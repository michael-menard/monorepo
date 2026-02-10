/**
 * Wishlist Zod Schemas
 *
 * Runtime validation and type inference for wishlist operations.
 * All types are derived from Zod schemas using z.infer<>.
 *
 * WISH-2110: Custom error messages for better form UX
 */
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Store and Currency Enums
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Store/retailer enum schema for wishlist items.
 * Matches the `wishlist_store` PostgreSQL enum from WISH-2000.
 * @example WishlistStoreSchema.parse('LEGO') // 'LEGO'
 */
export const WishlistStoreSchema = z.enum(['LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other'], {
  errorMap: () => ({
    message: 'Store must be LEGO, Barweer, Cata, BrickLink, or Other',
  }),
})
export type WishlistStore = z.infer<typeof WishlistStoreSchema>

/**
 * Currency enum schema for wishlist pricing.
 * Matches the `wishlist_currency` PostgreSQL enum from WISH-2000.
 * @example CurrencySchema.parse('USD') // 'USD'
 */
export const CurrencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'], {
  errorMap: () => ({ message: 'Currency must be USD, EUR, GBP, CAD, or AUD' }),
})
export type Currency = z.infer<typeof CurrencySchema>

/**
 * Item status enum schema for lifecycle tracking.
 * Matches the `item_status` PostgreSQL enum from SETS-MVP-001.
 * @example ItemStatusSchema.parse('wishlist') // 'wishlist'
 */
export const ItemStatusSchema = z.enum(['wishlist', 'owned'], {
  errorMap: () => ({ message: 'Status must be wishlist or owned' }),
})
export type ItemStatus = z.infer<typeof ItemStatusSchema>

/**
 * Build status enum schema for owned items.
 * Matches the `build_status` PostgreSQL enum from SETS-MVP-001.
 * @example BuildStatusSchema.parse('in_progress') // 'in_progress'
 */
export const BuildStatusSchema = z.enum(['not_started', 'in_progress', 'completed'], {
  errorMap: () => ({
    message: 'Build status must be not_started, in_progress, or completed',
  }),
})
export type BuildStatus = z.infer<typeof BuildStatusSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Image Variants Schema (WISH-2016)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Image format enum for optimized images
 */
export const ImageFormatSchema = z.enum(['jpeg', 'webp', 'png'], {
  errorMap: () => ({ message: 'Image format must be jpeg, webp, or png' }),
})
export type ImageFormat = z.infer<typeof ImageFormatSchema>

/**
 * Metadata for a single image variant (thumbnail, medium, large)
 *
 * WISH-2016: Image Optimization
 */
export const ImageVariantMetadataSchema = z.object({
  url: z.string().url({ message: 'Invalid image URL format' }),
  width: z
    .number()
    .int({ message: 'Width must be a whole number' })
    .positive({ message: 'Width must be positive' }),
  height: z
    .number()
    .int({ message: 'Height must be a whole number' })
    .positive({ message: 'Height must be positive' }),
  sizeBytes: z
    .number()
    .int({ message: 'File size must be a whole number' })
    .positive({ message: 'File size must be positive' }),
  format: ImageFormatSchema,
  watermarked: z.boolean().optional(),
})

export type ImageVariantMetadata = z.infer<typeof ImageVariantMetadataSchema>

/**
 * Processing status for image optimization
 */
export const ImageProcessingStatusSchema = z.enum(
  ['pending', 'processing', 'completed', 'failed'],
  {
    errorMap: () => ({
      message: 'Processing status must be pending, processing, completed, or failed',
    }),
  },
)
export type ImageProcessingStatus = z.infer<typeof ImageProcessingStatusSchema>

/**
 * Complete image variants structure stored in database JSONB column.
 *
 * WISH-2016: Image Optimization
 *
 * @remarks
 * Contains metadata for original and all optimized variants:
 * - original: Full resolution uploaded image
 * - thumbnail: 200x200 for gallery grid
 * - medium: 800x800 for hover preview
 * - large: 1600x1600 for detail page (with watermark)
 */
export const ImageVariantsSchema = z.object({
  original: ImageVariantMetadataSchema.optional(),
  thumbnail: ImageVariantMetadataSchema.optional(),
  medium: ImageVariantMetadataSchema.optional(),
  large: ImageVariantMetadataSchema.optional(),
  processingStatus: ImageProcessingStatusSchema.optional(),
  processedAt: z.string().datetime({ message: 'Invalid datetime format' }).optional(),
  error: z.string().optional(),
})

export type ImageVariants = z.infer<typeof ImageVariantsSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Base Wishlist Item Schema (from database)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Complete wishlist item schema matching the database structure from WISH-2000.
 * Use for API responses and database result validation.
 *
 * @remarks
 * - `priority` is an integer 0-5 (not a string enum)
 * - `price` is stored as string for decimal precision
 * - `tags` is a JSONB array in PostgreSQL
 * - Audit fields (`createdBy`, `updatedBy`) track who modified the record
 * - `imageVariants` added in WISH-2016 for optimized images
 */
// UUID pattern that accepts any valid UUID format (including test UUIDs)
const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

export const WishlistItemSchema = z.object({
  id: z.string().regex(uuidPattern, { message: 'Invalid UUID format' }),
  userId: z.string().min(1, { message: 'User ID is required' }),

  // Core fields (required)
  title: z.string().min(1, { message: 'Title is required' }),
  store: WishlistStoreSchema,

  // Identification
  setNumber: z.string().nullable(),
  sourceUrl: z.string().url({ message: 'Invalid URL format' }).nullable(),

  // Image
  imageUrl: z.string().url({ message: 'Invalid image URL format' }).nullable(),

  // Image Variants (WISH-2016: Optimized images)
  imageVariants: ImageVariantsSchema.nullable().optional(),

  // Pricing
  price: z.string().nullable(), // Decimal as string for precision
  currency: CurrencySchema.default('USD'),

  // Details
  pieceCount: z
    .number()
    .int({ message: 'Piece count must be a whole number' })
    .nonnegative({ message: 'Piece count cannot be negative' })
    .nullable(),
  releaseDate: z.string().datetime({ message: 'Invalid release date format' }).nullable(),
  tags: z.array(z.string()).default([]),

  // User organization
  priority: z
    .number()
    .int({ message: 'Priority must be a whole number' })
    .min(0, { message: 'Priority must be between 0 and 5' })
    .max(5, { message: 'Priority must be between 0 and 5' })
    .default(0),
  notes: z.string().nullable(),
  sortOrder: z
    .number()
    .int({ message: 'Sort order must be a whole number' })
    .min(0, { message: 'Sort order cannot be negative' }),

  // Timestamps
  createdAt: z.string().datetime({ message: 'Invalid creation date format' }),
  updatedAt: z.string().datetime({ message: 'Invalid update date format' }),

  // Audit fields (WISH-2000 enhancement)
  // These are optional because legacy data may not have them, and nullable for explicit null values
  createdBy: z.string().nullable().optional(),
  updatedBy: z.string().nullable().optional(),

  // ─────────────────────────────────────────────────────────────────────────
  // Collection Management (SETS-MVP-001)
  // ─────────────────────────────────────────────────────────────────────────

  // Lifecycle tracking
  status: ItemStatusSchema.default('wishlist'),
  statusChangedAt: z
    .string()
    .datetime({ message: 'Invalid datetime format' })
    .nullable()
    .optional(),

  // Purchase tracking (for owned items)
  purchaseDate: z
    .string()
    .datetime({ message: 'Invalid purchase date format' })
    .nullable()
    .optional(),
  purchasePrice: z.string().nullable().optional(),
  purchaseTax: z.string().nullable().optional(),
  purchaseShipping: z.string().nullable().optional(),

  // Build tracking (for owned items)
  buildStatus: BuildStatusSchema.nullable().optional(),
})

export type WishlistItem = z.infer<typeof WishlistItemSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Create Schema (POST body)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema for creating new wishlist items (POST /api/wishlist).
 * Omits server-generated fields: id, userId, sortOrder, timestamps, audit fields.
 *
 * @remarks
 * - `title` and `store` are required
 * - `priority` defaults to 0, range 0-5
 * - `price` accepts empty string for clearing
 * - `sourceUrl` accepts empty string for clearing
 */
export const CreateWishlistItemSchema = z.object({
  title: z.string().min(1, { message: 'Title is required' }),
  store: z.string().min(1, { message: 'Store is required' }),
  setNumber: z.string().optional(),
  sourceUrl: z.string().url({ message: 'Invalid URL format' }).optional().or(z.literal('')),
  imageUrl: z.string().url({ message: 'Invalid image URL format' }).optional(),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, {
      message: 'Price must be a valid decimal with up to 2 decimal places',
    })
    .optional()
    .or(z.literal('')),
  currency: z.string().default('USD'),
  pieceCount: z
    .number()
    .int({ message: 'Piece count must be a whole number' })
    .nonnegative({ message: 'Piece count cannot be negative' })
    .optional(),
  releaseDate: z.string().datetime({ message: 'Invalid release date format' }).optional(),
  tags: z.array(z.string()).default([]),
  priority: z
    .number()
    .int({ message: 'Priority must be a whole number' })
    .min(0, { message: 'Priority must be between 0 and 5' })
    .max(5, { message: 'Priority must be between 0 and 5' })
    .default(0),
  notes: z.string().optional(),
})

export type CreateWishlistItem = z.infer<typeof CreateWishlistItemSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Update Schema (PATCH body - all fields optional)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema for updating existing wishlist items (PATCH /api/wishlist/:id).
 * All fields are optional for partial updates.
 * Derived from CreateWishlistItemSchema using `.partial()` with buildStatus added.
 *
 * SETS-MVP-004: Added buildStatus field for toggling build state of owned items.
 */
export const UpdateWishlistItemSchema = CreateWishlistItemSchema.partial().extend({
  buildStatus: BuildStatusSchema.optional(),
})

export type UpdateWishlistItem = z.infer<typeof UpdateWishlistItemSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Query Parameters Schema (GET list)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sort field enum for wishlist queries.
 * Includes standard column sorts and smart sorting algorithms (WISH-2014).
 */
export const WishlistSortFieldSchema = z.enum(
  [
    'createdAt',
    'title',
    'price',
    'pieceCount',
    'sortOrder',
    'priority',
    // Smart sorting algorithms (WISH-2014)
    'bestValue', // price / pieceCount ratio (lowest first)
    'expiringSoon', // oldest release date first
    'hiddenGems', // (5 - priority) * pieceCount (highest first)
  ],
  {
    errorMap: () => ({ message: 'Invalid sort field' }),
  },
)

export type WishlistSortField = z.infer<typeof WishlistSortFieldSchema>

/**
 * Query parameters schema for listing wishlist items (GET /api/wishlist).
 * Supports search, filtering, sorting, and pagination.
 *
 * @remarks
 * - `q` is the search string for title matching
 * - `tags` is comma-separated for multi-tag filtering
 * - `status` defaults to 'wishlist' for backward compatibility (SETS-MVP-001)
 * - `page` defaults to 1, `limit` defaults to 20 (max 100)
 * - All number params use coerce for query string conversion
 * - Smart sort modes (WISH-2014): bestValue, expiringSoon, hiddenGems
 */
export const WishlistQueryParamsSchema = z.object({
  // Search
  q: z.string().optional(),

  // Filtering
  // WISH-20171: Store filter as array
  store: z.array(WishlistStoreSchema).optional(),

  tags: z.string().optional(), // comma-separated

  // Keep single priority for backward compatibility
  priority: z.coerce
    .number()
    .int({ message: 'Priority must be a whole number' })
    .min(0, { message: 'Priority must be between 0 and 5' })
    .max(5, { message: 'Priority must be between 0 and 5' })
    .optional(),

  // WISH-20171: Priority range filter
  priorityRange: z
    .object({
      min: z.number().int().min(0).max(5),
      max: z.number().int().min(0).max(5),
    })
    .refine(val => val.min <= val.max, {
      message: 'Priority range min must be <= max',
    })
    .optional(),

  // WISH-20171: Price range filter
  priceRange: z
    .object({
      min: z.number().min(0),
      max: z.number().min(0),
    })
    .refine(val => val.min <= val.max, {
      message: 'Price range min must be <= max',
    })
    .optional(),

  status: ItemStatusSchema.optional().default('wishlist'), // SETS-MVP-001: Filter by lifecycle status

  // Sorting
  sort: WishlistSortFieldSchema.optional(),
  order: z
    .enum(['asc', 'desc'], {
      errorMap: () => ({ message: "Sort order must be 'asc' or 'desc'" }),
    })
    .optional(),

  // Pagination
  page: z.coerce
    .number()
    .int({ message: 'Page number must be a whole number' })
    .min(1, { message: 'Page number must be at least 1' })
    .default(1),
  limit: z.coerce
    .number()
    .int({ message: 'Limit must be a whole number' })
    .min(1, { message: 'Limit must be at least 1' })
    .max(100, { message: 'Limit cannot exceed 100 items' })
    .default(20),
})

export type WishlistQueryParams = z.infer<typeof WishlistQueryParamsSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Pagination Schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pagination metadata schema for list responses.
 * Included in all paginated API responses.
 */
export const PaginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
})

export type Pagination = z.infer<typeof PaginationSchema>

// ─────────────────────────────────────────────────────────────────────────────
// List Response Schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Response schema for wishlist list endpoint (GET /api/wishlist).
 * Includes items, pagination, and optional counts/filters metadata.
 */
export const WishlistListResponseSchema = z.object({
  items: z.array(WishlistItemSchema),
  pagination: PaginationSchema,
  counts: z
    .object({
      total: z.number().int(),
      byStore: z.record(z.string(), z.number()),
    })
    .optional(),
  filters: z
    .object({
      availableTags: z.array(z.string()),
      availableStores: z.array(z.string()),
    })
    .optional(),
})

export type WishlistListResponse = z.infer<typeof WishlistListResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Reorder Schema (for drag-and-drop)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Single item reorder schema for individual drag operations.
 * @deprecated Use BatchReorderSchema for batch operations.
 */
export const ReorderWishlistItemSchema = z.object({
  itemId: z.string().regex(uuidPattern, { message: 'Invalid UUID format' }),
  newSortOrder: z
    .number()
    .int({ message: 'Sort order must be a whole number' })
    .min(0, { message: 'Sort order cannot be negative' }),
})

export type ReorderWishlistItem = z.infer<typeof ReorderWishlistItemSchema>

/**
 * Batch reorder schema for drag-and-drop operations (PUT /api/wishlist/reorder).
 * Accepts an array of {id, sortOrder} pairs for bulk updates.
 * Story: WISH-2005a
 */
export const BatchReorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().regex(uuidPattern, { message: 'Invalid item ID in reorder list' }),
        sortOrder: z
          .number()
          .int({ message: 'Sort order must be a whole number' })
          .min(0, { message: 'Sort order cannot be negative' }),
      }),
    )
    .min(1, { message: 'At least one item is required for reordering' }),
})

export type BatchReorder = z.infer<typeof BatchReorderSchema>

/**
 * Reorder response schema (from PUT /api/wishlist/reorder)
 * Story WISH-2005a: Drag-and-drop reordering
 */
export const ReorderResponseSchema = z.object({
  updated: z.number().int().min(0),
})

export type ReorderResponse = z.infer<typeof ReorderResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Presigned URL Schema (for image upload)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Request schema for presigned URL generation (POST /api/wishlist/presign).
 * Used for S3 image uploads.
 */
export const PresignRequestSchema = z.object({
  fileName: z.string().min(1, { message: 'File name is required' }),
  mimeType: z.string().min(1, { message: 'MIME type is required' }),
})

export type PresignRequest = z.infer<typeof PresignRequestSchema>

/**
 * Response schema for presigned URL generation.
 * Contains the S3 presigned URL, key, and expiration time.
 */
export const PresignResponseSchema = z.object({
  presignedUrl: z.string().url({ message: 'Invalid presigned URL format' }),
  key: z.string(),
  expiresIn: z.number().int().positive(),
})

export type PresignResponse = z.infer<typeof PresignResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Purchase Schema (WISH-2042)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Input schema for marking a wishlist item as purchased.
 * Creates a Set item and optionally removes from wishlist.
 */
export const MarkAsPurchasedInputSchema = z.object({
  /**
   * Price paid for the item (must be >= 0 if provided)
   */
  pricePaid: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, {
      message: 'Price must be a valid decimal with up to 2 decimal places',
    })
    .optional()
    .refine(val => val === undefined || val === '' || parseFloat(val) >= 0, {
      message: 'Price cannot be negative',
    }),

  /**
   * Tax paid (must be >= 0 if provided)
   */
  tax: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, {
      message: 'Tax must be a valid decimal with up to 2 decimal places',
    })
    .optional()
    .or(z.literal(''))
    .refine(val => val === undefined || val === '' || parseFloat(val) >= 0, {
      message: 'Tax cannot be negative',
    }),

  /**
   * Shipping cost (must be >= 0 if provided)
   */
  shipping: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, {
      message: 'Shipping must be a valid decimal with up to 2 decimal places',
    })
    .optional()
    .or(z.literal(''))
    .refine(val => val === undefined || val === '' || parseFloat(val) >= 0, {
      message: 'Shipping cannot be negative',
    }),

  /**
   * Quantity purchased (must be >= 1)
   */
  quantity: z.number().int().min(1, { message: 'Quantity must be at least 1' }).default(1),

  /**
   * Date of purchase (must be <= today if provided)
   * ISO datetime string
   */
  purchaseDate: z.string().datetime({ message: 'Invalid purchase date format' }).optional(),

  /**
   * If true, keep the item on the wishlist after purchase
   * If false (default), delete from wishlist
   */
  keepOnWishlist: z.boolean().default(false),
})

export type MarkAsPurchasedInput = z.infer<typeof MarkAsPurchasedInputSchema>

/**
 * Form values schema for the GotItModal component.
 * Uses numbers for price fields (converted to strings before API call).
 */
export const GotItFormSchema = z.object({
  pricePaid: z
    .string()
    .optional()
    .refine(val => !val || /^\d+(\.\d{1,2})?$/.test(val), {
      message: 'Price must be a valid decimal with up to 2 decimal places',
    }),
  tax: z
    .string()
    .optional()
    .refine(val => !val || /^\d+(\.\d{1,2})?$/.test(val), {
      message: 'Tax must be a valid decimal with up to 2 decimal places',
    }),
  shipping: z
    .string()
    .optional()
    .refine(val => !val || /^\d+(\.\d{1,2})?$/.test(val), {
      message: 'Shipping must be a valid decimal with up to 2 decimal places',
    }),
  quantity: z.number().int().min(1, { message: 'Quantity must be at least 1' }).default(1),
  purchaseDate: z.string().optional(),
  keepOnWishlist: z.boolean().default(false),
})

export type GotItFormValues = z.infer<typeof GotItFormSchema>

/**
 * Set item schema (response from purchase endpoint)
 */
export const SetItemSchema = z.object({
  id: z.string().regex(uuidPattern, { message: 'Invalid UUID format' }),
  userId: z.string().regex(uuidPattern, { message: 'Invalid UUID format' }),
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
  wishlistItemId: z.string().regex(uuidPattern, { message: 'Invalid UUID format' }).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type SetItem = z.infer<typeof SetItemSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Collection Management Operations (SETS-MVP-001)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema for marking a wishlist item as purchased/owned.
 * PATCH /wishlist/:id/purchase
 *
 * Sets status='owned' and records purchase details.
 */
export const MarkAsPurchasedSchema = z.object({
  purchaseDate: z.string().datetime({ message: 'Invalid purchase date format' }).optional(),
  purchasePrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, {
      message: 'Price must be a valid decimal with up to 2 decimal places',
    })
    .optional()
    .or(z.literal('')),
  purchaseTax: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, {
      message: 'Tax must be a valid decimal with up to 2 decimal places',
    })
    .optional()
    .or(z.literal('')),
  purchaseShipping: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, {
      message: 'Shipping must be a valid decimal with up to 2 decimal places',
    })
    .optional()
    .or(z.literal('')),
})

export type MarkAsPurchased = z.infer<typeof MarkAsPurchasedSchema>

/**
 * Schema for purchase details input in GotItModal purchase flow.
 * SETS-MVP-0310: Extended purchase flow with build status tracking.
 *
 * This schema is used for the purchase details step where users can:
 * - Enter purchase date (defaults to today)
 * - Enter purchase price (pre-filled with retail price if available)
 * - Enter tax and shipping costs
 * - Set initial build status (defaults to 'not_started')
 *
 * All fields are optional to support "Skip" flow with minimal data.
 */
export const PurchaseDetailsInputSchema = z.object({
  purchaseDate: z.string().datetime({ message: 'Invalid purchase date format' }).optional(),
  purchasePrice: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, {
      message: 'Price must be a valid decimal with up to 2 decimal places',
    })
    .optional()
    .or(z.literal('')),
  purchaseTax: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, {
      message: 'Tax must be a valid decimal with up to 2 decimal places',
    })
    .optional()
    .or(z.literal('')),
  purchaseShipping: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, {
      message: 'Shipping must be a valid decimal with up to 2 decimal places',
    })
    .optional()
    .or(z.literal('')),
  buildStatus: BuildStatusSchema.optional().default('not_started'),
})

export type PurchaseDetailsInput = z.infer<typeof PurchaseDetailsInputSchema>

/**
 * Schema for updating build status of owned items.
 * PATCH /wishlist/:id/build-status
 *
 * Only valid when status='owned'.
 */
export const UpdateBuildStatusSchema = z.object({
  buildStatus: BuildStatusSchema,
})

export type UpdateBuildStatus = z.infer<typeof UpdateBuildStatusSchema>
