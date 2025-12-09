/**
 * Wishlist Type Definitions
 *
 * Zod schemas and TypeScript types for Wishlist API.
 */

import { z } from 'zod'

// ============================================================================
// Wishlist Item Schema
// ============================================================================

/**
 * Wishlist Item Entity Schema
 */
export const WishlistItemSchema = z.object({
  /** Unique wishlist item record ID */
  id: z.string().uuid(),

  /** UUID of the user who owns this item */
  userId: z.string(),

  /** Item title */
  title: z.string().min(1).max(255),

  /** Item description */
  description: z.string().max(1000).nullable().optional(),

  /** Link to product page */
  productLink: z.string().url().nullable().optional(),

  /** Image URL */
  imageUrl: z.string().url().nullable().optional(),

  /** Image width in pixels */
  imageWidth: z.number().int().min(1).max(5000).nullable().optional(),

  /** Image height in pixels */
  imageHeight: z.number().int().min(1).max(5000).nullable().optional(),

  /** LEGO category (e.g., "Speed Champions", "Modular", "Star Wars") */
  category: z.string().max(100).nullable().optional(),

  /** Sort order for display */
  sortOrder: z.string(),

  /** When item was added */
  createdAt: z.date(),

  /** Last modification timestamp */
  updatedAt: z.date(),
})

export type WishlistItem = z.infer<typeof WishlistItemSchema>

/**
 * Create Wishlist Item Schema
 */
export const CreateWishlistItemSchema = z.object({
  /** Item title */
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),

  /** Item description */
  description: z.string().max(1000, 'Description too long').optional(),

  /** Link to product page */
  productLink: z.string().url('Must be a valid URL').optional(),

  /** Image URL */
  imageUrl: z.string().url('Must be a valid URL').optional(),

  /** Image width in pixels */
  imageWidth: z.number().int().min(1).max(5000).optional(),

  /** Image height in pixels */
  imageHeight: z.number().int().min(1).max(5000).optional(),

  /** LEGO category */
  category: z.string().max(100, 'Category too long').optional(),

  /** Sort order for display */
  sortOrder: z.string().min(1, 'Sort order is required'),
})

export type CreateWishlistItem = z.infer<typeof CreateWishlistItemSchema>

/**
 * Update Wishlist Item Schema
 */
export const UpdateWishlistItemSchema = z.object({
  /** Item title */
  title: z.string().min(1).max(255).optional(),

  /** Item description */
  description: z.string().max(1000).optional(),

  /** Link to product page */
  productLink: z.string().url().optional(),

  /** Image URL */
  imageUrl: z.string().url().optional(),

  /** Image width in pixels */
  imageWidth: z.number().int().min(1).max(5000).optional(),

  /** Image height in pixels */
  imageHeight: z.number().int().min(1).max(5000).optional(),

  /** LEGO category */
  category: z.string().max(100).optional(),

  /** Sort order for display */
  sortOrder: z.string().min(1).optional(),
})

export type UpdateWishlistItem = z.infer<typeof UpdateWishlistItemSchema>

// ============================================================================
// Wishlist Reorder Schema
// ============================================================================

/**
 * Reorder Wishlist Items Schema
 */
export const ReorderWishlistSchema = z.object({
  /** Array of item IDs in new order */
  itemIds: z.array(z.string().uuid()),
})

export type ReorderWishlist = z.infer<typeof ReorderWishlistSchema>
