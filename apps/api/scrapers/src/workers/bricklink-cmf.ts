/**
 * BrickLink CMF (Collectible Minifigure) Worker
 *
 * Scrapes a CMF set page (S=col25-13) and saves it as a minifig variant.
 * CMF packs are hybrid items — they use the BrickLink "Set" URL pattern (S=)
 * but should be stored as minifig variants with their accessories and parts.
 *
 * Scrapes:
 * - Set detail page (name, image, year, category, CMF series)
 * - Parts inventory with sub-minifig expansion (accessories + body parts)
 * - Per-part price guides (last 6 months, new + used)
 * - CMF item price guide
 *
 * Called from bricklink-minifig worker when itemType='S' and itemNumber starts with 'col'.
 */

import { initializeBucket, uploadToS3 } from '@repo/s3-client'
import { logger } from '@repo/logger'
import type { BricklinkMinifigJob } from '../queues.js'
import {
  getSharedPage,
  resetPage,
  navigateWithRetry,
  waitForAgeGate,
  checkRateLimited,
} from './shared-browser.js'
import type { Page } from 'playwright'

const API_BASE = process.env.LEGO_API_URL || 'http://localhost:9100'
const S3_BUCKET = process.env.S3_BUCKET || 'lego-moc-files'
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000'

/** Random delay between 5-8 seconds */
function randomDelay(): number {
  return Math.floor(Math.random() * 3001) + 5000
}

// ─────────────────────────────────────────────────────────────────────────
// Types
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
  priceGuide?: PriceGuide
}

export interface CmfScrapeResult {
  success: boolean
  rateLimited?: boolean
  resetHint?: string
  error?: string
  itemNumber: string
  variantId?: string
  instanceId?: string
}

// ─────────────────────────────────────────────────────────────────────────
// Price guide parsing (shared logic with other workers)
// ─────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────
// Price guide scraping
// ─────────────────────────────────────────────────────────────────────────

async function scrapePriceGuide(
  page: Page,
  itemType: 'P' | 'S',
  itemNumber: string,
  colorId?: number,
): Promise<PriceGuide> {
  const colorParam = colorId ? `&idColor=${colorId}` : ''
  const url = `https://www.bricklink.com/v2/catalog/catalogitem.page?${itemType}=${itemNumber}${colorParam}#T=P`
  try {
    await navigateWithRetry(page, url, { timeout: 30000 })
    await waitForAgeGate(page)
    await page.waitForTimeout(randomDelay())

    // Click the Price Guide tab
    const priceGuideTab = page.locator('text=Price Guide').first()
    await priceGuideTab.click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(randomDelay())

    const rawSections = await page.evaluate(() => {
      const sections: { newText?: string; usedText?: string } = {}
      const allCells = document.querySelectorAll('td')
      let newHeaderCell: Element | null = null
      let usedHeaderCell: Element | null = null

      for (const cell of allCells) {
        const directText = (cell.textContent || '').trim()
        const parentTable = cell.closest('table')
        if (!parentTable) continue
        const tableText = parentTable.textContent || ''
        if (!tableText.includes('Last 6 Months Sales')) continue

        if (directText === 'New' && !newHeaderCell) newHeaderCell = cell
        if (directText === 'Used' && !usedHeaderCell) usedHeaderCell = cell
      }

      for (const [headerCell, key] of [
        [newHeaderCell, 'newText'],
        [usedHeaderCell, 'usedText'],
      ] as const) {
        if (!headerCell) continue
        const headerRow = headerCell.closest('tr')
        const colIndex = headerRow
          ? Array.from(headerRow.children).indexOf(headerCell as HTMLElement)
          : -1
        if (headerRow && colIndex >= 0) {
          let nextRow = headerRow.nextElementSibling
          while (nextRow) {
            const statsCell = nextRow.children[colIndex]
            if (statsCell) {
              const t = statsCell.textContent || ''
              if (t.includes('Times Sold') || t.includes('Total Qty')) {
                sections[key] = t
                break
              }
            }
            nextRow = nextRow.nextElementSibling
          }
        }
      }

      return sections
    })

    const guide: PriceGuide = {}
    if (rawSections.newText) guide.newSales = parsePriceGuideText(rawSections.newText)
    if (rawSections.usedText) guide.usedSales = parsePriceGuideText(rawSections.usedText)

    if (guide.newSales || guide.usedSales) {
      const n = guide.newSales
      const u = guide.usedSales
      logger.info(
        `[bricklink-cmf] Price ${itemNumber}: New=${n ? `$${n.avgPrice.toFixed(2)}` : 'n/a'} Used=${u ? `$${u.avgPrice.toFixed(2)}` : 'n/a'}`,
      )
    }

    return guide
  } catch (error) {
    logger.warn(`[bricklink-cmf] Price guide failed for ${itemNumber}`, { error })
    return {}
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Parts inventory scraping (with sub-minifig expansion)
// ─────────────────────────────────────────────────────────────────────────

async function scrapePartsInventory(
  page: Page,
  itemNumber: string,
  itemType: 'M' | 'S',
): Promise<MinifigPart[]> {
  const url = `https://www.bricklink.com/catalogItemInv.asp?${itemType}=${itemNumber}`
  try {
    await navigateWithRetry(page, url, { timeout: 30000 })
    await waitForAgeGate(page)
    await page.waitForTimeout(randomDelay())

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

        // Category header rows
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

        if (cells.length < 4) continue

        const partLink =
          row.querySelector('a[href*="catalogItem.asp"][href*="P="]') ||
          row.querySelector('a[href*="catalogitem.page?P="]')
        if (!partLink) continue

        const href = (partLink as HTMLAnchorElement).href
        const partMatch = href.match(/[?&]P=([^&]+)/)
        if (!partMatch) continue

        const partNumber = partMatch[1]
        const colorIdMatch = href.match(/[?&]idColor=(\d+)/)
        const colorId = colorIdMatch ? parseInt(colorIdMatch[1], 10) : undefined
        const bricklinkUrl = `https://www.bricklink.com/v2/catalog/catalogitem.page?P=${partNumber}${colorId ? `&idColor=${colorId}` : ''}`

        const img = row.querySelector('img[src*="img.bricklink.com"]') as HTMLImageElement | null
        const imageUrl = img?.src || undefined

        const descCell = cells.length >= 4 ? cells[3] : null
        const boldEl = descCell?.querySelector('b')
        const fullName = boldEl?.textContent?.trim() || partLink.textContent?.trim() || ''

        let category: string | undefined
        const categoryLinks = descCell?.querySelectorAll('font.fv a') || []
        if (categoryLinks.length > 0) {
          const lastCatLink = categoryLinks[categoryLinks.length - 1]
          category = lastCatLink?.textContent?.trim() || undefined
        }

        const hasInventory = !!row.querySelector('a[href*="catalogItemInv.asp"]')

        // Extract color
        let color = ''
        if (colorIdMatch) {
          const colorLink = row.querySelector('a[href*="colorID="]')
          if (colorLink) {
            color = colorLink.textContent?.trim() || ''
          }
        }
        if (!color && fullName) {
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

        // Quantity
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

    // For set inventories, find minifig sub-items (M=) to expand
    const subMinifigNumbers: string[] = []
    if (itemType === 'S') {
      const subItems = await page.evaluate(() => {
        const minifigLinks = document.querySelectorAll(
          'a[href*="catalogItem.asp"][href*="M="], a[href*="catalogitem.page?M="]',
        )
        const numbers: string[] = []
        for (const link of minifigLinks) {
          const href = (link as HTMLAnchorElement).href
          const match = href.match(/[?&]M=([^&]+)/)
          if (match && !numbers.includes(match[1])) {
            numbers.push(match[1])
          }
        }
        return numbers
      })
      subMinifigNumbers.push(...subItems)
    }

    logger.info(`[bricklink-cmf] Parts: ${parts.length} direct`, {
      itemNumber,
      subMinifigs: subMinifigNumbers,
    })

    // Expand minifig sub-inventories (CMF set → minifig → head/torso/legs/accessories)
    for (const minifigNum of subMinifigNumbers) {
      logger.info(`[bricklink-cmf] Expanding sub-inventory: ${minifigNum}`)
      const subParts = await scrapePartsInventory(page, minifigNum, 'M')
      parts.push(...subParts)
      await page.waitForTimeout(randomDelay())
    }

    logger.info(`[bricklink-cmf] Parts total: ${parts.length} (after expansion)`, { itemNumber })
    return parts
  } catch (error) {
    logger.warn(`[bricklink-cmf] Parts inventory failed for ${itemNumber}`, { error })
    return []
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Image download/upload
// ─────────────────────────────────────────────────────────────────────────

async function downloadAndUploadImage(
  imageUrl: string,
  itemNumber: string,
  fileName: string,
): Promise<string> {
  const fullUrl = imageUrl.startsWith('//') ? `https:${imageUrl}` : imageUrl
  const urlPath = new URL(fullUrl).pathname
  const ext = urlPath.match(/\.(png|jpg|jpeg|webp|gif)$/i)?.[0] || '.jpg'
  const safeName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const s3Key = `minifigs/${itemNumber}/images/${safeName}${ext}`

  const res = await fetch(fullUrl)
  if (!res.ok) {
    logger.warn(`[bricklink-cmf] Failed to download ${imageUrl}: ${res.status}`)
    return ''
  }
  const buffer = Buffer.from(await res.arrayBuffer())

  await uploadToS3({
    key: s3Key,
    body: buffer,
    contentType: ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg',
    bucket: S3_BUCKET,
  })
  return s3Key
}

// ─────────────────────────────────────────────────────────────────────────
// Main CMF processor
// ─────────────────────────────────────────────────────────────────────────

/**
 * Check if a CMF item name indicates it's a box/bundle/random set, not an individual minifig.
 * These should be skipped during scraping.
 */
function isCmfBundleListing(name: string): boolean {
  return (
    /\(Complete Random Set of/i.test(name) ||
    /\(Complete Series of/i.test(name) ||
    /\(Box of/i.test(name)
  )
}

export async function processBricklinkCmf(job: BricklinkMinifigJob): Promise<CmfScrapeResult> {
  const { itemNumber, wishlist } = job
  const page = await getSharedPage()

  try {
    await initializeBucket(S3_BUCKET)

    // ── 1. Detail page (as set: S=col25-13) ────────────────────────────

    const detailUrl = `https://www.bricklink.com/v2/catalog/catalogitem.page?S=${itemNumber}#T=S`
    logger.info(`[bricklink-cmf] Scraping CMF ${itemNumber}`, { detailUrl })

    await navigateWithRetry(page, detailUrl, { timeout: 60000 })
    await waitForAgeGate(page)
    await page.waitForTimeout(randomDelay())

    const rateLimitCheck = await checkRateLimited(page)
    if (rateLimitCheck.rateLimited) {
      return {
        success: false,
        rateLimited: true,
        resetHint: rateLimitCheck.resetHint,
        itemNumber,
      }
    }

    try {
      await page.waitForSelector('img.pciImageMain', { timeout: 15000 })
    } catch {
      await page.waitForSelector('img.pciImageMain', { timeout: 60000 })
    }

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

      document.querySelectorAll('a[href*="catalogItemInv.asp"][href*="S="]').forEach(link => {
        const text = (link.textContent || '').trim()
        const match = text.match(/(\d+)\s+(?:Parts|Items)/)
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

    // Skip box/bundle/random set listings — these aren't individual CMF minifigs
    const displayName = basicInfo.description || basicInfo.name
    if (isCmfBundleListing(displayName)) {
      logger.info(`[bricklink-cmf] Skipping bundle listing: ${displayName}`, { itemNumber })
      return { success: true, itemNumber }
    }

    // ── 2. Parts inventory with sub-minifig expansion ──────────────────

    const parts = await scrapePartsInventory(page, itemNumber, 'S')

    // ── 3. Per-part price guides ───────────────────────────────────────

    if (parts.length > 0) {
      logger.info(`[bricklink-cmf] Scraping price guides for ${parts.length} parts`)
      for (const part of parts) {
        part.priceGuide = await scrapePriceGuide(page, 'P', part.partNumber, part.colorId)
        await page.waitForTimeout(randomDelay())
      }
    }

    // ── 4. CMF item price guide ────────────────────────────────────────

    logger.info(`[bricklink-cmf] Scraping CMF set price guide`)
    const priceGuide = await scrapePriceGuide(page, 'S', itemNumber)

    // ── 5. Images ──────────────────────────────────────────────────────

    let primaryImageUrl = basicInfo.mainImage
    try {
      if (basicInfo.mainImage) {
        const s3Key = await downloadAndUploadImage(basicInfo.mainImage, itemNumber, 'main')
        if (s3Key) {
          primaryImageUrl = `${S3_ENDPOINT}/${S3_BUCKET}/${s3Key}`
        }
      }

      for (let i = 0; i < basicInfo.thumbnails.length; i++) {
        await downloadAndUploadImage(basicInfo.thumbnails[i], itemNumber, `thumb_${i + 1}`)
      }

      for (const part of parts) {
        if (part.imageUrl) {
          const partFileName = `part_${part.partNumber}${part.colorId ? `_c${part.colorId}` : ''}`
          const s3Key = await downloadAndUploadImage(part.imageUrl, itemNumber, partFileName)
          if (s3Key) {
            part.imageUrl = `${S3_ENDPOINT}/${S3_BUCKET}/${s3Key}`
          }
        }
      }
    } catch (error) {
      logger.warn(`[bricklink-cmf] Image download failed, using original URLs`, { error })
    }

    // ── 6. Extract CMF series from category ────────────────────────────

    let cmfSeries: string | undefined
    if (basicInfo.category) {
      const seriesMatch = basicInfo.category.match(/Series\s+\d+/i)
      cmfSeries = seriesMatch ? seriesMatch[0] : basicInfo.category
    }

    // ── 7. Save variant via API ────────────────────────────────────────

    const variantPayload = {
      legoNumber: itemNumber,
      name: basicInfo.description || basicInfo.name,
      theme: basicInfo.category || undefined,
      year: basicInfo.yearReleased ? parseInt(basicInfo.yearReleased, 10) : undefined,
      cmfSeries,
      imageUrl: primaryImageUrl,
      weight: basicInfo.weight || undefined,
      dimensions: basicInfo.dimensions || undefined,
      partsCount: basicInfo.partsCount || undefined,
      bricklinkUrl: `https://www.bricklink.com/v2/catalog/catalogitem.page?S=${itemNumber}`,
      priceGuide,
      parts: parts.length > 0 ? parts : undefined,
    }

    const variantRes = await fetch(`${API_BASE}/minifigs/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(variantPayload),
    })

    if (!variantRes.ok) {
      const body = await variantRes.text()
      return {
        success: false,
        error: `Failed to save variant: ${variantRes.status} — ${body}`,
        itemNumber,
      }
    }

    const variant = await variantRes.json()

    // ── 8. Check/create instance ───────────────────────────────────────

    const existingRes = await fetch(
      `${API_BASE}/minifigs?limit=1&search=${encodeURIComponent(itemNumber)}`,
    )
    const existingData = existingRes.ok ? await existingRes.json() : null
    const existingInstances = existingData?.items ?? existingData?.data ?? []
    const alreadyExists = existingInstances.some(
      (inst: { variantId: string }) => inst.variantId === variant.id,
    )

    let instanceId: string | undefined

    if (!alreadyExists) {
      const instancePayload = {
        displayName: basicInfo.description || basicInfo.name,
        variantId: variant.id,
        status: wishlist ? 'wanted' : 'none',
        sourceType: 'cmf_pack',
        imageUrl: primaryImageUrl,
      }

      const instanceRes = await fetch(`${API_BASE}/minifigs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(instancePayload),
      })

      if (instanceRes.ok) {
        const instance = await instanceRes.json()
        instanceId = instance.id
      }
    }

    logger.info(`[bricklink-cmf] Completed ${itemNumber}`, {
      variantId: variant.id,
      instanceId,
      cmfSeries,
      partsCount: parts.length,
      hasPriceGuide: !!(priceGuide.newSales || priceGuide.usedSales),
    })

    return {
      success: true,
      variantId: variant.id,
      instanceId,
      itemNumber,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error(`[bricklink-cmf] Failed ${itemNumber}`, { error: msg })
    return { success: false, error: msg, itemNumber }
  } finally {
    await resetPage()
  }
}
