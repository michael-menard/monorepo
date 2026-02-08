import { z } from 'zod'

/**
 * Inspiration Gallery Domain Types
 *
 * Zod schemas for validation + type inference.
 *
 * @remarks
 * These schemas are aligned with @repo/api-client/schemas/inspiration but use
 * z.date() for timestamps because Drizzle returns Date objects from the database.
 * The API client uses z.string().datetime() for JSON serialization.
 *
 * Epic 5: Inspiration Gallery
 */

// ─────────────────────────────────────────────────────────────────────────
// Inspiration Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * Internal inspiration schema for database results.
 * Uses z.date() for timestamps because Drizzle returns Date objects.
 */
export const InspirationSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string(),
  thumbnailUrl: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  sortOrder: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Inspiration = z.infer<typeof InspirationSchema>

/**
 * Schema for creating inspirations (POST body validation).
 */
export const CreateInspirationInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  imageUrl: z.string().url('Invalid image URL format'),
  thumbnailUrl: z.string().url('Invalid thumbnail URL format').optional(),
  sourceUrl: z.string().url('Invalid source URL format').optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
})

export type CreateInspirationInput = z.infer<typeof CreateInspirationInputSchema>

/**
 * Schema for updating inspirations (PATCH body validation).
 */
export const UpdateInspirationInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
  sourceUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export type UpdateInspirationInput = z.infer<typeof UpdateInspirationInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Album Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * Internal album schema for database results.
 */
export const AlbumSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  coverImageId: z.string().uuid().nullable(),
  tags: z.array(z.string()).nullable(),
  sortOrder: z.number().int(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Album = z.infer<typeof AlbumSchema>

/**
 * Album with cover image and item counts.
 */
export const AlbumWithMetadataSchema = AlbumSchema.extend({
  coverImage: InspirationSchema.nullable().optional(),
  itemCount: z.number().int().optional(),
  childAlbumCount: z.number().int().optional(),
})

export type AlbumWithMetadata = z.infer<typeof AlbumWithMetadataSchema>

/**
 * Schema for creating albums (POST body validation).
 */
export const CreateAlbumInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  coverImageId: z.string().uuid().optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  parentAlbumId: z.string().uuid().optional(), // For creating nested albums
})

export type CreateAlbumInput = z.infer<typeof CreateAlbumInputSchema>

/**
 * Schema for updating albums (PATCH body validation).
 */
export const UpdateAlbumInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  coverImageId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export type UpdateAlbumInput = z.infer<typeof UpdateAlbumInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Album Item Types (Junction Table)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Schema for adding items to an album.
 */
export const AddToAlbumInputSchema = z.object({
  inspirationIds: z.array(z.string().uuid()).min(1, 'At least one inspiration is required'),
})

export type AddToAlbumInput = z.infer<typeof AddToAlbumInputSchema>

/**
 * Schema for removing items from an album.
 */
export const RemoveFromAlbumInputSchema = z.object({
  inspirationIds: z.array(z.string().uuid()).min(1, 'At least one inspiration is required'),
})

export type RemoveFromAlbumInput = z.infer<typeof RemoveFromAlbumInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Album Parent Types (DAG Hierarchy)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Schema for adding a parent to an album.
 */
export const AddAlbumParentInputSchema = z.object({
  parentAlbumId: z.string().uuid(),
})

export type AddAlbumParentInput = z.infer<typeof AddAlbumParentInputSchema>

/**
 * Schema for removing a parent from an album.
 */
export const RemoveAlbumParentInputSchema = z.object({
  parentAlbumId: z.string().uuid(),
})

export type RemoveAlbumParentInput = z.infer<typeof RemoveAlbumParentInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// MOC Linking Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * Schema for linking inspiration to MOC.
 */
export const LinkInspirationToMocInputSchema = z.object({
  mocId: z.string().uuid(),
  notes: z.string().max(500).optional(),
})

export type LinkInspirationToMocInput = z.infer<typeof LinkInspirationToMocInputSchema>

/**
 * Schema for linking album to MOC.
 */
export const LinkAlbumToMocInputSchema = z.object({
  mocId: z.string().uuid(),
  notes: z.string().max(500).optional(),
})

export type LinkAlbumToMocInput = z.infer<typeof LinkAlbumToMocInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Query Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * Sort field enum for inspiration queries.
 */
export const InspirationSortFieldSchema = z.enum(['createdAt', 'updatedAt', 'title', 'sortOrder'])

export type InspirationSortField = z.infer<typeof InspirationSortFieldSchema>

/**
 * Query parameters schema for listing inspirations.
 */
export const ListInspirationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  albumId: z.string().uuid().optional(), // Filter by album
  unassigned: z.coerce.boolean().optional(), // Only show items not in any album
  sort: InspirationSortFieldSchema.default('sortOrder'),
  order: z.enum(['asc', 'desc']).default('asc'),
})

export type ListInspirationQuery = z.infer<typeof ListInspirationQuerySchema>

/**
 * Sort field enum for album queries.
 */
export const AlbumSortFieldSchema = z.enum(['createdAt', 'updatedAt', 'title', 'sortOrder'])

export type AlbumSortField = z.infer<typeof AlbumSortFieldSchema>

/**
 * Query parameters schema for listing albums.
 */
export const ListAlbumQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  tags: z.string().optional(), // comma-separated
  parentAlbumId: z.string().uuid().optional(), // Filter by parent album
  rootOnly: z.coerce.boolean().optional(), // Only show top-level albums
  sort: AlbumSortFieldSchema.default('sortOrder'),
  order: z.enum(['asc', 'desc']).default('asc'),
})

export type ListAlbumQuery = z.infer<typeof ListAlbumQuerySchema>

// ─────────────────────────────────────────────────────────────────────────
// Reorder Types
// ─────────────────────────────────────────────────────────────────────────

/**
 * Single item in a reorder batch request.
 */
export const ReorderItemSchema = z.object({
  id: z.string().uuid('Invalid item ID format'),
  sortOrder: z.number().int().min(0, 'Sort order must be a non-negative integer'),
})

/**
 * Batch reorder request schema for inspirations.
 */
export const ReorderInspirationsInputSchema = z.object({
  items: z.array(ReorderItemSchema).min(1, 'At least one item is required'),
})

export type ReorderInspirationsInput = z.infer<typeof ReorderInspirationsInputSchema>

/**
 * Batch reorder request schema for albums.
 */
export const ReorderAlbumsInputSchema = z.object({
  items: z.array(ReorderItemSchema).min(1, 'At least one item is required'),
})

export type ReorderAlbumsInput = z.infer<typeof ReorderAlbumsInputSchema>

/**
 * Reorder items within an album.
 */
export const ReorderAlbumItemsInputSchema = z.object({
  albumId: z.string().uuid(),
  items: z.array(ReorderItemSchema).min(1, 'At least one item is required'),
})

export type ReorderAlbumItemsInput = z.infer<typeof ReorderAlbumItemsInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Presign Types (Image Upload)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Request schema for presigned URL generation.
 */
export const PresignRequestSchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  mimeType: z.string().min(1, 'MIME type is required'),
  fileSize: z.coerce.number().int().positive().optional(),
})

export type PresignRequest = z.infer<typeof PresignRequestSchema>

/**
 * Response schema for presigned URL generation.
 */
export const PresignResponseSchema = z.object({
  presignedUrl: z.string().url(),
  key: z.string(),
  expiresIn: z.number().int().positive(),
})

export type PresignResponse = z.infer<typeof PresignResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// Stack-to-Create Album Types (INSP-012)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Schema for creating an album from stacked inspirations.
 */
export const CreateAlbumFromStackInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  inspirationIds: z.array(z.string().uuid()).min(2, 'At least 2 inspirations required for stack'),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
})

export type CreateAlbumFromStackInput = z.infer<typeof CreateAlbumFromStackInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────────────────────────────────

export type InspirationError =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'DB_ERROR'
  | 'UPLOAD_FAILED'
  | 'INVALID_EXTENSION'
  | 'INVALID_MIME_TYPE'
  | 'FILE_TOO_LARGE'
  | 'FILE_TOO_SMALL'

export type AlbumError =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'DB_ERROR'
  | 'DUPLICATE_TITLE'
  | 'CYCLE_DETECTED'
  | 'MAX_DEPTH_EXCEEDED'

export type PresignError = 'INVALID_EXTENSION' | 'INVALID_MIME_TYPE' | 'PRESIGN_FAILED'
