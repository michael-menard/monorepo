/**
 * Internal Types for MOC Instructions Core Package
 *
 * Zod schemas for MOC data structures used by moc-instructions-core functions.
 */

import { z } from 'zod'

// ============================================================
// DATABASE ROW SCHEMAS
// ============================================================

/**
 * MOC Row Schema (DB row format)
 *
 * Represents a row from the moc_instructions table.
 */
export const MocRowSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  type: z.enum(['moc', 'set']),
  mocId: z.string().nullable(),
  slug: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  author: z.string().nullable(),
  brand: z.string().nullable(),
  theme: z.string().nullable(),
  subtheme: z.string().nullable(),
  setNumber: z.string().nullable(),
  releaseYear: z.number().int().nullable(),
  retired: z.boolean().nullable(),
  partsCount: z.number().int().nullable(),
  tags: z.array(z.string()).nullable(),
  thumbnailUrl: z.string().nullable(),
  status: z.enum(['draft', 'published', 'archived', 'pending_review']),
  publishedAt: z.date().nullable(),
  finalizedAt: z.date().nullable(),
  finalizingAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type MocRow = z.infer<typeof MocRowSchema>

/**
 * MOC File Row Schema (DB row format)
 *
 * Represents a row from the moc_files table.
 */
export const MocFileRowSchema = z.object({
  id: z.string().uuid(),
  mocId: z.string().uuid(),
  fileType: z.enum(['instruction', 'parts-list', 'thumbnail', 'gallery-image']),
  fileUrl: z.string(),
  originalFilename: z.string().nullable(),
  mimeType: z.string().nullable(),
  createdAt: z.date(),
  deletedAt: z.date().nullable(),
})

export type MocFileRow = z.infer<typeof MocFileRowSchema>

// ============================================================
// API RESPONSE SCHEMAS
// ============================================================

/**
 * MOC File (API response format)
 */
export const MocFileSchema = z.object({
  id: z.string().uuid(),
  category: z.string(),
  filename: z.string(),
  mimeType: z.string().nullable(),
  url: z.string(),
  uploadedAt: z.string(), // ISO date string
})

export type MocFile = z.infer<typeof MocFileSchema>

/**
 * MOC Detail Schema (API response format)
 *
 * Full MOC detail with files and ownership flag.
 */
export const MocDetailSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  theme: z.string().nullable(),
  status: z.enum(['draft', 'published', 'archived', 'pending_review']),
  createdAt: z.string(), // ISO date string
  updatedAt: z.string(), // ISO date string
  publishedAt: z.string().nullable(), // ISO date string
  files: z.array(MocFileSchema),
  isOwner: z.boolean(),
})

export type MocDetail = z.infer<typeof MocDetailSchema>

// ============================================================
// LIST MOCS SCHEMAS
// ============================================================

/**
 * List MOCs Filter Options
 *
 * - page/limit: Pagination params
 * - search: Optional ILIKE search on title/description
 * - tag: Optional tag filter
 */
export const ListMocsFiltersSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  tag: z.string().optional(),
})

export type ListMocsFilters = z.infer<typeof ListMocsFiltersSchema>

/**
 * MOC List Item (simplified for list view)
 */
export const MocListItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  theme: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  status: z.enum(['draft', 'published', 'archived', 'pending_review']),
  createdAt: z.string(), // ISO date string
  updatedAt: z.string(), // ISO date string
})

export type MocListItem = z.infer<typeof MocListItemSchema>

/**
 * List MOCs Response Schema
 */
export const ListMocsResponseSchema = z.object({
  data: z.array(MocListItemSchema),
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
})

export type ListMocsResponse = z.infer<typeof ListMocsResponseSchema>

// ============================================================
// STATS SCHEMAS
// ============================================================

/**
 * Category Stat Schema
 */
export const CategoryStatSchema = z.object({
  category: z.string(),
  count: z.number().int().min(0),
})

export type CategoryStat = z.infer<typeof CategoryStatSchema>

/**
 * Category Stats Response Schema
 */
export const CategoryStatsResponseSchema = z.object({
  data: z.array(CategoryStatSchema),
  total: z.number().int().min(0),
})

export type CategoryStatsResponse = z.infer<typeof CategoryStatsResponseSchema>

/**
 * Upload Over Time Schema
 */
export const UploadOverTimeSchema = z.object({
  date: z.string(), // YYYY-MM format
  category: z.string(),
  count: z.number().int().min(0),
})

export type UploadOverTime = z.infer<typeof UploadOverTimeSchema>

/**
 * Uploads Over Time Response Schema
 */
export const UploadsOverTimeResponseSchema = z.object({
  data: z.array(UploadOverTimeSchema),
})

export type UploadsOverTimeResponse = z.infer<typeof UploadsOverTimeResponseSchema>

// ============================================================
// INITIALIZE WITH FILES SCHEMAS (STORY-015)
// ============================================================

/**
 * File metadata schema for initialization
 *
 * Represents a single file to be uploaded as part of MOC creation.
 */
export const FileMetadataSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  fileType: z.enum(['instruction', 'parts-list', 'gallery-image', 'thumbnail']),
  mimeType: z.string().min(1, 'MIME type is required'),
  size: z.number().positive('File size must be positive'),
})

export type FileMetadata = z.infer<typeof FileMetadataSchema>

/**
 * Initialize MOC Input Schema
 *
 * Request body for initializing a MOC with file uploads.
 */
export const InitializeMocInputSchema = z.object({
  // Basic fields
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  description: z.string().optional(),
  type: z.enum(['moc', 'set']),
  tags: z.array(z.string()).optional(),

  // MOC-specific fields
  author: z.string().optional(),
  setNumber: z.string().optional(),
  partsCount: z.number().optional(),
  theme: z.string().optional(),
  subtheme: z.string().optional(),

  // Set-specific fields
  brand: z.string().optional(),
  releaseYear: z.number().optional(),
  retired: z.boolean().optional(),

  // Core identification
  mocId: z.string().max(50).optional(),
  slug: z.string().max(255).optional(),

  // Files (required)
  files: z.array(FileMetadataSchema).min(1, 'At least one file is required'),
})

export type InitializeMocInput = z.infer<typeof InitializeMocInputSchema>

/**
 * Presigned Upload URL
 *
 * Represents a presigned S3 URL for uploading a single file.
 */
export const PresignedUploadUrlSchema = z.object({
  fileId: z.string().uuid(),
  filename: z.string(),
  fileType: z.string(),
  uploadUrl: z.string().url(),
  expiresIn: z.number().positive(),
})

export type PresignedUploadUrl = z.infer<typeof PresignedUploadUrlSchema>

/**
 * Initialize With Files Success Result
 */
export const InitializeWithFilesSuccessSchema = z.object({
  mocId: z.string().uuid(),
  uploadUrls: z.array(PresignedUploadUrlSchema),
  sessionTtlSeconds: z.number().positive(),
})

export type InitializeWithFilesSuccess = z.infer<typeof InitializeWithFilesSuccessSchema>

/**
 * Initialize With Files Error Codes
 */
export const InitializeErrorCodeSchema = z.enum([
  'RATE_LIMIT_EXCEEDED',
  'DUPLICATE_TITLE',
  'VALIDATION_ERROR',
  'DB_ERROR',
  'S3_ERROR',
])

export type InitializeErrorCode = z.infer<typeof InitializeErrorCodeSchema>

/**
 * Initialize With Files Result (discriminated union)
 */
export type InitializeWithFilesResult =
  | { success: true; data: InitializeWithFilesSuccess }
  | {
      success: false
      error: InitializeErrorCode
      message: string
      details?: Record<string, unknown>
    }

// ============================================================
// FINALIZE WITH FILES SCHEMAS (STORY-015)
// ============================================================

/**
 * File upload confirmation schema
 */
export const FinalizeUploadedFileSchema = z.object({
  fileId: z.string().uuid('Invalid file ID'),
  success: z.boolean(),
})

export type FinalizeUploadedFile = z.infer<typeof FinalizeUploadedFileSchema>

/**
 * Finalize MOC Input Schema
 */
export const FinalizeMocInputSchema = z.object({
  uploadedFiles: z
    .array(FinalizeUploadedFileSchema)
    .min(1, 'At least one file confirmation is required'),
})

export type FinalizeMocInput = z.infer<typeof FinalizeMocInputSchema>

/**
 * Per-file validation result
 */
export const FileValidationResultSchema = z.object({
  fileId: z.string().uuid(),
  filename: z.string(),
  success: z.boolean(),
  errors: z
    .array(
      z.object({
        code: z.string(),
        message: z.string(),
        line: z.number().optional(),
        field: z.string().optional(),
      }),
    )
    .optional(),
  warnings: z
    .array(
      z.object({
        code: z.string(),
        message: z.string(),
        line: z.number().optional(),
        field: z.string().optional(),
      }),
    )
    .optional(),
  pieceCount: z.number().optional(),
})

export type FileValidationResult = z.infer<typeof FileValidationResultSchema>

/**
 * Finalize With Files Error Codes
 */
export const FinalizeErrorCodeSchema = z.enum([
  'NOT_FOUND',
  'FORBIDDEN',
  'RATE_LIMIT_EXCEEDED',
  'NO_SUCCESSFUL_UPLOADS',
  'FILE_NOT_IN_S3',
  'SIZE_TOO_LARGE',
  'INVALID_TYPE',
  'PARTS_VALIDATION_ERROR',
  'DB_ERROR',
  'S3_ERROR',
])

export type FinalizeErrorCode = z.infer<typeof FinalizeErrorCodeSchema>

/**
 * Finalize With Files Success Result
 */
export const FinalizeWithFilesSuccessSchema = z.object({
  moc: MocRowSchema.extend({
    files: z.array(MocFileRowSchema),
  }),
  idempotent: z.boolean().optional(),
  status: z.enum(['published', 'finalizing']).optional(),
  fileValidation: z.array(FileValidationResultSchema).optional(),
  totalPieceCount: z.number().optional(),
})

export type FinalizeWithFilesSuccess = z.infer<typeof FinalizeWithFilesSuccessSchema>

/**
 * Finalize With Files Result (discriminated union)
 */
export type FinalizeWithFilesResult =
  | { success: true; data: FinalizeWithFilesSuccess }
  | {
      success: false
      error: FinalizeErrorCode
      message: string
      details?: Record<string, unknown>
    }

// ============================================================
// DEPENDENCY INJECTION INTERFACES (STORY-015)
// ============================================================

/**
 * Rate limit check result
 */
export interface RateLimitCheckResult {
  allowed: boolean
  remaining: number
  currentCount: number
  nextAllowedAt: Date
  retryAfterSeconds: number
}

/**
 * Upload configuration interface (subset of @repo/upload-config)
 */
export interface UploadConfigSubset {
  pdfMaxBytes: number
  imageMaxBytes: number
  partsListMaxBytes: number
  pdfMaxMb: number
  imageMaxMb: number
  partsListMaxMb: number
  imageMaxCount: number
  partsListMaxCount: number
  rateLimitPerDay: number
  presignTtlMinutes: number
  presignTtlSeconds: number
  sessionTtlMinutes: number
  sessionTtlSeconds: number
  finalizeLockTtlMinutes: number
}

/**
 * Dependencies for initializeWithFiles
 *
 * All infrastructure concerns are injected to keep core logic platform-agnostic.
 */
export interface InitializeWithFilesDeps {
  /** Database client for MOC operations */
  db: {
    checkDuplicateTitle: (userId: string, title: string) => Promise<{ id: string } | null>
    createMoc: (mocData: Record<string, unknown>) => Promise<MocRow>
    createMocFile: (fileData: Record<string, unknown>) => Promise<MocFileRow>
  }
  /** Generate a presigned URL for S3 PUT operation */
  generatePresignedUrl: (
    bucket: string,
    key: string,
    contentType: string,
    ttlSeconds: number,
  ) => Promise<string>
  /** Check rate limit for user */
  checkRateLimit: (userId: string) => Promise<RateLimitCheckResult>
  /** Validate MIME type against allowlist */
  isMimeTypeAllowed: (
    fileType: 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image',
    mimeType: string,
  ) => boolean
  /** Get allowed MIME types for a file type (for error messages) */
  getAllowedMimeTypes: (
    fileType: 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image',
  ) => string[]
  /** Sanitize filename for S3 key usage */
  sanitizeFilename: (filename: string) => string
  /** Generate a UUID */
  generateUuid: () => string
  /** S3 bucket name */
  s3Bucket: string
  /** S3 region */
  s3Region: string
  /** Upload configuration */
  config: UploadConfigSubset
}

/**
 * Parts validation result
 */
export interface PartsValidationResult {
  success: boolean
  errors: Array<{
    code: string
    message: string
    line?: number
    field?: string
  }>
  warnings: Array<{
    code: string
    message: string
    line?: number
    field?: string
  }>
  data?: {
    totalPieceCount?: number
  }
}

/**
 * Dependencies for finalizeWithFiles
 *
 * All infrastructure concerns are injected to keep core logic platform-agnostic.
 */
export interface FinalizeWithFilesDeps {
  /** Database client for MOC operations */
  db: {
    getMocById: (mocId: string) => Promise<MocRow | null>
    getMocFiles: (mocId: string, fileIds?: string[]) => Promise<MocFileRow[]>
    acquireFinalizeLock: (mocId: string, staleCutoff: Date) => Promise<MocRow | null>
    updateMocFile: (fileId: string, updates: Record<string, unknown>) => Promise<void>
    updateMoc: (mocId: string, updates: Record<string, unknown>) => Promise<MocRow>
    clearFinalizeLock: (mocId: string) => Promise<void>
  }
  /** Check if file exists in S3 and get metadata */
  headObject: (bucket: string, key: string) => Promise<{ contentLength: number }>
  /** Get object content from S3 */
  getObject: (bucket: string, key: string, range?: string) => Promise<Buffer>
  /** Validate file magic bytes */
  validateMagicBytes: (buffer: Buffer, mimeType: string) => boolean
  /** Validate parts list file (optional - not all deployments need parts validation) */
  validatePartsFile?: (
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ) => Promise<PartsValidationResult>
  /** Check rate limit for user */
  checkRateLimit: (userId: string) => Promise<RateLimitCheckResult>
  /** Get file size limit by type */
  getFileSizeLimit: (
    fileType: 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image',
  ) => number
  /** S3 bucket name */
  s3Bucket: string
  /** Upload configuration */
  config: UploadConfigSubset
}

// ============================================================
// DELETE MOC FILE SCHEMAS (STORY-016)
// ============================================================

/**
 * Delete MOC File Error Codes
 */
export const DeleteMocFileErrorCodeSchema = z.enum(['NOT_FOUND', 'FORBIDDEN', 'DB_ERROR'])

export type DeleteMocFileErrorCode = z.infer<typeof DeleteMocFileErrorCodeSchema>

/**
 * Delete MOC File Success Result
 */
export const DeleteMocFileSuccessSchema = z.object({
  fileId: z.string().uuid(),
  message: z.string(),
})

export type DeleteMocFileSuccess = z.infer<typeof DeleteMocFileSuccessSchema>

/**
 * Delete MOC File Result (discriminated union)
 */
export type DeleteMocFileResult =
  | { success: true; data: DeleteMocFileSuccess }
  | {
      success: false
      error: DeleteMocFileErrorCode
      message: string
    }

/**
 * Dependencies for deleteMocFile
 */
export interface DeleteMocFileDeps {
  db: {
    getMoc: (mocId: string) => Promise<MocRow | null>
    getFile: (fileId: string, mocId: string) => Promise<MocFileRow | null>
    softDeleteFile: (fileId: string) => Promise<void>
    updateMocTimestamp: (mocId: string) => Promise<void>
  }
}

// ============================================================
// UPLOAD PARTS LIST SCHEMAS (STORY-016)
// ============================================================

/**
 * Parts list parsing result
 */
export const PartsListParseResultSchema = z.object({
  totalPieceCount: z.number().int().min(0),
  uniqueParts: z.number().int().min(0),
  format: z.enum(['csv', 'xml']),
})

export type PartsListParseResult = z.infer<typeof PartsListParseResultSchema>

/**
 * MOC Parts List Row Schema (DB row format)
 */
export const MocPartsListRowSchema = z.object({
  id: z.string().uuid(),
  mocId: z.string().uuid(),
  fileId: z.string().uuid().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  totalPartsCount: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type MocPartsListRow = z.infer<typeof MocPartsListRowSchema>

/**
 * Upload Parts List Error Codes
 */
export const UploadPartsListErrorCodeSchema = z.enum([
  'NOT_FOUND',
  'FORBIDDEN',
  'VALIDATION_ERROR',
  'PARSE_ERROR',
  'DB_ERROR',
  'S3_ERROR',
])

export type UploadPartsListErrorCode = z.infer<typeof UploadPartsListErrorCodeSchema>

/**
 * Upload Parts List Success Result
 */
export const UploadPartsListSuccessSchema = z.object({
  file: MocFileRowSchema,
  partsList: MocPartsListRowSchema,
  parsing: PartsListParseResultSchema.extend({ success: z.literal(true) }),
  moc: z.object({
    id: z.string().uuid(),
    totalPieceCount: z.number().nullable(),
  }),
})

export type UploadPartsListSuccess = z.infer<typeof UploadPartsListSuccessSchema>

/**
 * Upload Parts List Result (discriminated union)
 */
export type UploadPartsListResult =
  | { success: true; data: UploadPartsListSuccess }
  | {
      success: false
      error: UploadPartsListErrorCode
      message: string
      details?: { errors?: Array<{ code: string; message: string; line?: number }> }
    }

/**
 * Dependencies for uploadPartsList
 */
export interface UploadPartsListDeps {
  db: {
    getMoc: (mocId: string) => Promise<MocRow | null>
    createMocFile: (data: {
      mocId: string
      fileType: string
      fileUrl: string
      originalFilename: string
      mimeType: string
    }) => Promise<MocFileRow>
    createPartsList: (data: {
      mocId: string
      fileId: string
      title: string
      description: string
      totalPartsCount: string
    }) => Promise<MocPartsListRow>
    updateMocPieceCount: (mocId: string, pieceCount: number) => Promise<MocRow>
  }
  uploadToS3: (bucket: string, key: string, buffer: Buffer, contentType: string) => Promise<string>
  parsePartsListFile: (
    filename: string,
    mimeType: string,
    buffer: Buffer,
  ) => Promise<{
    success: boolean
    data?: {
      totalPieceCount: number
      parts: Array<{ partNumber: string; quantity: number }>
      format: 'csv' | 'xml'
    }
    errors: Array<{ code: string; message: string; line?: number }>
  }>
  sanitizeFilename: (filename: string) => string
  generateUuid: () => string
  s3Bucket: string
  s3Region: string
}

// ============================================================
// EDIT PRESIGN SCHEMAS (STORY-016)
// ============================================================

/**
 * Edit file metadata input schema
 */
export const EditFileMetadataSchema = z.object({
  category: z.enum(['instruction', 'image', 'parts-list', 'thumbnail']),
  filename: z.string().min(1, 'Filename is required'),
  size: z.number().positive('File size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required'),
})

export type EditFileMetadata = z.infer<typeof EditFileMetadataSchema>

/**
 * Edit Presign Input Schema
 */
export const EditPresignInputSchema = z.object({
  files: z
    .array(EditFileMetadataSchema)
    .min(1, 'At least one file is required')
    .max(20, 'Maximum 20 files per request'),
})

export type EditPresignInput = z.infer<typeof EditPresignInputSchema>

/**
 * Presigned file info for edit
 */
export const EditPresignedFileSchema = z.object({
  id: z.string().uuid(),
  category: z.string(),
  filename: z.string(),
  uploadUrl: z.string().url(),
  s3Key: z.string(),
  expiresAt: z.string().datetime(),
})

export type EditPresignedFile = z.infer<typeof EditPresignedFileSchema>

/**
 * Edit Presign Error Codes
 */
export const EditPresignErrorCodeSchema = z.enum([
  'NOT_FOUND',
  'FORBIDDEN',
  'VALIDATION_ERROR',
  'RATE_LIMIT_EXCEEDED',
  'FILE_TOO_LARGE',
  'INVALID_MIME_TYPE',
  'S3_ERROR',
])

export type EditPresignErrorCode = z.infer<typeof EditPresignErrorCodeSchema>

/**
 * Edit Presign Success Result
 */
export const EditPresignSuccessSchema = z.object({
  files: z.array(EditPresignedFileSchema),
  sessionExpiresAt: z.string().datetime(),
})

export type EditPresignSuccess = z.infer<typeof EditPresignSuccessSchema>

/**
 * Edit Presign Result (discriminated union)
 */
export type EditPresignResult =
  | { success: true; data: EditPresignSuccess }
  | {
      success: false
      error: EditPresignErrorCode
      message: string
      details?: {
        filename?: string
        category?: string
        maxBytes?: number
        providedBytes?: number
        allowedTypes?: string[]
        providedType?: string
        retryAfterSeconds?: number
        resetAt?: string
        usage?: { current: number; limit: number }
      }
    }

/**
 * Dependencies for editPresign
 */
export interface EditPresignDeps {
  db: {
    getMoc: (mocId: string) => Promise<MocRow | null>
  }
  generatePresignedUrl: (
    bucket: string,
    key: string,
    contentType: string,
    ttlSeconds: number,
  ) => Promise<string>
  checkRateLimit: (
    userId: string,
  ) => Promise<{ allowed: boolean; currentCount: number; limit: number }>
  isMimeTypeAllowed: (fileType: string, mimeType: string) => boolean
  getAllowedMimeTypes: (fileType: string) => string[]
  getFileSizeLimit: (fileType: string) => number
  getFileCountLimit: (fileType: string) => number
  sanitizeFilename: (filename: string) => string
  generateUuid: () => string
  config: UploadConfigSubset
  s3Bucket: string
}

// ============================================================
// EDIT FINALIZE SCHEMAS (STORY-016)
// ============================================================

/**
 * New file metadata for edit finalize
 */
export const EditNewFileSchema = z.object({
  s3Key: z.string().min(1, 'S3 key is required'),
  category: z.enum(['instruction', 'image', 'parts-list', 'thumbnail']),
  filename: z.string().min(1, 'Filename is required'),
  size: z.number().positive('Size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required'),
})

export type EditNewFile = z.infer<typeof EditNewFileSchema>

/**
 * Edit Finalize Input Schema
 */
export const EditFinalizeInputSchema = z.object({
  // Metadata updates (all optional)
  title: z.string().min(1, 'Title is required').max(100, 'Title too long').optional(),
  description: z.string().max(2000, 'Description too long').nullable().optional(),
  tags: z
    .array(z.string().max(30, 'Tag too long'))
    .max(10, 'Maximum 10 tags allowed')
    .nullable()
    .optional(),
  theme: z.string().max(50, 'Theme too long').nullable().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens')
    .max(100, 'Slug too long')
    .optional(),

  // File changes
  newFiles: z.array(EditNewFileSchema).optional().default([]),
  removedFileIds: z.array(z.string().uuid()).optional().default([]),

  // Idempotency - for conflict detection
  expectedUpdatedAt: z.string().datetime('Invalid datetime format'),
})

export type EditFinalizeInput = z.infer<typeof EditFinalizeInputSchema>

/**
 * Edit Finalize Error Codes
 */
export const EditFinalizeErrorCodeSchema = z.enum([
  'NOT_FOUND',
  'FORBIDDEN',
  'VALIDATION_ERROR',
  'CONCURRENT_EDIT',
  'RATE_LIMIT_EXCEEDED',
  'FILE_NOT_IN_S3',
  'INVALID_FILE_CONTENT',
  'DB_ERROR',
  'S3_ERROR',
])

export type EditFinalizeErrorCode = z.infer<typeof EditFinalizeErrorCodeSchema>

/**
 * Edit Finalize File Result
 */
export const EditFinalizeFileSchema = z.object({
  id: z.string().uuid(),
  fileType: z.string(),
  filename: z.string().nullable(),
  mimeType: z.string().nullable(),
  url: z.string().nullable(),
  presignedUrl: z.string().nullable(),
  createdAt: z.string().nullable(),
})

export type EditFinalizeFile = z.infer<typeof EditFinalizeFileSchema>

/**
 * Edit Finalize Success Result
 */
export const EditFinalizeSuccessSchema = z.object({
  moc: z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    slug: z.string().nullable(),
    tags: z.array(z.string()).nullable(),
    theme: z.string().nullable(),
    status: z.string(),
    updatedAt: z.string().datetime(),
  }),
  files: z.array(EditFinalizeFileSchema),
})

export type EditFinalizeSuccess = z.infer<typeof EditFinalizeSuccessSchema>

/**
 * Edit Finalize Result (discriminated union)
 */
export type EditFinalizeResult =
  | { success: true; data: EditFinalizeSuccess }
  | {
      success: false
      error: EditFinalizeErrorCode
      message: string
      details?: {
        currentUpdatedAt?: string
        filename?: string
        s3Key?: string
        retryAfterSeconds?: number
        resetAt?: string
        usage?: { current: number; limit: number }
      }
    }

/**
 * Transaction client interface (generic)
 */
export interface TxClient {
  // Opaque transaction client - implementation specific
}

/**
 * Dependencies for editFinalize
 */
export interface EditFinalizeDeps {
  db: {
    getMoc: (mocId: string) => Promise<MocRow | null>
    getMocFiles: (mocId: string, fileIds?: string[]) => Promise<MocFileRow[]>
    transaction: <T>(fn: (tx: TxClient) => Promise<T>) => Promise<T>
    // Transaction operations (use tx parameter)
    updateMocWithLock: (
      tx: TxClient,
      mocId: string,
      expectedUpdatedAt: Date,
      updates: Record<string, unknown>,
    ) => Promise<MocRow | null>
    insertMocFiles: (
      tx: TxClient,
      files: Array<{
        mocId: string
        fileType: string
        fileUrl: string
        originalFilename: string
        mimeType: string
      }>,
    ) => Promise<void>
    softDeleteFiles: (tx: TxClient, mocId: string, fileIds: string[]) => Promise<void>
  }
  headObject: (bucket: string, key: string) => Promise<{ contentLength: number }>
  getObject: (bucket: string, key: string, range?: string) => Promise<Buffer>
  copyObject: (bucket: string, source: string, dest: string) => Promise<void>
  deleteObject: (bucket: string, key: string) => Promise<void>
  deleteObjects: (bucket: string, keys: string[]) => Promise<void>
  validateMagicBytes: (buffer: Buffer, mimeType: string) => boolean
  checkRateLimit: (userId: string) => Promise<RateLimitCheckResult>
  generatePresignedGetUrl?: (bucket: string, key: string, ttlSeconds: number) => Promise<string>
  updateOpenSearch?: (moc: MocRow) => Promise<void>
  config: UploadConfigSubset
  s3Bucket: string
}
