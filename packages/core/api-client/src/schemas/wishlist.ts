/**
 * Wishlist Zod Schemas
 *
 * Runtime validation and type inference for wishlist operations.
 * All types are derived from Zod schemas using z.infer<>.
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
export const WishlistStoreSchema = z.enum(['LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other'])
export type WishlistStore = z.infer<typeof WishlistStoreSchema>

/**
 * Currency enum schema for wishlist pricing.
 * Matches the `wishlist_currency` PostgreSQL enum from WISH-2000.
 * @example CurrencySchema.parse('USD') // 'USD'
 */
export const CurrencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])
export type Currency = z.infer<typeof CurrencySchema>

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
 */
export const WishlistItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),

  // Core fields (required)
  title: z.string().min(1),
  store: WishlistStoreSchema,

  // Identification
  setNumber: z.string().nullable(),
  sourceUrl: z.string().url().nullable(),

  // Image
  imageUrl: z.string().url().nullable(),

  // Pricing
  price: z.string().nullable(), // Decimal as string for precision
  currency: CurrencySchema.default('USD'),

  // Details
  pieceCount: z.number().int().nonnegative().nullable(),
  releaseDate: z.string().datetime().nullable(),
  tags: z.array(z.string()).default([]),

  // User organization
  priority: z.number().int().min(0).max(5).default(0),
  notes: z.string().nullable(),
  sortOrder: z.number().int(),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),

  // Audit fields (WISH-2000 enhancement)
  createdBy: z.string().nullable(),
  updatedBy: z.string().nullable(),
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
  title: z.string().min(1, 'Title is required'),
  store: z.string().min(1, 'Store is required'),
  setNumber: z.string().optional(),
  sourceUrl: z.string().url('Invalid URL').optional().or(z.literal('')),
  imageUrl: z.string().url().optional(),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid decimal')
    .optional()
    .or(z.literal('')),
  currency: z.string().default('USD'),
  pieceCount: z.number().int().nonnegative().optional(),
  releaseDate: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
  priority: z.number().int().min(0).max(5).default(0),
  notes: z.string().optional(),
})

export type CreateWishlistItem = z.infer<typeof CreateWishlistItemSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Update Schema (PATCH body - all fields optional)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schema for updating existing wishlist items (PATCH /api/wishlist/:id).
 * All fields are optional for partial updates.
 * Derived from CreateWishlistItemSchema using `.partial()`.
 */
export const UpdateWishlistItemSchema = CreateWishlistItemSchema.partial()

export type UpdateWishlistItem = z.infer<typeof UpdateWishlistItemSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Query Parameters Schema (GET list)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sort field enum for wishlist queries.
 * Includes standard column sorts and smart sorting algorithms (WISH-2014).
 */
export const WishlistSortFieldSchema = z.enum([
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
])

export type WishlistSortField = z.infer<typeof WishlistSortFieldSchema>

/**
 * Query parameters schema for listing wishlist items (GET /api/wishlist).
 * Supports search, filtering, sorting, and pagination.
 *
 * @remarks
 * - `q` is the search string for title matching
 * - `tags` is comma-separated for multi-tag filtering
 * - `page` defaults to 1, `limit` defaults to 20 (max 100)
 * - All number params use coerce for query string conversion
 * - Smart sort modes (WISH-2014): bestValue, expiringSoon, hiddenGems
 */
export const WishlistQueryParamsSchema = z.object({
  // Search
  q: z.string().optional(),

  // Filtering
  store: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  priority: z.coerce.number().int().min(0).max(5).optional(),

  // Sorting
  sort: WishlistSortFieldSchema.optional(),
  order: z.enum(['asc', 'desc']).optional(),

  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
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
  itemId: z.string().uuid(),
  newSortOrder: z.number().int().min(0),
})

export type ReorderWishlistItem = z.infer<typeof ReorderWishlistItemSchema>

/**
 * Batch reorder schema for drag-and-drop operations (PUT /api/wishlist/reorder).
 * Accepts an array of {id, sortOrder} pairs for bulk updates.
 * Story: WISH-2005a
 */
export const BatchReorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    }),
  ),
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
  fileName: z.string().min(1, 'File name is required'),
  mimeType: z.string().min(1, 'MIME type is required'),
})

export type PresignRequest = z.infer<typeof PresignRequestSchema>

/**
 * Response schema for presigned URL generation.
 * Contains the S3 presigned URL, key, and expiration time.
 */
export const PresignResponseSchema = z.object({
  presignedUrl: z.string().url(),
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
    .regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid decimal')
    .optional()
    .refine(val => val === undefined || val === '' || parseFloat(val) >= 0, {
      message: 'Price must be >= 0',
    }),

  /**
   * Tax paid (must be >= 0 if provided)
   */
  tax: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Tax must be a valid decimal')
    .optional()
    .or(z.literal(''))
    .refine(val => val === undefined || val === '' || parseFloat(val) >= 0, {
      message: 'Tax must be >= 0',
    }),

  /**
   * Shipping cost (must be >= 0 if provided)
   */
  shipping: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Shipping must be a valid decimal')
    .optional()
    .or(z.literal(''))
    .refine(val => val === undefined || val === '' || parseFloat(val) >= 0, {
      message: 'Shipping must be >= 0',
    }),

  /**
   * Quantity purchased (must be >= 1)
   */
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),

  /**
   * Date of purchase (must be <= today if provided)
   * ISO datetime string
   */
  purchaseDate: z.string().datetime().optional(),

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
      message: 'Price must be a valid decimal',
    }),
  tax: z
    .string()
    .optional()
    .refine(val => !val || /^\d+(\.\d{1,2})?$/.test(val), {
      message: 'Tax must be a valid decimal',
    }),
  shipping: z
    .string()
    .optional()
    .refine(val => !val || /^\d+(\.\d{1,2})?$/.test(val), {
      message: 'Shipping must be a valid decimal',
    }),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  purchaseDate: z.string().optional(),
  keepOnWishlist: z.boolean().default(false),
})

export type GotItFormValues = z.infer<typeof GotItFormSchema>

/**
 * Set item schema (response from purchase endpoint)
 */
export const SetItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
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
  wishlistItemId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type SetItem = z.infer<typeof SetItemSchema>
