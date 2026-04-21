import { logger } from '@repo/logger'
import { BasePage } from './base-page.js'
import { waitForPagination } from '../scraper/human-behavior.js'
import { ScrapedInstructionListItemSchema } from '../__types__/index.js'
import type { ScrapedInstructionListItem } from '../__types__/index.js'

const REBRICKABLE_BASE = 'https://rebrickable.com'

export class LikedMocsPage extends BasePage {
  async navigate(userSlug: string): Promise<void> {
    await this.withScreenshotOnError('liked-mocs-navigate', async () => {
      const url = `${REBRICKABLE_BASE}/users/${userSlug}/likedmocs/`
      await this.page.goto(url, { waitUntil: 'networkidle' })
      logger.info(`[liked-mocs] Navigated to liked MOCs page`)
      await this.screenshot('liked-mocs-page', 'discovery')
    })
  }

  async scrapeAllInstructions(limit?: number): Promise<ScrapedInstructionListItem[]> {
    const allItems: ScrapedInstructionListItem[] = []
    let pageNum = 1

    while (true) {
      logger.info(`[liked-mocs] Scraping page ${pageNum}`)
      const items = await this.scrapeCurrentPage()
      allItems.push(...items)

      if (limit && allItems.length >= limit) {
        logger.info(
          `[liked-mocs] Collected ${allItems.length} items, limit is ${limit} — stopping pagination early`,
        )
        break
      }

      const hasNext = await this.goToNextPage()
      if (!hasNext) break

      pageNum++
      await waitForPagination()
    }

    logger.info(
      `[liked-mocs] Found ${allItems.length} free liked instructions across ${pageNum} pages`,
    )
    return allItems
  }

  private async scrapeCurrentPage(): Promise<ScrapedInstructionListItem[]> {
    const items: ScrapedInstructionListItem[] = []

    // Wait for MOC containers to be present before evaluating
    await this.page.waitForSelector('.set-col-main', { timeout: 10000 }).catch(() => {
      logger.warn('[liked-mocs] No .set-col-main elements found on page')
    })

    // Each MOC is a .set-tn container. The .js-sort-data div holds data attributes.
    // Premium MOCs have a <span class="label label-dark-blue" title="Premium MOC"> inside .js-set-actions.
    // We skip disabled MOCs (they have <small class="text-right trunc">(disabled)</small>).
    const rawItems = await this.page.$$eval('.set-col-main', (containers: Element[]) =>
      containers
        .map(container => {
          // Skip disabled MOCs
          const disabledEl = container.querySelector('small.trunc')
          if (disabledEl?.textContent?.includes('(disabled)')) return null

          // Skip Premium MOCs: .js-set-actions contains .label-dark-blue
          const actions = container.querySelector('.js-set-actions')
          if (actions?.querySelector('.label-dark-blue')) return null

          // MOC number from data-variant on .js-sort-data
          const sortData = container.querySelector('.js-sort-data')
          const mocNumber = sortData?.getAttribute('data-variant') || ''
          if (!mocNumber) return null

          const title = sortData?.getAttribute('data-set_name') || ''
          const partsStr = sortData?.getAttribute('data-num_parts') || '0'

          // URL from the anchor wrapping the thumbnail
          const anchor = container.querySelector('a[href*="/mocs/MOC-"]')
          const href = anchor?.getAttribute('href') || ''
          const url = href.startsWith('http') ? href : `${REBRICKABLE_BASE}${href}`

          // Author from the "By <a>" link
          const authorLink = container.querySelector('.clearfix.trunc a[href*="/users/"]')
          const author = authorLink?.textContent?.trim() || ''

          return { mocNumber, title, url, author, partsCount: parseInt(partsStr, 10) || 0 }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null && !!item.mocNumber),
    )

    // Deduplicate by MOC number
    const seen = new Set<string>()
    for (const raw of rawItems) {
      if (seen.has(raw.mocNumber)) continue
      seen.add(raw.mocNumber)

      const parsed = ScrapedInstructionListItemSchema.safeParse({
        mocNumber: raw.mocNumber,
        title: raw.title || `MOC-${raw.mocNumber}`,
        url: raw.url || `${REBRICKABLE_BASE}/mocs/MOC-${raw.mocNumber}/`,
        author: raw.author,
      })

      if (parsed.success) {
        items.push(parsed.data)
      } else {
        logger.warn(`[liked-mocs] Invalid item data for MOC-${raw.mocNumber}`, {
          errors: parsed.error.issues,
        })
      }
    }

    logger.info(`[liked-mocs] Found ${items.length} free MOCs on this page`)
    return items
  }

  private async goToNextPage(): Promise<boolean> {
    try {
      const nextLi = await this.page.$('ul.pagination-btns li:has(a:has-text("Next"))')
      if (!nextLi) {
        logger.info('[liked-mocs] No Next button found — last page')
        return false
      }

      const isDisabled = await nextLi.evaluate(el => el.classList.contains('disabled'))
      if (isDisabled) {
        logger.info('[liked-mocs] Next button is disabled — last page')
        return false
      }

      // Guard against infinite loops
      const nextHref = await nextLi.$eval('a', el => el.getAttribute('href') || '')
      const currentUrl = this.page.url()
      const currentPage = currentUrl.match(/[?&]page=(\d+)/)?.[1] || '1'
      const nextPage = nextHref.match(/page=(\d+)/)?.[1]

      if (nextPage && parseInt(nextPage) <= parseInt(currentPage)) {
        logger.info(
          `[liked-mocs] Next page ${nextPage} <= current ${currentPage} — stopping to prevent loop`,
        )
        return false
      }

      await nextLi.$eval('a', el => (el as HTMLAnchorElement).click())
      await this.page.waitForLoadState('networkidle', { timeout: 15000 })
      return true
    } catch (error) {
      logger.warn('[liked-mocs] goToNextPage error', {
        error: error instanceof Error ? error.message : String(error),
      })
      return false
    }
  }
}
