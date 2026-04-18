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

interface CatalogListItem {
  minifigNumber: string
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
    // Wait for catalog items to appear — BrickLink uses table rows with minifig links
    await page.waitForSelector('a[href*="catalogitem.page?M="]', { timeout: 60000 })
    await page.waitForTimeout(2000)

    const pageResult = await page.evaluate(() => {
      const items: Array<{ minifigNumber: string; name: string; imageUrl: string }> = []

      const itemLinks = document.querySelectorAll('a[href*="catalogitem.page?M="]')

      itemLinks.forEach(link => {
        const href = (link as HTMLAnchorElement).href
        const text = (link.textContent || '').trim()

        const match = href.match(/[?&]M=([^&]+)/)
        if (!match) return

        const minifigNumber = match[1]
        if (items.some(item => item.minifigNumber === minifigNumber)) return

        const row = link.closest('tr') || link.closest('div')
        const img = row?.querySelector('img')
        const imageUrl = img?.src || ''

        if (!imageUrl || imageUrl.includes('printer') || imageUrl.includes('spacer')) return

        items.push({ minifigNumber, name: text, imageUrl })
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
    console.log(
      `  Found ${pageResult.items.length} minifigs on this page (${allItems.length} total)`,
    )

    currentPage++
  }

  console.log(`\nTotal: ${allItems.length} minifigs across ${totalPages} page(s)`)
  return allItems
}

// ─────────────────────────────────────────────────────────────────────────
// Single minifig detail scraping
// ─────────────────────────────────────────────────────────────────────────

interface MinifigPart {
  partNumber: string
  name: string
  color: string
  quantity: number
  position?: string
}

interface AppearsInSet {
  setNumber: string
  name: string
  imageUrl?: string
}

async function scrapeMinifigDetail(page: Page, minifigNumber: string) {
  // 1. Main detail page
  const url = `https://www.bricklink.com/v2/catalog/catalogitem.page?M=${minifigNumber}#T=S`
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
  const parts = await scrapePartsInventory(page, minifigNumber)

  // 3. Appears in sets page
  const appearsInSets = await scrapeAppearsInSets(page, minifigNumber)

  return {
    ...basicInfo,
    parts,
    appearsInSets,
  }
}

/**
 * Scrape the parts inventory page for a minifig.
 * URL: https://www.bricklink.com/catalogItemInv.asp?M=<number>
 */
async function scrapePartsInventory(page: Page, minifigNumber: string): Promise<MinifigPart[]> {
  const url = `https://www.bricklink.com/catalogItemInv.asp?M=${minifigNumber}`
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await waitForAgeGate(page)
    await page.waitForTimeout(2000)

    const parts = await page.evaluate(() => {
      const results: Array<{
        partNumber: string
        name: string
        color: string
        quantity: number
        position?: string
      }> = []

      // BrickLink inventory tables have rows with part images, numbers, colors, and quantities
      // The table structure: each part row has cells for image, qty, color, part number, description
      const rows = document.querySelectorAll('table.ta tr')

      let currentCategory = ''

      for (const row of rows) {
        const cells = row.querySelectorAll('td')

        // Category header rows (e.g., "Minifig Upper Body", "Minifig Lower Body")
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

        // Part rows typically have 5+ cells
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
        const name = partLink.textContent?.trim() || ''

        // Find quantity — usually the first cell with just a number
        let quantity = 1
        for (const cell of cells) {
          const text = cell.textContent?.trim() || ''
          if (/^\d+$/.test(text) && parseInt(text, 10) > 0) {
            quantity = parseInt(text, 10)
            break
          }
        }

        // Find color — look for a link to color catalog
        let color = ''
        const colorLink = row.querySelector('a[href*="colorID="]')
        if (colorLink) {
          color = colorLink.textContent?.trim() || ''
        }

        // Map category to position
        let position: string | undefined
        const catLower = currentCategory.toLowerCase()
        if (catLower.includes('headgear') || catLower.includes('hair')) position = 'headgear'
        else if (catLower.includes('head') || catLower.includes('face')) position = 'head'
        else if (catLower.includes('upper body') || catLower.includes('torso')) position = 'torso'
        else if (
          catLower.includes('lower body') ||
          catLower.includes('leg') ||
          catLower.includes('hip')
        )
          position = 'legs'
        else if (
          catLower.includes('accessory') ||
          catLower.includes('weapon') ||
          catLower.includes('tool')
        )
          position = 'accessory'
        else if (catLower.includes('cape') || catLower.includes('neck')) position = 'accessory'

        if (partNumber && name) {
          results.push({ partNumber, name, color, quantity, position })
        }
      }

      return results
    })

    console.log(`  Parts: ${parts.length} found`)
    return parts
  } catch (error) {
    console.warn(`  Could not scrape parts inventory: ${error}`)
    return []
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
  minifigNumber: string,
  index: number,
  total: number,
) {
  console.log(`\n[${index + 1}/${total}] Scraping ${minifigNumber}...`)

  let scraped
  try {
    scraped = await scrapeMinifigDetail(page, minifigNumber)
  } catch (error) {
    console.error(`  Failed to scrape ${minifigNumber}: ${error}`)
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
  let primaryImageUrl = scraped.mainImage
  try {
    if (scraped.mainImage) {
      const s3Key = await downloadAndUploadImage(scraped.mainImage, minifigNumber, 'main')
      if (s3Key) {
        const s3Endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000'
        primaryImageUrl = `${s3Endpoint}/${S3_BUCKET}/${s3Key}`
      }
    }

    // Download thumbnails
    for (let i = 0; i < scraped.thumbnails.length; i++) {
      await downloadAndUploadImage(scraped.thumbnails[i], minifigNumber, `thumb_${i + 1}`)
    }
  } catch (error) {
    console.warn(`  Image download failed, using original URL: ${error}`)
  }

  // Create variant (getOrCreate avoids duplicates)
  const variantPayload = {
    legoNumber: minifigNumber,
    name: scraped.description || scraped.name,
    theme: scraped.category || undefined,
    year: scraped.yearReleased ? parseInt(scraped.yearReleased, 10) : undefined,
    imageUrl: primaryImageUrl,
    weight: scraped.weight || undefined,
    dimensions: scraped.dimensions || undefined,
    partsCount: scraped.partsCount || undefined,
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
  console.log(`  Variant: ${variant.id}`)

  // Create instance
  const status = isWishlist ? 'wanted' : 'none'
  const instancePayload = {
    displayName: scraped.description || scraped.name,
    variantId: variant.id,
    status,
    sourceType: 'bricklink',
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

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('Usage:')
    console.error('  pnpm scrape <minifig-number>                  — single minifig')
    console.error('  pnpm scrape <catalog-list-url>                — all minifigs from catalog')
    console.error('')
    console.error('Options:')
    console.error('  --wishlist   save as wanted instead of owned')
    console.error('  --dry-run    scrape only, do not save')
    console.error('')
    console.error('Examples:')
    console.error('  pnpm scrape cas002')
    console.error('  pnpm scrape https://www.bricklink.com/catalogList.asp?catType=M&catString=9')
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
        console.log('No minifigs found in catalog.')
        return
      }

      console.log(`\nProcessing ${items.length} minifigs...`)

      for (let i = 0; i < items.length; i++) {
        await processAndSaveMinifig(page, items[i].minifigNumber, i, items.length)

        // Brief pause between requests to be polite
        if (i < items.length - 1) {
          await page.waitForTimeout(1000)
        }
      }

      console.log(`\nDone. Processed ${items.length} minifigs.`)
    } else {
      // Single minifig mode
      await processAndSaveMinifig(page, arg, 0, 1)
    }
  } finally {
    await context.close()
  }
}

main()
