import { z } from 'zod'

/**
 * Unified Sets Domain Types
 *
 * Zod schemas for validation + type inference.
 * Covers both wishlist (status='wanted') and collection (status='owned') items.
 */

// ─────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────

export const SetStatusSchema = z.enum(['wanted', 'owned'])
export type SetStatus = z.infer<typeof SetStatusSchema>

export const ConditionSchema = z.enum(['new', 'used'])
export type Condition = z.infer<typeof ConditionSchema>

export const CompletenessSchema = z.enum(['sealed', 'complete', 'incomplete'])
export type Completeness = z.infer<typeof CompletenessSchema>

export const BuildStatusSchema = z.enum(['not_started', 'in_progress', 'completed', 'parted_out'])
export type BuildStatus = z.infer<typeof BuildStatusSchema>

export const AvailabilityStatusSchema = z.enum(['available', 'retiring_soon', 'retired'])
export type AvailabilityStatus = z.infer<typeof AvailabilityStatusSchema>

// ─────────────────────────────────────────────────────────────────────────
// Image Variants (WISH-2016)
// ─────────────────────────────────────────────────────────────────────────

export const ImageVariantMetadataSchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().positive(),
  format: z.enum(['jpeg', 'webp', 'png']),
  watermarked: z.boolean().optional(),
})

export const ImageVariantsSchema = z.object({
  original: ImageVariantMetadataSchema.optional(),
  thumbnail: ImageVariantMetadataSchema.optional(),
  medium: ImageVariantMetadataSchema.optional(),
  large: ImageVariantMetadataSchema.optional(),
  processingStatus: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
  processedAt: z.string().datetime().optional(),
  error: z.string().optional(),
})

export type ImageVariants = z.infer<typeof ImageVariantsSchema>

// ─────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────

export const StoreSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  url: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.date(),
})

export type Store = z.infer<typeof StoreSchema>

// ─────────────────────────────────────────────────────────────────────────
// Set — unified (replaces WishlistItem + old Set)
// ─────────────────────────────────────────────────────────────────────────

export const SetSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),

  // Lifecycle
  status: SetStatusSchema,
  statusChangedAt: z.date().nullable(),

  // Identity
  title: z.string(),
  setNumber: z.string().nullable(),
  sourceUrl: z.string().nullable(),

  // Store
  storeId: z.string().uuid().nullable(),
  storeName: z.string().nullable().optional(), // joined from stores table

  // Physical
  pieceCount: z.number().int().nullable(),
  brand: z.string().nullable(),
  year: z.number().int().nullable(),
  releaseDate: z.date().nullable(),
  retireDate: z.date().nullable(),
  notes: z.string().nullable(),

  // Condition
  condition: ConditionSchema.nullable(),
  completeness: CompletenessSchema.nullable(),

  // Build
  buildStatus: BuildStatusSchema.nullable(),

  // Purchase
  purchasePrice: z.string().nullable(),
  purchaseTax: z.string().nullable(),
  purchaseShipping: z.string().nullable(),
  purchaseDate: z.date().nullable(),
  quantity: z.number().int(),

  // Wishlist-specific
  priority: z.number().int().nullable(),
  sortOrder: z.number().int().nullable(),

  // Images (legacy)
  imageUrl: z.string().nullable(),
  imageVariants: ImageVariantsSchema.nullable(),

  // Tags (resolved from entity_tags)
  tags: z.array(z.string()).optional(),

  // Product links
  productLinks: z
    .array(
      z.object({
        label: z.string(),
        url: z.string(),
        source: z.enum(['lego.com', 'rebrickable', 'bricklink', 'manual']),
        addedAt: z.string(),
      }),
    )
    .optional(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Set = z.infer<typeof SetSchema>

// ─────────────────────────────────────────────────────────────────────────
// Create Input
// ─────────────────────────────────────────────────────────────────────────

export const CreateSetInputSchema = z.object({
  status: SetStatusSchema.default('wanted'),
  title: z.string().min(1).max(200),
  setNumber: z.string().max(50).optional(),
  sourceUrl: z.string().url().optional(),
  storeId: z.string().uuid().optional(),
  pieceCount: z.number().int().positive().optional(),
  theme: z.string().max(100).optional(),
  brand: z.string().max(100).optional(),
  description: z.string().max(5000).optional(),
  dimensions: z
    .object({
      height: z.object({ cm: z.number().optional(), inches: z.number().optional() }).optional(),
      width: z.object({ cm: z.number().optional(), inches: z.number().optional() }).optional(),
      depth: z.object({ cm: z.number().optional(), inches: z.number().optional() }).optional(),
      studsWidth: z.number().optional(),
      studsDepth: z.number().optional(),
      studsHeight: z.number().optional(),
    })
    .optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  releaseDate: z.coerce.date().optional(),
  retireDate: z.coerce.date().optional(),
  notes: z.string().max(5000).optional(),
  condition: ConditionSchema.optional(),
  completeness: CompletenessSchema.optional(),
  buildStatus: BuildStatusSchema.optional(),
  purchasePrice: z.string().optional(),
  purchaseTax: z.string().optional(),
  purchaseShipping: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  quantity: z.number().int().positive().optional(),
  priority: z.number().int().min(0).max(5).optional(),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export type CreateSetInput = z.infer<typeof CreateSetInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Update Input
// ─────────────────────────────────────────────────────────────────────────

export const UpdateSetInputSchema = z.object({
  status: SetStatusSchema.optional(),
  title: z.string().min(1).max(200).optional(),
  setNumber: z.string().max(50).nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  storeId: z.string().uuid().nullable().optional(),
  pieceCount: z.number().int().positive().nullable().optional(),
  theme: z.string().max(100).nullable().optional(),
  brand: z.string().max(100).nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  dimensions: z
    .object({
      height: z
        .object({ cm: z.number().nullable().optional(), inches: z.number().nullable().optional() })
        .nullable()
        .optional(),
      width: z
        .object({ cm: z.number().nullable().optional(), inches: z.number().nullable().optional() })
        .nullable()
        .optional(),
      depth: z
        .object({ cm: z.number().nullable().optional(), inches: z.number().nullable().optional() })
        .nullable()
        .optional(),
      studsWidth: z.number().nullable().optional(),
      studsDepth: z.number().nullable().optional(),
      studsHeight: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  releaseDate: z.coerce.date().nullable().optional(),
  retireDate: z.coerce.date().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  condition: ConditionSchema.nullable().optional(),
  completeness: CompletenessSchema.nullable().optional(),
  buildStatus: BuildStatusSchema.nullable().optional(),
  purchasePrice: z.string().nullable().optional(),
  purchaseTax: z.string().nullable().optional(),
  purchaseShipping: z.string().nullable().optional(),
  purchaseDate: z.coerce.date().nullable().optional(),
  quantity: z.number().int().positive().optional(),
  priority: z.number().int().min(0).max(5).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
  imageUrl: z.string().url().nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),

  // Product pricing & specs (populated by scrapers)
  msrpPrice: z.string().nullable().optional(),
  msrpCurrency: z.string().max(10).nullable().optional(),
  weight: z.string().nullable().optional(),
  availabilityStatus: AvailabilityStatusSchema.nullable().optional(),
  quantityWanted: z.number().int().min(0).optional(),
  lastScrapedAt: z.coerce.date().nullable().optional(),
  lastScrapedSource: z.string().max(200).nullable().optional(),

  // BrickLink enrichment
  priceGuide: z
    .object({
      newSales: z
        .object({
          timesSold: z.number(),
          totalQty: z.number(),
          minPrice: z.number(),
          avgPrice: z.number(),
          qtyAvgPrice: z.number(),
          maxPrice: z.number(),
        })
        .optional(),
      usedSales: z
        .object({
          timesSold: z.number(),
          totalQty: z.number(),
          minPrice: z.number(),
          avgPrice: z.number(),
          qtyAvgPrice: z.number(),
          maxPrice: z.number(),
        })
        .optional(),
    })
    .nullable()
    .optional(),
  scrapedSources: z.array(z.string()).optional(),

  // Product links
  productLinks: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        url: z.string().url(),
        source: z.enum(['lego.com', 'rebrickable', 'bricklink', 'manual']),
        addedAt: z.string().datetime(),
      }),
    )
    .optional(),
})

export type UpdateSetInput = z.infer<typeof UpdateSetInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Product Links
// ─────────────────────────────────────────────────────────────────────────

export const ProductLinkSourceSchema = z.enum(['lego.com', 'rebrickable', 'bricklink', 'manual'])
export type ProductLinkSource = z.infer<typeof ProductLinkSourceSchema>

export const ProductLinkSchema = z.object({
  label: z.string().min(1).max(200),
  url: z.string().url(),
  source: ProductLinkSourceSchema,
  addedAt: z.string().datetime(),
})

export type ProductLink = z.infer<typeof ProductLinkSchema>

// ─────────────────────────────────────────────────────────────────────────
// Admin Update Input (admin-only spec + link fields)
// ─────────────────────────────────────────────────────────────────────────

export const AdminUpdateSetInputSchema = z.object({
  // Product specs
  pieceCount: z.number().int().positive().nullable().optional(),
  brand: z.string().max(100).nullable().optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  msrpPrice: z.string().nullable().optional(),
  weight: z.string().nullable().optional(),
  dimensions: z
    .object({
      height: z
        .object({ cm: z.number().nullable().optional(), inches: z.number().nullable().optional() })
        .nullable()
        .optional(),
      width: z
        .object({ cm: z.number().nullable().optional(), inches: z.number().nullable().optional() })
        .nullable()
        .optional(),
      depth: z
        .object({ cm: z.number().nullable().optional(), inches: z.number().nullable().optional() })
        .nullable()
        .optional(),
      studsWidth: z.number().nullable().optional(),
      studsDepth: z.number().nullable().optional(),
      studsHeight: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  releaseDate: z.coerce.date().nullable().optional(),
  retireDate: z.coerce.date().nullable().optional(),
  availabilityStatus: AvailabilityStatusSchema.nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  theme: z.string().max(100).nullable().optional(),

  // Product links
  productLinks: z.array(ProductLinkSchema).optional(),
})

export type AdminUpdateSetInput = z.infer<typeof AdminUpdateSetInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Query
// ─────────────────────────────────────────────────────────────────────────

export const SortFieldSchema = z.enum([
  'createdAt',
  'title',
  'purchasePrice',
  'pieceCount',
  'sortOrder',
  'priority',
  // Smart sorting (from wishlist)
  'bestValue',
  'expiringSoon',
  'hiddenGems',
])

export type SortField = z.infer<typeof SortFieldSchema>

export const ListSetsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: SetStatusSchema.optional(), // filter by wanted/owned
  storeId: z.string().uuid().optional(),
  tags: z.string().optional(), // comma-separated
  priority: z.coerce.number().int().min(0).max(5).optional(),
  priorityRange: z
    .string()
    .optional()
    .transform(val => {
      if (!val) return undefined
      const [min, max] = val.split(',').map(Number)
      return { min, max }
    })
    .refine(val => !val || (val.min >= 0 && val.max <= 5 && val.min <= val.max), {
      message: 'Priority range must be 0-5 with min <= max',
    }),
  priceRange: z
    .string()
    .optional()
    .transform(val => {
      if (!val) return undefined
      const [min, max] = val.split(',').map(Number)
      return { min, max }
    })
    .refine(val => !val || (val.min >= 0 && val.max >= 0 && val.min <= val.max), {
      message: 'Price range must be >= 0 with min <= max',
    }),
  isBuilt: z.coerce.boolean().optional(),
  sort: SortFieldSchema.default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
})

export type ListSetsQuery = z.infer<typeof ListSetsQuerySchema>

// ─────────────────────────────────────────────────────────────────────────
// Reorder
// ─────────────────────────────────────────────────────────────────────────

export const ReorderItemSchema = z.object({
  id: z.string().uuid(),
  sortOrder: z.number().int().min(0),
})

export const ReorderInputSchema = z.object({
  items: z.array(ReorderItemSchema).min(1),
})

export type ReorderInput = z.infer<typeof ReorderInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Purchase (status transition: wanted → owned)
// ─────────────────────────────────────────────────────────────────────────

export const PurchaseInputSchema = z.object({
  purchaseDate: z.coerce.date().optional(),
  purchasePrice: z.string().optional(),
  purchaseTax: z.string().optional(),
  purchaseShipping: z.string().optional(),
  condition: ConditionSchema.optional(),
  completeness: CompletenessSchema.optional(),
  buildStatus: BuildStatusSchema.optional().default('not_started'),
})

export type PurchaseInput = z.infer<typeof PurchaseInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Build Status Update
// ─────────────────────────────────────────────────────────────────────────

export const BuildStatusUpdateInputSchema = z.object({
  buildStatus: BuildStatusSchema,
})

export type BuildStatusUpdateInput = z.infer<typeof BuildStatusUpdateInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Presign
// ─────────────────────────────────────────────────────────────────────────

export const PresignSetImageInputSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
})

export type PresignSetImageInput = z.infer<typeof PresignSetImageInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Register Image (after presign upload)
// ─────────────────────────────────────────────────────────────────────────

export const RegisterSetImageInputSchema = z.object({
  imageUrl: z.string().url(),
  key: z.string().min(1),
  thumbnailUrl: z.string().url().optional(),
})

export type RegisterSetImageInput = z.infer<typeof RegisterSetImageInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Set Image (from set_images table — deprecated, migrating to entity_files)
// ─────────────────────────────────────────────────────────────────────────

export const SetImageSchema = z.object({
  id: z.string().uuid(),
  setId: z.string().uuid(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().nullable(),
  position: z.number().int(),
  createdAt: z.date(),
})

export type SetImage = z.infer<typeof SetImageSchema>

export const CreateSetImageInputSchema = z.object({
  setId: z.string().uuid(),
  position: z.number().int().min(0).optional(),
})

export type CreateSetImageInput = z.infer<typeof CreateSetImageInputSchema>

export const UpdateSetImageInputSchema = z.object({
  position: z.number().int().min(0).optional(),
})

export type UpdateSetImageInput = z.infer<typeof UpdateSetImageInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// File Types
// ─────────────────────────────────────────────────────────────────────────

export const UploadedFileSchema = z.object({
  buffer: z.instanceof(Buffer),
  filename: z.string(),
  mimetype: z.string(),
  size: z.number(),
})

export type UploadedFile = z.infer<typeof UploadedFileSchema>

// ─────────────────────────────────────────────────────────────────────────
// Set Instance — one row per physical copy owned
// ─────────────────────────────────────────────────────────────────────────

export const SetInstanceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  setId: z.string().uuid(),

  // Condition & Status
  condition: ConditionSchema.nullable(),
  completeness: CompletenessSchema.nullable(),
  buildStatus: BuildStatusSchema.nullable(),
  includesMinifigs: z.boolean().nullable(),

  // Purchase
  purchasePrice: z.string().nullable(),
  purchaseTax: z.string().nullable(),
  purchaseShipping: z.string().nullable(),
  purchaseDate: z.date().nullable(),
  storeId: z.string().uuid().nullable(),

  // Notes
  notes: z.string().nullable(),

  // Ordering
  sortOrder: z.number().int().nullable(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type SetInstance = z.infer<typeof SetInstanceSchema>

export const CreateSetInstanceInputSchema = z.object({
  condition: ConditionSchema.optional(),
  completeness: CompletenessSchema.optional(),
  buildStatus: BuildStatusSchema.optional(),
  includesMinifigs: z.boolean().optional(),
  purchasePrice: z.string().optional(),
  purchaseTax: z.string().optional(),
  purchaseShipping: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  storeId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export type CreateSetInstanceInput = z.infer<typeof CreateSetInstanceInputSchema>

export const UpdateSetInstanceInputSchema = z.object({
  condition: ConditionSchema.nullable().optional(),
  completeness: CompletenessSchema.nullable().optional(),
  buildStatus: BuildStatusSchema.nullable().optional(),
  includesMinifigs: z.boolean().nullable().optional(),
  purchasePrice: z.string().nullable().optional(),
  purchaseTax: z.string().nullable().optional(),
  purchaseShipping: z.string().nullable().optional(),
  purchaseDate: z.coerce.date().nullable().optional(),
  storeId: z.string().uuid().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  sortOrder: z.number().int().min(0).nullable().optional(),
})

export type UpdateSetInstanceInput = z.infer<typeof UpdateSetInstanceInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────

export type SetError =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'UPLOAD_FAILED'
  | 'INVALID_FILE'
  | 'DB_ERROR'
  | 'VALIDATION_ERROR'
  | 'INVALID_STATUS'
