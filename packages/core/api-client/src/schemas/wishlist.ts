/**
 * Wishlist Schemas — DEPRECATION SHIM
 *
 * Re-exports from the unified sets schema with backward-compatible type aliases.
 * Frontend components import from here until they are migrated to use Set types directly.
 *
 * Phase 4.5: Migrate components to import from './sets' then delete this file.
 *
 * @deprecated Import from './sets' instead.
 */
import { z } from 'zod'
import {
  ImageFormatSchema,
  ImageVariantMetadataSchema,
  ImageVariantsSchema,
  ReorderResponseSchema,
  type Set,
  type ImageFormat,
  type ImageVariantMetadata,
  type ImageVariants,
} from './sets'

// ─────────────────────────────────────────────────────────────────────────────
// Re-export enums with old names
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Use SetStatusSchema from './sets' */
export const WishlistStoreSchema = z.enum(['LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other'])
/** @deprecated */
export type WishlistStore = z.infer<typeof WishlistStoreSchema>

/** @deprecated Removed — USD only */
export const CurrencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])
/** @deprecated */
export type Currency = z.infer<typeof CurrencySchema>

/** @deprecated Use SetStatusSchema from './sets' */
export const ItemStatusSchema = z.enum(['wishlist', 'owned'])
/** @deprecated */
export type ItemStatus = z.infer<typeof ItemStatusSchema>

/** @deprecated Use BuildStatusSchema from './sets' (now includes 'parted_out') */
export const BuildStatusSchema = z.enum(['not_started', 'in_progress', 'completed'])
/** @deprecated */
export type BuildStatus = z.infer<typeof BuildStatusSchema>

// Re-export image schemas unchanged
export { ImageFormatSchema, ImageVariantMetadataSchema, ImageVariantsSchema }
export type { ImageFormat, ImageVariantMetadata, ImageVariants }

export const ImageProcessingStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed'])
export type ImageProcessingStatus = z.infer<typeof ImageProcessingStatusSchema>

// ─────────────────────────────────────────────────────────────────────────────
// WishlistItem — backward-compatible type mapped from unified Set
//
// Components import this type and expect fields like `store`, `price`, `currency`.
// The API now returns Set objects with `storeId`/`storeName`/`purchasePrice`.
// This shim provides the old field names so existing components don't break.
// ─────────────────────────────────────────────────────────────────────────────

const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/** @deprecated Use SetSchema from './sets' */
export const WishlistItemSchema = z.object({
  id: z.string().regex(uuidPattern),
  userId: z.string(),

  // Core fields
  title: z.string(),
  store: z.string(), // mapped from storeName
  setNumber: z.string().nullable(),
  sourceUrl: z.string().url().nullable(),

  // Image
  imageUrl: z.string().url().nullable(),
  imageVariants: ImageVariantsSchema.nullable().optional(),

  // Pricing — maps from unified purchasePrice
  price: z.string().nullable(),
  currency: CurrencySchema.default('USD'),

  // Details
  pieceCount: z.number().int().nullable(),
  releaseDate: z.string().datetime().nullable(),
  tags: z.array(z.string()).default([]),

  // User organization
  priority: z.number().int().min(0).max(5).default(0),
  notes: z.string().nullable(),
  sortOrder: z.number().int().min(0),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  // Audit (always null — single user)
  createdBy: z.string().nullable().optional(),
  updatedBy: z.string().nullable().optional(),

  // Collection management
  status: ItemStatusSchema.default('wishlist'),
  statusChangedAt: z.string().datetime().nullable().optional(),
  purchaseDate: z.string().datetime().nullable().optional(),
  purchasePrice: z.string().nullable().optional(),
  purchaseTax: z.string().nullable().optional(),
  purchaseShipping: z.string().nullable().optional(),
  buildStatus: BuildStatusSchema.nullable().optional(),
})

/** @deprecated Use Set from './sets' */
export type WishlistItem = z.infer<typeof WishlistItemSchema>

/**
 * Map a unified Set object to the legacy WishlistItem shape.
 * Call this in RTK transformResponse or at the component boundary.
 */
export function setToWishlistItem(set: Set): WishlistItem {
  return {
    id: set.id,
    userId: set.userId,
    title: set.title,
    store: set.storeName ?? 'Other',
    setNumber: set.setNumber,
    sourceUrl: set.sourceUrl,
    imageUrl: set.imageUrl,
    imageVariants: set.imageVariants ?? null,
    price: set.purchasePrice,
    currency: 'USD',
    pieceCount: set.pieceCount,
    releaseDate: set.releaseDate,
    tags: set.tags ?? [],
    priority: set.priority ?? 0,
    notes: set.notes,
    sortOrder: set.sortOrder ?? 0,
    createdAt: set.createdAt,
    updatedAt: set.updatedAt,
    createdBy: null,
    updatedBy: null,
    // Map 'wanted' back to 'wishlist' for legacy compat
    status: set.status === 'wanted' ? 'wishlist' : 'owned',
    statusChangedAt: set.statusChangedAt ?? null,
    purchaseDate: set.purchaseDate ?? null,
    purchasePrice: set.purchasePrice ?? null,
    purchaseTax: set.purchaseTax ?? null,
    purchaseShipping: set.purchaseShipping ?? null,
    buildStatus:
      set.buildStatus === 'parted_out'
        ? 'completed'
        : ((set.buildStatus as BuildStatus | null) ?? null),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Create / Update schemas
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated Use CreateSetSchema from './sets' */
export const CreateWishlistItemSchema = z.object({
  title: z.string().min(1),
  store: z.string().min(1),
  setNumber: z.string().optional(),
  sourceUrl: z.string().url().optional().or(z.literal('')),
  imageUrl: z.string().url().optional(),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
    .or(z.literal('')),
  currency: z.string().default('USD'),
  pieceCount: z.number().int().nonnegative().optional(),
  releaseDate: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
  priority: z.number().int().min(0).max(5).default(0),
  notes: z.string().optional(),
})

/** @deprecated */
export type CreateWishlistItem = z.infer<typeof CreateWishlistItemSchema>

/** @deprecated Use UpdateSetSchema from './sets' */
export const UpdateWishlistItemSchema = CreateWishlistItemSchema.partial().extend({
  buildStatus: BuildStatusSchema.optional(),
})

/** @deprecated */
export type UpdateWishlistItem = z.infer<typeof UpdateWishlistItemSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Query / Response
// ─────────────────────────────────────────────────────────────────────────────

export const WishlistSortFieldSchema = z.enum([
  'createdAt',
  'title',
  'price',
  'pieceCount',
  'sortOrder',
  'priority',
  'bestValue',
  'expiringSoon',
  'hiddenGems',
])
/** @deprecated */
export type WishlistSortField = z.infer<typeof WishlistSortFieldSchema>

/** @deprecated Use SetListQuerySchema from './sets' */
export const WishlistQueryParamsSchema = z.object({
  q: z.string().optional(),
  store: z.array(WishlistStoreSchema).optional(),
  tags: z.string().optional(),
  priority: z.coerce.number().int().min(0).max(5).optional(),
  priorityRange: z
    .object({ min: z.number().int().min(0).max(5), max: z.number().int().min(0).max(5) })
    .refine(val => val.min <= val.max)
    .optional(),
  priceRange: z
    .object({ min: z.number().min(0), max: z.number().min(0) })
    .refine(val => val.min <= val.max)
    .optional(),
  status: ItemStatusSchema.optional().default('wishlist'),
  sort: WishlistSortFieldSchema.optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/** @deprecated */
export type WishlistQueryParams = z.infer<typeof WishlistQueryParamsSchema>

/** @deprecated Use SetListPaginationSchema from './sets' */
export const PaginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
})

/** @deprecated */
export type Pagination = z.infer<typeof PaginationSchema>

/** @deprecated Use SetListResponseSchema from './sets' */
export const WishlistListResponseSchema = z.object({
  items: z.array(WishlistItemSchema),
  pagination: PaginationSchema,
  counts: z
    .object({ total: z.number().int(), byStore: z.record(z.string(), z.number()) })
    .optional(),
  filters: z
    .object({ availableTags: z.array(z.string()), availableStores: z.array(z.string()) })
    .optional(),
})

/** @deprecated */
export type WishlistListResponse = z.infer<typeof WishlistListResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Reorder
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated */
export const ReorderWishlistItemSchema = z.object({
  itemId: z.string().regex(uuidPattern),
  newSortOrder: z.number().int().min(0),
})

/** @deprecated */
export type ReorderWishlistItem = z.infer<typeof ReorderWishlistItemSchema>

/** @deprecated Use BatchReorderSchema from './sets' */
export const BatchReorderSchema = z.object({
  items: z
    .array(z.object({ id: z.string().regex(uuidPattern), sortOrder: z.number().int().min(0) }))
    .min(1),
})

/** @deprecated */
export type BatchReorder = z.infer<typeof BatchReorderSchema>

/** @deprecated */
export { ReorderResponseSchema }
/** @deprecated */
export type ReorderResponse = z.infer<typeof ReorderResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Presign
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated */
export const PresignRequestSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
})

/** @deprecated */
export type PresignRequest = z.infer<typeof PresignRequestSchema>

/** @deprecated */
export const PresignResponseSchema = z.object({
  presignedUrl: z.string().url(),
  key: z.string(),
  expiresIn: z.number().int().positive(),
})

/** @deprecated */
export type PresignResponse = z.infer<typeof PresignResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Purchase
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated */
export const MarkAsPurchasedInputSchema = z.object({
  pricePaid: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  tax: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
    .or(z.literal('')),
  shipping: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
    .or(z.literal('')),
  quantity: z.number().int().min(1).default(1),
  purchaseDate: z.string().datetime().optional(),
  keepOnWishlist: z.boolean().default(false),
})

/** @deprecated */
export type MarkAsPurchasedInput = z.infer<typeof MarkAsPurchasedInputSchema>

/** @deprecated */
export const GotItFormSchema = z.object({
  pricePaid: z.string().optional(),
  tax: z.string().optional(),
  shipping: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  purchaseDate: z.string().optional(),
  keepOnWishlist: z.boolean().default(false),
})

/** @deprecated */
export type GotItFormValues = z.infer<typeof GotItFormSchema>

/** @deprecated Use SetSchema from './sets' */
export const SetItemSchema = z.object({
  id: z.string().regex(uuidPattern),
  userId: z.string(),
  title: z.string(),
  setNumber: z.string().nullable(),
  store: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  pieceCount: z.number().int().nullable(),
  releaseDate: z.string().datetime().nullable(),
  theme: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  notes: z.string().nullable(),
  isBuilt: z.boolean(),
  quantity: z.number().int(),
  purchasePrice: z.string().nullable(),
  tax: z.string().nullable(),
  shipping: z.string().nullable(),
  purchaseDate: z.string().datetime().nullable(),
  wishlistItemId: z.string().regex(uuidPattern).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

/** @deprecated */
export type SetItem = z.infer<typeof SetItemSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Collection Management (re-exports)
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated */
export const MarkAsPurchasedSchema = z.object({
  purchaseDate: z.string().datetime().optional(),
  purchasePrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
    .or(z.literal('')),
  purchaseTax: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
    .or(z.literal('')),
  purchaseShipping: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
    .or(z.literal('')),
})

/** @deprecated */
export type MarkAsPurchased = z.infer<typeof MarkAsPurchasedSchema>

/** @deprecated Use PurchaseInputSchema from './sets' */
export const PurchaseDetailsInputSchema = z.object({
  purchaseDate: z.string().datetime().optional(),
  purchasePrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
    .or(z.literal('')),
  purchaseTax: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
    .or(z.literal('')),
  purchaseShipping: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
    .or(z.literal('')),
  buildStatus: BuildStatusSchema.optional().default('not_started'),
})

/** @deprecated */
export type PurchaseDetailsInput = z.infer<typeof PurchaseDetailsInputSchema>

/** @deprecated Use UpdateBuildStatusSchema from './sets' */
export const UpdateBuildStatusSchema_COMPAT = z.object({
  buildStatus: BuildStatusSchema,
})

// Re-export with original name
export { UpdateBuildStatusSchema_COMPAT as UpdateBuildStatusSchema }

/** @deprecated */
export type UpdateBuildStatus_COMPAT = z.infer<typeof UpdateBuildStatusSchema_COMPAT>
