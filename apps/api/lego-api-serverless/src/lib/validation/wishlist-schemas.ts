/**
 * Zod Validation Schemas for Wishlist API
 */

import { z } from 'zod'

/**
 * Create Wishlist Item Request Schema
 */
export const CreateWishlistItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  productLink: z.string().url('Invalid URL format').optional(),
  imageUrl: z.string().url('Invalid URL format').optional(),
  category: z.string().max(100, 'Category must be less than 100 characters').optional(),
  sortOrder: z.string().default(() => new Date().toISOString()),
})

export type CreateWishlistItemRequest = z.infer<typeof CreateWishlistItemSchema>

/**
 * Update Wishlist Item Request Schema (all fields optional for PATCH)
 */
export const UpdateWishlistItemSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  productLink: z.string().url().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  sortOrder: z.string().optional(),
})

export type UpdateWishlistItemRequest = z.infer<typeof UpdateWishlistItemSchema>

/**
 * Reorder Wishlist Request Schema
 */
export const ReorderWishlistItemSchema = z.object({
  id: z.string().uuid('Invalid item ID format'),
  sortOrder: z.string().min(1, 'Sort order is required'),
})

export const ReorderWishlistSchema = z.object({
  items: z.array(ReorderWishlistItemSchema).min(1, 'At least one item is required'),
})

export type ReorderWishlistRequest = z.infer<typeof ReorderWishlistSchema>

/**
 * Query Parameters Schema for List Wishlist Items
 */
export const ListWishlistQuerySchema = z.object({
  category: z.string().max(100).optional(),
  search: z.string().max(200).optional(),
})

export type ListWishlistQuery = z.infer<typeof ListWishlistQuerySchema>

/**
 * Path Parameter Schema
 */
export const WishlistItemIdSchema = z.object({
  id: z.string().uuid('Invalid item ID format'),
})

export type WishlistItemIdParams = z.infer<typeof WishlistItemIdSchema>

/**
 * Wishlist Item Response Schema (inferred from database)
 */
export const WishlistItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  productLink: z.string().url().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  category: z.string().nullable().optional(),
  sortOrder: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type WishlistItem = z.infer<typeof WishlistItemSchema>
