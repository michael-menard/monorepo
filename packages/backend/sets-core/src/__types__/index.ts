/**
 * Internal Types for Sets Core Package
 *
 * Zod schemas for internal data structures used by sets-core functions.
 * Public API types are imported from @repo/api-client/schemas/sets.
 */

import { z } from 'zod'

/**
 * List Sets Filter Options
 *
 * Options for filtering, searching, sorting, and paginating sets list queries.
 */
export const ListSetsFiltersSchema = z.object({
  search: z.string().optional(),
  theme: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isBuilt: z.boolean().optional(),
  sortField: z
    .enum(['title', 'setNumber', 'pieceCount', 'purchaseDate', 'purchasePrice', 'createdAt'])
    .default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
})

export type ListSetsFilters = z.infer<typeof ListSetsFiltersSchema>

/**
 * Database row shape for set with joined images
 *
 * Represents raw DB query result before aggregation.
 */
export const SetRowSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  setNumber: z.string().nullable(),
  store: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  pieceCount: z.number().int().nullable(),
  releaseDate: z.date().nullable(),
  theme: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  notes: z.string().nullable(),
  isBuilt: z.boolean(),
  quantity: z.number().int(),
  purchasePrice: z.string().nullable(),
  tax: z.string().nullable(),
  shipping: z.string().nullable(),
  purchaseDate: z.date().nullable(),
  wishlistItemId: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  imageId: z.string().uuid().nullable(),
  imageUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  position: z.number().int().nullable(),
})

export type SetRow = z.infer<typeof SetRowSchema>
