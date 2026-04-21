/**
 * Instructions/MOC API Schemas
 *
 * Frontend Zod schemas for MOC Instructions API validation.
 * These schemas align with backend types but are tailored for API client usage.
 *
 * Story INST-1008: Wire RTK Query Mutations for MOC Instructions API
 */

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────
// UUID Helper - Lenient UUID validation for test environment compatibility
// Accepts any UUID-formatted string (8-4-4-4-12 hex pattern)
// ─────────────────────────────────────────────────────────────────────────

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const lenientUuid = z.string().refine(val => uuidRegex.test(val), {
  message: 'Invalid UUID format',
})

// ─────────────────────────────────────────────────────────────────────────
// Core Enums (aligned with backend)
// ─────────────────────────────────────────────────────────────────────────

export const InstructionTypeSchema = z.enum(['moc', 'set'])
export type InstructionType = z.infer<typeof InstructionTypeSchema>

export const BuildStatusSchema = z.enum([
  'instructions_added',
  'acquiring_parts',
  'ready_to_build',
  'building',
  'complete',
  'parted_out',
])
export type BuildStatus = z.infer<typeof BuildStatusSchema>

export const ReviewStatusSchema = z.enum(['none', 'draft', 'complete'])
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>

export const DifficultySchema = z.enum(['beginner', 'intermediate', 'advanced', 'expert'])
export type Difficulty = z.infer<typeof DifficultySchema>

export const StatusSchema = z.enum(['draft', 'published', 'archived', 'pending_review'])
export type Status = z.infer<typeof StatusSchema>

export const VisibilitySchema = z.enum(['public', 'private', 'unlisted'])
export type Visibility = z.infer<typeof VisibilitySchema>

export const FileTypeSchema = z.enum(['instruction', 'parts-list', 'thumbnail', 'gallery-image'])
export type FileType = z.infer<typeof FileTypeSchema>

// ─────────────────────────────────────────────────────────────────────────
// Nested JSONB Schemas
// ─────────────────────────────────────────────────────────────────────────

export const DesignerSchema = z.object({
  username: z.string(),
  displayName: z.string().nullable().optional(),
  profileUrl: z.string().url().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  socialLinks: z
    .object({
      instagram: z.string().nullable().optional(),
      twitter: z.string().nullable().optional(),
      youtube: z.string().nullable().optional(),
      website: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
})

export type Designer = z.infer<typeof DesignerSchema>

export const DimensionsSchema = z.object({
  height: z
    .object({
      cm: z.number().nullable().optional(),
      inches: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  width: z
    .object({
      cm: z.number().nullable().optional(),
      inches: z.number().nullable().optional(),
      openCm: z.number().nullable().optional(),
      openInches: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  depth: z
    .object({
      cm: z.number().nullable().optional(),
      inches: z.number().nullable().optional(),
      openCm: z.number().nullable().optional(),
      openInches: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  weight: z
    .object({
      kg: z.number().nullable().optional(),
      lbs: z.number().nullable().optional(),
    })
    .nullable()
    .optional(),
  studsWidth: z.number().nullable().optional(),
  studsDepth: z.number().nullable().optional(),
  studsHeight: z.number().nullable().optional(),
  subBuilds: z
    .array(
      z.object({
        name: z.string(),
        height: z
          .object({
            cm: z.number().nullable().optional(),
            inches: z.number().nullable().optional(),
          })
          .nullable()
          .optional(),
        width: z
          .object({
            cm: z.number().nullable().optional(),
            inches: z.number().nullable().optional(),
          })
          .nullable()
          .optional(),
        depth: z
          .object({
            cm: z.number().nullable().optional(),
            inches: z.number().nullable().optional(),
          })
          .nullable()
          .optional(),
        studsWidth: z.number().nullable().optional(),
        studsDepth: z.number().nullable().optional(),
        studsHeight: z.number().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
})

export type Dimensions = z.infer<typeof DimensionsSchema>

export const InstructionsMetadataSchema = z.object({
  instructionType: z.enum(['pdf', 'xml', 'studio', 'ldraw', 'lxf', 'other']).nullable().optional(),
  hasInstructions: z.boolean(),
  pageCount: z.number().int().nullable().optional(),
  fileSize: z.number().int().nullable().optional(),
  previewImages: z.array(z.string()),
})

export type InstructionsMetadata = z.infer<typeof InstructionsMetadataSchema>

export const FeatureSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
})

export type Feature = z.infer<typeof FeatureSchema>

// ─────────────────────────────────────────────────────────────────────────
// MOC Instructions Entity (API Response)
// ─────────────────────────────────────────────────────────────────────────

export const MocInstructionsSchema = z.object({
  id: lenientUuid,
  userId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  type: InstructionTypeSchema,

  // Core Identification
  mocId: z.string().nullable(),
  slug: z.string().nullable(),

  // MOC-specific fields
  author: z.string().nullable(),
  partsCount: z.number().int().nullable(),
  minifigCount: z.number().int().nullable(),
  theme: z.string().nullable(),
  themeId: z.number().int().nullable(),
  subtheme: z.string().nullable(),
  uploadedDate: z.string().nullable(),
  // Set-specific fields
  brand: z.string().nullable(),
  setNumber: z.string().nullable(),
  releaseYear: z.number().int().nullable(),
  retired: z.boolean().nullable(),

  // Extended Metadata
  designer: DesignerSchema.nullable(),
  dimensions: DimensionsSchema.nullable(),
  instructionsMetadata: InstructionsMetadataSchema.nullable(),
  features: z.array(FeatureSchema).nullable(),

  // Rich Description
  descriptionHtml: z.string().nullable(),
  shortDescription: z.string().nullable(),

  // Difficulty & Build Info
  difficulty: DifficultySchema.nullable(),
  buildTimeHours: z.number().int().nullable(),
  ageRecommendation: z.string().nullable(),

  // Status & Visibility
  status: StatusSchema,
  visibility: VisibilitySchema,
  isFeatured: z.boolean(),
  isVerified: z.boolean(),

  // Common fields
  tags: z.array(z.string()).nullable(),
  thumbnailUrl: z.string().nullable(),
  totalPieceCount: z.number().int().nullable(),

  // Procurement
  wantToBuild: z.boolean().nullable().optional(),

  // Timestamps
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type MocInstructions = z.infer<typeof MocInstructionsSchema>

// ─────────────────────────────────────────────────────────────────────────
// MOC Files Entity (API Response)
// ─────────────────────────────────────────────────────────────────────────

export const MocFileSchema = z.object({
  id: lenientUuid,
  mocId: lenientUuid,
  fileType: z.string(),
  fileUrl: z.string().url(),
  originalFilename: z.string().nullable(),
  mimeType: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().nullable(),
  deletedAt: z.string().nullable(),
})

export type MocFile = z.infer<typeof MocFileSchema>

// ─────────────────────────────────────────────────────────────────────────
// Input Schemas (for mutations)
// ─────────────────────────────────────────────────────────────────────────

export const CreateMocInputSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  type: InstructionTypeSchema.default('moc'),

  // MOC-specific
  author: z.string().max(200).optional(),
  partsCount: z.number().int().positive().optional(),
  minifigCount: z.number().int().min(0).optional(),
  theme: z.string().max(100).optional(),
  subtheme: z.string().max(100).optional(),

  // Set-specific
  brand: z.string().max(100).optional(),
  setNumber: z.string().max(50).optional(),
  releaseYear: z.number().int().min(1900).max(2100).optional(),

  // Metadata
  tags: z.array(z.string()).max(20).optional(),
  difficulty: DifficultySchema.optional(),
  buildTimeHours: z.number().int().positive().optional(),
  ageRecommendation: z.string().max(20).optional(),

  // Visibility
  status: StatusSchema.default('draft'),
  visibility: VisibilitySchema.default('private'),
})

export type CreateMocInput = z.infer<typeof CreateMocInputSchema>

export const UpdateMocInputSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).nullable().optional(),
  type: InstructionTypeSchema.optional(),

  // MOC-specific
  author: z.string().max(200).nullable().optional(),
  partsCount: z.number().int().positive().nullable().optional(),
  minifigCount: z.number().int().min(0).nullable().optional(),
  theme: z.string().max(100).nullable().optional(),
  subtheme: z.string().max(100).nullable().optional(),

  // Set-specific
  brand: z.string().max(100).nullable().optional(),
  setNumber: z.string().max(50).nullable().optional(),
  releaseYear: z.number().int().min(1900).max(2100).nullable().optional(),

  // Metadata
  tags: z.array(z.string()).max(20).nullable().optional(),
  dimensions: DimensionsSchema.nullable().optional(),
  difficulty: DifficultySchema.nullable().optional(),
  buildTimeHours: z.number().int().positive().nullable().optional(),
  ageRecommendation: z.string().max(20).nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),

  // Personal
  notes: z.string().nullable().optional(),

  // Build Status & Review
  buildStatus: BuildStatusSchema.optional(),
  reviewSkippedAt: z.string().nullable().optional(),

  // Visibility
  status: StatusSchema.optional(),
  visibility: VisibilitySchema.optional(),
})

export type UpdateMocInput = z.infer<typeof UpdateMocInputSchema>

export const UpdateMocResponseSchema = z.object({
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

export type UpdateMocResponse = z.infer<typeof UpdateMocResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// List/Query Schemas
// ─────────────────────────────────────────────────────────────────────────

export const ListMocsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  type: InstructionTypeSchema.optional(),
  status: StatusSchema.optional(),
  theme: z.string().optional(),
})

export type ListMocsQuery = z.infer<typeof ListMocsQuerySchema>

export const PaginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
})

export type Pagination = z.infer<typeof PaginationSchema>

export const MocListResponseSchema = z.object({
  items: z.array(MocInstructionsSchema),
  pagination: PaginationSchema,
})

export type MocListResponse = z.infer<typeof MocListResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// File Upload Schemas
// ─────────────────────────────────────────────────────────────────────────

export const UploadFileInputSchema = z.object({
  mocId: lenientUuid,
  file: z.instanceof(File),
})

export type UploadFileInput = z.infer<typeof UploadFileInputSchema>

export const DeleteFileInputSchema = z.object({
  mocId: lenientUuid,
  fileId: lenientUuid,
})

export type DeleteFileInput = z.infer<typeof DeleteFileInputSchema>

// ─────────────────────────────────────────────────────────────────────────
// GET /mocs/:id Response Schema (INST-1101)
// ─────────────────────────────────────────────────────────────────────────

export const MocDetailFileSchema = z.object({
  id: lenientUuid,
  mocId: lenientUuid,
  fileType: z.string(),
  name: z.string(),
  size: z.number().int(),
  mimeType: z.string().nullable(),
  s3Key: z.string(),
  uploadedAt: z.string(),
  downloadUrl: z.string().url(),
})

export type MocDetailFile = z.infer<typeof MocDetailFileSchema>

export const MocStatsSchema = z.object({
  pieceCount: z.number().int().nullable(),
  fileCount: z.number().int(),
})

export type MocStats = z.infer<typeof MocStatsSchema>

export const GetMocDetailResponseSchema = z.object({
  id: lenientUuid,
  userId: z.string(),
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
  dimensions: DimensionsSchema.nullable().optional(),
  ratings: z
    .object({
      overall: z.number().min(0).max(5).nullable().optional(),
      buildExperience: z.number().min(0).max(5).nullable().optional(),
    })
    .nullable()
    .optional(),
  notes: z.string().nullable().optional(),
  buildStatus: BuildStatusSchema,
  reviewStatus: ReviewStatusSchema,
  reviewSkippedAt: z.string().nullable().optional(),
})

export type GetMocDetailResponse = z.infer<typeof GetMocDetailResponseSchema>
// ─────────────────────────────────────────────────────────────────────────
// Upload Thumbnail Response Schema (INST-1103)
// ─────────────────────────────────────────────────────────────────────────

export const UploadThumbnailResponseSchema = z.object({
  thumbnailUrl: z.string().url(),
})

export type UploadThumbnailResponse = z.infer<typeof UploadThumbnailResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// File Download URL Response (INST-1105)
// ─────────────────────────────────────────────────────────────────────────

export const GetFileDownloadUrlResponseSchema = z.object({
  downloadUrl: z.string().url(),
  expiresAt: z.string(),
})

export type GetFileDownloadUrlResponse = z.infer<typeof GetFileDownloadUrlResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// Upload Session Schemas (INST-1105)
// ─────────────────────────────────────────────────────────────────────────

export const CreateUploadSessionRequestSchema = z.object({
  files: z.array(
    z.object({
      name: z.string(),
      size: z.number().int().positive(),
      mimeType: z.string(),
      category: z.enum(['instruction', 'parts-list', 'thumbnail', 'image']),
    }),
  ),
  partSizeBytes: z.number().int().positive().optional(),
})

export type CreateUploadSessionRequest = z.infer<typeof CreateUploadSessionRequestSchema>

export const CreateUploadSessionResponseSchema = z.object({
  sessionId: lenientUuid,
  files: z.array(
    z.object({
      fileId: lenientUuid,
      name: z.string(),
      uploadUrls: z.array(
        z.object({
          partNumber: z.number().int(),
          url: z.string().url(),
        }),
      ),
    }),
  ),
  expiresAt: z.string(),
})

export type CreateUploadSessionResponse = z.infer<typeof CreateUploadSessionResponseSchema>

export const CompleteUploadSessionResponseSchema = z.object({
  mocId: lenientUuid,
  files: z.array(
    z.object({
      fileId: lenientUuid,
      fileUrl: z.string().url(),
    }),
  ),
})

export type CompleteUploadSessionResponse = z.infer<typeof CompleteUploadSessionResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// Review Section Schemas (MOC Build Status & Review System)
// ─────────────────────────────────────────────────────────────────────────

export const BrandSchema = z.enum([
  'cada',
  'mould_king',
  'xingbao',
  'wrebbit',
  'gobrick',
  'lego',
  'other',
])
export type Brand = z.infer<typeof BrandSchema>

export const PartsQualitySectionSchema = z.object({
  rating: z.number().min(1).max(5),
  brand: BrandSchema,
  brandOther: z.string().optional(),
  clutchPower: z.number().min(1).max(5),
  colorAccuracy: z.number().min(1).max(5),
  missingParts: z.boolean(),
  missingPartsNotes: z.string().optional(),
  notes: z.string().optional(),
})
export type PartsQualitySection = z.infer<typeof PartsQualitySectionSchema>

export const InstructionsSectionSchema = z.object({
  rating: z.number().min(1).max(5),
  clarity: z.number().min(1).max(5),
  stepGranularity: z.enum(['too_few', 'just_right', 'too_many']),
  errors: z.boolean(),
  errorsNotes: z.string().optional(),
  notes: z.string().optional(),
})
export type InstructionsSection = z.infer<typeof InstructionsSectionSchema>

export const MinifigsSectionSchema = z.object({
  designerIncludedMinifigs: z.boolean(),
  rating: z.number().min(1).max(5).optional(),
  quality: z.number().min(1).max(5).optional(),
  printVsSticker: z.enum(['printed', 'stickered', 'mix', 'none']).optional(),
  notes: z.string().optional(),
})
export type MinifigsSection = z.infer<typeof MinifigsSectionSchema>

export const StickersSectionSchema = z.object({
  hasStickers: z.boolean(),
  rating: z.number().min(1).max(5).optional(),
  quality: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
})
export type StickersSection = z.infer<typeof StickersSectionSchema>

export const ValueSectionSchema = z.object({
  rating: z.number().min(1).max(5),
  pricePerPiece: z.enum(['great', 'fair', 'expensive', 'overpriced']),
  notes: z.string().optional(),
})
export type ValueSection = z.infer<typeof ValueSectionSchema>

export const BuildExperienceSectionSchema = z.object({
  rating: z.number().min(1).max(5),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  sessionCount: z.number().int().min(1),
  enjoyment: z.number().min(1).max(5),
  notes: z.string().optional(),
})
export type BuildExperienceSection = z.infer<typeof BuildExperienceSectionSchema>

export const DesignSectionSchema = z.object({
  rating: z.number().min(1).max(5),
  notes: z.string().optional(),
  promptChips: z.array(z.string()).optional(),
})
export type DesignSection = z.infer<typeof DesignSectionSchema>

export const ReviewSectionsSchema = z.object({
  partsQuality: PartsQualitySectionSchema.optional(),
  instructions: InstructionsSectionSchema.optional(),
  minifigs: MinifigsSectionSchema.optional(),
  stickers: StickersSectionSchema.optional(),
  value: ValueSectionSchema.optional(),
  buildExperience: BuildExperienceSectionSchema.optional(),
  design: DesignSectionSchema.optional(),
})
export type ReviewSections = z.infer<typeof ReviewSectionsSchema>

// ─────────────────────────────────────────────────────────────────────────
// Review CRUD Schemas
// ─────────────────────────────────────────────────────────────────────────

export const MocReviewSchema = z.object({
  id: lenientUuid,
  mocId: lenientUuid,
  userId: z.string(),
  status: z.enum(['draft', 'complete']),
  sections: ReviewSectionsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type MocReview = z.infer<typeof MocReviewSchema>

export const UpdateReviewRequestSchema = z.object({
  sections: ReviewSectionsSchema.optional(),
  status: z.enum(['draft', 'complete']).optional(),
})
export type UpdateReviewRequest = z.infer<typeof UpdateReviewRequestSchema>
