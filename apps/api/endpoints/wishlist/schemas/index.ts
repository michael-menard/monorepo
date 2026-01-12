/**
 * Zod Validation Schemas for Wishlist API
 *
 * Updated to match PRD data model for Epic 6: Wishlist (wish-2000)
 */

import { z } from 'zod'

/**
 * Create Wishlist Item Request Schema
 */
export const CreateWishlistItemSchema = z.object({
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

export type CreateWishlistItemRequest = z.infer<typeof CreateWishlistItemSchema>

/**
 * Update Wishlist Item Request Schema (all fields optional for PATCH)
 */
export const UpdateWishlistItemSchema = z.object({
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

export type UpdateWishlistItemRequest = z.infer<typeof UpdateWishlistItemSchema>

/**
 * Reorder Wishlist Request Schema
 */
export const ReorderWishlistItemSchema = z.object({
  id: z.string().uuid('Invalid item ID format'),
  sortOrder: z.number().int().min(0, 'Sort order must be a non-negative integer'),
})

export const ReorderWishlistSchema = z.object({
  items: z.array(ReorderWishlistItemSchema).min(1, 'At least one item is required'),
})

export type ReorderWishlistRequest = z.infer<typeof ReorderWishlistSchema>

/**
 * Query Parameters Schema for List Wishlist Items
 */
export const ListWishlistQuerySchema = z.object({
  store: z.string().max(100).optional(),
  priority: z.coerce.number().int().min(0).max(5).optional(),
  tags: z.string().optional(), // comma-separated
  search: z.string().max(200).optional(),
})

export type ListWishlistQuery = z.infer<typeof ListWishlistQuerySchema>

/**
 * Search Wishlist Items Query Parameters Schema
 * Story 3.8: Search with pagination support
 */
export const SearchWishlistQuerySchema = z.object({
  search: z
    .string()
    .min(1, 'Search query is required')
    .max(200, 'Search query must be less than 200 characters'),
  page: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1, 'Page must be >= 1')),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().min(1).max(100, 'Limit must be between 1 and 100')),
})

export type SearchWishlistQuery = z.infer<typeof SearchWishlistQuerySchema>

/**
 * Path Parameter Schema
 */
export const WishlistItemIdSchema = z.object({
  id: z.string().uuid('Invalid item ID format'),
})

export type WishlistItemIdParams = z.infer<typeof WishlistItemIdSchema>

/**
 * Mark Wishlist Item Purchased Request Schema
 */
export const MarkWishlistItemPurchasedSchema = z.object({
  purchasePrice: z.number().nonnegative(),
  purchaseTax: z.number().nonnegative().optional(),
  purchaseShipping: z.number().nonnegative().optional(),
  quantity: z.number().int().min(1).default(1),
  purchaseDate: z.string().datetime(),
  keepOnWishlist: z.boolean().default(false),
})

export type MarkWishlistItemPurchasedRequest = z.infer<typeof MarkWishlistItemPurchasedSchema>

/**
 * Wishlist Item Response Schema (matches database schema)
 */
export const WishlistItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  store: z.string(),
  setNumber: z.string().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  price: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  pieceCount: z.number().int().nullable().optional(),
  releaseDate: z.date().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  priority: z.number().int().nullable().optional(),
  notes: z.string().nullable().optional(),
  sortOrder: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type WishlistItem = z.infer<typeof WishlistItemSchema>

/**
 * Mark As Purchased Request Schema
 * Story wish-2004: Got It Flow
 */
export const MarkPurchasedRequestSchema = z.object({
  purchasePrice: z.number().nonnegative('Price must be non-negative'),
  purchaseTax: z.number().nonnegative('Tax must be non-negative').optional(),
  purchaseShipping: z.number().nonnegative('Shipping must be non-negative').optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
  purchaseDate: z.string().datetime('Invalid date format'),
  keepOnWishlist: z.boolean().default(false),
})

export type MarkPurchasedRequest = z.infer<typeof MarkPurchasedRequestSchema>

/**
 * Mark As Purchased Response Schema
 */
export const MarkPurchasedResponseSchema = z.object({
  message: z.string(),
  newSetId: z.string().uuid().nullable(),
  removedFromWishlist: z.boolean(),
  undoToken: z.string().optional(),
})

export type MarkPurchasedResponse = z.infer<typeof MarkPurchasedResponseSchema>
