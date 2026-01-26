import { z } from 'zod'

/**
 * Wishlist Domain Types
 *
 * Zod schemas for validation + type inference
 */

// ─────────────────────────────────────────────────────────────────────────
// Wishlist Item Types
// ─────────────────────────────────────────────────────────────────────────

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
  releaseDate: z.date().nullable(),
  tags: z.array(z.string()).nullable(),
  priority: z.number().int().nullable(),
  notes: z.string().nullable(),
  sortOrder: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type WishlistItem = z.infer<typeof WishlistItemSchema>

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

export const ListWishlistQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  store: z.string().max(100).optional(),
  tags: z.string().optional(), // comma-separated
  priority: z.coerce.number().int().min(0).max(5).optional(),
  sort: z.enum(['createdAt', 'title', 'price', 'pieceCount', 'sortOrder', 'priority']).default('sortOrder'),
  order: z.enum(['asc', 'desc']).default('asc'),
})

export type ListWishlistQuery = z.infer<typeof ListWishlistQuerySchema>

// ─────────────────────────────────────────────────────────────────────────
// Reorder Types
// ─────────────────────────────────────────────────────────────────────────

export const ReorderWishlistItemSchema = z.object({
  id: z.string().uuid('Invalid item ID format'),
  sortOrder: z.number().int().min(0, 'Sort order must be a non-negative integer'),
})

export const ReorderWishlistInputSchema = z.object({
  items: z.array(ReorderWishlistItemSchema).min(1, 'At least one item is required'),
})

export type ReorderWishlistInput = z.infer<typeof ReorderWishlistInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────

export type WishlistError =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'DB_ERROR'
