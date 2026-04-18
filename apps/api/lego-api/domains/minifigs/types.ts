import { z } from 'zod'

/**
 * Minifig Collection Domain Types
 *
 * Zod schemas for validation + type inference.
 * Covers archetypes, variants, and instances.
 */

// ─────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────
// Parts JSONB
// ─────────────────────────────────────────────────────────────────────────

export const MinifigPartSchema = z.object({
  partNumber: z.string(),
  name: z.string(),
  color: z.string(),
  quantity: z.number().int(),
  position: z.string().optional(),
})

export type MinifigPart = z.infer<typeof MinifigPartSchema>

// ─────────────────────────────────────────────────────────────────────────
// Appears In Sets JSONB
// ─────────────────────────────────────────────────────────────────────────

export const AppearsInSetSchema = z.object({
  setNumber: z.string(),
  name: z.string(),
  imageUrl: z.string().optional(),
})

export type AppearsInSet = z.infer<typeof AppearsInSetSchema>

// ─────────────────────────────────────────────────────────────────────────
// Archetype
// ─────────────────────────────────────────────────────────────────────────

export const MinifigArchetypeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type MinifigArchetype = z.infer<typeof MinifigArchetypeSchema>

// ─────────────────────────────────────────────────────────────────────────
// Variant
// ─────────────────────────────────────────────────────────────────────────

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
  parts: z.array(MinifigPartSchema).nullable(),
  appearsInSets: z.array(AppearsInSetSchema).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type MinifigVariant = z.infer<typeof MinifigVariantSchema>

// ─────────────────────────────────────────────────────────────────────────
// Instance
// ─────────────────────────────────────────────────────────────────────────

export const MinifigInstanceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  variantId: z.string().uuid().nullable(),

  // Identity
  displayName: z.string(),

  // Status / Condition
  status: MinifigStatusSchema,
  condition: MinifigConditionSchema.nullable(),

  // Source
  sourceType: MinifigSourceTypeSchema.nullable(),
  sourceSetId: z.string().uuid().nullable(),
  isCustom: z.boolean(),

  // Quantities
  quantityOwned: z.number().int(),
  quantityWanted: z.number().int(),

  // Purchase
  purchasePrice: z.string().nullable(),
  purchaseTax: z.string().nullable(),
  purchaseShipping: z.string().nullable(),
  purchaseDate: z.date().nullable(),

  // Planning
  purpose: z.string().nullable(),
  plannedUse: z.string().nullable(),
  notes: z.string().nullable(),

  // Image
  imageUrl: z.string().nullable(),

  // Ordering
  sortOrder: z.number().int().nullable(),

  // Tags (resolved from entity_tags)
  tags: z.array(z.string()).optional(),

  // Variant (joined)
  variant: MinifigVariantSchema.nullable().optional(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type MinifigInstance = z.infer<typeof MinifigInstanceSchema>

// ─────────────────────────────────────────────────────────────────────────
// Create Input
// ─────────────────────────────────────────────────────────────────────────

export const CreateMinifigInstanceInputSchema = z.object({
  displayName: z.string().min(1).max(200),
  status: MinifigStatusSchema.default('owned'),
  condition: MinifigConditionSchema.optional(),
  variantId: z.string().uuid().optional(),
  sourceType: MinifigSourceTypeSchema.optional(),
  sourceSetId: z.string().uuid().optional(),
  isCustom: z.boolean().optional(),
  quantityOwned: z.number().int().min(0).optional(),
  quantityWanted: z.number().int().min(0).optional(),
  purchasePrice: z.string().optional(),
  purchaseTax: z.string().optional(),
  purchaseShipping: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  purpose: z.string().max(5000).optional(),
  plannedUse: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export type CreateMinifigInstanceInput = z.infer<typeof CreateMinifigInstanceInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Update Input
// ─────────────────────────────────────────────────────────────────────────

export const UpdateMinifigInstanceInputSchema = z.object({
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
  purchaseDate: z.coerce.date().nullable().optional(),
  purpose: z.string().max(5000).nullable().optional(),
  plannedUse: z.string().max(5000).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export type UpdateMinifigInstanceInput = z.infer<typeof UpdateMinifigInstanceInputSchema>

export const UpdateMinifigVariantInputSchema = z.object({
  theme: z.string().max(200).nullable().optional(),
  subtheme: z.string().max(200).nullable().optional(),
})

export type UpdateMinifigVariantInput = z.infer<typeof UpdateMinifigVariantInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Query
// ─────────────────────────────────────────────────────────────────────────

export const MinifigSortFieldSchema = z.enum([
  'createdAt',
  'displayName',
  'purchasePrice',
  'purchaseDate',
  'condition',
])

export type MinifigSortField = z.infer<typeof MinifigSortFieldSchema>

export const ListMinifigsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: MinifigStatusSchema.optional(),
  condition: MinifigConditionSchema.optional(),
  sourceType: MinifigSourceTypeSchema.optional(),
  tags: z.string().optional(), // comma-separated
  sort: MinifigSortFieldSchema.default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export type ListMinifigsQuery = z.infer<typeof ListMinifigsQuerySchema>

// ─────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────

export type MinifigError = 'NOT_FOUND' | 'FORBIDDEN' | 'DB_ERROR' | 'VALIDATION_ERROR'
