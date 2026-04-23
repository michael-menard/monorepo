/**
 * BrickLink Set Worker
 *
 * Scrapes a BrickLink set catalog page for:
 * - Set metadata (year, weight, dimensions, category, image)
 * - Minifig inventory (which minifigs the set contains)
 * - Price guide (new/used market values)
 *
 * Called from the bricklink-minifig worker when itemType='S'.
 * Shares the same queue and rate limit.
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

const API_BASE = process.env.LEGO_API_URL || 'http://localhost:9100'
const S3_BUCKET = process.env.S3_BUCKET || 'lego-moc-files'
const S3_ENDPOINT = process.env.S3_ENDPOINT || 'http://localhost:9000'

/** Random delay between 5-8 seconds */
function randomDelay(): number {
  return Math.floor(Math.random() * 3001) + 5000
}

export interface SetScrapeResult {
  success: boolean
  rateLimited?: boolean
  resetHint?: string
  error?: string
  itemNumber: string
  setId?: string
  minifigs?: Array<{ minifigNumber: string; quantity: number }>
}

interface PriceGuideStats {
  timesSold: number
  totalQty: number
  minPrice: number
  avgPrice: number
  qtyAvgPrice: number
  maxPrice: number
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
 * Normalize a set number for BrickLink URLs.
 * BrickLink expects the "-1" variant suffix (e.g., "75192-1").
 */
function normalizeBricklinkSetNumber(setNumber: string): string {
  return /-\d+$/.test(setNumber) ? setNumber : `${setNumber}-1`
}

/**
 * Process a BrickLink set scrape job.
 * Scrapes detail page, minifig inventory, and price guide.
 */
export async function processBricklinkSet(job: BricklinkMinifigJob): Promise<SetScrapeResult> {
  const { itemNumber, setId } = job
  const blSetNumber = normalizeBricklinkSetNumber(itemNumber)
  const page = await getSharedPage()

  try {
    await initializeBucket(S3_BUCKET)

    // ── 1. Detail page ──────────────────────────────────────────────────

    const detailUrl = `https://www.bricklink.com/v2/catalog/catalogitem.page?S=${blSetNumber}#T=S`
    logger.info(`[bricklink-set] Scraping set ${blSetNumber}`, { detailUrl })

    await navigateWithRetry(page, detailUrl, { timeout: 60000 })
    await waitForAgeGate(page)
    await page.waitForTimeout(randomDelay())

    // Check rate limiting
    const rateCheck = await checkRateLimited(page)
    if (rateCheck.rateLimited) {
      return {
        success: false,
        rateLimited: true,
        resetHint: rateCheck.resetHint,
        itemNumber,
      }
    }

    // Wait for page to load
    try {
      await page.waitForSelector('img.pciImageMain', { timeout: 15000 })
    } catch {
      await page.waitForSelector('img.pciImageMain', { timeout: 60000 })
    }

    // Extract set metadata from detail page
    const metadata = await page.evaluate(() => {
      const mainImg = document.querySelector('img.pciImageMain')
      const mainImage = mainImg?.getAttribute('src') || ''

      let yearReleased = ''
      let weight = ''
      let dimensions = ''
      let category = ''

      document.querySelectorAll('font[face="Tahoma,Arial"]').forEach(el => {
        const text = (el.textContent || '').trim()
        const yearMatch = text.match(/Year Released:\s*(\d{4})/)
        if (yearMatch) yearReleased = yearMatch[1]
        const weightMatch = text.match(/Weight:\s*([\d.]+)g/)
        if (weightMatch) weight = weightMatch[1]
        const dimMatch = text.match(/Item Dim\.:\s*([\d.]+)\s*x\s*([\d.]+)\s*x\s*([\d.]+)\s*cm/)
        if (dimMatch) dimensions = `${dimMatch[1]}x${dimMatch[2]}x${dimMatch[3]}`
        const catMatch = text.match(/Category:\s*([^\n<]+)/)
        if (catMatch) category = catMatch[1].trim()
      })

      // Get piece count from "Item Consists Of" section
      let pieceCount = ''
      document.querySelectorAll('a').forEach(a => {
        const text = a.textContent?.trim() || ''
        const partMatch = text.match(/(\d+)\s*Parts?/)
        if (partMatch) pieceCount = partMatch[1]
      })

      const name = document.title.split(' : ')[0].trim()

      return { name, mainImage, yearReleased, weight, dimensions, category, pieceCount }
    })

    // Download and upload main image
    let primaryImageUrl = metadata.mainImage
    if (metadata.mainImage) {
      try {
        const fullUrl = metadata.mainImage.startsWith('//')
          ? `https:${metadata.mainImage}`
          : metadata.mainImage
        const res = await fetch(fullUrl)
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer())
          const s3Key = `sets/${itemNumber}/images/main.jpg`
          await uploadToS3({
            key: s3Key,
            body: buffer,
            contentType: 'image/jpeg',
            bucket: S3_BUCKET,
          })
          primaryImageUrl = `${S3_ENDPOINT}/${S3_BUCKET}/${s3Key}`
        }
      } catch (e) {
        logger.warn(`[bricklink-set] Image upload failed for ${blSetNumber}`, { error: e })
      }
    }

    // ── 2. Minifig inventory ────────────────────────────────────────────

    const invUrl = `https://www.bricklink.com/catalogItemInv.asp?S=${blSetNumber}&viewItemType=M`
    logger.info(`[bricklink-set] Scraping minifig inventory for ${blSetNumber}`)

    const minifigs: Array<{ minifigNumber: string; quantity: number }> = []

    try {
      await navigateWithRetry(page, invUrl, { timeout: 30000 })
      await waitForAgeGate(page)
      await page.waitForTimeout(randomDelay())

      const inventoryData = await page.evaluate(() => {
        const results: Array<{ minifigNumber: string; quantity: number }> = []
        const rows = document.querySelectorAll('table.ta tr')

        for (const row of rows) {
          const cells = row.querySelectorAll('td')
          if (cells.length < 4) continue

          // Look for minifig links (M= pattern)
          const links = row.querySelectorAll('a[href*="M="]')
          for (const link of links) {
            const href = (link as HTMLAnchorElement).href
            const match = href.match(/[?&]M=([^&]+)/)
            if (!match) continue

            const minifigNumber = match[1]

            // Get quantity from the Qty column (typically the second cell)
            let qty = 1
            for (const cell of cells) {
              const text = cell.textContent?.trim() || ''
              if (/^\d+$/.test(text) && parseInt(text, 10) > 0 && parseInt(text, 10) < 100) {
                qty = parseInt(text, 10)
                break
              }
            }

            // Avoid duplicates within the same set
            if (!results.some(r => r.minifigNumber === minifigNumber)) {
              results.push({ minifigNumber, quantity: qty })
            }
          }
        }

        return results
      })

      minifigs.push(...inventoryData)
      logger.info(`[bricklink-set] Found ${minifigs.length} minifigs in ${blSetNumber}`, {
        minifigs: minifigs.map(m => m.minifigNumber),
      })
    } catch (invError) {
      const msg = invError instanceof Error ? invError.message : String(invError)
      logger.warn(`[bricklink-set] Minifig inventory scrape failed for ${blSetNumber}`, {
        error: msg,
      })
      // Non-fatal — continue with metadata and price guide
    }

    // ── 3. Price guide ──────────────────────────────────────────────────

    const priceUrl = `https://www.bricklink.com/v2/catalog/catalogitem.page?S=${blSetNumber}#T=P`
    let priceGuide: { newSales?: PriceGuideStats; usedSales?: PriceGuideStats } | undefined

    try {
      await navigateWithRetry(page, priceUrl, { timeout: 30000 })
      await waitForAgeGate(page)
      await page.waitForTimeout(randomDelay())

      // Click Price Guide tab
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

      priceGuide = {}
      if (rawSections.newText) priceGuide.newSales = parsePriceGuideText(rawSections.newText)
      if (rawSections.usedText) priceGuide.usedSales = parsePriceGuideText(rawSections.usedText)

      if (!priceGuide.newSales && !priceGuide.usedSales) {
        priceGuide = undefined
        logger.warn(`[bricklink-set] No price data found for ${blSetNumber}`)
      }
    } catch (priceError) {
      const msg = priceError instanceof Error ? priceError.message : String(priceError)
      logger.warn(`[bricklink-set] Price guide scrape failed for ${blSetNumber}`, { error: msg })
      // Non-fatal
    }

    // ── 4. Save results ─────────────────────────────────────────────────

    // 4a. Insert set_minifigs join rows
    if (minifigs.length > 0) {
      for (const mf of minifigs) {
        try {
          await fetch(`${API_BASE}/sets/minifigs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              setNumber: itemNumber,
              minifigNumber: mf.minifigNumber,
              quantity: mf.quantity,
            }),
          })
        } catch (e) {
          logger.warn(
            `[bricklink-set] Failed to save set_minifig link ${itemNumber}→${mf.minifigNumber}`,
            { error: e },
          )
        }
      }
    }

    // 4b. Update the set record (fill gaps + always overwrite price guide and scraped sources)
    let resolvedSetId = setId

    // If no setId provided, look up by setNumber
    if (!resolvedSetId) {
      try {
        const lookupRes = await fetch(
          `${API_BASE}/sets?search=${encodeURIComponent(itemNumber)}&limit=1`,
        )
        if (lookupRes.ok) {
          const lookupData = await lookupRes.json()
          const items = lookupData?.items ?? lookupData?.data ?? []
          const match = items.find(
            (s: { setNumber?: string }) =>
              s.setNumber === itemNumber || s.setNumber === blSetNumber,
          )
          if (match) resolvedSetId = match.id
        }
      } catch {
        // Lookup failed — can't update set
      }
    }

    if (resolvedSetId) {
      // First get current set data to fill gaps
      let currentSet: Record<string, unknown> = {}
      try {
        const getRes = await fetch(`${API_BASE}/sets/${resolvedSetId}`)
        if (getRes.ok) currentSet = await getRes.json()
      } catch {
        // proceed with empty — will overwrite all fields
      }

      const parseDimensions = (dimStr: string) => {
        const parts = dimStr.split('x').map(s => parseFloat(s.trim()))
        if (parts.length !== 3) return undefined
        return {
          height: { cm: parts[2] },
          width: { cm: parts[0] },
          depth: { cm: parts[1] },
        }
      }

      const currentSources = (currentSet.scrapedSources as string[]) || []
      const updatedSources = currentSources.includes('bricklink')
        ? currentSources
        : [...currentSources, 'bricklink']

      const updatePayload: Record<string, unknown> = {
        lastScrapedAt: new Date().toISOString(),
        lastScrapedSource: 'bricklink',
        scrapedSources: updatedSources,
      }

      // Always overwrite price guide
      if (priceGuide) updatePayload.priceGuide = priceGuide

      // Fill gaps only
      if (!currentSet.year && metadata.yearReleased)
        updatePayload.year = parseInt(metadata.yearReleased, 10)
      if (!currentSet.weight && metadata.weight) updatePayload.weight = metadata.weight
      if (!currentSet.dimensions && metadata.dimensions)
        updatePayload.dimensions = parseDimensions(metadata.dimensions)
      if (!currentSet.theme && metadata.category) updatePayload.theme = metadata.category
      if (!currentSet.imageUrl && primaryImageUrl) updatePayload.imageUrl = primaryImageUrl
      if (!currentSet.pieceCount && metadata.pieceCount)
        updatePayload.pieceCount = parseInt(metadata.pieceCount, 10)

      const patchRes = await fetch(`${API_BASE}/sets/${resolvedSetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      })

      if (!patchRes.ok) {
        const body = await patchRes.text()
        logger.warn(`[bricklink-set] Failed to update set ${resolvedSetId}`, {
          status: patchRes.status,
          body,
        })
      }
    } else {
      logger.warn(`[bricklink-set] No matching set found for ${itemNumber} — skipping set update`)
    }

    logger.info(`[bricklink-set] Completed ${blSetNumber}`, {
      setId: resolvedSetId,
      minifigCount: minifigs.length,
      hasPriceGuide: !!priceGuide,
    })

    return {
      success: true,
      itemNumber,
      setId: resolvedSetId,
      minifigs,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error(`[bricklink-set] Failed ${blSetNumber}`, { error: msg })
    return { success: false, error: msg, itemNumber }
  } finally {
    await resetPage()
  }
}
