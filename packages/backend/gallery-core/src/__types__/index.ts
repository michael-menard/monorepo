/**
 * Internal Types for Gallery Core Package
 *
 * Zod schemas for gallery album data structures used by gallery-core functions.
 */

import { z } from 'zod'

// UUID regex - accepts standard format (8-4-4-4-12 hex chars)
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Gallery Image Schema (for response within albums)
 */
export const GalleryImageSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  imageUrl: z.string(),
  thumbnailUrl: z.string().nullable(),
  albumId: z.string().uuid().nullable(),
  flagged: z.boolean(),
  createdAt: z.string(), // ISO date string
  lastUpdatedAt: z.string(), // ISO date string
})

export type GalleryImage = z.infer<typeof GalleryImageSchema>

/**
 * Gallery Album Schema (API response format)
 */
export const AlbumSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  coverImageId: z.string().uuid().nullable(),
  coverImageUrl: z.string().nullable(),
  imageCount: z.number().int(),
  createdAt: z.string(), // ISO date string
  lastUpdatedAt: z.string(), // ISO date string
})

export type Album = z.infer<typeof AlbumSchema>

/**
 * Album with Images Schema (for get album response)
 */
export const AlbumWithImagesSchema = AlbumSchema.extend({
  images: z.array(GalleryImageSchema),
})

export type AlbumWithImages = z.infer<typeof AlbumWithImagesSchema>

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
 * Album List Response Schema
 */
export const AlbumListResponseSchema = z.object({
  data: z.array(AlbumSchema),
  pagination: PaginationSchema,
})

export type AlbumListResponse = z.infer<typeof AlbumListResponseSchema>

/**
 * List Albums Filter Options
 */
export const ListAlbumsFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

export type ListAlbumsFilters = z.infer<typeof ListAlbumsFiltersSchema>

/**
 * Create Album Input Schema
 *
 * Validation for creating a new album.
 * - title: Required, non-empty string, max 200 chars
 * - description: Optional string, max 2000 chars
 * - coverImageId: Optional UUID
 */
export const CreateAlbumInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  coverImageId: z.string().regex(uuidRegex, 'Invalid image ID format').optional(),
})

export type CreateAlbumInput = z.infer<typeof CreateAlbumInputSchema>

/**
 * Update Album Input Schema
 *
 * Validation for updating an existing album.
 * All fields are optional (patch semantics).
 * coverImageId can be null to clear the cover.
 */
export const UpdateAlbumInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  coverImageId: z.string().regex(uuidRegex).nullable().optional(),
})

export type UpdateAlbumInput = z.infer<typeof UpdateAlbumInputSchema>

/**
 * Album Row Schema (DB row format)
 */
export const AlbumRowSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  coverImageId: z.string().uuid().nullable(),
  createdAt: z.date(),
  lastUpdatedAt: z.date(),
})

export type AlbumRow = z.infer<typeof AlbumRowSchema>

/**
 * Image Row Schema (DB row format)
 */
export const ImageRowSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  imageUrl: z.string(),
  thumbnailUrl: z.string().nullable(),
  albumId: z.string().uuid().nullable(),
  flagged: z.boolean(),
  createdAt: z.date(),
  lastUpdatedAt: z.date(),
})

export type ImageRow = z.infer<typeof ImageRowSchema>

// ============================================================
// IMAGE OPERATION SCHEMAS (STORY-007)
// ============================================================

/**
 * List Images Filter Options
 *
 * - page/limit: Pagination params
 * - albumId: Optional filter to show images in specific album
 *   When omitted, returns only standalone images (albumId IS NULL)
 */
export const ListImagesFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  albumId: z.string().uuid().optional(),
})

export type ListImagesFilters = z.infer<typeof ListImagesFiltersSchema>

/**
 * Search Images Filter Options
 *
 * - search: Required search term (searches title, description, tags)
 * - page/limit: Pagination params
 */
export const SearchImagesFiltersSchema = z.object({
  search: z.string().min(1, 'Search term is required'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

export type SearchImagesFilters = z.infer<typeof SearchImagesFiltersSchema>

/**
 * Flag Image Input Schema
 *
 * - imageId: Required UUID of image to flag
 * - reason: Optional reason for flagging
 */
export const FlagImageInputSchema = z.object({
  imageId: z.string().regex(uuidRegex, 'Invalid image ID format'),
  reason: z.string().max(1000).optional().nullable(),
})

export type FlagImageInput = z.infer<typeof FlagImageInputSchema>

/**
 * Image List Response Schema
 */
export const ImageListResponseSchema = z.object({
  data: z.array(GalleryImageSchema),
  pagination: PaginationSchema,
})

export type ImageListResponse = z.infer<typeof ImageListResponseSchema>

/**
 * Flag Row Schema (DB row format)
 */
export const FlagRowSchema = z.object({
  id: z.string().uuid(),
  imageId: z.string().uuid(),
  userId: z.string(),
  reason: z.string().nullable(),
  createdAt: z.date(),
  lastUpdatedAt: z.date(),
})

export type FlagRow = z.infer<typeof FlagRowSchema>

/**
 * Flag Result Schema (API response format)
 */
export const FlagResultSchema = z.object({
  id: z.string().uuid(),
  imageId: z.string().uuid(),
  userId: z.string(),
  reason: z.string().nullable(),
  createdAt: z.string(), // ISO date string
  lastUpdatedAt: z.string(), // ISO date string
})

export type FlagResult = z.infer<typeof FlagResultSchema>

// ============================================================
// IMAGE WRITE OPERATION SCHEMAS (STORY-008)
// ============================================================

/**
 * Update Image Input Schema
 *
 * Validation for updating an existing image (patch semantics).
 * - title: Optional, 1-200 chars if provided (empty string invalid)
 * - description: Optional, can be null (to clear) or string up to 2000 chars
 * - tags: Optional, can be null (to clear), empty array, or array of strings (max 20 tags, 50 chars each)
 * - albumId: Optional, can be null (move to standalone) or valid UUID
 *
 * Note: imageUrl, thumbnailUrl, and flagged are NOT updatable via this endpoint.
 */
export const UpdateImageInputSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .nullable()
    .optional(),
  tags: z
    .array(z.string().max(50, 'Each tag must be 50 characters or less'))
    .max(20, 'Maximum 20 tags allowed')
    .nullable()
    .optional(),
  albumId: z.string().regex(uuidRegex, 'Invalid album ID format').nullable().optional(),
})

export type UpdateImageInput = z.infer<typeof UpdateImageInputSchema>
