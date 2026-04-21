import { logger } from '@repo/logger'
import type { MarketplaceAdapter, ScrapedListing } from './types.js'

/**
 * BrickLink Marketplace Adapter
 *
 * Scrapes part pricing from BrickLink catalog pages.
 * BrickLink URLs follow the pattern:
 *   https://www.bricklink.com/v2/catalog/catalogitem.page?P={partNumber}
 *   https://www.bricklink.com/v2/catalog/catalogitem.page?P={partNumber}#T=S&C={colorId}&O={"ss":"US","rpp":"500","iconly":0}
 *
 * Note: BrickLink uses its own color ID system, not LEGO color names.
 * Color mapping needs to be resolved (see plan open question #2).
 */
export class BrickLinkAdapter implements MarketplaceAdapter {
  source = 'bricklink'

  private baseUrl = 'https://www.bricklink.com'

  async fetchPartListings(partNumber: string, color: string): Promise<ScrapedListing[]> {
    logger.info('BrickLink: fetching listings', { partNumber, color })

    // TODO: Implement actual scraping with Puppeteer/Playwright
    // This is the adapter structure — scraping logic will be added
    // when browser automation is set up.
    //
    // Implementation plan:
    // 1. Navigate to BrickLink catalog page for the part
    // 2. Filter by color (requires BrickLink color ID mapping)
    // 3. Navigate to "Price Guide" or "For Sale" tab
    // 4. Parse store listings: store name, price, currency, quantity, condition
    // 5. Return normalized ScrapedListing objects
    //
    // Example URL for price guide:
    //   https://www.bricklink.com/v2/catalog/catalogitem.page?P=3001&C=5
    //   (P=part number, C=color ID)

    logger.warn('BrickLink adapter not yet implemented — returning empty results', {
      partNumber,
      color,
    })

    return []
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/main.page`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }
}
