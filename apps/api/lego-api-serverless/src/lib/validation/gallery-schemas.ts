/**
 * Zod Validation Schemas for Gallery API
 */

import { z } from 'zod'

/**
 * Create Gallery Image Request Schema
 */
export const CreateGalleryImageSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  tags: z.array(z.string()).max(20, 'Maximum 20 tags allowed').default([]),
  albumId: z.string().uuid('Invalid album ID format').optional(),
})

export type CreateGalleryImageRequest = z.infer<typeof CreateGalleryImageSchema>

/**
 * Update Gallery Image Request Schema (all fields optional for PATCH)
 */
export const UpdateGalleryImageSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string()).max(20).optional(),
  albumId: z.string().uuid().optional().nullable(),
})

export type UpdateGalleryImageRequest = z.infer<typeof UpdateGalleryImageSchema>

/**
 * Query Parameters Schema for List Gallery Images
 */
export const ListGalleryImagesQuerySchema = z.object({
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
  search: z.string().max(200).optional(),
  albumId: z.string().uuid().optional(),
})

export type ListGalleryImagesQuery = z.infer<typeof ListGalleryImagesQuerySchema>

/**
 * Create Album Request Schema
 */
export const CreateAlbumSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  coverImageId: z.string().uuid('Invalid image ID format').optional(),
})

export type CreateAlbumRequest = z.infer<typeof CreateAlbumSchema>

/**
 * Update Album Request Schema (all fields optional for PATCH)
 */
export const UpdateAlbumSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  coverImageId: z.string().uuid().optional().nullable(),
})

export type UpdateAlbumRequest = z.infer<typeof UpdateAlbumSchema>

/**
 * Query Parameters Schema for List Albums
 */
export const ListAlbumsQuerySchema = z.object({
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
  search: z.string().max(200).optional(),
})

export type ListAlbumsQuery = z.infer<typeof ListAlbumsQuerySchema>

/**
 * Path Parameter Schemas
 */
export const GalleryImageIdSchema = z.object({
  id: z.string().uuid('Invalid image ID format'),
})

export type GalleryImageIdParams = z.infer<typeof GalleryImageIdSchema>

export const AlbumIdSchema = z.object({
  id: z.string().uuid('Invalid album ID format'),
})

export type AlbumIdParams = z.infer<typeof AlbumIdSchema>

/**
 * Gallery Image Response Schema (inferred from database)
 */
export const GalleryImageSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().nullable().optional(),
  albumId: z.string().uuid().nullable().optional(),
  flagged: z.boolean(),
  createdAt: z.date(),
  lastUpdatedAt: z.date(),
})

export type GalleryImage = z.infer<typeof GalleryImageSchema>

/**
 * Gallery Album Response Schema
 */
export const GalleryAlbumSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  coverImageId: z.string().uuid().nullable().optional(),
  createdAt: z.date(),
  lastUpdatedAt: z.date(),
  imageCount: z.number().int().optional(),
  coverImageUrl: z.string().url().optional(),
})

export type GalleryAlbum = z.infer<typeof GalleryAlbumSchema>
