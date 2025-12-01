/**
 * Generated Zod schemas from Drizzle ORM schemas
 *
 * This file contains automatically generated Zod validation schemas
 * derived from the Drizzle database schema definitions.
 *
 * DO NOT EDIT MANUALLY - This file is generated from the Drizzle schemas.
 * To modify validation rules, update the Drizzle schema or use refinements.
 */

import { createSelectSchema, createInsertSchema, createUpdateSchema } from 'drizzle-zod'
import { z } from 'zod'
import {
  galleryImages,
  galleryAlbums,
  galleryFlags,
  mocInstructions,
  mocFiles,
  mocGalleryImages,
  mocGalleryAlbums,
  wishlistItems,
  mocPartsLists,
  mocParts,
} from './schema'

// =============================================================================
// GALLERY SCHEMAS
// =============================================================================

export const galleryImageSchemas = {
  select: createSelectSchema(galleryImages),
  insert: createInsertSchema(galleryImages),
  update: createUpdateSchema(galleryImages),
}

export const galleryAlbumSchemas = {
  select: createSelectSchema(galleryAlbums),
  insert: createInsertSchema(galleryAlbums),
  update: createUpdateSchema(galleryAlbums),
}

export const galleryFlagSchemas = {
  select: createSelectSchema(galleryFlags),
  insert: createInsertSchema(galleryFlags),
  update: createUpdateSchema(galleryFlags),
}

// =============================================================================
// MOC INSTRUCTION SCHEMAS
// =============================================================================

export const mocInstructionSchemas = {
  select: createSelectSchema(mocInstructions),
  insert: createInsertSchema(mocInstructions),
  update: createUpdateSchema(mocInstructions),
}

export const mocFileSchemas = {
  select: createSelectSchema(mocFiles),
  insert: createInsertSchema(mocFiles),
  update: createUpdateSchema(mocFiles),
}

// =============================================================================
// JOIN TABLE SCHEMAS
// =============================================================================

export const mocGalleryImageSchemas = {
  select: createSelectSchema(mocGalleryImages),
  insert: createInsertSchema(mocGalleryImages),
  update: createUpdateSchema(mocGalleryImages),
}

export const mocGalleryAlbumSchemas = {
  select: createSelectSchema(mocGalleryAlbums),
  insert: createInsertSchema(mocGalleryAlbums),
  update: createUpdateSchema(mocGalleryAlbums),
}

// =============================================================================
// WISHLIST SCHEMAS
// =============================================================================

export const wishlistItemSchemas = {
  select: createSelectSchema(wishlistItems),
  insert: createInsertSchema(wishlistItems),
  update: createUpdateSchema(wishlistItems),
}

// =============================================================================
// PARTS SCHEMAS
// =============================================================================

export const mocPartsListSchemas = {
  select: createSelectSchema(mocPartsLists),
  insert: createInsertSchema(mocPartsLists),
  update: createUpdateSchema(mocPartsLists),
}

export const mocPartSchemas = {
  select: createSelectSchema(mocParts),
  insert: createInsertSchema(mocParts),
  update: createUpdateSchema(mocParts),
}

// =============================================================================
// BUSINESS LOGIC REFINEMENTS
// =============================================================================

/**
 * Gallery Image schemas with business validation rules
 */
export const createGalleryImageSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').optional(),
  imageUrl: z.string().url('Must be a valid URL'),
  thumbnailUrl: z.string().url('Must be a valid URL').optional(),
  albumId: z.string().uuid().optional(),
  flagged: z.boolean().default(false).optional(),
})

export const updateGalleryImageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').optional(),
  imageUrl: z.string().url('Must be a valid URL').optional(),
  thumbnailUrl: z.string().url('Must be a valid URL').optional(),
  albumId: z.string().uuid().optional(),
  flagged: z.boolean().optional(),
})

/**
 * Gallery Album schemas with business validation rules
 */
export const createGalleryAlbumSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(1, 'Album title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').optional(),
  coverImageId: z.string().uuid().optional(),
})

export const updateGalleryAlbumSchema = z.object({
  title: z.string().min(1, 'Album title is required').max(100, 'Title too long').optional(),
  description: z.string().max(500, 'Description too long').optional(),
  coverImageId: z.string().uuid().optional(),
})

/**
 * MOC Instruction schemas with type-specific validation
 */
export const createMocSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: z.literal('moc'),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  author: z.string().min(1, 'Author is required for MOCs').max(255, 'Author name too long'),
  partsCount: z.number().int().min(1, 'Parts count must be at least 1'),
  theme: z.string().min(1, 'Theme is required').max(100, 'Theme too long'),
  subtheme: z.string().max(100, 'Subtheme too long').optional(),
  setNumber: z.string().min(1, 'MOC ID is required'), // e.g., "MOC-172552"
  tags: z.array(z.string()).max(20, 'Maximum 20 tags allowed').optional(),
  thumbnailUrl: z.string().url('Must be a valid URL').optional(),
  uploadedDate: z.date().optional(),
  totalPieceCount: z.number().int().optional(),
})

export const createSetSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: z.literal('set'),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  brand: z.string().min(1, 'Brand is required for Sets').max(100, 'Brand too long'),
  setNumber: z.string().min(1, 'Set number is required'), // e.g., "10294"
  theme: z.string().min(1, 'Theme is required').max(100, 'Theme too long'),
  subtheme: z.string().max(100, 'Subtheme too long').optional(),
  releaseYear: z
    .number()
    .int()
    .min(1950)
    .max(new Date().getFullYear() + 2)
    .optional(),
  retired: z.boolean().optional(),
  tags: z.array(z.string()).max(20, 'Maximum 20 tags allowed').optional(),
  thumbnailUrl: z.string().url('Must be a valid URL').optional(),
  totalPieceCount: z.number().int().optional(),
})

/**
 * Wishlist Item schemas with business validation rules
 */
export const createWishlistItemSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  productLink: z.string().url('Must be a valid URL').optional(),
  imageUrl: z.string().url('Must be a valid URL').optional(),
  imageWidth: z.number().int().min(1).max(5000).optional(),
  imageHeight: z.number().int().min(1).max(5000).optional(),
  category: z.string().max(100, 'Category too long').optional(),
  sortOrder: z.string().min(1, 'Sort order is required'),
})

export const updateWishlistItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  productLink: z.string().url('Must be a valid URL').optional(),
  imageUrl: z.string().url('Must be a valid URL').optional(),
  imageWidth: z.number().int().min(1).max(5000).optional(),
  imageHeight: z.number().int().min(1).max(5000).optional(),
  category: z.string().max(100, 'Category too long').optional(),
  sortOrder: z.string().min(1, 'Sort order is required').optional(),
})

/**
 * MOC Parts List schemas with business validation rules
 */
export const createMocPartsListSchema = z.object({
  mocId: z.string().uuid('Must be a valid UUID'),
  fileId: z.string().uuid('Must be a valid UUID').optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  built: z.boolean().default(false),
  purchased: z.boolean().default(false),
  inventoryPercentage: z
    .string()
    .regex(/^\d+\.\d{2}$/, 'Must be a decimal with 2 places')
    .default('0.00'),
  totalPartsCount: z.string().regex(/^\d+$/, 'Must be a valid number').optional(),
  acquiredPartsCount: z.string().regex(/^\d+$/, 'Must be a valid number').default('0'),
  costEstimate: z
    .string()
    .regex(/^\d+\.\d{2}$/, 'Must be a decimal with 2 places')
    .optional(),
  actualCost: z
    .string()
    .regex(/^\d+\.\d{2}$/, 'Must be a decimal with 2 places')
    .optional(),
  notes: z.string().max(2000, 'Notes too long').optional(),
})

export const updateMocPartsListSchema = z.object({
  fileId: z.string().uuid('Must be a valid UUID').optional(),
  title: z.string().min(1, 'Title is required').max(255, 'Title too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  built: z.boolean().optional(),
  purchased: z.boolean().optional(),
  inventoryPercentage: z
    .string()
    .regex(/^\d+\.\d{2}$/, 'Must be a decimal with 2 places')
    .optional(),
  totalPartsCount: z.string().regex(/^\d+$/, 'Must be a valid number').optional(),
  acquiredPartsCount: z.string().regex(/^\d+$/, 'Must be a valid number').optional(),
  costEstimate: z
    .string()
    .regex(/^\d+\.\d{2}$/, 'Must be a decimal with 2 places')
    .optional(),
  actualCost: z
    .string()
    .regex(/^\d+\.\d{2}$/, 'Must be a decimal with 2 places')
    .optional(),
  notes: z.string().max(2000, 'Notes too long').optional(),
})

/**
 * MOC Part schemas with business validation rules
 */
export const createMocPartSchema = z.object({
  partsListId: z.string().uuid('Must be a valid UUID'),
  partId: z.string().min(1, 'Part ID is required').max(50, 'Part ID too long'),
  partName: z.string().min(1, 'Part name is required').max(255, 'Part name too long'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(10000, 'Quantity too large'),
  color: z.string().min(1, 'Color is required').max(100, 'Color name too long'),
})

export const updateMocPartSchema = z.object({
  partId: z.string().min(1, 'Part ID is required').max(50, 'Part ID too long').optional(),
  partName: z.string().min(1, 'Part name is required').max(255, 'Part name too long').optional(),
  quantity: z
    .number()
    .int()
    .min(1, 'Quantity must be at least 1')
    .max(10000, 'Quantity too large')
    .optional(),
  color: z.string().min(1, 'Color is required').max(100, 'Color name too long').optional(),
})

// =============================================================================
// UTILITY SCHEMAS
// =============================================================================

/**
 * Common pagination schema
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * Common filter schema for user-owned resources
 */
export const userFilterSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().optional(),
})

/**
 * File upload schema for MOC files
 */
export const mocFileUploadSchema = z.object({
  fileType: z.enum(['instruction', 'parts-list', 'thumbnail', 'gallery-image']),
  originalFilename: z.string().min(1, 'Filename is required').max(255, 'Filename too long'),
  mimeType: z.string().min(1, 'MIME type is required').max(100, 'MIME type too long'),
})
