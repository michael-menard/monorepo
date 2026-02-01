import { z } from 'zod'

/**
 * Wishlist Domain Types
 *
 * Zod schemas for validation + type inference.
 *
 * @remarks
 * These schemas are aligned with @repo/api-client/schemas/wishlist but use
 * z.date() for timestamps because Drizzle returns Date objects from the database.
 * The API client uses z.string().datetime() for JSON serialization.
 *
 * WISH-2010: Schema alignment with @repo/api-client
 */

// ─────────────────────────────────────────────────────────────────────────
// Image Variants Types (WISH-2016)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Image format enum for optimized images
 */
export const ImageFormatSchema = z.enum(['jpeg', 'webp', 'png'])
export type ImageFormat = z.infer<typeof ImageFormatSchema>

/**
 * Metadata for a single image variant
 */
export const ImageVariantMetadataSchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().positive(),
  format: ImageFormatSchema,
  watermarked: z.boolean().optional(),
})

export type ImageVariantMetadata = z.infer<typeof ImageVariantMetadataSchema>

/**
 * Processing status for image optimization
 */
export const ImageProcessingStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed'])
export type ImageProcessingStatus = z.infer<typeof ImageProcessingStatusSchema>

/**
 * Complete image variants structure (stored in database JSONB)
 *
 * WISH-2016: Image Optimization
 */
export const ImageVariantsSchema = z.object({
  original: ImageVariantMetadataSchema.optional(),
  thumbnail: ImageVariantMetadataSchema.optional(),
  medium: ImageVariantMetadataSchema.optional(),
  large: ImageVariantMetadataSchema.optional(),
  processingStatus: ImageProcessingStatusSchema.optional(),
  processedAt: z.string().datetime().optional(),
  error: z.string().optional(),
})

export type ImageVariants = z.infer<typeof ImageVariantsSchema>

// ─────────────────────────────────────────────────────────────────────────
// Wishlist Item Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * Internal wishlist item schema for database results.
 * Uses z.date() for timestamps because Drizzle returns Date objects.
 *
 * @see {@link @repo/api-client/schemas/wishlist#WishlistItemSchema} for API version
 */
export const WishlistItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  store: z.string(),
  setNumber: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  imageVariants: ImageVariantsSchema.nullable().optional().default(null),
  price: z.string().nullable(),
  currency: z.string().nullable(),
  pieceCount: z.number().int().nullable(),
  releaseDate: z.date().nullable(),
  tags: z.array(z.string()).nullable(),
  priority: z.number().int().nullable(),
  notes: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type WishlistItem = z.infer<typeof WishlistItemSchema>

/**
 * Schema for creating wishlist items (POST body validation).
 * Aligned with @repo/api-client CreateWishlistItemSchema.
 */
export const CreateWishlistItemInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  store: z.string().min(1, 'Store is required').max(100, 'Store must be less than 100 characters'),
  setNumber: z.string().max(50).optional(),
  sourceUrl: z.string().url('Invalid URL format').optional(),
  imageUrl: z.string().url('Invalid URL format').optional(),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid decimal')
    .optional(),
  currency: z.string().max(10).default('USD'),
  pieceCount: z.number().int().nonnegative().optional(),
  releaseDate: z.string().datetime().optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  priority: z.number().int().min(0).max(5).default(0),
  notes: z.string().max(2000, 'Notes must be less than 2000 characters').optional(),
})

export type CreateWishlistItemInput = z.infer<typeof CreateWishlistItemInputSchema>

/**
 * Schema for updating wishlist items (PATCH body validation).
 * All fields optional for partial updates.
 * Aligned with @repo/api-client UpdateWishlistItemSchema.
 */
export const UpdateWishlistItemInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  store: z.string().min(1).max(100).optional(),
  setNumber: z.string().max(50).optional().nullable(),
  sourceUrl: z.string().url().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  price: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
    .nullable(),
  currency: z.string().max(10).optional(),
  pieceCount: z.number().int().nonnegative().optional().nullable(),
  releaseDate: z.string().datetime().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  priority: z.number().int().min(0).max(5).optional(),
  notes: z.string().max(2000).optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
})

export type UpdateWishlistItemInput = z.infer<typeof UpdateWishlistItemInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Query Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * Query parameters schema for listing wishlist items.
 * Supports search, filtering, sorting, and pagination.
 * Aligned with @repo/api-client WishlistQueryParamsSchema.
 */
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

export const ListWishlistQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  store: z.string().max(100).optional(),
  tags: z.string().optional(), // comma-separated
  priority: z.coerce.number().int().min(0).max(5).optional(),
  sort: WishlistSortFieldSchema.default('sortOrder'),
  order: z.enum(['asc', 'desc']).default('asc'),
})

export type ListWishlistQuery = z.infer<typeof ListWishlistQuerySchema>

// ─────────────────────────────────────────────────────────────────────────
// Reorder Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * Single item in a reorder batch request.
 */
export const ReorderWishlistItemSchema = z.object({
  id: z.string().uuid('Invalid item ID format'),
  sortOrder: z.number().int().min(0, 'Sort order must be a non-negative integer'),
})

/**
 * Batch reorder request schema.
 * Used for drag-and-drop reordering (WISH-2005a).
 * Aligned with @repo/api-client BatchReorderSchema.
 */
export const ReorderWishlistInputSchema = z.object({
  items: z.array(ReorderWishlistItemSchema).min(1, 'At least one item is required'),
})

export type ReorderWishlistInput = z.infer<typeof ReorderWishlistInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Presign Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * Maximum file size in bytes (10MB)
 * WISH-2013: Consistent with storage adapter limit
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Request schema for presigned URL generation (GET /api/wishlist/images/presign).
 * Used for S3 image uploads.
 * Aligned with @repo/api-client PresignRequestSchema.
 *
 * WISH-2013: Added optional fileSize for server-side validation
 */
export const PresignRequestSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  mimeType: z.string().min(1, 'MIME type is required'),
  fileSize: z.coerce.number().int().positive().optional(),
})

export type PresignRequest = z.infer<typeof PresignRequestSchema>

/**
 * Response schema for presigned URL generation.
 * Contains the S3 presigned URL, key, and expiration time.
 * Aligned with @repo/api-client PresignResponseSchema.
 */
export const PresignResponseSchema = z.object({
  presignedUrl: z.string().url(),
  key: z.string(),
  expiresIn: z.number().int().positive(),
})

export type PresignResponse = z.infer<typeof PresignResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// Purchase Types (WISH-2042)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Input schema for marking a wishlist item as purchased.
 * Creates a Set item and optionally deletes the Wishlist item.
 * Aligned with @repo/api-client MarkAsPurchasedInputSchema.
 */
export const MarkAsPurchasedInputSchema = z.object({
  /**
   * Price paid for the item (must be >= 0 if provided)
   * Stored as string for decimal precision
   */
  pricePaid: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid decimal')
    .optional()
    .refine(val => val === undefined || parseFloat(val) >= 0, {
      message: 'Price must be >= 0',
    }),

  /**
   * Tax paid (must be >= 0 if provided)
   * Stored as string for decimal precision
   */
  tax: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Tax must be a valid decimal')
    .optional()
    .refine(val => val === undefined || parseFloat(val) >= 0, {
      message: 'Tax must be >= 0',
    }),

  /**
   * Shipping cost (must be >= 0 if provided)
   * Stored as string for decimal precision
   */
  shipping: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Shipping must be a valid decimal')
    .optional()
    .refine(val => val === undefined || parseFloat(val) >= 0, {
      message: 'Shipping must be >= 0',
    }),

  /**
   * Quantity purchased (must be >= 1)
   */
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),

  /**
   * Date of purchase (must be <= today if provided)
   * Defaults to today if not provided
   */
  purchaseDate: z
    .string()
    .datetime()
    .optional()
    .refine(
      val => {
        if (!val) return true
        const purchaseDate = new Date(val)
        const today = new Date()
        today.setHours(23, 59, 59, 999) // End of today
        return purchaseDate <= today
      },
      { message: 'Purchase date cannot be in the future' },
    ),

  /**
   * If true, keep the item on the wishlist after purchase
   * If false (default), delete from wishlist
   */
  keepOnWishlist: z.boolean().default(false),
})

export type MarkAsPurchasedInput = z.infer<typeof MarkAsPurchasedInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Error Types (Backend-specific)
// ─────────────────────────────────────────────────────────────────────────

export type WishlistError =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'DB_ERROR'
  | 'SET_CREATION_FAILED'
  | 'IMAGE_COPY_FAILED'

export type PresignError = 'INVALID_EXTENSION' | 'INVALID_MIME_TYPE' | 'PRESIGN_FAILED'
