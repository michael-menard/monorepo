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
  tags: z.array(z.string().max(50)).max(20).optional(),
})

// Request schema for updating a MOC (INST-1108: AC-2, AC-5)
// All fields optional for partial update semantics
const DimAxisSchema = z
  .object({ cm: z.number().nullable().optional(), inches: z.number().nullable().optional() })
  .nullable()
  .optional()

const DimEntrySchema = z.object({
  height: DimAxisSchema,
  width: DimAxisSchema,
  depth: DimAxisSchema,
  studsWidth: z.number().nullable().optional(),
  studsDepth: z.number().nullable().optional(),
  studsHeight: z.number().nullable().optional(),
})

const BuildStatusSchema = z.enum([
  'instructions_added',
  'acquiring_parts',
  'ready_to_build',
  'building',
  'complete',
  'parted_out',
])

export const UpdateMocRequestSchema = CreateMocRequestSchema.partial().extend({
  dimensions: DimEntrySchema.extend({
    subBuilds: z
      .array(DimEntrySchema.extend({ name: z.string().max(100) }))
      .max(30)
      .nullable()
      .optional(),
  })
    .nullable()
    .optional(),
  ratings: z
    .object({
      overall: z.number().min(0).max(5).nullable().optional(),
      buildExperience: z.number().min(0).max(5).nullable().optional(),
    })
    .nullable()
    .optional(),
  notes: z.string().nullable().optional(),
  buildStatus: BuildStatusSchema.optional(),
  reviewSkippedAt: z.string().nullable().optional(),
})

// ─────────────────────────────────────────────────────────────────────────
// Review Schemas
// ─────────────────────────────────────────────────────────────────────────

const ReviewSectionsSchema = z.object({
  partsQuality: z
    .object({
      rating: z.number().min(1).max(5),
      brand: z.enum(['cada', 'mould_king', 'xingbao', 'wrebbit', 'gobrick', 'lego', 'other']),
      brandOther: z.string().optional(),
      clutchPower: z.number().min(1).max(5),
      colorAccuracy: z.number().min(1).max(5),
      missingParts: z.boolean(),
      missingPartsNotes: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  instructions: z
    .object({
      rating: z.number().min(1).max(5),
      clarity: z.number().min(1).max(5),
      stepGranularity: z.enum(['too_few', 'just_right', 'too_many']),
      errors: z.boolean(),
      errorsNotes: z.string().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  minifigs: z
    .object({
      designerIncludedMinifigs: z.boolean(),
      rating: z.number().min(1).max(5).optional(),
      quality: z.number().min(1).max(5).optional(),
      printVsSticker: z.enum(['printed', 'stickered', 'mix', 'none']).optional(),
      notes: z.string().optional(),
    })
    .optional(),
  stickers: z
    .object({
      hasStickers: z.boolean(),
      rating: z.number().min(1).max(5).optional(),
      quality: z.number().min(1).max(5).optional(),
      notes: z.string().optional(),
    })
    .optional(),
  value: z
    .object({
      rating: z.number().min(1).max(5),
      pricePerPiece: z.enum(['great', 'fair', 'expensive', 'overpriced']),
      notes: z.string().optional(),
    })
    .optional(),
  buildExperience: z
    .object({
      rating: z.number().min(1).max(5),
      difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
      sessionCount: z.number().int().min(1),
      enjoyment: z.number().min(1).max(5),
      notes: z.string().optional(),
    })
    .optional(),
  design: z
    .object({
      rating: z.number().min(1).max(5),
      notes: z.string().optional(),
      promptChips: z.array(z.string()).optional(),
    })
    .optional(),
})

export const UpdateReviewRequestSchema = z.object({
  sections: ReviewSectionsSchema.optional(),
  status: z.enum(['draft', 'complete']).optional(),
})

export const MocReviewResponseSchema = z.object({
  id: z.string().uuid(),
  mocId: z.string().uuid(),
  userId: z.string(),
  status: z.enum(['draft', 'complete']),
  sections: ReviewSectionsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type UpdateReviewRequest = z.infer<typeof UpdateReviewRequestSchema>
export type MocReviewResponse = z.infer<typeof MocReviewResponseSchema>
export type ReviewSections = z.infer<typeof ReviewSectionsSchema>

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
  mocId: z.string().nullable(),
  source: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  theme: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  thumbnailUrl: z.string().nullable(),
  author: z.string().nullable().optional(),
  designerUrl: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  publishedAt: z.string().nullable().optional(),
  files: z.array(MocDetailFileSchema),
  stats: MocStatsSchema,
  dimensions: z.unknown().nullable().optional(),
  ratings: z
    .object({
      overall: z.number().min(0).max(5).nullable().optional(),
      buildExperience: z.number().min(0).max(5).nullable().optional(),
    })
    .nullable()
    .optional(),
  notes: z.string().nullable().optional(),
  buildStatus: BuildStatusSchema,
  reviewStatus: z.enum(['none', 'draft', 'complete']),
  reviewSkippedAt: z.string().nullable().optional(),
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
  wantToBuild: z.boolean().optional().default(false),
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
export type UpdateMocRequest = z.infer<typeof UpdateMocRequestSchema>
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

// Download file response schema (INST-1107: AC-9, AC-15)
export const GetFileDownloadUrlResponseSchema = z.object({
  downloadUrl: z.string().url(),
  expiresAt: z.string().datetime(),
})

// Type inference
export type GetFileDownloadUrlResponse = z.infer<typeof GetFileDownloadUrlResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// Upload Session Schemas (INST-1105)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Create Upload Session Request Schema
 * (INST-1105: AC31)
 */
export const CreateUploadSessionRequestSchema = z.object({
  filename: z.string().min(1, 'Filename is required').max(255, 'Filename too long'),
  fileSize: z.number().int().positive('File size must be positive'),
  fileType: z.string().min(1, 'File type is required'),
})

export type CreateUploadSessionRequest = z.infer<typeof CreateUploadSessionRequestSchema>

/**
 * Create Upload Session Response Schema
 * (INST-1105: AC47)
 */
export const CreateUploadSessionResponseSchema = z.object({
  sessionId: z.string().uuid(),
  presignedUrl: z.string().url(),
  expiresAt: z.string().datetime(),
})

export type CreateUploadSessionResponse = z.infer<typeof CreateUploadSessionResponseSchema>

/**
 * Complete Upload Session Request Schema
 * (INST-1105: AC49)
 *
 * Note: sessionId comes from URL path, so request body may be empty
 */
export const CompleteUploadSessionRequestSchema = z.object({
  // Currently no body required - sessionId is in URL path
})

export type CompleteUploadSessionRequest = z.infer<typeof CompleteUploadSessionRequestSchema>

/**
 * Complete Upload Session Response Schema
 * (INST-1105: AC61)
 */
export const CompleteUploadSessionResponseSchema = z.object({
  id: z.string().uuid(),
  mocId: z.string().uuid(),
  fileType: z.literal('instruction'),
  fileUrl: z.string().url(),
  originalFilename: z.string(),
  mimeType: z.literal('application/pdf'),
  fileSize: z.number().int().positive(),
  createdAt: z.string().datetime(),
  uploadedBy: z.string(),
})

export type CompleteUploadSessionResponse = z.infer<typeof CompleteUploadSessionResponseSchema>

/**
 * Upload Session entity schema (for internal use)
 */
export const UploadSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  mocInstructionId: z.string().uuid().nullable(),
  status: z.enum(['pending', 'active', 'completed', 'expired', 'cancelled']),
  partSizeBytes: z.number().int(),
  expiresAt: z.date(),
  originalFilename: z.string().nullable(),
  originalFileSize: z.number().int().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  finalizedAt: z.date().nullable(),
  finalizingAt: z.date().nullable(),
})

export type UploadSessionType = z.infer<typeof UploadSessionSchema>
