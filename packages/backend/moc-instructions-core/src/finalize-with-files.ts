/**
 * Finalize MOC with Files
 *
 * Platform-agnostic core logic for finalizing a MOC with file uploads.
 * Phase 2 of two-phase MOC creation flow.
 *
 * Features:
 * - Idempotent: Safe to retry if already finalized
 * - Two-phase lock: Atomic lock acquisition with TTL-based stale lock rescue
 * - Verifies files exist in S3 via HeadObject
 * - Validates file content via magic bytes
 * - Validates parts list files (optional)
 * - Sets first image as thumbnail
 * - Updates MOC status from draft to published
 *
 * STORY-015: MOC Instructions - Initialization & Finalization
 */

import {
  FinalizeMocInputSchema,
  type FinalizeMocInput,
  type FinalizeWithFilesDeps,
  type FinalizeWithFilesResult,
  type FileValidationResult,
  type MocFileRow,
} from './__types__/index.js'

/**
 * Finalize MOC with files
 *
 * Confirms file uploads and finalizes MOC record.
 *
 * @param userId - Authenticated user ID
 * @param mocId - MOC UUID to finalize
 * @param input - Upload confirmations (validated against FinalizeMocInputSchema)
 * @param deps - Injected dependencies (db, s3, validators, config)
 * @returns Success with finalized MOC, or error result
 */
export async function finalizeWithFiles(
  userId: string,
  mocId: string,
  input: FinalizeMocInput,
  deps: FinalizeWithFilesDeps,
): Promise<FinalizeWithFilesResult> {
  // Validate input against schema
  const validation = FinalizeMocInputSchema.safeParse(input)
  if (!validation.success) {
    return {
      success: false,
      error: 'PARTS_VALIDATION_ERROR',
      message: 'Invalid request data',
      details: { errors: validation.error.flatten() },
    }
  }

  const { uploadedFiles } = validation.data

  // Step 1: Check rate limit BEFORE any side effects (AC-23)
  const rateLimitResult = await deps.checkRateLimit(userId)
  if (!rateLimitResult.allowed) {
    return {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Daily upload limit exceeded. Please try again tomorrow.',
      details: {
        nextAllowedAt: rateLimitResult.nextAllowedAt.toISOString(),
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      },
    }
  }

  // Step 2: Verify MOC exists (AC-19)
  const moc = await deps.db.getMocById(mocId)
  if (!moc) {
    return {
      success: false,
      error: 'NOT_FOUND',
      message: 'MOC not found',
    }
  }

  // Step 3: Verify user owns the MOC (AC-18)
  if (moc.userId !== userId) {
    return {
      success: false,
      error: 'FORBIDDEN',
      message: 'You do not own this MOC',
    }
  }

  // Step 4: Check if already finalized (AC-20 - idempotent short-circuit)
  if (moc.finalizedAt) {
    const fileRecords = await deps.db.getMocFiles(mocId)
    return {
      success: true,
      data: {
        moc: {
          ...moc,
          files: fileRecords,
        },
        idempotent: true,
      },
    }
  }

  // Step 5: Try to acquire finalize lock (AC-21, AC-22)
  const lockTtlMinutes = deps.config.finalizeLockTtlMinutes
  const staleCutoff = new Date(Date.now() - lockTtlMinutes * 60 * 1000)

  const lockedMoc = await deps.db.acquireFinalizeLock(mocId, staleCutoff)

  // If no row returned, another process holds the lock or it's already finalized
  if (!lockedMoc) {
    // Re-fetch to determine current state
    const currentMoc = await deps.db.getMocById(mocId)

    if (currentMoc?.finalizedAt) {
      // Already finalized by another process (idempotent)
      const fileRecords = await deps.db.getMocFiles(mocId)
      return {
        success: true,
        data: {
          moc: {
            ...currentMoc,
            files: fileRecords,
          },
          idempotent: true,
        },
      }
    }

    // Another process is currently finalizing
    return {
      success: true,
      data: {
        moc: {
          ...(currentMoc || moc),
          files: [],
        },
        status: 'finalizing',
      },
    }
  }

  // We have the lock - proceed with side effects
  // Wrap in try/finally to ensure lock is cleared on failure
  try {
    // Step 6: Filter to successful uploads (AC-12)
    const successfulFiles = uploadedFiles.filter(f => f.success)
    if (successfulFiles.length === 0) {
      await deps.db.clearFinalizeLock(mocId)
      return {
        success: false,
        error: 'NO_SUCCESSFUL_UPLOADS',
        message: 'No files were successfully uploaded',
      }
    }

    // Step 7: Verify files in S3 and validate content (AC-13, AC-14, AC-15)
    const fileIds = successfulFiles.map(f => f.fileId)
    const fileRecords = await deps.db.getMocFiles(mocId, fileIds)

    const { validatedFiles, hasBlockingErrors, blockingError } = await verifyFilesInS3(
      fileRecords,
      deps,
    )

    // If blocking error (size, type), return immediately
    if (blockingError) {
      await deps.db.clearFinalizeLock(mocId)
      return blockingError
    }

    // If parts list validation failed, return 422 with per-file errors (AC-15)
    if (hasBlockingErrors) {
      await deps.db.clearFinalizeLock(mocId)
      const failedFiles = validatedFiles.filter(f => !f.success)
      return {
        success: false,
        error: 'PARTS_VALIDATION_ERROR',
        message:
          'One or more parts list files have validation errors. Please fix the files and retry.',
        details: {
          fileValidation: validatedFiles,
          failedFiles: failedFiles.map(f => ({
            fileId: f.fileId,
            filename: f.filename,
            errors: f.errors,
          })),
        },
      }
    }

    // Step 8: Set first image as thumbnail (AC-16)
    let thumbnailUrl: string | null = null
    const imageFiles = fileRecords.filter(
      f => f.fileType === 'gallery-image' || f.fileType === 'thumbnail',
    )

    if (imageFiles.length > 0) {
      thumbnailUrl = imageFiles[0].fileUrl
      await deps.db.updateMocFile(imageFiles[0].id, { fileType: 'thumbnail' })
    }

    // Step 9: Update MOC with thumbnail, status, finalizedAt (AC-17)
    const now = new Date()
    const updateData: Record<string, unknown> = {
      thumbnailUrl,
      updatedAt: now,
      finalizedAt: now,
      finalizingAt: null, // Clear the lock
    }

    // If status is still draft, update to published
    if (lockedMoc.status === 'draft' || !lockedMoc.status) {
      updateData.status = 'published'
      if (!lockedMoc.publishedAt) {
        updateData.publishedAt = now
      }
    }

    const updatedMoc = await deps.db.updateMoc(mocId, updateData)

    // Get all file records for response
    const allFileRecords = await deps.db.getMocFiles(mocId)

    // Calculate total piece count from validated parts lists
    const totalPieceCount = validatedFiles.reduce((sum, f) => sum + (f.pieceCount || 0), 0)

    // Step 10: Return success (AC-24)
    return {
      success: true,
      data: {
        moc: {
          ...updatedMoc,
          files: allFileRecords,
        },
        fileValidation: validatedFiles.length > 0 ? validatedFiles : undefined,
        totalPieceCount: totalPieceCount > 0 ? totalPieceCount : undefined,
      },
    }
  } catch (error) {
    // Clear the lock on failure so retry can proceed
    await deps.db.clearFinalizeLock(mocId)

    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Failed to finalize MOC',
    }
  }
}

/**
 * Verify files exist in S3 with size, magic bytes, and parts list validation
 */
async function verifyFilesInS3(
  fileRecords: MocFileRow[],
  deps: FinalizeWithFilesDeps,
): Promise<{
  validatedFiles: FileValidationResult[]
  hasBlockingErrors: boolean
  blockingError?: FinalizeWithFilesResult
}> {
  const validatedFiles: FileValidationResult[] = []
  let hasBlockingErrors = false

  for (const file of fileRecords) {
    const s3Key = extractS3KeyFromUrl(file.fileUrl)
    const result: FileValidationResult = {
      fileId: file.id,
      filename: file.originalFilename || 'unknown',
      success: true,
    }

    try {
      // HeadObject for existence and size check (AC-13)
      const headResponse = await deps.headObject(deps.s3Bucket, s3Key)
      const contentLength = headResponse.contentLength

      // Validate file size against config limits
      const fileType = file.fileType as 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image'
      const maxSize = deps.getFileSizeLimit(fileType)

      if (contentLength > maxSize) {
        return {
          validatedFiles: [],
          hasBlockingErrors: false,
          blockingError: {
            success: false,
            error: 'SIZE_TOO_LARGE',
            message: `File ${file.originalFilename} exceeds size limit (${Math.round(contentLength / 1024 / 1024)}MB > ${Math.round(maxSize / 1024 / 1024)}MB)`,
            details: {
              filename: file.originalFilename,
              fileType,
              actualSize: contentLength,
              maxSize,
            },
          },
        }
      }

      // GetObject for magic bytes validation and parts list validation
      const isPartsList = fileType === 'parts-list'
      const shouldValidateMagicBytes = ['instruction', 'thumbnail', 'gallery-image'].includes(
        fileType,
      )

      if ((shouldValidateMagicBytes || isPartsList) && contentLength > 0) {
        // For parts lists, get full file; for others, just magic bytes
        const buffer = isPartsList
          ? await deps.getObject(deps.s3Bucket, s3Key)
          : await deps.getObject(deps.s3Bucket, s3Key, 'bytes=0-511')

        // Magic bytes validation for non-parts-list files (AC-14)
        if (shouldValidateMagicBytes) {
          const expectedMime = getExpectedMimeType(fileType, file.mimeType)
          const isValidMagicBytes = deps.validateMagicBytes(buffer, expectedMime)

          if (!isValidMagicBytes) {
            return {
              validatedFiles: [],
              hasBlockingErrors: false,
              blockingError: {
                success: false,
                error: 'INVALID_TYPE',
                message: `File ${file.originalFilename} content does not match expected type "${expectedMime}". The file may be corrupted or have an incorrect extension.`,
                details: {
                  filename: file.originalFilename,
                  fileType,
                  expectedMime,
                },
              },
            }
          }
        }

        // Parts list validation (AC-15)
        if (isPartsList && deps.validatePartsFile) {
          const partsResult = await deps.validatePartsFile(
            buffer,
            file.originalFilename || 'parts-list',
            file.mimeType || 'application/octet-stream',
          )

          if (!partsResult.success) {
            result.success = false
            result.errors = partsResult.errors.map(e => ({
              code: e.code,
              message: e.message,
              line: e.line,
              field: e.field,
            }))
            hasBlockingErrors = true
          } else {
            result.pieceCount = partsResult.data?.totalPieceCount
          }

          // Always include warnings
          if (partsResult.warnings.length > 0) {
            result.warnings = partsResult.warnings.map(w => ({
              code: w.code,
              message: w.message,
              line: w.line,
              field: w.field,
            }))
          }
        }
      }

      validatedFiles.push(result)
    } catch (error) {
      // File not in S3 or other error
      return {
        validatedFiles: [],
        hasBlockingErrors: false,
        blockingError: {
          success: false,
          error: 'FILE_NOT_IN_S3',
          message: `File ${file.originalFilename} was not uploaded successfully. Please try again.`,
          details: {
            fileId: file.id,
            filename: file.originalFilename,
          },
        },
      }
    }
  }

  return { validatedFiles, hasBlockingErrors }
}

/**
 * Extract S3 key from full S3 URL
 */
function extractS3KeyFromUrl(fileUrl: string): string {
  const url = new URL(fileUrl)
  return url.pathname.substring(1) // Remove leading slash
}

/**
 * Map file type to MIME type for magic bytes validation
 */
function getExpectedMimeType(fileType: string, mimeType: string | null): string {
  // Use stored MIME type if available
  if (mimeType) return mimeType

  // Fallback based on file type
  switch (fileType) {
    case 'instruction':
      return 'application/pdf'
    case 'thumbnail':
    case 'gallery-image':
      return 'image/jpeg' // Default, will be validated by magic bytes
    default:
      return 'application/octet-stream'
  }
}
