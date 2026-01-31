import { z } from 'zod'

/**
 * Gallery Domain Types
 *
 * Zod schemas for validation + type inference
 */

// ─────────────────────────────────────────────────────────────────────────
// Image Types
// ─────────────────────────────────────────────────────────────────────────

export const GalleryImageSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().nullable(),
  albumId: z.string().uuid().nullable(),
  flagged: z.boolean(),
  createdAt: z.date(),
  lastUpdatedAt: z.date(),
})

export type GalleryImage = z.infer<typeof GalleryImageSchema>

export const CreateImageInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string()).max(20).optional(),
  albumId: z.string().uuid().optional(),
})

export type CreateImageInput = z.infer<typeof CreateImageInputSchema>

export const UpdateImageInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string()).max(20).optional(),
  albumId: z.string().uuid().nullable().optional(),
})

export type UpdateImageInput = z.infer<typeof UpdateImageInputSchema>

export const ListImagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  albumId: z.string().uuid().optional(),
})

export type ListImagesQuery = z.infer<typeof ListImagesQuerySchema>

// ─────────────────────────────────────────────────────────────────────────
// Album Types
// ─────────────────────────────────────────────────────────────────────────

export const GalleryAlbumSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  coverImageId: z.string().uuid().nullable(),
  imageCount: z.number().int(),
  createdAt: z.date(),
  lastUpdatedAt: z.date(),
})

export type GalleryAlbum = z.infer<typeof GalleryAlbumSchema>

export const CreateAlbumInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  coverImageId: z.string().uuid().optional(),
})

export type CreateAlbumInput = z.infer<typeof CreateAlbumInputSchema>

export const UpdateAlbumInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  coverImageId: z.string().uuid().nullable().optional(),
})

export type UpdateAlbumInput = z.infer<typeof UpdateAlbumInputSchema>

export const ListAlbumsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
})

export type ListAlbumsQuery = z.infer<typeof ListAlbumsQuerySchema>

// ─────────────────────────────────────────────────────────────────────────
// File Types
// ─────────────────────────────────────────────────────────────────────────

export const UploadedFileSchema = z.object({
  buffer: z.instanceof(Buffer),
  filename: z.string(),
  mimetype: z.string(),
  size: z.number(),
})

export type UploadedFile = z.infer<typeof UploadedFileSchema>

// ─────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────

export type GalleryError =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'UPLOAD_FAILED'
  | 'INVALID_FILE'
  | 'DB_ERROR'
  | 'VALIDATION_ERROR'
