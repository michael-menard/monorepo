import { z } from 'zod'

/**
 * Sets Domain Types
 *
 * Zod schemas for validation + type inference
 */

// ─────────────────────────────────────────────────────────────────────────
// Set Types
// ─────────────────────────────────────────────────────────────────────────

export const SetSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),

  // Basic info
  title: z.string(),
  setNumber: z.string().nullable(),
  store: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  pieceCount: z.number().int().nullable(),
  releaseDate: z.date().nullable(),
  theme: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  notes: z.string().nullable(),

  // Set status
  isBuilt: z.boolean(),
  quantity: z.number().int(),

  // Purchase details
  purchasePrice: z.string().nullable(), // decimal comes as string from Drizzle
  tax: z.string().nullable(),
  shipping: z.string().nullable(),
  purchaseDate: z.date().nullable(),

  // Wishlist integration
  wishlistItemId: z.string().uuid().nullable(),

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type Set = z.infer<typeof SetSchema>

export const CreateSetInputSchema = z.object({
  title: z.string().min(1).max(200),
  setNumber: z.string().max(50).optional(),
  store: z.string().max(100).optional(),
  sourceUrl: z.string().url().optional(),
  pieceCount: z.number().int().positive().optional(),
  releaseDate: z.coerce.date().optional(),
  theme: z.string().max(100).optional(),
  tags: z.array(z.string()).max(20).optional(),
  notes: z.string().max(5000).optional(),
  isBuilt: z.boolean().optional(),
  quantity: z.number().int().positive().optional(),
  purchasePrice: z.string().optional(), // accepts string for decimal
  tax: z.string().optional(),
  shipping: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  wishlistItemId: z.string().uuid().optional(),
})

export type CreateSetInput = z.infer<typeof CreateSetInputSchema>

export const UpdateSetInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  setNumber: z.string().max(50).nullable().optional(),
  store: z.string().max(100).nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  pieceCount: z.number().int().positive().nullable().optional(),
  releaseDate: z.coerce.date().nullable().optional(),
  theme: z.string().max(100).nullable().optional(),
  tags: z.array(z.string()).max(20).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  isBuilt: z.boolean().optional(),
  quantity: z.number().int().positive().optional(),
  purchasePrice: z.string().nullable().optional(),
  tax: z.string().nullable().optional(),
  shipping: z.string().nullable().optional(),
  purchaseDate: z.coerce.date().nullable().optional(),
  wishlistItemId: z.string().uuid().nullable().optional(),
})

export type UpdateSetInput = z.infer<typeof UpdateSetInputSchema>

export const ListSetsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  theme: z.string().optional(),
  isBuilt: z.coerce.boolean().optional(),
})

export type ListSetsQuery = z.infer<typeof ListSetsQuerySchema>

// ─────────────────────────────────────────────────────────────────────────
// Set Image Types
// ─────────────────────────────────────────────────────────────────────────

export const SetImageSchema = z.object({
  id: z.string().uuid(),
  setId: z.string().uuid(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().nullable(),
  position: z.number().int(),
  createdAt: z.date(),
})

export type SetImage = z.infer<typeof SetImageSchema>

export const CreateSetImageInputSchema = z.object({
  setId: z.string().uuid(),
  position: z.number().int().min(0).optional(),
})

export type CreateSetImageInput = z.infer<typeof CreateSetImageInputSchema>

export const UpdateSetImageInputSchema = z.object({
  position: z.number().int().min(0).optional(),
})

export type UpdateSetImageInput = z.infer<typeof UpdateSetImageInputSchema>

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

export type SetError =
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'UPLOAD_FAILED'
  | 'INVALID_FILE'
  | 'DB_ERROR'
  | 'VALIDATION_ERROR'
