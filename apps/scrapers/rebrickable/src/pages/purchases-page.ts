import { logger } from '@repo/logger'
import { BasePage } from './base-page.js'
import { waitForPagination } from '../scraper/human-behavior.js'
import { ScrapedInstructionListItemSchema } from '../__types__/index.js'
import type { ScrapedInstructionListItem } from '../__types__/index.js'

const PURCHASES_BASE = 'https://rebrickable.com'

export class PurchasesPage extends BasePage {
  async navigate(userSlug: string): Promise<void> {
    await this.withScreenshotOnError('purchases-navigate', async () => {
      const url = `${PURCHASES_BASE}/users/${userSlug}/mocs/purchases/`
      await this.page.goto(url, { waitUntil: 'networkidle' })
      logger.info(`[purchases] Navigated to purchases page`)
      await this.screenshot('purchases-page', 'discovery')
    })
  }

  async scrapeAllInstructions(limit?: number): Promise<ScrapedInstructionListItem[]> {
    const allItems: ScrapedInstructionListItem[] = []
    let pageNum = 1

    while (true) {
      logger.info(`[purchases] Scraping page ${pageNum}`)
      const items = await this.scrapeCurrentPage()
      allItems.push(...items)

      // Stop early if we have enough for the limit
      if (limit && allItems.length >= limit) {
        logger.info(`[purchases] Collected ${allItems.length} items, limit is ${limit} — stopping pagination early`)
        break
      }

      const hasNext = await this.goToNextPage()
      if (!hasNext) break

      pageNum++
      await waitForPagination()
    }

    logger.info(`[purchases] Found ${allItems.length} purchased instructions across ${pageNum} pages`)
    return allItems
  }

  private async scrapeCurrentPage(): Promise<ScrapedInstructionListItem[]> {
    const items: ScrapedInstructionListItem[] = []

    // Each purchased MOC is a row/card on the page with a link to the MOC detail
    // The MOC links follow the pattern /mocs/MOC-{number}/...
    const rawItems = await this.page.$$eval(
      'a[href*="/mocs/MOC-"]',
      links =>
        links
          .map(link => {
            const href = link.getAttribute('href') || ''
            const text = link.textContent?.trim() || ''

            // Extract MOC number from URL
            const mocMatch = href.match(/MOC-(\d+)/)
            const mocNumber = mocMatch ? mocMatch[1] : ''

            return {
              mocNumber,
              title: text,
              url: href.startsWith('http') ? href : `https://rebrickable.com${href}`,
            }
          })
          .filter(item => item.mocNumber && item.title),
    )

    // Deduplicate by MOC number
    const seen = new Set<string>()
    for (const raw of rawItems) {
      if (seen.has(raw.mocNumber)) continue
      seen.add(raw.mocNumber)

      const parsed = ScrapedInstructionListItemSchema.safeParse(raw)
      if (parsed.success) {
        items.push(parsed.data)
      } else {
        logger.warn(`[purchases] Invalid item data for MOC-${raw.mocNumber}`, {
          errors: parsed.error.issues,
        })
      }
    }

    return items
  }

  private async goToNextPage(): Promise<boolean> {
    try {
      // Rebrickable uses <ul class="pagination-btns"> with:
      //   <li><a href="?page=N"><button>Next ></button></a></li>
      // On the last page, the Next li is absent entirely.
      // There are TWO identical pagination-btns on each page (top + bottom).
      const nextLi = await this.page.$('ul.pagination-btns li:has(a:has-text("Next"))')
      if (!nextLi) {
        logger.info('[purchases] No Next button found — last page')
        return false
      }

      // Check if the li is disabled
      const isDisabled = await nextLi.evaluate(el => el.classList.contains('disabled'))
      if (isDisabled) {
        logger.info('[purchases] Next button is disabled — last page')
        return false
      }

      // Guard against infinite loops: ensure next page > current page
      const nextHref = await nextLi.$eval('a', el => el.getAttribute('href') || '')
      const currentUrl = this.page.url()
      const currentPage = currentUrl.match(/[?&]page=(\d+)/)?.[1] || '1'
      const nextPage = nextHref.match(/page=(\d+)/)?.[1]

      if (nextPage && parseInt(nextPage) <= parseInt(currentPage)) {
        logger.info(`[purchases] Next page ${nextPage} <= current ${currentPage} — stopping to prevent loop`)
        return false
      }

      await nextLi.$eval('a', el => (el as HTMLAnchorElement).click())
      await this.page.waitForLoadState('networkidle', { timeout: 15000 })
      return true
    } catch (error) {
      logger.warn('[purchases] goToNextPage error', {
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }
}
