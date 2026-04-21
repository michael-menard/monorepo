import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────
// Parts Needed
// ─────────────────────────────────────────────────────────────────────────

export const MocSourceSchema = z.object({
  mocId: z.string().uuid(),
  mocTitle: z.string(),
  quantity: z.number().int(),
})

export const AggregatedPartSchema = z.object({
  partNumber: z.string(),
  partName: z.string(),
  color: z.string(),
  quantityNeeded: z.number().int(),
  quantityOwned: z.number().int(),
  quantityToBuy: z.number().int(),
  mocSources: z.array(MocSourceSchema),
})

export type AggregatedPart = z.infer<typeof AggregatedPartSchema>

export const PartsNeededResponseSchema = z.object({
  parts: z.array(AggregatedPartSchema),
})

export type PartsNeededResponse = z.infer<typeof PartsNeededResponseSchema>

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

export const InventoryResponseSchema = z.object({
  inventory: z.array(InventoryPartSchema),
})

export type InventoryResponse = z.infer<typeof InventoryResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────

export const CacheFreshnessSchema = z.object({
  totalCached: z.number().int(),
  staleCount: z.number().int(),
  oldestFetch: z.string().datetime().nullable(),
})

export const ProcurementSummarySchema = z.object({
  mocsSelected: z.number().int(),
  mocsMissingParts: z.number().int(),
  totalPartsNeeded: z.number().int(),
  uniquePartsNeeded: z.number().int(),
  partsInInventory: z.number().int(),
  partsToBuy: z.number().int(),
  estimatedCostUsd: z.string().nullable(),
  pricingCoverage: z.number(),
  cacheFreshness: CacheFreshnessSchema,
})

export type ProcurementSummary = z.infer<typeof ProcurementSummarySchema>

// ─────────────────────────────────────────────────────────────────────────
// Priced Parts
// ─────────────────────────────────────────────────────────────────────────

export const PricedPartSchema = AggregatedPartSchema.extend({
  cheapestPriceUsd: z.string().nullable(),
  cheapestSource: z.string().nullable(),
  cheapestStoreName: z.string().nullable(),
  listingCount: z.number().int(),
  status: z.enum(['priced', 'unavailable', 'not_fetched']),
})

export type PricedPart = z.infer<typeof PricedPartSchema>

export const PricedPartsResponseSchema = z.object({
  parts: z.array(PricedPartSchema),
})

export type PricedPartsResponse = z.infer<typeof PricedPartsResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// Fetch Prices
// ─────────────────────────────────────────────────────────────────────────

export const FetchPricesResponseSchema = z.object({
  jobId: z.string().uuid(),
  partsCount: z.number().int(),
  message: z.string(),
})

export type FetchPricesResponse = z.infer<typeof FetchPricesResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// Want to Build
// ─────────────────────────────────────────────────────────────────────────

export const WantToBuildResponseSchema = z.object({
  success: z.boolean(),
  wantToBuild: z.boolean(),
})

export type WantToBuildResponse = z.infer<typeof WantToBuildResponseSchema>
