/**
 * Sets Zod Schemas
 *
 * Runtime validation and type inference for Sets gallery operations.
 * All types are derived from Zod schemas using z.infer<>.
 */
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Image Schema
// ─────────────────────────────────────────────────────────────────────────────

export const SetImageSchema = z.object({
  id: z.string().uuid(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().nullable(),
  position: z.number().int().nonnegative(),
})

export type SetImage = z.infer<typeof SetImageSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Base Set Schema (DB representation + images)
// ─────────────────────────────────────────────────────────────────────────────

export const SetSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),

  // Basic info
  title: z.string().min(1).max(200),
  setNumber: z.string().max(20).nullable(),
  store: z.string().max(100).nullable(),
  sourceUrl: z.string().url().nullable(),
  pieceCount: z.number().int().positive().nullable(),
  releaseDate: z.string().datetime().nullable(),
  theme: z.string().max(50).nullable(),
  tags: z.array(z.string().max(30)).max(10).default([]),
  notes: z.string().max(2000).nullable(),

  // Set status
  isBuilt: z.boolean().default(false),
  quantity: z.number().int().min(1).default(1),

  // Purchase details
  purchasePrice: z.number().positive().nullable(),
  tax: z.number().nonnegative().nullable(),
  shipping: z.number().nonnegative().nullable(),
  purchaseDate: z.string().datetime().nullable(),

  // Wishlist traceability
  wishlistItemId: z.string().uuid().nullable(),

  // Images (joined from set_images)
  images: z.array(SetImageSchema).default([]),

  // Timestamps
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type Set = z.infer<typeof SetSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Create / Update Schemas (request bodies)
// ─────────────────────────────────────────────────────────────────────────────

export const CreateSetSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  setNumber: z.string().max(20).optional(),
  store: z.string().max(100).optional(),
  sourceUrl: z.string().url().optional(),
  pieceCount: z.number().int().positive().optional(),
  releaseDate: z.string().datetime().optional(),
  theme: z.string().max(50).optional(),
  tags: z.array(z.string().max(30)).max(10).default([]),
  notes: z.string().max(2000).optional(),
  isBuilt: z.boolean().default(false),
  quantity: z.number().int().min(1).default(1),
  purchasePrice: z.number().positive().optional(),
  tax: z.number().nonnegative().optional(),
  shipping: z.number().nonnegative().optional(),
  purchaseDate: z.string().datetime().optional(),
})

export type CreateSetInput = z.infer<typeof CreateSetSchema>

export const UpdateSetSchema = CreateSetSchema.partial()

export type UpdateSetInput = z.infer<typeof UpdateSetSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Query / Response Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const SetListQuerySchema = z.object({
  search: z.string().optional(),
  theme: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isBuilt: z.boolean().optional(),
  sortField: z
    .enum(['title', 'setNumber', 'pieceCount', 'purchaseDate', 'purchasePrice', 'createdAt'])
    .default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type SetListQuery = z.infer<typeof SetListQuerySchema>

export const SetListPaginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
})

export type SetListPagination = z.infer<typeof SetListPaginationSchema>

export const SetListFiltersSchema = z.object({
  availableThemes: z.array(z.string()),
  availableTags: z.array(z.string()),
})

export type SetListFilters = z.infer<typeof SetListFiltersSchema>

export const SetListResponseSchema = z.object({
  items: z.array(SetSchema),
  pagination: SetListPaginationSchema,
  filters: SetListFiltersSchema.optional(),
})

export type SetListResponse = z.infer<typeof SetListResponseSchema>
