import { z } from 'zod'

// Theme enum matching the 11 theme options
export const ThemeEnum = z.enum([
  'Castle',
  'Space',
  'City',
  'Technic',
  'Creator',
  'Star Wars',
  'Harry Potter',
  'Marvel',
  'DC',
  'Friends',
  'Other',
])

// Request schema for creating a MOC
export const CreateMocRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  theme: ThemeEnum,
  tags: z.array(z.string().max(30)).max(20).optional(),
})

// Response schema for created MOC
export const CreateMocResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  theme: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  slug: z.string().nullable(),
  type: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// File schema for GET /mocs/:id response (INST-1101: AC-14)
export const MocDetailFileSchema = z.object({
  id: z.string().uuid(),
  mocId: z.string().uuid(),
  fileType: z.string(),
  name: z.string(),
  size: z.number().int(),
  mimeType: z.string().nullable(),
  s3Key: z.string(),
  uploadedAt: z.string(),
  downloadUrl: z.string().url(),
})

// Stats schema for GET /mocs/:id response (INST-1101: AC-15)
export const MocStatsSchema = z.object({
  pieceCount: z.number().int().nullable(),
  fileCount: z.number().int(),
})

// Response schema for GET /mocs/:id (INST-1101: AC-13)
export const GetMocResponseSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  theme: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  thumbnailUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  files: z.array(MocDetailFileSchema),
  stats: MocStatsSchema,
})

// Query schema for listing MOCs
export const ListMocsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  type: z.enum(['moc', 'set']).optional(),
  status: z.enum(['draft', 'published', 'archived', 'pending_review']).optional(),
  theme: z.string().optional(),
})

// Pagination schema for list response
export const PaginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
})

// MOC item schema for list response (aligned with frontend MocInstructionsSchema)
export const MocListItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  type: z.enum(['moc', 'set']),
  mocId: z.string().nullable(),
  slug: z.string().nullable(),
  author: z.string().nullable(),
  partsCount: z.number().int().nullable(),
  minifigCount: z.number().int().nullable(),
  theme: z.string().nullable(),
  themeId: z.number().int().nullable(),
  subtheme: z.string().nullable(),
  uploadedDate: z.string().nullable(),
  brand: z.string().nullable(),
  setNumber: z.string().nullable(),
  releaseYear: z.number().int().nullable(),
  retired: z.boolean().nullable(),
  designer: z.unknown().nullable(),
  dimensions: z.unknown().nullable(),
  instructionsMetadata: z.unknown().nullable(),
  features: z.unknown().nullable(),
  descriptionHtml: z.string().nullable(),
  shortDescription: z.string().nullable(),
  difficulty: z.string().nullable(),
  buildTimeHours: z.number().int().nullable(),
  ageRecommendation: z.string().nullable(),
  status: z.enum(['draft', 'published', 'archived', 'pending_review']),
  visibility: z.enum(['public', 'private', 'unlisted']),
  isFeatured: z.boolean(),
  isVerified: z.boolean(),
  tags: z.array(z.string()).nullable(),
  thumbnailUrl: z.string().nullable(),
  totalPieceCount: z.number().int().nullable(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// List response schema
export const MocListResponseSchema = z.object({
  items: z.array(MocListItemSchema),
  pagination: PaginationSchema,
})

// Type inference
export type CreateMocRequest = z.infer<typeof CreateMocRequestSchema>
export type CreateMocResponse = z.infer<typeof CreateMocResponseSchema>
export type Theme = z.infer<typeof ThemeEnum>
export type MocDetailFile = z.infer<typeof MocDetailFileSchema>
export type MocStats = z.infer<typeof MocStatsSchema>
export type GetMocResponse = z.infer<typeof GetMocResponseSchema>
export type ListMocsQuery = z.infer<typeof ListMocsQuerySchema>
export type Pagination = z.infer<typeof PaginationSchema>
export type MocListItem = z.infer<typeof MocListItemSchema>
export type MocListResponse = z.infer<typeof MocListResponseSchema>

// Upload thumbnail response schema (INST-1103: AC50)
export const UploadThumbnailResponseSchema = z.object({
  thumbnailUrl: z.string().url(),
})

// Type inference
export type UploadThumbnailResponse = z.infer<typeof UploadThumbnailResponseSchema>
