/**
 * Gallery Type Definitions
 *
 * Zod schemas and TypeScript types for Gallery API.
 */

import { z } from 'zod'

// ============================================================================
// Gallery Image Schema
// ============================================================================

/**
 * Gallery Image Entity Schema
 */
export const GalleryImageSchema = z.object({
  /** Unique image record ID */
  id: z.string().uuid(),

  /** UUID of the user who owns this image */
  userId: z.string(),

  /** Image title */
  title: z.string().min(1).max(100),

  /** Image description */
  description: z.string().max(500).nullable().optional(),

  /** Searchable tags */
  tags: z.array(z.string()).max(10).nullable().optional(),

  /** Full-size image URL */
  imageUrl: z.string().url(),

  /** Thumbnail URL */
  thumbnailUrl: z.string().url().nullable().optional(),

  /** Album this image belongs to */
  albumId: z.string().uuid().nullable().optional(),

  /** Whether image has been flagged */
  flagged: z.boolean().default(false),

  /** When image was uploaded */
  createdAt: z.date(),

  /** Last modification timestamp */
  lastUpdatedAt: z.date(),
})

export type GalleryImage = z.infer<typeof GalleryImageSchema>

/**
 * Create Gallery Image Schema
 */
export const CreateGalleryImageSchema = z.object({
  /** Image title */
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),

  /** Image description */
  description: z.string().max(500, 'Description too long').optional(),

  /** Searchable tags */
  tags: z.array(z.string()).max(10, 'Maximum 10 tags allowed').optional(),

  /** Full-size image URL */
  imageUrl: z.string().url('Must be a valid URL'),

  /** Thumbnail URL */
  thumbnailUrl: z.string().url('Must be a valid URL').optional(),

  /** Album to add image to */
  albumId: z.string().uuid().optional(),
})

export type CreateGalleryImage = z.infer<typeof CreateGalleryImageSchema>

/**
 * Update Gallery Image Schema
 */
export const UpdateGalleryImageSchema = z.object({
  /** Image title */
  title: z.string().min(1).max(100).optional(),

  /** Image description */
  description: z.string().max(500).optional(),

  /** Searchable tags */
  tags: z.array(z.string()).max(10).optional(),

  /** Full-size image URL */
  imageUrl: z.string().url().optional(),

  /** Thumbnail URL */
  thumbnailUrl: z.string().url().optional(),

  /** Album to move image to */
  albumId: z.string().uuid().optional(),

  /** Flag status */
  flagged: z.boolean().optional(),
})

export type UpdateGalleryImage = z.infer<typeof UpdateGalleryImageSchema>

// ============================================================================
// Gallery Album Schema
// ============================================================================

/**
 * Gallery Album Entity Schema
 */
export const GalleryAlbumSchema = z.object({
  /** Unique album record ID */
  id: z.string().uuid(),

  /** UUID of the user who owns this album */
  userId: z.string(),

  /** Album title */
  title: z.string().min(1).max(100),

  /** Album description */
  description: z.string().max(500).nullable().optional(),

  /** Cover image ID */
  coverImageId: z.string().uuid().nullable().optional(),

  /** When album was created */
  createdAt: z.date(),

  /** Last modification timestamp */
  lastUpdatedAt: z.date(),
})

export type GalleryAlbum = z.infer<typeof GalleryAlbumSchema>

/**
 * Create Gallery Album Schema
 */
export const CreateGalleryAlbumSchema = z.object({
  /** Album title */
  title: z.string().min(1, 'Album title is required').max(100, 'Title too long'),

  /** Album description */
  description: z.string().max(500, 'Description too long').optional(),

  /** Cover image ID */
  coverImageId: z.string().uuid().optional(),
})

export type CreateGalleryAlbum = z.infer<typeof CreateGalleryAlbumSchema>

/**
 * Update Gallery Album Schema
 */
export const UpdateGalleryAlbumSchema = z.object({
  /** Album title */
  title: z.string().min(1).max(100).optional(),

  /** Album description */
  description: z.string().max(500).optional(),

  /** Cover image ID */
  coverImageId: z.string().uuid().optional(),
})

export type UpdateGalleryAlbum = z.infer<typeof UpdateGalleryAlbumSchema>

// ============================================================================
// Gallery Flag Schema
// ============================================================================

/**
 * Gallery Flag Entity Schema
 */
export const GalleryFlagSchema = z.object({
  /** Unique flag record ID */
  id: z.string().uuid(),

  /** Image that was flagged */
  imageId: z.string().uuid(),

  /** User who flagged the image */
  userId: z.string(),

  /** Reason for flagging */
  reason: z.string().max(500).nullable().optional(),

  /** When flag was created */
  createdAt: z.date(),
})

export type GalleryFlag = z.infer<typeof GalleryFlagSchema>

/**
 * Create Gallery Flag Schema
 */
export const CreateGalleryFlagSchema = z.object({
  /** Image to flag */
  imageId: z.string().uuid(),

  /** Reason for flagging */
  reason: z.string().max(500).optional(),
})

export type CreateGalleryFlag = z.infer<typeof CreateGalleryFlagSchema>
