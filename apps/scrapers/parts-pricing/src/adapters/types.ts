import { z } from 'zod'

/**
 * Marketplace Adapter Interface
 *
 * Each marketplace source implements this interface.
 * Adapters handle scraping, parsing, and normalizing data from their source.
 */

export const ScrapedListingSchema = z.object({
  source: z.string(),
  storeId: z.string().nullable(),
  storeName: z.string().nullable(),
  partNumber: z.string(),
  colorRaw: z.string().nullable(),
  condition: z.enum(['new', 'used']),
  priceOriginal: z.string(),
  currencyOriginal: z.string(),
  quantityAvailable: z.number().int().positive(),
  minBuy: z.string().nullable(),
})

export type ScrapedListing = z.infer<typeof ScrapedListingSchema>

export interface MarketplaceAdapter {
  /** Source identifier (e.g., 'bricklink', 'brickowl', 'webrick') */
  source: string

  /**
   * Fetch listings for a specific part + color combination.
   * Returns scraped listings with prices in original currency.
   */
  fetchPartListings(partNumber: string, color: string): Promise<ScrapedListing[]>

  /**
   * Check if the adapter is available (e.g., site is reachable)
   */
  isAvailable(): Promise<boolean>
}
