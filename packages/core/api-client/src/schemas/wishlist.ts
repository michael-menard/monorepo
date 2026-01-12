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

export const WishlistStoreSchema = z.enum(['LEGO', 'Barweer', 'Cata', 'BrickLink', 'Other'])
export type WishlistStore = z.infer<typeof WishlistStoreSchema>

export const CurrencySchema = z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])
export type Currency = z.infer<typeof CurrencySchema>

// ─────────────────────────────────────────────────────────────────────────────
// Base Wishlist Item Schema (from database)
// ─────────────────────────────────────────────────────────────────────────────

export const WishlistItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),

  // Core fields (required)
  title: z.string().min(1),
  store: z.string().min(1),

  // Identification
  setNumber: z.string().nullable(),
  sourceUrl: z.string().url().nullable(),

  // Image
  imageUrl: z.string().url().nullable(),

  // Pricing
  price: z.string().nullable(), // Decimal as string for precision
  currency: z.string().default('USD'),

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
})

export type WishlistItem = z.infer<typeof WishlistItemSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Create Schema (POST body)
// ─────────────────────────────────────────────────────────────────────────────

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

export const UpdateWishlistItemSchema = CreateWishlistItemSchema.partial()

export type UpdateWishlistItem = z.infer<typeof UpdateWishlistItemSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Query Parameters Schema (GET list)
// ─────────────────────────────────────────────────────────────────────────────

export const WishlistQueryParamsSchema = z.object({
  // Search
  q: z.string().optional(),

  // Filtering
  store: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  priority: z.coerce.number().int().min(0).max(5).optional(),

  // Sorting
  sort: z.enum(['createdAt', 'title', 'price', 'pieceCount', 'sortOrder', 'priority']).optional(),
  order: z.enum(['asc', 'desc']).optional(),

  // Pagination
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type WishlistQueryParams = z.infer<typeof WishlistQueryParamsSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Pagination Schema
// ─────────────────────────────────────────────────────────────────────────────

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

export const ReorderWishlistItemSchema = z.object({
  itemId: z.string().uuid(),
  newSortOrder: z.number().int().min(0),
})

export type ReorderWishlistItem = z.infer<typeof ReorderWishlistItemSchema>

export const BatchReorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    }),
  ),
})

export type BatchReorder = z.infer<typeof BatchReorderSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Mark As Purchased Schema (POST body)
// Story wish-2004: Got It Flow
// ─────────────────────────────────────────────────────────────────────────────

export const MarkPurchasedRequestSchema = z.object({
  purchasePrice: z.number().nonnegative(),
  purchaseTax: z.number().nonnegative().optional(),
  purchaseShipping: z.number().nonnegative().optional(),
  quantity: z.number().int().min(1).default(1),
  purchaseDate: z.string().datetime(),
  keepOnWishlist: z.boolean().default(false),
})

export type MarkPurchasedRequest = z.infer<typeof MarkPurchasedRequestSchema>

export const MarkPurchasedResponseSchema = z.object({
  message: z.string(),
  newSetId: z.string().uuid().nullable(),
  removedFromWishlist: z.boolean(),
  undoToken: z.string().optional(),
})

export type MarkPurchasedResponse = z.infer<typeof MarkPurchasedResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Delete Response Schema
// ─────────────────────────────────────────────────────────────────────────────

export const DeleteWishlistItemResponseSchema = z.object({
  id: z.string().uuid(),
  message: z.string().optional(),
})

export type DeleteWishlistItemResponse = z.infer<typeof DeleteWishlistItemResponseSchema>
