/**
 * Initialize MOC with Files
 *
 * Platform-agnostic core logic for initializing a MOC with file uploads.
 * Phase 1 of two-phase MOC creation flow.
 *
 * Features:
 * - Validates file requirements (at least 1 instruction, max 10 instructions)
 * - Validates file sizes and MIME types against config
 * - Checks rate limit before any DB writes
 * - Checks for duplicate title (pre-check + handles race condition)
 * - Creates MOC record with status='draft'
 * - Generates presigned URLs for each file
 * - Creates placeholder file records
 *
 * STORY-015: MOC Instructions - Initialization & Finalization
 */

import {
  InitializeMocInputSchema,
  type InitializeMocInput,
  type InitializeWithFilesDeps,
  type InitializeWithFilesResult,
  type FileMetadata,
  type PresignedUploadUrl,
} from './__types__/index.js'

/**
 * Initialize MOC with files
 *
 * Creates a MOC record and generates presigned S3 URLs for file uploads.
 *
 * @param userId - Authenticated user ID
 * @param input - MOC data and file metadata (validated against InitializeMocInputSchema)
 * @param deps - Injected dependencies (db, s3, rate limiter, config)
 * @returns Success with mocId and presigned URLs, or error result
 */
export async function initializeWithFiles(
  userId: string,
  input: InitializeMocInput,
  deps: InitializeWithFilesDeps,
): Promise<InitializeWithFilesResult> {
  // Validate input against schema
  const validation = InitializeMocInputSchema.safeParse(input)
  if (!validation.success) {
    return {
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: { errors: validation.error.flatten() },
    }
  }

  const { files, ...mocData } = validation.data

  // Step 1: Validate file requirements
  const fileValidationError = validateFileRequirements(files, deps.config)
  if (fileValidationError) {
    return {
      success: false,
      error: 'VALIDATION_ERROR',
      message: fileValidationError,
    }
  }

  // Step 2: Validate file sizes and MIME types
  for (const file of files) {
    const sizeValidationError = validateFileSize(file, deps.config)
    if (sizeValidationError) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: sizeValidationError,
      }
    }

    if (!deps.isMimeTypeAllowed(file.fileType, file.mimeType)) {
      const allowedTypes = deps.getAllowedMimeTypes(file.fileType)
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: `File ${file.filename} has invalid MIME type "${file.mimeType}" for ${file.fileType}. Allowed types: ${allowedTypes.join(', ')}`,
      }
    }
  }

  // Step 3: Check rate limit BEFORE any DB writes (AC-8)
  const rateLimitResult = await deps.checkRateLimit(userId)
  if (!rateLimitResult.allowed) {
    return {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Daily upload limit exceeded. Please try again tomorrow.`,
      details: {
        nextAllowedAt: rateLimitResult.nextAllowedAt.toISOString(),
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      },
    }
  }

  // Step 4: Pre-check for duplicate title (AC-7)
  const existingMoc = await deps.db.checkDuplicateTitle(userId, mocData.title)
  if (existingMoc) {
    return {
      success: false,
      error: 'DUPLICATE_TITLE',
      message: 'A MOC with this title already exists',
      details: {
        title: mocData.title,
        existingMocId: existingMoc.id,
      },
    }
  }

  // Step 5: Create MOC record
  const mocId = deps.generateUuid()
  const now = new Date()

  const baseValues: Record<string, unknown> = {
    id: mocId,
    userId,
    title: mocData.title,
    description: mocData.description || null,
    type: mocData.type,
    tags: mocData.tags || null,
    thumbnailUrl: null, // Will be set in finalize step

    // Core identification
    mocId: mocData.mocId || null,
    slug: mocData.slug || null,

    // Status
    status: 'draft',

    // Timestamps
    createdAt: now,
    updatedAt: now,
  }

  // Add type-specific fields
  const values =
    mocData.type === 'moc'
      ? {
          ...baseValues,
          author: mocData.author || null,
          setNumber: mocData.setNumber || null,
          partsCount: mocData.partsCount || null,
          theme: mocData.theme || null,
          subtheme: mocData.subtheme || null,
          brand: null,
          releaseYear: null,
          retired: null,
        }
      : {
          ...baseValues,
          author: null,
          brand: mocData.brand || null,
          theme: mocData.theme || null,
          setNumber: mocData.setNumber || null,
          releaseYear: mocData.releaseYear || null,
          retired: mocData.retired || false,
          partsCount: mocData.partsCount || null,
          subtheme: null,
        }

  try {
    await deps.db.createMoc(values)
  } catch (error) {
    // Handle race condition on duplicate title (Postgres unique violation code 23505)
    if (isPostgresUniqueViolation(error)) {
      return {
        success: false,
        error: 'DUPLICATE_TITLE',
        message: 'A MOC with this title already exists',
        details: { title: mocData.title },
      }
    }
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Failed to create MOC record',
    }
  }

  // Step 6: Generate presigned URLs and create file records
  const uploadUrls: PresignedUploadUrl[] = []

  try {
    for (const file of files) {
      const fileId = deps.generateUuid()
      const timestamp = Date.now()
      const sanitizedFilename = deps.sanitizeFilename(file.filename)
      const s3Key = `mocs/${mocId}/${file.fileType}/${timestamp}-${sanitizedFilename}`

      // Create placeholder file record
      await deps.db.createMocFile({
        id: fileId,
        mocId,
        fileType: file.fileType,
        fileUrl: `https://${deps.s3Bucket}.s3.${deps.s3Region}.amazonaws.com/${s3Key}`,
        originalFilename: file.filename,
        mimeType: file.mimeType,
        createdAt: new Date(),
      })

      // Generate presigned URL
      const uploadUrl = await deps.generatePresignedUrl(
        deps.s3Bucket,
        s3Key,
        file.mimeType,
        deps.config.presignTtlSeconds,
      )

      uploadUrls.push({
        fileId,
        filename: file.filename,
        fileType: file.fileType,
        uploadUrl,
        expiresIn: deps.config.presignTtlSeconds,
      })
    }
  } catch (error) {
    return {
      success: false,
      error: 'S3_ERROR',
      message: error instanceof Error ? error.message : 'Failed to generate presigned URLs',
    }
  }

  // Step 7: Return success with presigned URLs (AC-1, AC-9)
  return {
    success: true,
    data: {
      mocId,
      uploadUrls,
      sessionTtlSeconds: deps.config.sessionTtlSeconds,
    },
  }
}

/**
 * Validate file requirements
 *
 * - At least one instruction file is required (AC-3)
 * - Maximum 10 instruction files allowed (AC-4)
 * - Maximum parts-list and image counts from config
 */
function validateFileRequirements(
  files: FileMetadata[],
  config: InitializeWithFilesDeps['config'],
): string | null {
  const instructionFiles = files.filter(f => f.fileType === 'instruction')
  if (instructionFiles.length === 0) {
    return 'At least one instruction file is required'
  }

  if (instructionFiles.length > 10) {
    return 'Maximum 10 instruction files allowed'
  }

  const partsListFiles = files.filter(f => f.fileType === 'parts-list')
  if (partsListFiles.length > config.partsListMaxCount) {
    return `Maximum ${config.partsListMaxCount} parts list files allowed`
  }

  const imageFiles = files.filter(f => f.fileType === 'gallery-image' || f.fileType === 'thumbnail')
  if (imageFiles.length > config.imageMaxCount) {
    return `Maximum ${config.imageMaxCount} images allowed`
  }

  return null
}

/**
 * Validate file size against config limits (AC-5)
 */
function validateFileSize(
  file: FileMetadata,
  config: InitializeWithFilesDeps['config'],
): string | null {
  let maxSize: number
  let maxSizeMb: number

  switch (file.fileType) {
    case 'instruction':
      maxSize = config.pdfMaxBytes
      maxSizeMb = config.pdfMaxMb
      break
    case 'parts-list':
      maxSize = config.partsListMaxBytes
      maxSizeMb = config.partsListMaxMb
      break
    case 'thumbnail':
    case 'gallery-image':
      maxSize = config.imageMaxBytes
      maxSizeMb = config.imageMaxMb
      break
    default:
      return `Unknown file type: ${file.fileType}`
  }

  if (file.size > maxSize) {
    return `File ${file.filename} exceeds size limit for ${file.fileType} (max: ${maxSizeMb} MB)`
  }

  return null
}

/**
 * Check if error is a Postgres unique violation (code 23505)
 */
function isPostgresUniqueViolation(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code === '23505'
  }
  return false
}
