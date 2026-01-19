/**
 * Internal Types for Wishlist Core Package
 *
 * Zod schemas for internal data structures used by wishlist-core functions.
 */

import { z } from 'zod'

/**
 * Wishlist Item Schema
 *
 * Represents a single wishlist item as returned by the API.
 */
export const WishlistItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  store: z.string(),
  setNumber: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
  price: z.string().nullable(),
  currency: z.string().nullable(),
  pieceCount: z.number().int().nullable(),
  releaseDate: z.string().nullable(), // ISO date string
  tags: z.array(z.string()).nullable(),
  priority: z.number().int().nullable(),
  notes: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string(), // ISO date string
  updatedAt: z.string(), // ISO date string
})

export type WishlistItem = z.infer<typeof WishlistItemSchema>

/**
 * Pagination Schema
 */
export const PaginationSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
})

export type Pagination = z.infer<typeof PaginationSchema>

/**
 * Wishlist List Response Schema
 */
export const WishlistListResponseSchema = z.object({
  items: z.array(WishlistItemSchema),
  pagination: PaginationSchema,
})

export type WishlistListResponse = z.infer<typeof WishlistListResponseSchema>

/**
 * List Wishlist Items Filter Options
 */
export const ListWishlistFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

export type ListWishlistFilters = z.infer<typeof ListWishlistFiltersSchema>

/**
 * Search Wishlist Items Filter Options
 */
export const SearchWishlistFiltersSchema = z.object({
  q: z.string().min(1),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

export type SearchWishlistFilters = z.infer<typeof SearchWishlistFiltersSchema>

/**
 * Database row shape for wishlist item
 *
 * Represents raw DB query result.
 */
export const WishlistRowSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  store: z.string(),
  setNumber: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  imageUrl: z.string().nullable(),
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

export type WishlistRow = z.infer<typeof WishlistRowSchema>

/**
 * Create Wishlist Item Input Schema
 *
 * Validation for creating a new wishlist item.
 * - title: Required, non-empty string
 * - store: Required, non-empty string
 * - priority: Optional integer 0-5 inclusive, defaults to 0
 */
export const CreateWishlistInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  store: z.string().min(1, 'Store is required'),
  setNumber: z.string().optional(),
  sourceUrl: z.string().optional(),
  price: z.string().optional(),
  currency: z.string().optional(),
  pieceCount: z.number().int().positive().optional(),
  releaseDate: z.string().optional(), // ISO 8601 date string
  tags: z.array(z.string()).optional(),
  priority: z.number().int().min(0).max(5).optional(),
  notes: z.string().optional(),
})

export type CreateWishlistInput = z.infer<typeof CreateWishlistInputSchema>

/**
 * Update Wishlist Item Input Schema
 *
 * Validation for updating an existing wishlist item.
 * All fields are optional (patch semantics).
 */
export const UpdateWishlistInputSchema = z.object({
  title: z.string().min(1).optional(),
  store: z.string().min(1).optional(),
  setNumber: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  price: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  pieceCount: z.number().int().positive().nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  priority: z.number().int().min(0).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
})

export type UpdateWishlistInput = z.infer<typeof UpdateWishlistInputSchema>

// UUID regex - accepts standard format (8-4-4-4-12 hex chars)
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Reorder Item Schema
 *
 * Single item in reorder request.
 */
export const ReorderItemSchema = z.object({
  id: z.string().regex(uuidRegex, 'Invalid item ID format'),
  sortOrder: z.number().int().min(0),
})

export type ReorderItem = z.infer<typeof ReorderItemSchema>

/**
 * Reorder Wishlist Input Schema
 *
 * Validation for reordering wishlist items.
 */
export const ReorderWishlistInputSchema = z.object({
  items: z.array(ReorderItemSchema).min(1, 'Items array cannot be empty'),
})

export type ReorderWishlistInput = z.infer<typeof ReorderWishlistInputSchema>
