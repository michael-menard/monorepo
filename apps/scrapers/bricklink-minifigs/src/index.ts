import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { chromium, type Page, type BrowserContext } from 'playwright'
import { initializeBucket, uploadToS3 } from '@repo/s3-client'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../.env') })

const API_BASE = process.env.LEGO_API_URL || 'http://localhost:9100'
const S3_BUCKET = process.env.S3_BUCKET || 'lego-moc-files'
const dryRun = process.argv.includes('--dry-run')
const isWishlist = process.argv.includes('--wishlist')

// ─────────────────────────────────────────────────────────────────────────
// Image download/upload
// ─────────────────────────────────────────────────────────────────────────

async function downloadAndUploadImage(
  imageUrl: string,
  minifigNumber: string,
  fileName: string,
): Promise<string> {
  // BrickLink uses protocol-relative URLs (//img.bricklink.com/...)
  const fullUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl
  const urlPath = new URL(fullUrl).pathname
  const ext = urlPath.match(/\.(png|jpg|jpeg|webp|gif)$/i)?.[0] || '.jpg'
  const safeName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const s3Key = `minifigs/${minifigNumber}/images/${safeName}${ext}`

  console.log(`  Downloading ${fileName}...`)
  const res = await fetch(fullUrl)
  if (!res.ok) {
    console.warn(`  Failed to download ${imageUrl}: ${res.status}`)
    return ''
  }
  const buffer = Buffer.from(await res.arrayBuffer())

  await uploadToS3({
    key: s3Key,
    body: buffer,
    contentType: ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg',
    bucket: S3_BUCKET,
  })
  console.log(`  Uploaded → ${s3Key}`)
  return s3Key
}

// ─────────────────────────────────────────────────────────────────────────
// Age gate / birthday popup dismissal
// ─────────────────────────────────────────────────────────────────────────

/**
 * Wait after navigation, checking if an age/birthday gate appears.
 * If detected, pauses and waits for the user to complete it in the browser.
 * Gives the page 3 seconds to render the popup before checking.
 */
async function waitForAgeGate(page: Page) {
  // Give the page time to render any popup
  await page.waitForTimeout(3000)

  const hasAgeGate = await page
    .evaluate(() => {
      const body = document.body.innerText || ''
      return (
        document.querySelector(
          'select[name="yy"], #yearField, #divBirthDate, input[name="frmDate"]',
        ) !== null || /date of birth|enter your birthday|age verification|birth date/i.test(body)
      )
    })
    .catch(() => false)

  if (!hasAgeGate) {
    await dismissCookiePopup(page)
    return
  }

  console.log('  ⏳ Birthday verification detected — please enter your birthday in the browser...')

  // Poll every 2 seconds until the gate is gone (up to 2 minutes)
  const start = Date.now()
  const timeout = 120000
  while (Date.now() - start < timeout) {
    await page.waitForTimeout(2000)

    const stillThere = await page
      .evaluate(() => {
        const body = document.body.innerText || ''
        return (
          document.querySelector(
            'select[name="yy"], #yearField, #divBirthDate, input[name="frmDate"]',
          ) !== null || /date of birth|enter your birthday|age verification|birth date/i.test(body)
        )
      })
      .catch(() => false)

    if (!stillThere) {
      console.log('  ✓ Birthday verification complete.')
      await page.waitForTimeout(1000)
      await dismissCookiePopup(page)
      return
    }
  }

  console.warn('  ⚠ Timed out waiting for birthday verification — continuing anyway...')
  await dismissCookiePopup(page)
}

/**
 * Dismiss cookie consent popups if present.
 * Called after age gate check since cookies popup often appears right after.
 */
async function dismissCookiePopup(page: Page) {
  try {
    const cookieBtn = page
      .locator(
        'button:has-text("Accept"), button:has-text("Accept All"), button:has-text("I Accept"), button:has-text("OK"), button:has-text("Got it"), #onetrust-accept-btn-handler, .cookie-accept, [data-testid="cookie-accept"]',
      )
      .first()

    const isVisible = await cookieBtn.isVisible({ timeout: 1500 }).catch(() => false)
    if (isVisible) {
      console.log('  Dismissing cookie popup...')
      await cookieBtn.click()
      await page.waitForTimeout(500)
    }
  } catch {
    // No cookie popup — fine
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Catalog list scraping (multi-page)
// ─────────────────────────────────────────────────────────────────────────

type BricklinkItemType = 'M' | 'S'

interface CatalogListItem {
  itemNumber: string
  itemType: BricklinkItemType
  name: string
  imageUrl: string
}

async function scrapeCatalogList(page: Page, catalogUrl: string): Promise<CatalogListItem[]> {
  const allItems: CatalogListItem[] = []
  let currentPage = 1
  let totalPages = 1
  const baseUrl = catalogUrl.split('?')[0]
  const queryParams = catalogUrl.includes('?') ? catalogUrl.split('?')[1] : ''

  while (currentPage <= totalPages) {
    const pageUrl =
      currentPage === 1
        ? catalogUrl
        : `${baseUrl}?${queryParams}${queryParams ? '&' : ''}pg=${currentPage}`

    console.log(
      `\nScraping catalog page ${currentPage}${totalPages > 1 ? ` of ${totalPages}` : ''}...`,
    )
    console.log(`  ${pageUrl}`)

    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await waitForAgeGate(page)
    console.log('  Waiting for page to load (click Cloudflare/captcha if prompted)...')
    // Wait for catalog items to appear — BrickLink uses table rows with item links (M= for minifigs, S= for sets/CMF)
    await page.waitForSelector('a[href*="catalogitem.page?M="], a[href*="catalogitem.page?S="]', {
      timeout: 60000,
    })
    await page.waitForTimeout(2000)

    const pageResult = await page.evaluate(() => {
      const items: Array<{
        itemNumber: string
        itemType: 'M' | 'S'
        name: string
        imageUrl: string
      }> = []

      const itemLinks = document.querySelectorAll(
        'a[href*="catalogitem.page?M="], a[href*="catalogitem.page?S="]',
      )

      itemLinks.forEach(link => {
        const href = (link as HTMLAnchorElement).href
        const text = (link.textContent || '').trim()

        // Match both M= (minifigs) and S= (sets/CMF)
        const match = href.match(/[?&]([MS])=([^&]+)/)
        if (!match) return

        const itemType = match[1] as 'M' | 'S'
        const itemNumber = match[2]
        if (items.some(item => item.itemNumber === itemNumber)) return

        const row = link.closest('tr') || link.closest('div')
        const img = row?.querySelector('img')
        const imageUrl = img?.src || ''

        if (!imageUrl || imageUrl.includes('printer') || imageUrl.includes('spacer')) return

        items.push({ itemNumber, itemType, name: text, imageUrl })
      })

      // Detect pagination
      const bodyText = document.body.textContent || ''
      const pageMatch = bodyText.match(/Page\s+(\d+)\s+of\s+(\d+)/i)
      let currentPg = 1
      let totalPgs = 1
      if (pageMatch) {
        currentPg = parseInt(pageMatch[1], 10)
        totalPgs = parseInt(pageMatch[2], 10)
      }

      return { items, currentPage: currentPg, totalPages: totalPgs }
    })

    allItems.push(...pageResult.items)
    totalPages = pageResult.totalPages
    console.log(`  Found ${pageResult.items.length} items on this page (${allItems.length} total)`)

    currentPage++
  }

  console.log(`\nTotal: ${allItems.length} items across ${totalPages} page(s)`)
  return allItems
}

// ─────────────────────────────────────────────────────────────────────────
// Single minifig detail scraping
// ─────────────────────────────────────────────────────────────────────────

interface PriceGuideStats {
  timesSold: number
  totalQty: number
  minPrice: number
  avgPrice: number
  qtyAvgPrice: number
  maxPrice: number
}

interface PriceGuide {
  newSales?: PriceGuideStats
  usedSales?: PriceGuideStats
}

interface MinifigPart {
  partNumber: string
  name: string
  color: string
  colorId?: number
  quantity: number
  position?: string
  imageUrl?: string
  category?: string
  bricklinkUrl?: string
  hasInventory?: boolean
  priceGuide?: PriceGuide
}

interface AppearsInSet {
  setNumber: string
  name: string
  imageUrl?: string
}

async function scrapeMinifigDetail(
  page: Page,
  itemNumber: string,
  itemType: BricklinkItemType = 'M',
) {
  // 1. Main detail page
  const url = `https://www.bricklink.com/v2/catalog/catalogitem.page?${itemType}=${itemNumber}#T=S`
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await waitForAgeGate(page)

  try {
    await page.waitForSelector('img.pciImageMain', { timeout: 15000 })
  } catch {
    console.log('  Waiting for page (click Cloudflare if prompted)...')
    await page.waitForSelector('img.pciImageMain', { timeout: 60000 })
  }
  await page.waitForTimeout(1500)

  const basicInfo = await page.evaluate(() => {
    const mainImg = document.querySelector('img.pciImageMain')
    const mainImage = mainImg?.getAttribute('src') || ''
    const thumbnails: string[] = []
    document.querySelectorAll('.pciThumbImgBox img').forEach(img => {
      const src = (img as HTMLImageElement).src
      if (src && src.startsWith('http') && !src.includes('Large Images')) {
        thumbnails.push(src)
      }
    })

    let yearReleased = ''
    let weight = ''
    let dimensions = ''
    let category = ''
    let description = ''
    let partsCount = 0

    document.querySelectorAll('font[face="Tahoma,Arial"]').forEach(el => {
      const text = (el.textContent || '').trim()
      const yearMatch = text.match(/Year Released:\s*(\d{4})/)
      if (yearMatch) yearReleased = yearMatch[1]
      const weightMatch = text.match(/Weight:\s*([^\n<]+)/)
      if (weightMatch) weight = weightMatch[1].trim()
      const dimMatch = text.match(/Item Dim\.:\s*([^\n<]+)/)
      if (dimMatch) dimensions = dimMatch[1].trim()
      const catMatch = text.match(/Category:\s*([^\n<]+)/)
      if (catMatch) category = catMatch[1].trim()
    })

    const nameEl = document.querySelector(
      'td.pciMainImageHolder ~ td font[face="Tahoma,Arial"] strong',
    )
    if (nameEl) description = nameEl.textContent || ''

    document.querySelectorAll('a[href*="catalogItemInv.asp"][href*="M="]').forEach(link => {
      const text = (link.textContent || '').trim()
      const match = text.match(/(\d+)\s+Parts/)
      if (match) partsCount = parseInt(match[1].replace(/,/g, ''), 10)
    })

    const name = document.title.split(' : ')[0].trim()

    return {
      name,
      mainImage,
      thumbnails,
      yearReleased,
      weight,
      dimensions,
      category,
      description,
      partsCount,
    }
  })

  // 2. Parts inventory page
  const parts = await scrapePartsInventory(page, itemNumber, itemType)

  // 2b. Price guide for each part
  if (parts.length > 0) {
    console.log(`  Scraping price guides for ${parts.length} parts...`)
    for (const part of parts) {
      part.priceGuide = await scrapePriceGuide(page, 'P', part.partNumber, part.colorId)
      // Small delay between requests to avoid rate limiting
      await page.waitForTimeout(1500)
    }
  }

  // 3. Item price guide
  console.log(`  Scraping ${itemType === 'S' ? 'CMF set' : 'minifig'} price guide...`)
  const priceGuide = await scrapePriceGuide(page, itemType, itemNumber)

  // 4. Appears in sets page (skip for CMF sets — they ARE the source item)
  const appearsInSets = itemType === 'S' ? [] : await scrapeAppearsInSets(page, itemNumber)

  return {
    ...basicInfo,
    bricklinkUrl: `https://www.bricklink.com/v2/catalog/catalogitem.page?${itemType}=${itemNumber}`,
    parts,
    priceGuide,
    appearsInSets,
  }
}

/**
 * Scrape the parts inventory page for a minifig.
 * URL: https://www.bricklink.com/catalogItemInv.asp?M=<number>
 */
async function scrapePartsInventory(
  page: Page,
  itemNumber: string,
  itemType: BricklinkItemType = 'M',
): Promise<MinifigPart[]> {
  const url = `https://www.bricklink.com/catalogItemInv.asp?${itemType}=${itemNumber}`
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await waitForAgeGate(page)
    await page.waitForTimeout(2000)

    const parts = await page.evaluate(() => {
      const results: Array<{
        partNumber: string
        name: string
        color: string
        colorId?: number
        quantity: number
        position?: string
        imageUrl?: string
        category?: string
        bricklinkUrl?: string
        hasInventory?: boolean
      }> = []

      const rows = document.querySelectorAll('table.ta tr')

      let currentCategory = ''

      for (const row of rows) {
        const cells = row.querySelectorAll('td')

        // Category header rows (e.g., "Parts:", "Minifig Upper Body")
        if (cells.length === 1) {
          const headerText = cells[0].textContent?.trim() || ''
          if (
            headerText &&
            !headerText.includes('Regular Items') &&
            !headerText.includes('Total')
          ) {
            currentCategory = headerText
          }
          continue
        }

        // Part rows typically have 4-5 cells
        if (cells.length < 4) continue

        // Look for a link to a part page
        const partLink =
          row.querySelector('a[href*="catalogItem.asp"][href*="P="]') ||
          row.querySelector('a[href*="catalogitem.page?P="]')
        if (!partLink) continue

        const href = (partLink as HTMLAnchorElement).href
        const partMatch = href.match(/[?&]P=([^&]+)/)
        if (!partMatch) continue

        const partNumber = partMatch[1]

        // Extract color ID from part link (e.g., idColor=11)
        const colorIdMatch = href.match(/[?&]idColor=(\d+)/)
        const colorId = colorIdMatch ? parseInt(colorIdMatch[1], 10) : undefined

        // Build canonical BrickLink URL for this part
        const bricklinkUrl = `https://www.bricklink.com/v2/catalog/catalogitem.page?P=${partNumber}${colorId ? `&idColor=${colorId}` : ''}`

        // Extract image URL from the row's img element
        const img = row.querySelector('img[src*="img.bricklink.com"]') as HTMLImageElement | null
        const imageUrl = img?.src || undefined

        // Extract full part name from the description cell's bold text
        // The description cell contains: "<b>Color PartName</b><br><font>Catalog: Parts: Category</font>"
        const descCell = cells.length >= 4 ? cells[3] : null
        const boldEl = descCell?.querySelector('b')
        const fullName = boldEl?.textContent?.trim() || partLink.textContent?.trim() || ''

        // Extract category from the catalog breadcrumb in the description cell
        // Pattern: Catalog: Parts: <category link text>
        let category: string | undefined
        const categoryLinks = descCell?.querySelectorAll('font.fv a') || []
        if (categoryLinks.length > 0) {
          // Last link in the breadcrumb is the most specific category
          const lastCatLink = categoryLinks[categoryLinks.length - 1]
          category = lastCatLink?.textContent?.trim() || undefined
        }

        // Check if this part has a sub-inventory link "(Inv)"
        const hasInventory = !!row.querySelector('a[href*="catalogItemInv.asp"]')

        // Extract color name from the beginning of the full name
        // The full name format is "ColorName PartDescription" (e.g., "Black Minifigure, Hair...")
        let color = ''
        if (colorIdMatch) {
          // Color is the prefix before the part description in the bold text
          // Also check for a direct color link
          const colorLink = row.querySelector('a[href*="colorID="]')
          if (colorLink) {
            color = colorLink.textContent?.trim() || ''
          }
        }
        // If no color link found, try to infer from the full name
        if (!color && fullName) {
          // Known BrickLink color names that appear as prefixes
          const colorPrefixes = [
            'Black',
            'White',
            'Red',
            'Blue',
            'Yellow',
            'Green',
            'Brown',
            'Tan',
            'Dark Tan',
            'Dark Red',
            'Dark Blue',
            'Dark Green',
            'Dark Bluish Gray',
            'Dark Brown',
            'Light Bluish Gray',
            'Light Gray',
            'Medium Blue',
            'Medium Lavender',
            'Medium Nougat',
            'Nougat',
            'Orange',
            'Pearl Gold',
            'Reddish Brown',
            'Sand Blue',
            'Sand Green',
            'Trans-Clear',
            'Trans-Light Blue',
            'Trans-Neon Green',
            'Trans-Red',
            'Trans-Yellow',
          ]
          for (const prefix of colorPrefixes) {
            if (fullName.startsWith(prefix + ' ')) {
              color = prefix
              break
            }
          }
        }

        // Find quantity — the cell with just a number
        let quantity = 1
        for (const cell of cells) {
          const text = cell.textContent?.trim() || ''
          if (/^\d+$/.test(text) && parseInt(text, 10) > 0) {
            quantity = parseInt(text, 10)
            break
          }
        }

        // Map category to body position
        let position: string | undefined
        const catLower = (category || currentCategory).toLowerCase()
        if (catLower.includes('headgear') || catLower.includes('hair')) position = 'headgear'
        else if (catLower.includes('head') || catLower.includes('face')) position = 'head'
        else if (catLower.includes('torso') || catLower.includes('upper body')) position = 'torso'
        else if (
          catLower.includes('leg') ||
          catLower.includes('hip') ||
          catLower.includes('lower body')
        )
          position = 'legs'
        else if (
          catLower.includes('accessory') ||
          catLower.includes('weapon') ||
          catLower.includes('tool') ||
          catLower.includes('cape') ||
          catLower.includes('neck')
        )
          position = 'accessory'

        if (partNumber && fullName) {
          results.push({
            partNumber,
            name: fullName,
            color,
            colorId,
            quantity,
            position,
            imageUrl,
            category,
            bricklinkUrl,
            hasInventory,
          })
        }
      }

      return results
    })

    console.log(`  Parts: ${parts.length} found`)
    for (const part of parts) {
      console.log(
        `    ${part.partNumber} — ${part.color || '?'} (colorId:${part.colorId ?? '?'}) qty:${part.quantity} [${part.category || part.position || '?'}]`,
      )
    }
    return parts
  } catch (error) {
    console.warn(`  Could not scrape parts inventory: ${error}`)
    return []
  }
}

function parsePriceGuideText(text: string): PriceGuideStats | undefined {
  const timesSoldMatch = text.match(/Times Sold:\s*([\d,]+)/)
  const totalQtyMatch = text.match(/Total Qty:\s*([\d,]+)/)
  if (!timesSoldMatch && !totalQtyMatch) return undefined

  const parseNum = (s: string) => parseInt(s.replace(/,/g, ''), 10)
  const parseUsd = (s: string) => {
    const m = s.match(/US\s*\$\s*([\d,]+\.?\d*)/)
    return m ? parseFloat(m[1].replace(',', '')) : 0
  }

  const minPriceMatch = text.match(/Min Price:\s*(US\s*\$[\d,.]+)/)
  const avgPriceMatch = text.match(/Avg Price:\s*(US\s*\$[\d,.]+)/)
  const qtyAvgPriceMatch = text.match(/Qty Avg Price:\s*(US\s*\$[\d,.]+)/)
  const maxPriceMatch = text.match(/Max Price:\s*(US\s*\$[\d,.]+)/)

  return {
    timesSold: timesSoldMatch ? parseNum(timesSoldMatch[1]) : 0,
    totalQty: totalQtyMatch ? parseNum(totalQtyMatch[1]) : 0,
    minPrice: minPriceMatch ? parseUsd(minPriceMatch[1]) : 0,
    avgPrice: avgPriceMatch ? parseUsd(avgPriceMatch[1]) : 0,
    qtyAvgPrice: qtyAvgPriceMatch ? parseUsd(qtyAvgPriceMatch[1]) : 0,
    maxPrice: maxPriceMatch ? parseUsd(maxPriceMatch[1]) : 0,
  }
}

/**
 * Scrape the Price Guide tab for a catalog item, extracting Last 6 Months Sales (New + Used).
 * Works for both parts (P=) and minifigs (M=).
 */
async function scrapePriceGuide(
  page: Page,
  itemType: 'P' | 'M' | 'S',
  itemNumber: string,
  colorId?: number,
): Promise<PriceGuide> {
  const colorParam = colorId ? `&idColor=${colorId}` : ''
  const url = `https://www.bricklink.com/v2/catalog/catalogitem.page?${itemType}=${itemNumber}${colorParam}#T=P`
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await waitForAgeGate(page)
    await dismissCookiePopup(page)

    // Click the Price Guide tab
    const priceGuideTab = page.locator('text=Price Guide').first()
    await priceGuideTab.click({ timeout: 5000 }).catch(() => {
      // Tab might already be selected or page might use #T=P hash
    })
    await page.waitForTimeout(2000)

    // Extract raw text from the DOM — no function declarations inside evaluate to avoid tsx __name issue
    // The BrickLink price guide layout: a table with "Last 6 Months Sales:" header,
    // then a row with "New" and "Used" column headers, then a row with two cells
    // each containing a nested table with the stats (Times Sold, Min Price, etc.)
    const rawSections = await page.evaluate(() => {
      const sections: { newText?: string; usedText?: string } = {}

      // Find all TDs that contain exactly "New" or "Used" as their direct text
      // These are column headers in the price guide table
      const allCells = document.querySelectorAll('td')
      let newHeaderCell: Element | null = null
      let usedHeaderCell: Element | null = null

      for (const cell of allCells) {
        const directText = (cell.textContent || '').trim()
        // Only match cells within the "Last 6 Months Sales" section
        const parentTable = cell.closest('table')
        if (!parentTable) continue
        const tableText = parentTable.textContent || ''
        if (!tableText.includes('Last 6 Months Sales')) continue

        if (directText === 'New' && !newHeaderCell) newHeaderCell = cell
        if (directText === 'Used' && !usedHeaderCell) usedHeaderCell = cell
      }

      // For each header, find the stats cell in the same column position
      // The header and stats are in adjacent rows of the same parent table
      if (newHeaderCell) {
        const headerRow = newHeaderCell.closest('tr')
        const colIndex = headerRow
          ? Array.from(headerRow.children).indexOf(newHeaderCell as HTMLElement)
          : -1
        if (headerRow && colIndex >= 0) {
          // Look at subsequent rows in the same table for the stats
          let nextRow = headerRow.nextElementSibling
          while (nextRow) {
            const statsCell = nextRow.children[colIndex]
            if (statsCell) {
              const t = statsCell.textContent || ''
              if (t.includes('Times Sold') || t.includes('Total Qty')) {
                sections.newText = t
                break
              }
            }
            nextRow = nextRow.nextElementSibling
          }
        }
      }

      if (usedHeaderCell) {
        const headerRow = usedHeaderCell.closest('tr')
        const colIndex = headerRow
          ? Array.from(headerRow.children).indexOf(usedHeaderCell as HTMLElement)
          : -1
        if (headerRow && colIndex >= 0) {
          let nextRow = headerRow.nextElementSibling
          while (nextRow) {
            const statsCell = nextRow.children[colIndex]
            if (statsCell) {
              const t = statsCell.textContent || ''
              if (t.includes('Times Sold') || t.includes('Total Qty')) {
                sections.usedText = t
                break
              }
            }
            nextRow = nextRow.nextElementSibling
          }
        }
      }

      return sections
    })

    // Parse the raw text in Node (not in browser context)
    const priceData: { newSales?: PriceGuideStats; usedSales?: PriceGuideStats } = {}
    if (rawSections.newText) priceData.newSales = parsePriceGuideText(rawSections.newText)
    if (rawSections.usedText) priceData.usedSales = parsePriceGuideText(rawSections.usedText)

    const guide: PriceGuide = {}
    if (priceData.newSales) guide.newSales = priceData.newSales
    if (priceData.usedSales) guide.usedSales = priceData.usedSales

    if (guide.newSales || guide.usedSales) {
      const n = guide.newSales
      const u = guide.usedSales
      console.log(
        `    💰 ${itemNumber} — New: ${n ? `${n.timesSold} sold, avg $${n.avgPrice.toFixed(2)}` : 'n/a'} | Used: ${u ? `${u.timesSold} sold, avg $${u.avgPrice.toFixed(2)}` : 'n/a'}`,
      )
    }

    return guide
  } catch (error) {
    console.warn(`    Could not scrape price guide for ${itemNumber}: ${error}`)
    return {}
  }
}

/**
 * Scrape the "appears in sets" page for a minifig.
 * URL: https://www.bricklink.com/catalogItemIn.asp?M=<number>&in=S
 */
async function scrapeAppearsInSets(page: Page, minifigNumber: string): Promise<AppearsInSet[]> {
  const url = `https://www.bricklink.com/catalogItemIn.asp?M=${minifigNumber}&in=S`
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await waitForAgeGate(page)
    await page.waitForTimeout(2000)

    const sets = await page.evaluate(() => {
      const results: Array<{ setNumber: string; name: string; imageUrl?: string }> = []

      // The "appears in" page has a table with set links
      const rows = document.querySelectorAll('tr')

      for (const row of rows) {
        // Look for links to set pages
        const setLink = row.querySelector('a[href*="catalogitem.page?S="]')
        if (!setLink) continue

        const href = (setLink as HTMLAnchorElement).href
        const match = href.match(/[?&]S=([^&]+)/)
        if (!match) continue

        const setNumber = match[1]

        // Get set name — usually in a nearby cell or the link text itself
        let name = ''
        const cells = row.querySelectorAll('td')
        for (const cell of cells) {
          const text = cell.textContent?.trim() || ''
          // The name cell usually has more text than just a number
          if (text.length > 5 && !text.match(/^\d/) && text !== setNumber) {
            name = text.replace(/\s+/g, ' ').trim()
            break
          }
        }
        if (!name) name = setLink.textContent?.trim() || setNumber

        // Get image if available
        const img = row.querySelector('img')
        const imageUrl = img?.src && img.src.startsWith('http') ? img.src : undefined

        // Avoid duplicates
        if (!results.some(r => r.setNumber === setNumber)) {
          results.push({ setNumber, name, imageUrl })
        }
      }

      return results
    })

    console.log(`  Appears in: ${sets.length} sets`)
    return sets
  } catch (error) {
    console.warn(`  Could not scrape appears-in-sets: ${error}`)
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Save one minifig to API
// ─────────────────────────────────────────────────────────────────────────

async function processAndSaveMinifig(
  page: Page,
  itemNumber: string,
  itemType: BricklinkItemType,
  index: number,
  total: number,
) {
  const isCmf = itemType === 'S'
  console.log(
    `\n[${index + 1}/${total}] Scraping ${isCmf ? 'CMF set' : 'minifig'} ${itemNumber}...`,
  )

  let scraped
  try {
    scraped = await scrapeMinifigDetail(page, itemNumber, itemType)
  } catch (error) {
    console.error(`  Failed to scrape ${itemNumber}: ${error}`)
    return
  }

  console.log(`  Name: ${scraped.description || scraped.name}`)
  console.log(
    `  Year: ${scraped.yearReleased || '?'} | Category: ${scraped.category || '?'} | Parts: ${scraped.parts.length} (${scraped.partsCount} listed)`,
  )
  console.log(`  Sets: ${scraped.appearsInSets.length}`)

  if (dryRun) {
    console.log('  --dry-run: skipping save')
    return
  }

  // Download main image to MinIO
  const s3Endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000'
  let primaryImageUrl = scraped.mainImage
  try {
    if (scraped.mainImage) {
      const s3Key = await downloadAndUploadImage(scraped.mainImage, itemNumber, 'main')
      if (s3Key) {
        primaryImageUrl = `${s3Endpoint}/${S3_BUCKET}/${s3Key}`
      }
    }

    // Download thumbnails
    for (let i = 0; i < scraped.thumbnails.length; i++) {
      await downloadAndUploadImage(scraped.thumbnails[i], itemNumber, `thumb_${i + 1}`)
    }

    // Download part images
    for (const part of scraped.parts) {
      if (part.imageUrl) {
        const partFileName = `part_${part.partNumber}${part.colorId ? `_c${part.colorId}` : ''}`
        const s3Key = await downloadAndUploadImage(part.imageUrl, itemNumber, partFileName)
        if (s3Key) {
          part.imageUrl = `${s3Endpoint}/${S3_BUCKET}/${s3Key}`
        }
      }
    }
  } catch (error) {
    console.warn(`  Image download failed, using original URL: ${error}`)
  }

  // Extract CMF series from category (e.g., "Collectible Minifigures Series 25" → "Series 25")
  let cmfSeries: string | undefined
  if (isCmf && scraped.category) {
    const seriesMatch = scraped.category.match(/Series\s+\d+/i)
    cmfSeries = seriesMatch ? seriesMatch[0] : scraped.category
  }

  // Create variant (getOrCreate avoids duplicates)
  const variantPayload = {
    legoNumber: itemNumber,
    name: scraped.description || scraped.name,
    theme: scraped.category || undefined,
    year: scraped.yearReleased ? parseInt(scraped.yearReleased, 10) : undefined,
    cmfSeries,
    imageUrl: primaryImageUrl,
    weight: scraped.weight || undefined,
    dimensions: scraped.dimensions || undefined,
    partsCount: scraped.partsCount || undefined,
    bricklinkUrl: scraped.bricklinkUrl,
    priceGuide: scraped.priceGuide,
    parts: scraped.parts.length > 0 ? scraped.parts : undefined,
    appearsInSets: scraped.appearsInSets.length > 0 ? scraped.appearsInSets : undefined,
  }

  const variantRes = await fetch(`${API_BASE}/minifigs/variants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(variantPayload),
  })

  if (!variantRes.ok) {
    const body = await variantRes.text()
    console.error(`  Failed to save variant: ${variantRes.status} — ${body}`)
    return
  }

  const variant = await variantRes.json()
  console.log(`  Variant: ${variant.id}${cmfSeries ? ` (${cmfSeries})` : ''}`)

  // Check if an instance already exists for this variant
  const existingRes = await fetch(
    `${API_BASE}/minifigs?limit=1&search=${encodeURIComponent(itemNumber)}`,
  )
  const existingData = existingRes.ok ? await existingRes.json() : null
  const existingInstances = existingData?.items ?? existingData?.data ?? []
  const alreadyExists = existingInstances.some((inst: any) => inst.variantId === variant.id)

  if (alreadyExists) {
    console.log(`  Instance already exists for variant ${variant.id} — skipping`)
    return
  }

  // Create instance
  const status = isWishlist ? 'wanted' : 'none'
  const instancePayload = {
    displayName: scraped.description || scraped.name,
    variantId: variant.id,
    status,
    sourceType: isCmf ? 'cmf_pack' : 'bricklink',
    imageUrl: primaryImageUrl,
  }

  const instanceRes = await fetch(`${API_BASE}/minifigs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(instancePayload),
  })

  if (!instanceRes.ok) {
    const body = await instanceRes.text()
    console.error(`  Failed to save instance: ${instanceRes.status} — ${body}`)
    return
  }

  const instance = await instanceRes.json()
  console.log(`  Saved instance: ${instance.id}`)
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

/**
 * Detect BrickLink item type from a number/ID string.
 * CMF sets use prefixes like "col" (e.g., col25-13), "colhp" (Harry Potter), "colmar" (Marvel).
 * Regular minifigs use prefixes like "cas", "sw", "cty", etc.
 */
function detectItemType(itemId: string): BricklinkItemType {
  // BrickLink CMF set numbers start with "col" (col25-13, colhp-1, colmar-6, etc.)
  return /^col/i.test(itemId) ? 'S' : 'M'
}

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage:')
    console.error('  pnpm scrape <minifig-number>                  — single minifig (e.g., cas002)')
    console.error(
      '  pnpm scrape <cmf-set-number>                  — single CMF set (e.g., col25-13)',
    )
    console.error('  pnpm scrape <catalog-list-url>                — all items from catalog')
    console.error('')
    console.error('Options:')
    console.error('  --wishlist   save as wanted instead of owned')
    console.error('  --dry-run    scrape only, do not save')
    console.error('')
    console.error('Examples:')
    console.error('  pnpm scrape cas002')
    console.error('  pnpm scrape col25-13')
    console.error('  pnpm scrape https://www.bricklink.com/catalogList.asp?catType=M&catString=9')
    console.error(
      '  pnpm scrape https://www.bricklink.com/catalogList.asp?catType=S&catString=746.753',
    )
    process.exit(1)
  }

  const isCatalogUrl = arg.startsWith('http') && arg.includes('catalogList')

  const userDataDir = resolve(__dirname, '../.chrome-profile')
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
  })
  const page = context.pages()[0] || (await context.newPage())

  try {
    if (!dryRun) {
      await initializeBucket(S3_BUCKET)
    }

    if (isCatalogUrl) {
      // Catalog mode: scrape list, then each detail page
      const items = await scrapeCatalogList(page, arg)

      if (items.length === 0) {
        console.log('No items found in catalog.')
        return
      }

      const cmfCount = items.filter(i => i.itemType === 'S').length
      const minifigCount = items.filter(i => i.itemType === 'M').length
      console.log(
        `\nProcessing ${items.length} items` +
          (cmfCount > 0 ? ` (${cmfCount} CMF sets)` : '') +
          (minifigCount > 0 ? ` (${minifigCount} minifigs)` : '') +
          '...',
      )

      for (let i = 0; i < items.length; i++) {
        await processAndSaveMinifig(page, items[i].itemNumber, items[i].itemType, i, items.length)

        // Brief pause between requests to be polite
        if (i < items.length - 1) {
          await page.waitForTimeout(1000)
        }
      }

      console.log(`\nDone. Processed ${items.length} items.`)
    } else {
      // Single item mode — detect type from the item number
      const itemType = detectItemType(arg)
      if (itemType === 'S') {
        console.log(`Detected CMF set number: ${arg}`)
      }
      await processAndSaveMinifig(page, arg, itemType, 0, 1)
    }
  } finally {
    await context.close()
  }
}

main()
