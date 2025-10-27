import { z } from 'zod'
import { createEnhancedSchemas, validationMessages } from '@repo/ui'

// Wishlist item schema with enhanced error messages
export const wishlistItemSchema = z.object({
  id: z.string().uuid(),
  name: createEnhancedSchemas.requiredString('Name'),
  description: createEnhancedSchemas.optionalString('Description'),
  price: createEnhancedSchemas.price('Price'),
  url: createEnhancedSchemas.url('Product Link'),
  imageUrl: createEnhancedSchemas.url('Image URL'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  category: createEnhancedSchemas.optionalString('Category'),
  isPurchased: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Wishlist schema with enhanced error messages
export const wishlistSchema = z.object({
  id: z.string().uuid(),
  name: createEnhancedSchemas.requiredString('Wishlist Name'),
  description: createEnhancedSchemas.optionalString('Description'),
  items: z.array(wishlistItemSchema).default([]),
  isPublic: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
})

// Create wishlist item schema
export const createWishlistItemSchema = wishlistItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

// Update wishlist item schema
export const updateWishlistItemSchema = createWishlistItemSchema.partial()

// Create wishlist schema
export const createWishlistSchema = wishlistSchema.omit({
  id: true,
  items: true,
  createdAt: true,
  updatedAt: true,
})

// Update wishlist schema
export const updateWishlistSchema = createWishlistSchema.partial()

// Drag and drop schema
export const dragDropSchema = z.object({
  sourceIndex: z.number().int().min(0),
  destinationIndex: z.number().int().min(0),
  itemId: z.string().uuid(),
})

// Filter schema
export const wishlistFilterSchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  isPurchased: z.boolean().optional(),
  sortBy: z.enum(['name', 'price', 'priority', 'createdAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

// Category filter schema
export const categoryFilterSchema = z.object({
  category: z.string().optional(),
})

// Export types
export type WishlistItem = z.infer<typeof wishlistItemSchema>
export type Wishlist = z.infer<typeof wishlistSchema>
export type CreateWishlistItem = z.infer<typeof createWishlistItemSchema>
export type UpdateWishlistItem = z.infer<typeof updateWishlistItemSchema>
export type CreateWishlist = z.infer<typeof createWishlistSchema>
export type UpdateWishlist = z.infer<typeof updateWishlistSchema>
export type DragDrop = z.infer<typeof dragDropSchema>
export type WishlistFilter = z.infer<typeof wishlistFilterSchema>
export type CategoryFilter = z.infer<typeof categoryFilterSchema>
