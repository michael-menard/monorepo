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
  uploadedDate: z
    .string()
    .nullable()
    .transform(val => (val ? new Date(val) : null)),

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

  // Timestamps
  publishedAt: z
    .string()
    .nullable()
    .transform(val => (val ? new Date(val) : null)),
  createdAt: z.string().transform(val => new Date(val)),
  updatedAt: z.string().transform(val => new Date(val)),
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
  createdAt: z.string().transform(val => new Date(val)),
  updatedAt: z
    .string()
    .nullable()
    .transform(val => (val ? new Date(val) : null)),
  deletedAt: z
    .string()
    .nullable()
    .transform(val => (val ? new Date(val) : null)),
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
  difficulty: DifficultySchema.nullable().optional(),
  buildTimeHours: z.number().int().positive().nullable().optional(),
  ageRecommendation: z.string().max(20).nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),

  // Visibility
  status: StatusSchema.optional(),
  visibility: VisibilitySchema.optional(),
})

export type UpdateMocInput = z.infer<typeof UpdateMocInputSchema>

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
  uploadedAt: z.string().transform(val => new Date(val)),
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
  createdAt: z.string().transform(val => new Date(val)),
  updatedAt: z.string().transform(val => new Date(val)),
  files: z.array(MocDetailFileSchema),
  stats: MocStatsSchema,
})

export type GetMocDetailResponse = z.infer<typeof GetMocDetailResponseSchema>
// ─────────────────────────────────────────────────────────────────────────
// Upload Thumbnail Response Schema (INST-1103)
// ─────────────────────────────────────────────────────────────────────────

export const UploadThumbnailResponseSchema = z.object({
  thumbnailUrl: z.string().url(),
})

export type UploadThumbnailResponse = z.infer<typeof UploadThumbnailResponseSchema>
