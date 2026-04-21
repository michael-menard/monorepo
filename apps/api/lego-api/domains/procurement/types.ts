import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────
// Parts Needed
// ─────────────────────────────────────────────────────────────────────────

export const AggregatedPartSchema = z.object({
  partNumber: z.string(),
  partName: z.string(),
  color: z.string(),
  quantityNeeded: z.number().int(),
  quantityOwned: z.number().int(),
  quantityToBuy: z.number().int(),
  mocSources: z.array(
    z.object({
      mocId: z.string().uuid(),
      mocTitle: z.string(),
      quantity: z.number().int(),
    }),
  ),
})

export type AggregatedPart = z.infer<typeof AggregatedPartSchema>

// ─────────────────────────────────────────────────────────────────────────
// Inventory
// ─────────────────────────────────────────────────────────────────────────

export const InventoryPartSchema = z.object({
  partNumber: z.string(),
  color: z.string(),
  quantity: z.number().int(),
  source: z.string().nullable(),
  sourceId: z.string().uuid().nullable(),
})

export type InventoryPart = z.infer<typeof InventoryPartSchema>

// ─────────────────────────────────────────────────────────────────────────
// Marketplace Pricing
// ─────────────────────────────────────────────────────────────────────────

export const MarketplaceListingSchema = z.object({
  id: z.string().uuid(),
  source: z.string(),
  storeId: z.string().nullable(),
  storeName: z.string().nullable(),
  partNumber: z.string(),
  colorRaw: z.string().nullable(),
  condition: z.string(),
  priceOriginal: z.string(),
  currencyOriginal: z.string(),
  priceUsd: z.string(),
  quantityAvailable: z.number().int(),
  fetchedAt: z.date(),
  expiresAt: z.date(),
})

export type MarketplaceListing = z.infer<typeof MarketplaceListingSchema>

// ─────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────

export const ProcurementSummarySchema = z.object({
  mocsSelected: z.number().int(),
  mocsMissingParts: z.number().int(),
  totalPartsNeeded: z.number().int(),
  uniquePartsNeeded: z.number().int(),
  partsInInventory: z.number().int(),
  partsToBuy: z.number().int(),
  estimatedCostUsd: z.string().nullable(),
  pricingCoverage: z.number(), // 0-1, fraction of parts with pricing
  cacheFreshness: z.object({
    totalCached: z.number().int(),
    staleCount: z.number().int(),
    oldestFetch: z.string().datetime().nullable(),
  }),
})

export type ProcurementSummary = z.infer<typeof ProcurementSummarySchema>

// ─────────────────────────────────────────────────────────────────────────
// Priced Part (parts-needed + cheapest price)
// ─────────────────────────────────────────────────────────────────────────

export const PricedPartSchema = AggregatedPartSchema.extend({
  cheapestPriceUsd: z.string().nullable(),
  cheapestSource: z.string().nullable(),
  cheapestStoreName: z.string().nullable(),
  listingCount: z.number().int(),
  status: z.enum(['priced', 'unavailable', 'not_fetched']),
})

export type PricedPart = z.infer<typeof PricedPartSchema>

// ─────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────

export type ProcurementError =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'DB_ERROR'
  | 'NO_MOCS_SELECTED'
  | 'SCRAPER_FAILED'
