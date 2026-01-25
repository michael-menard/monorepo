/**
 * Edit Presign Core Function
 *
 * Platform-agnostic business logic for generating presigned S3 URLs for editing a MOC.
 * Part of the two-phase edit pattern: presign -> client S3 upload -> finalize.
 *
 * Follows ports & adapters pattern - all infrastructure is injected via deps.
 *
 * STORY-016: MOC File Upload Management
 */

import type {
  EditPresignDeps,
  EditPresignResult,
  EditFileMetadata,
  EditPresignedFile,
} from './__types__/index.js'

/**
 * Map API category to internal file type for config lookups
 */
function mapCategoryToFileType(
  category: 'instruction' | 'image' | 'parts-list' | 'thumbnail',
): 'instruction' | 'gallery-image' | 'parts-list' | 'thumbnail' {
  switch (category) {
    case 'instruction':
      return 'instruction'
    case 'image':
      return 'gallery-image'
    case 'parts-list':
      return 'parts-list'
    case 'thumbnail':
      return 'thumbnail'
  }
}

/**
 * Generate presigned URLs for editing a MOC
 *
 * Business rules:
 * 1. MOC must exist
 * 2. User must own the MOC
 * 3. Rate limit is checked (not incremented - finalize will increment)
 * 4. File counts per category are validated against limits
 * 5. File sizes are validated against limits
 * 6. MIME types are validated against allowlist
 * 7. Presigned URLs use edit-specific S3 path
 *
 * @param mocId - MOC ID
 * @param userId - Authenticated user ID
 * @param files - Array of file metadata
 * @param deps - Injected dependencies
 * @returns Result with presigned URLs or error details
 */
export async function editPresign(
  mocId: string,
  userId: string,
  files: EditFileMetadata[],
  deps: EditPresignDeps,
): Promise<EditPresignResult> {
  // Verify MOC exists and ownership
  const moc = await deps.db.getMoc(mocId)

  if (!moc) {
    return {
      success: false,
      error: 'NOT_FOUND',
      message: 'MOC not found',
    }
  }

  if (moc.userId !== userId) {
    return {
      success: false,
      error: 'FORBIDDEN',
      message: 'You do not have permission to edit this MOC',
    }
  }

  // Check rate limit (only check, don't increment - finalize will increment)
  const rateLimitResult = await deps.checkRateLimit(userId)
  if (!rateLimitResult.allowed) {
    // Calculate retry info
    const now = new Date()
    const resetAt = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
    )
    const retryAfterSeconds = Math.ceil((resetAt.getTime() - now.getTime()) / 1000)

    return {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Daily upload/edit limit reached. Please try again tomorrow.',
      details: {
        retryAfterSeconds,
        resetAt: resetAt.toISOString(),
        usage: {
          current: rateLimitResult.currentCount,
          limit: rateLimitResult.limit,
        },
      },
    }
  }

  // Validate file counts per category
  const categoryCounts: Record<string, number> = {}
  for (const file of files) {
    categoryCounts[file.category] = (categoryCounts[file.category] || 0) + 1
  }

  for (const [category, count] of Object.entries(categoryCounts)) {
    const fileType = mapCategoryToFileType(
      category as 'instruction' | 'image' | 'parts-list' | 'thumbnail',
    )
    const maxCount = deps.getFileCountLimit(fileType)

    if (count > maxCount) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: `Maximum ${maxCount} ${category} files allowed, got ${count}`,
      }
    }
  }

  // Validate each file's size and MIME type
  for (const file of files) {
    const fileType = mapCategoryToFileType(file.category)

    // Check file size
    const maxSize = deps.getFileSizeLimit(fileType)
    if (file.size > maxSize) {
      const maxSizeMb = Math.round(maxSize / (1024 * 1024))
      return {
        success: false,
        error: 'FILE_TOO_LARGE',
        message: `File "${file.filename}" exceeds maximum size for ${file.category} (${maxSizeMb} MB)`,
        details: {
          filename: file.filename,
          category: file.category,
          maxBytes: maxSize,
          providedBytes: file.size,
        },
      }
    }

    // Check MIME type
    if (!deps.isMimeTypeAllowed(fileType, file.mimeType)) {
      const allowedTypes = deps.getAllowedMimeTypes(fileType)
      return {
        success: false,
        error: 'INVALID_MIME_TYPE',
        message: `File "${file.filename}" has invalid MIME type "${file.mimeType}" for ${file.category}`,
        details: {
          filename: file.filename,
          category: file.category,
          providedType: file.mimeType,
          allowedTypes,
        },
      }
    }
  }

  // Generate presigned URLs
  try {
    const presignedFiles: EditPresignedFile[] = []
    const expiresIn = deps.config.presignTtlSeconds
    const stage = process.env.STAGE || 'dev'

    for (const file of files) {
      const fileId = deps.generateUuid()
      const sanitizedFilename = deps.sanitizeFilename(file.filename)

      // Extract extension from sanitized filename
      const lastDot = sanitizedFilename.lastIndexOf('.')
      const extension = lastDot > 0 ? sanitizedFilename.substring(lastDot + 1) : ''
      const fileIdWithExt = extension ? `${fileId}.${extension}` : fileId

      // Edit-specific S3 key format
      const s3Key = `${stage}/moc-instructions/${userId}/${mocId}/edit/${file.category}/${fileIdWithExt}`

      const uploadUrl = await deps.generatePresignedUrl(
        deps.s3Bucket,
        s3Key,
        file.mimeType,
        expiresIn,
      )

      const expiresAt = new Date(Date.now() + expiresIn * 1000)

      presignedFiles.push({
        id: fileId,
        category: file.category,
        filename: file.filename,
        uploadUrl,
        s3Key,
        expiresAt: expiresAt.toISOString(),
      })
    }

    const sessionExpiresAt = new Date(Date.now() + deps.config.sessionTtlSeconds * 1000)

    return {
      success: true,
      data: {
        files: presignedFiles,
        sessionExpiresAt: sessionExpiresAt.toISOString(),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: 'S3_ERROR',
      message: error instanceof Error ? error.message : 'Failed to generate presigned URLs',
    }
  }
}
