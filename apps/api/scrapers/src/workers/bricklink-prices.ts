/**
 * BrickLink Prices Worker
 *
 * Scrapes price guide data only for a minifig variant.
 * Rate-limited to 15 jobs/hour via BullMQ worker limiter.
 */

import { logger } from '@repo/logger'
import type { BricklinkPricesJob } from '../queues.js'
import {
  getSharedPage,
  resetPage,
  shutdownBrowser as shutdownPricesBrowser,
  navigateWithRetry,
  waitForAgeGate,
  checkRateLimited,
} from './shared-browser.js'

const API_BASE = process.env.LEGO_API_URL || 'http://localhost:9100'

/** Random delay between 5-8 seconds */
function randomDelay(): number {
  return Math.floor(Math.random() * 3001) + 5000
}

export { shutdownPricesBrowser }

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

export interface PriceResult {
  success: boolean
  rateLimited?: boolean
  resetHint?: string
  error?: string
  itemNumber: string
}

export async function processBricklinkPrices(job: BricklinkPricesJob): Promise<PriceResult> {
  const { itemNumber, itemType, variantId } = job
  const page = await getSharedPage()

  try {
    const url = `https://www.bricklink.com/v2/catalog/catalogitem.page?${itemType}=${itemNumber}#T=P`
    logger.info(`[bricklink-prices] Scraping price guide for ${itemType}=${itemNumber}`)

    await navigateWithRetry(page, url)

    await waitForAgeGate(page)
    await page.waitForTimeout(randomDelay())

    // Check for rate limiting
    const rateCheck = await checkRateLimited(page)
    if (rateCheck.rateLimited) {
      return {
        success: false,
        rateLimited: true,
        resetHint: rateCheck.resetHint,
        itemNumber,
      }
    }

    // Click Price Guide tab
    const priceGuideTab = page.locator('text=Price Guide').first()
    await priceGuideTab.click({ timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(randomDelay())

    // Extract price data
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

    const priceGuide: { newSales?: PriceGuideStats; usedSales?: PriceGuideStats } = {}
    if (rawSections.newText) priceGuide.newSales = parsePriceGuideText(rawSections.newText)
    if (rawSections.usedText) priceGuide.usedSales = parsePriceGuideText(rawSections.usedText)

    if (!priceGuide.newSales && !priceGuide.usedSales) {
      logger.warn(`[bricklink-prices] No price data found for ${itemNumber}`)
      return { success: true, itemNumber } // not an error, just no data
    }

    // Update variant via API
    const targetId = variantId
    if (targetId) {
      const res = await fetch(`${API_BASE}/minifigs/variants/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceGuide }),
      })

      if (!res.ok) {
        const body = await res.text()
        return {
          success: false,
          error: `Failed to update variant: ${res.status} — ${body}`,
          itemNumber,
        }
      }
    }

    logger.info(`[bricklink-prices] Updated price guide for ${itemNumber}`, {
      newAvg: priceGuide.newSales?.avgPrice,
      usedAvg: priceGuide.usedSales?.avgPrice,
    })

    return { success: true, itemNumber }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error(`[bricklink-prices] Failed ${itemNumber}`, { error: msg })
    return { success: false, error: msg, itemNumber }
  } finally {
    await resetPage()
  }
}
