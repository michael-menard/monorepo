import { z } from 'zod'

/**
 * Inspiration Gallery API Schemas
 *
 * Zod schemas for client-side validation of API responses.
 * Uses z.string().datetime() for timestamps since API returns JSON strings.
 *
 * Epic 5: Inspiration Gallery
 */

// ─────────────────────────────────────────────────────────────────────────
// Inspiration Schemas
// ─────────────────────────────────────────────────────────────────────────

/**
 * Inspiration item schema for API responses
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
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type Inspiration = z.infer<typeof InspirationSchema>

/**
 * Pagination schema
 */
export const PaginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
})

export type Pagination = z.infer<typeof PaginationSchema>

/**
 * Paginated inspirations response schema
 */
export const InspirationListResponseSchema = z.object({
  items: z.array(InspirationSchema),
  pagination: PaginationSchema,
})

export type InspirationListResponse = z.infer<typeof InspirationListResponseSchema>

/**
 * Create inspiration input schema
 */
export const CreateInspirationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  sourceUrl: z.string().url().optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
})

export type CreateInspiration = z.infer<typeof CreateInspirationSchema>

/**
 * Update inspiration input schema
 */
export const UpdateInspirationSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional().nullable(),
  sourceUrl: z.string().url().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export type UpdateInspiration = z.infer<typeof UpdateInspirationSchema>

// ─────────────────────────────────────────────────────────────────────────
// Album Schemas
// ─────────────────────────────────────────────────────────────────────────

/**
 * Album schema for API responses
 */
export const AlbumSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  coverImageId: z.string().uuid().nullable(),
  tags: z.array(z.string()).nullable(),
  sortOrder: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type Album = z.infer<typeof AlbumSchema>

/**
 * Album with metadata schema (includes counts and cover image)
 */
export const AlbumWithMetadataSchema = AlbumSchema.extend({
  coverImage: InspirationSchema.nullable().optional(),
  itemCount: z.number().int().optional(),
  childAlbumCount: z.number().int().optional(),
})

export type AlbumWithMetadata = z.infer<typeof AlbumWithMetadataSchema>

/**
 * Paginated albums response schema
 */
export const AlbumListResponseSchema = z.object({
  items: z.array(AlbumWithMetadataSchema),
  pagination: PaginationSchema,
})

export type AlbumListResponse = z.infer<typeof AlbumListResponseSchema>

/**
 * Create album input schema
 */
export const CreateAlbumSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000).optional(),
  coverImageId: z.string().uuid().optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
  parentAlbumId: z.string().uuid().optional(),
})

export type CreateAlbum = z.infer<typeof CreateAlbumSchema>

/**
 * Update album input schema
 */
export const UpdateAlbumSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  coverImageId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  sortOrder: z.number().int().min(0).optional(),
})

export type UpdateAlbum = z.infer<typeof UpdateAlbumSchema>

/**
 * Create album from stack input schema (INSP-012)
 */
export const CreateAlbumFromStackSchema = z.object({
  title: z.string().min(1).max(200),
  inspirationIds: z.array(z.string().uuid()).min(2, 'At least 2 inspirations required'),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).default([]),
})

export type CreateAlbumFromStack = z.infer<typeof CreateAlbumFromStackSchema>

// ─────────────────────────────────────────────────────────────────────────
// Query Parameter Schemas
// ─────────────────────────────────────────────────────────────────────────

/**
 * Inspiration query parameters
 */
export const InspirationQueryParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  q: z.string().optional(), // search query
  tags: z.string().optional(), // comma-separated
  albumId: z.string().uuid().optional(),
  unassigned: z.boolean().optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'title', 'sortOrder']).default('sortOrder'),
  order: z.enum(['asc', 'desc']).default('asc'),
})

export type InspirationQueryParams = z.infer<typeof InspirationQueryParamsSchema>

/**
 * Album query parameters
 */
export const AlbumQueryParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  q: z.string().optional(), // search query
  tags: z.string().optional(), // comma-separated
  parentAlbumId: z.string().uuid().optional(),
  rootOnly: z.boolean().optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'title', 'sortOrder']).default('sortOrder'),
  order: z.enum(['asc', 'desc']).default('asc'),
})

export type AlbumQueryParams = z.infer<typeof AlbumQueryParamsSchema>

// ─────────────────────────────────────────────────────────────────────────
// Reorder Schemas
// ─────────────────────────────────────────────────────────────────────────

/**
 * Single item in reorder batch
 */
export const ReorderItemSchema = z.object({
  id: z.string().uuid(),
  sortOrder: z.number().int().min(0),
})

/**
 * Batch reorder schema for inspirations
 */
export const BatchReorderInspirationsSchema = z.object({
  items: z.array(ReorderItemSchema).min(1),
})

export type BatchReorderInspirations = z.infer<typeof BatchReorderInspirationsSchema>

/**
 * Batch reorder schema for albums
 */
export const BatchReorderAlbumsSchema = z.object({
  items: z.array(ReorderItemSchema).min(1),
})

export type BatchReorderAlbums = z.infer<typeof BatchReorderAlbumsSchema>

/**
 * Reorder response schema
 */
export const ReorderResponseSchema = z.object({
  updated: z.number().int(),
})

export type ReorderResponse = z.infer<typeof ReorderResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// Album Items Schemas
// ─────────────────────────────────────────────────────────────────────────

/**
 * Add to album input schema
 */
export const AddToAlbumSchema = z.object({
  inspirationIds: z.array(z.string().uuid()).min(1),
})

export type AddToAlbum = z.infer<typeof AddToAlbumSchema>

/**
 * Remove from album input schema
 */
export const RemoveFromAlbumSchema = z.object({
  inspirationIds: z.array(z.string().uuid()).min(1),
})

export type RemoveFromAlbum = z.infer<typeof RemoveFromAlbumSchema>

/**
 * Album items response schema
 */
export const AlbumItemsResponseSchema = z.object({
  added: z.number().int().optional(),
  removed: z.number().int().optional(),
})

export type AlbumItemsResponse = z.infer<typeof AlbumItemsResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// Album Hierarchy Schemas
// ─────────────────────────────────────────────────────────────────────────

/**
 * Add album parent input schema
 */
export const AddAlbumParentSchema = z.object({
  parentAlbumId: z.string().uuid(),
})

export type AddAlbumParent = z.infer<typeof AddAlbumParentSchema>

/**
 * Breadcrumbs response schema
 */
export const BreadcrumbsResponseSchema = z.object({
  breadcrumbs: z.array(AlbumSchema),
})

export type BreadcrumbsResponse = z.infer<typeof BreadcrumbsResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// Presign Schemas (Image Upload)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Presign request schema
 */
export const PresignRequestSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive().optional(),
})

export type PresignRequest = z.infer<typeof PresignRequestSchema>

/**
 * Presign response schema
 */
export const PresignResponseSchema = z.object({
  presignedUrl: z.string().url(),
  key: z.string(),
  expiresIn: z.number().int().positive(),
})

export type PresignResponse = z.infer<typeof PresignResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// MOC Linking Schemas
// ─────────────────────────────────────────────────────────────────────────

/**
 * Link to MOC input schema
 */
export const LinkToMocSchema = z.object({
  mocId: z.string().uuid(),
  notes: z.string().max(500).optional(),
})

export type LinkToMoc = z.infer<typeof LinkToMocSchema>
