/**
 * Unified Sets Zod Schemas
 *
 * Runtime validation and type inference for both wishlist (wanted) and
 * collection (owned) operations. Replaces separate wishlist and sets schemas.
 */
import { z } from 'zod'
import { MinifigInstanceSchema } from './minifigs'

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const SetStatusSchema = z.enum(['wanted', 'owned'])
export type SetStatus = z.infer<typeof SetStatusSchema>

export const ConditionSchema = z.enum(['new', 'used'])
export type Condition = z.infer<typeof ConditionSchema>

export const CompletenessSchema = z.enum(['sealed', 'complete', 'incomplete'])
export type Completeness = z.infer<typeof CompletenessSchema>

export const BuildStatusSchema = z.enum(['not_started', 'in_progress', 'completed', 'parted_out'])
export type BuildStatus = z.infer<typeof BuildStatusSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Image Variants (WISH-2016)
// ─────────────────────────────────────────────────────────────────────────────

export const ImageFormatSchema = z.enum(['jpeg', 'webp', 'png'])
export type ImageFormat = z.infer<typeof ImageFormatSchema>

export const ImageVariantMetadataSchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().positive(),
  format: ImageFormatSchema,
  watermarked: z.boolean().optional(),
})

export type ImageVariantMetadata = z.infer<typeof ImageVariantMetadataSchema>

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

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const StoreSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  url: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string().datetime(),
})

export type Store = z.infer<typeof StoreSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Set Image (from set_images table — deprecated, migrating to entity_files)
// ─────────────────────────────────────────────────────────────────────────────

export const SetImageSchema = z.object({
  id: z.string().uuid(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().nullable(),
  position: z.number().int().nonnegative(),
})

export type SetImage = z.infer<typeof SetImageSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Set Instance (per-copy tracking)
// ─────────────────────────────────────────────────────────────────────────────

export const AvailabilityStatusSchema = z.enum(['available', 'retiring_soon', 'retired'])
export type AvailabilityStatus = z.infer<typeof AvailabilityStatusSchema>

export const SetInstanceSchema = z.object({
  id: z.string().uuid(),
  setId: z.string().uuid(),
  condition: ConditionSchema.nullable(),
  completeness: CompletenessSchema.nullable(),
  buildStatus: BuildStatusSchema.nullable(),
  includesMinifigs: z.boolean().nullable(),
  purchasePrice: z.string().nullable(),
  purchaseTax: z.string().nullable(),
  purchaseShipping: z.string().nullable(),
  purchaseDate: z.string().datetime().nullable(),
  storeId: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  sortOrder: z.number().int().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
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
  purchaseDate: z.string().datetime().optional(),
  storeId: z.string().uuid().optional(),
  notes: z.string().max(5000).optional(),
  sortOrder: z.number().int().optional(),
})

export type CreateSetInstanceInput = z.infer<typeof CreateSetInstanceInputSchema>

export const UpdateSetInstanceInputSchema = CreateSetInstanceInputSchema.partial()

export type UpdateSetInstanceInput = z.infer<typeof UpdateSetInstanceInputSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Unified Set Schema
// ─────────────────────────────────────────────────────────────────────────────

export const SetSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),

  // Lifecycle
  status: SetStatusSchema,
  statusChangedAt: z.string().datetime().nullable(),

  // Identity
  title: z.string(),
  setNumber: z.string().nullable(),
  sourceUrl: z.string().url().nullable(),

  // Store
  storeId: z.string().uuid().nullable(),
  storeName: z.string().nullable().optional(),

  // Physical
  pieceCount: z.number().int().nullable(),
  brand: z.string().nullable().optional(),
  year: z.number().int().nullable().optional(),
  theme: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
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
  releaseDate: z.string().datetime().nullable(),
  retireDate: z.string().datetime().nullable().optional(),
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
  purchaseDate: z.string().datetime().nullable(),
  quantity: z.number().int(),

  // Wishlist-specific
  priority: z.number().int().nullable(),
  sortOrder: z.number().int().nullable(),

  // Product details
  msrpPrice: z.string().nullable().optional(),
  msrpCurrency: z.string().nullable().optional(),
  weight: z.string().nullable().optional(),
  availabilityStatus: AvailabilityStatusSchema.nullable().optional(),
  quantityWanted: z.number().int().optional(),
  lastScrapedAt: z.string().datetime().nullable().optional(),
  lastScrapedSource: z.string().nullable().optional(),

  // Images
  imageUrl: z.string().url().nullable(),
  imageVariants: ImageVariantsSchema.nullable().optional(),
  images: z.array(SetImageSchema).default([]),

  // Tags
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

  // Instances (per-copy tracking)
  instances: z.array(SetInstanceSchema).default([]),

  // Minifigs (linked minifig instances)
  minifigs: z.array(MinifigInstanceSchema).default([]),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type Set = z.infer<typeof SetSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Create / Update
// ─────────────────────────────────────────────────────────────────────────────

export const CreateSetSchema = z.object({
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
  releaseDate: z.string().datetime().optional(),
  retireDate: z.string().datetime().optional(),
  notes: z.string().max(5000).optional(),
  condition: ConditionSchema.optional(),
  completeness: CompletenessSchema.optional(),
  buildStatus: BuildStatusSchema.optional(),
  purchasePrice: z.string().optional(),
  purchaseTax: z.string().optional(),
  purchaseShipping: z.string().optional(),
  purchaseDate: z.string().datetime().optional(),
  quantity: z.number().int().positive().optional(),
  priority: z.number().int().min(0).max(5).optional(),
  imageUrl: z.string().url().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
})

export type CreateSetInput = z.infer<typeof CreateSetSchema>

export const UpdateSetSchema = CreateSetSchema.partial()
  .omit({ status: true })
  .extend({
    status: SetStatusSchema.optional(),
    sortOrder: z.number().int().min(0).optional(),
    msrpPrice: z.string().optional(),
    msrpCurrency: z.string().optional(),
    weight: z.string().optional(),
    availabilityStatus: AvailabilityStatusSchema.optional(),
    quantityWanted: z.number().int().optional(),
    lastScrapedAt: z.string().datetime().optional(),
    lastScrapedSource: z.string().optional(),
  })

export type UpdateSetInput = z.infer<typeof UpdateSetSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Product Links
// ─────────────────────────────────────────────────────────────────────────────

export const ProductLinkSourceSchema = z.enum(['lego.com', 'rebrickable', 'bricklink', 'manual'])
export type ProductLinkSource = z.infer<typeof ProductLinkSourceSchema>

export const ProductLinkSchema = z.object({
  label: z.string().min(1).max(200),
  url: z.string().url(),
  source: ProductLinkSourceSchema,
  addedAt: z.string(),
})

export type ProductLink = z.infer<typeof ProductLinkSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Admin Update (admin-only spec + link fields)
// ─────────────────────────────────────────────────────────────────────────────

export const AdminUpdateSetSchema = z.object({
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
  releaseDate: z.string().datetime().nullable().optional(),
  retireDate: z.string().datetime().nullable().optional(),
  availabilityStatus: AvailabilityStatusSchema.nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  theme: z.string().max(100).nullable().optional(),
  productLinks: z.array(ProductLinkSchema).optional(),
})

export type AdminUpdateSetInput = z.infer<typeof AdminUpdateSetSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Query / Response
// ─────────────────────────────────────────────────────────────────────────────

export const SortFieldSchema = z.enum([
  'createdAt',
  'title',
  'purchasePrice',
  'pieceCount',
  'sortOrder',
  'priority',
  'bestValue',
  'expiringSoon',
  'hiddenGems',
])

export type SortField = z.infer<typeof SortFieldSchema>

export const SetListQuerySchema = z.object({
  search: z.string().optional(),
  status: SetStatusSchema.optional(),
  storeId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.number().int().min(0).max(5).optional(),
  priorityRange: z
    .object({ min: z.number().int().min(0).max(5), max: z.number().int().min(0).max(5) })
    .optional(),
  priceRange: z.object({ min: z.number().min(0), max: z.number().min(0) }).optional(),
  isBuilt: z.boolean().optional(),
  sort: SortFieldSchema.default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type SetListQuery = z.infer<typeof SetListQuerySchema>

export const SetListPaginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
})

export type SetListPagination = z.infer<typeof SetListPaginationSchema>

export const SetListResponseSchema = z.object({
  items: z.array(SetSchema),
  pagination: SetListPaginationSchema,
})

export type SetListResponse = z.infer<typeof SetListResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Reorder
// ─────────────────────────────────────────────────────────────────────────────

export const BatchReorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid(),
        sortOrder: z.number().int().min(0),
      }),
    )
    .min(1),
})

export type BatchReorder = z.infer<typeof BatchReorderSchema>

export const ReorderResponseSchema = z.object({
  updated: z.number().int().min(0),
})

export type ReorderResponse = z.infer<typeof ReorderResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Purchase (wanted → owned)
// ─────────────────────────────────────────────────────────────────────────────

export const PurchaseInputSchema = z.object({
  purchaseDate: z.string().datetime().optional(),
  purchasePrice: z.string().optional(),
  purchaseTax: z.string().optional(),
  purchaseShipping: z.string().optional(),
  condition: ConditionSchema.optional(),
  completeness: CompletenessSchema.optional(),
  buildStatus: BuildStatusSchema.optional().default('not_started'),
})

export type PurchaseInput = z.infer<typeof PurchaseInputSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Build Status Update
// ─────────────────────────────────────────────────────────────────────────────

export const UpdateBuildStatusSchema = z.object({
  buildStatus: BuildStatusSchema,
})

export type UpdateBuildStatus = z.infer<typeof UpdateBuildStatusSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Presign
// ─────────────────────────────────────────────────────────────────────────────

export const PresignRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
})

export type PresignRequest = z.infer<typeof PresignRequestSchema>

export const PresignResponseSchema = z.object({
  uploadUrl: z.string().url(),
  imageUrl: z.string().url(),
  key: z.string(),
})

export type PresignResponse = z.infer<typeof PresignResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Parts (from linked MOC)
// ─────────────────────────────────────────────────────────────────────────────

export const SetPartSchema = z.object({
  id: z.string().uuid(),
  partId: z.string(),
  partName: z.string(),
  quantity: z.number().int(),
  color: z.string(),
})

export type SetPart = z.infer<typeof SetPartSchema>

export const SetPartsListSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  totalPartsCount: z.string().nullable(),
  parts: z.array(SetPartSchema),
})

export type SetPartsList = z.infer<typeof SetPartsListSchema>

export const SetPartsResponseSchema = z.object({
  partsLists: z.array(SetPartsListSchema),
})

export type SetPartsResponse = z.infer<typeof SetPartsResponseSchema>
