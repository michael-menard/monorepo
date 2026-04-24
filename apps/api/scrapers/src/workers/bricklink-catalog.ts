/**
 * BrickLink Catalog Worker
 *
 * Discovers items from a BrickLink catalog list page (multi-page).
 * Enqueues each discovered item as a child bricklink-minifig job.
 */

import { Queue } from 'bullmq'
import { logger } from '@repo/logger'
import type { BricklinkCatalogJob, BricklinkMinifigJob } from '../queues.js'
import {
  getSharedPage,
  resetPage,
  shutdownBrowser as shutdownCatalogBrowser,
  navigateWithRetry,
} from './shared-browser.js'

/** Random delay between 5-8 seconds */
function randomDelay(): number {
  return Math.floor(Math.random() * 3001) + 5000
}

export { shutdownCatalogBrowser }

export interface CatalogResult {
  success: boolean
  rateLimited?: boolean
  resetHint?: string
  error?: string
  itemsFound: number
  jobsEnqueued: number
}

export async function processBricklinkCatalog(
  job: BricklinkCatalogJob,
  minifigQueue: Queue<BricklinkMinifigJob>,
  parentJobId: string,
): Promise<CatalogResult> {
  const { catalogUrl, wishlist } = job
  const page = await getSharedPage()

  try {
    const allItems: Array<{ itemNumber: string; itemType: 'M' | 'S'; name: string }> = []
    let currentPage = 1
    let totalPages = 1
    const baseUrl = catalogUrl.split('?')[0]
    const queryParams = catalogUrl.includes('?') ? catalogUrl.split('?')[1] : ''

    while (currentPage <= totalPages) {
      const pageUrl =
        currentPage === 1
          ? catalogUrl
          : `${baseUrl}?${queryParams}${queryParams ? '&' : ''}pg=${currentPage}`

      logger.info(`[bricklink-catalog] Page ${currentPage}/${totalPages}`, { pageUrl })

      await navigateWithRetry(page, pageUrl, { waitUntil: 'networkidle', timeout: 60000 })
      await page.waitForTimeout(randomDelay())

      // Check if BrickLink redirected us away (e.g. notFound.asp)
      const currentUrl = page.url()
      if (currentUrl.includes('notFound') || !currentUrl.includes('catalogList')) {
        logger.warn(`[bricklink-catalog] Redirected away from catalog`, {
          expected: pageUrl,
          actual: currentUrl,
        })
        // Try once more — BrickLink sometimes redirects on first load
        await navigateWithRetry(page, pageUrl, { waitUntil: 'networkidle', timeout: 60000 })
        await page.waitForTimeout(randomDelay())

        const retryUrl = page.url()
        if (retryUrl.includes('notFound') || !retryUrl.includes('catalogList')) {
          return {
            success: false,
            error: `BrickLink redirected to ${retryUrl} — catalog URL may be invalid or session expired`,
            itemsFound: 0,
            jobsEnqueued: 0,
          }
        }
      }

      // Check for rate limiting
      const bodyText = await page.evaluate(() => document.body?.innerText || '').catch(() => '')
      if (
        bodyText.toLowerCase().includes('rate limit') ||
        bodyText.toLowerCase().includes('too many requests') ||
        bodyText.toLowerCase().includes('access denied')
      ) {
        const resetMatch = bodyText.match(/try again in (\d+)\s*(minutes?|hours?)/i)
        return {
          success: false,
          rateLimited: true,
          resetHint: resetMatch ? `${resetMatch[1]} ${resetMatch[2]}` : undefined,
          itemsFound: allItems.length,
          jobsEnqueued: 0,
        }
      }

      // Wait for items to appear
      await page
        .waitForSelector('a[href*="catalogitem.page?M="], a[href*="catalogitem.page?S="]', {
          timeout: 60000,
        })
        .catch(() => {})

      const pageResult = await page.evaluate(() => {
        const items: Array<{ itemNumber: string; itemType: 'M' | 'S'; name: string }> = []

        const itemLinks = document.querySelectorAll(
          'a[href*="catalogitem.page?M="], a[href*="catalogitem.page?S="]',
        )

        itemLinks.forEach(link => {
          const href = (link as HTMLAnchorElement).href
          const text = (link.textContent || '').trim()

          const match = href.match(/[?&]([MS])=([^&]+)/)
          if (!match) return

          const itemType = match[1] as 'M' | 'S'
          const itemNumber = match[2]
          if (items.some(item => item.itemNumber === itemNumber)) return

          items.push({ itemNumber, itemType, name: text })
        })

        const bodyText = document.body.textContent || ''
        const pageMatch = bodyText.match(/Page\s+(\d+)\s+of\s+(\d+)/i)
        let totalPgs = 1
        if (pageMatch) {
          totalPgs = parseInt(pageMatch[2], 10)
        }

        return { items, totalPages: totalPgs }
      })

      allItems.push(...pageResult.items)
      totalPages = pageResult.totalPages
      logger.info(
        `[bricklink-catalog] Found ${pageResult.items.length} items on page ${currentPage} (${allItems.length} total)`,
      )

      currentPage++
    }

    // Filter out CMF box/bundle/random set listings before enqueuing
    const filteredItems = allItems.filter(item => {
      if (item.itemType === 'S' && /^col/i.test(item.itemNumber)) {
        const name = item.name
        if (
          /\(Complete Random Set of/i.test(name) ||
          /\(Complete Series of/i.test(name) ||
          /\(Box of/i.test(name)
        ) {
          logger.info(`[bricklink-catalog] Skipping bundle listing: ${name}`, {
            itemNumber: item.itemNumber,
          })
          return false
        }
      }
      return true
    })

    // Enqueue each discovered item as a child job
    let enqueued = 0
    for (const item of filteredItems) {
      await minifigQueue.add(
        'scrape',
        {
          itemNumber: item.itemNumber,
          itemType: item.itemType,
          wishlist,
          parentJobId,
        },
        { jobId: `${parentJobId}-${item.itemNumber}` },
      )
      enqueued++
    }

    const skipped = allItems.length - filteredItems.length
    logger.info(`[bricklink-catalog] Enqueued ${enqueued} jobs from catalog`, {
      catalogUrl,
      skipped: skipped > 0 ? skipped : undefined,
    })

    return {
      success: true,
      itemsFound: allItems.length,
      jobsEnqueued: enqueued,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('[bricklink-catalog] Failed', { error: msg, catalogUrl })
    return { success: false, error: msg, itemsFound: 0, jobsEnqueued: 0 }
  } finally {
    await resetPage()
  }
}
