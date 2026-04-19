/**
 * Minifig Collection Zod Schemas (Client-Side)
 *
 * Runtime validation and type inference for the minifig collection feature.
 */
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const MinifigStatusSchema = z.enum(['none', 'owned', 'wanted'])
export type MinifigStatus = z.infer<typeof MinifigStatusSchema>

export const MinifigConditionSchema = z.enum(['new_sealed', 'built', 'parted_out'])
export type MinifigCondition = z.infer<typeof MinifigConditionSchema>

export const MinifigSourceTypeSchema = z.enum([
  'set',
  'cmf_pack',
  'bricklink',
  'bulk_lot',
  'trade',
  'gift',
  'custom',
])
export type MinifigSourceType = z.infer<typeof MinifigSourceTypeSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Parts JSONB
// ─────────────────────────────────────────────────────────────────────────────

export const PriceGuideStatsSchema = z.object({
  timesSold: z.number(),
  totalQty: z.number(),
  minPrice: z.number(),
  avgPrice: z.number(),
  qtyAvgPrice: z.number(),
  maxPrice: z.number(),
})

export const PriceGuideSchema = z.object({
  newSales: PriceGuideStatsSchema.optional(),
  usedSales: PriceGuideStatsSchema.optional(),
})

export type PriceGuide = z.infer<typeof PriceGuideSchema>

export const MinifigPartSchema = z.object({
  partNumber: z.string(),
  name: z.string(),
  color: z.string(),
  colorId: z.number().int().optional(),
  quantity: z.number().int(),
  position: z.string().optional(),
  imageUrl: z.string().optional(),
  category: z.string().optional(),
  bricklinkUrl: z.string().optional(),
  hasInventory: z.boolean().optional(),
  priceGuide: PriceGuideSchema.optional(),
})

export type MinifigPart = z.infer<typeof MinifigPartSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Appears In Sets
// ─────────────────────────────────────────────────────────────────────────────

export const AppearsInSetSchema = z.object({
  setNumber: z.string(),
  name: z.string(),
  imageUrl: z.string().optional(),
})

export type AppearsInSet = z.infer<typeof AppearsInSetSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Archetype
// ─────────────────────────────────────────────────────────────────────────────

export const MinifigArchetypeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type MinifigArchetype = z.infer<typeof MinifigArchetypeSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Variant
// ─────────────────────────────────────────────────────────────────────────────

export const MinifigVariantSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  archetypeId: z.string().uuid().nullable(),
  name: z.string().nullable(),
  legoNumber: z.string().nullable(),
  theme: z.string().nullable(),
  subtheme: z.string().nullable(),
  year: z.number().int().nullable(),
  cmfSeries: z.string().nullable(),
  imageUrl: z.string().nullable(),
  weight: z.string().nullable(),
  dimensions: z.string().nullable(),
  partsCount: z.number().int().nullable(),
  bricklinkUrl: z.string().nullable().optional(),
  priceGuide: PriceGuideSchema.nullable().optional(),
  parts: z.array(MinifigPartSchema).nullable(),
  appearsInSets: z.array(AppearsInSetSchema).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type MinifigVariant = z.infer<typeof MinifigVariantSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Instance
// ─────────────────────────────────────────────────────────────────────────────

export const MinifigInstanceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  variantId: z.string().uuid().nullable(),
  displayName: z.string(),
  status: MinifigStatusSchema,
  condition: MinifigConditionSchema.nullable(),
  sourceType: MinifigSourceTypeSchema.nullable(),
  sourceSetId: z.string().uuid().nullable(),
  isCustom: z.boolean(),
  quantityOwned: z.number().int().default(0),
  quantityWanted: z.number().int().default(0),
  purchasePrice: z.string().nullable(),
  purchaseTax: z.string().nullable(),
  purchaseShipping: z.string().nullable(),
  purchaseDate: z.string().datetime().nullable(),
  purpose: z.string().nullable(),
  plannedUse: z.string().nullable(),
  notes: z.string().nullable(),
  imageUrl: z.string().nullable(),
  sortOrder: z.number().int().nullable(),
  tags: z.array(z.string()).optional(),
  variant: MinifigVariantSchema.nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type MinifigInstance = z.infer<typeof MinifigInstanceSchema>

// ─────────────────────────────────────────────────────────────────────────────
// List Response
// ─────────────────────────────────────────────────────────────────────────────

export const MinifigListPaginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
})

export type MinifigListPagination = z.infer<typeof MinifigListPaginationSchema>

export const MinifigListResponseSchema = z.object({
  items: z.array(MinifigInstanceSchema),
  pagination: MinifigListPaginationSchema,
})

export type MinifigListResponse = z.infer<typeof MinifigListResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Query
// ─────────────────────────────────────────────────────────────────────────────

export const MinifigSortFieldSchema = z.enum([
  'createdAt',
  'displayName',
  'purchasePrice',
  'purchaseDate',
  'condition',
])

export type MinifigSortField = z.infer<typeof MinifigSortFieldSchema>

export const MinifigListQuerySchema = z.object({
  search: z.string().optional(),
  status: MinifigStatusSchema.optional(),
  condition: MinifigConditionSchema.optional(),
  sourceType: MinifigSourceTypeSchema.optional(),
  tags: z.array(z.string()).optional(),
  sort: MinifigSortFieldSchema.default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type MinifigListQuery = z.infer<typeof MinifigListQuerySchema>

// ─────────────────────────────────────────────────────────────────────────────
// Update Input
// ─────────────────────────────────────────────────────────────────────────────

export const UpdateMinifigInstanceSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  status: MinifigStatusSchema.optional(),
  condition: MinifigConditionSchema.nullable().optional(),
  variantId: z.string().uuid().nullable().optional(),
  sourceType: MinifigSourceTypeSchema.nullable().optional(),
  sourceSetId: z.string().uuid().nullable().optional(),
  isCustom: z.boolean().optional(),
  quantityOwned: z.number().int().min(0).optional(),
  quantityWanted: z.number().int().min(0).optional(),
  purchasePrice: z.string().nullable().optional(),
  purchaseTax: z.string().nullable().optional(),
  purchaseShipping: z.string().nullable().optional(),
  purchaseDate: z.string().datetime().nullable().optional(),
  purpose: z.string().max(5000).nullable().optional(),
  plannedUse: z.string().max(5000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export type UpdateMinifigInstanceInput = z.infer<typeof UpdateMinifigInstanceSchema>
