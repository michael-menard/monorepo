/**
 * Edit Finalize Core Function
 *
 * Platform-agnostic business logic for finalizing MOC edits.
 * Part of the two-phase edit pattern: presign -> client S3 upload -> finalize.
 *
 * Features:
 * - Verifies new files exist in S3 with magic bytes validation
 * - Soft-deletes removed files
 * - Updates MOC metadata atomically with optimistic locking
 * - Moves files from edit/ path to permanent path
 * - Re-indexes OpenSearch (fail-open)
 *
 * Follows ports & adapters pattern - all infrastructure is injected via deps.
 *
 * STORY-016: MOC File Upload Management
 */

import type {
  EditFinalizeDeps,
  EditFinalizeResult,
  EditFinalizeInput,
  MocRow,
} from './__types__/index.js'

/**
 * Convert edit S3 key to permanent key
 *
 * Edit path:      {env}/moc-instructions/{ownerId}/{mocId}/edit/{category}/{uuid}.{ext}
 * Permanent path: {env}/moc-instructions/{ownerId}/{mocId}/{category}/{uuid}.{ext}
 */
function editKeyToPermanentKey(editKey: string): string {
  return editKey.replace('/edit/', '/')
}

/**
 * Extract S3 key from full S3 URL
 */
function extractS3KeyFromUrl(fileUrl: string): string {
  const url = new URL(fileUrl)
  return url.pathname.substring(1) // Remove leading slash
}

/**
 * Finalize MOC edit
 *
 * Business rules:
 * 1. MOC must exist
 * 2. User must own the MOC
 * 3. Rate limit is checked and incremented
 * 4. expectedUpdatedAt must match current (optimistic locking)
 * 5. New files are verified in S3 with magic bytes validation
 * 6. Removed files must belong to this MOC
 * 7. Metadata and file changes are atomic
 * 8. Files are moved from edit/ to permanent path
 * 9. OpenSearch is re-indexed (fail-open)
 *
 * @param mocId - MOC ID
 * @param userId - Authenticated user ID
 * @param input - Edit input with metadata, new files, removed files
 * @param deps - Injected dependencies
 * @returns Result with updated MOC or error details
 */
export async function editFinalize(
  mocId: string,
  userId: string,
  input: EditFinalizeInput,
  deps: EditFinalizeDeps,
): Promise<EditFinalizeResult> {
  const { title, description, tags, theme, slug, newFiles, removedFileIds, expectedUpdatedAt } =
    input

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

  // Check rate limit
  const rateLimitResult = await deps.checkRateLimit(userId)
  if (!rateLimitResult.allowed) {
    return {
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Daily upload/edit limit reached. Please try again tomorrow.',
      details: {
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
        resetAt: rateLimitResult.nextAllowedAt.toISOString(),
        usage: {
          current: rateLimitResult.currentCount,
          limit: deps.config.rateLimitPerDay,
        },
      },
    }
  }

  // Optimistic locking: Check expectedUpdatedAt
  if (moc.updatedAt.toISOString() !== expectedUpdatedAt) {
    return {
      success: false,
      error: 'CONCURRENT_EDIT',
      message: 'This MOC was modified since you started editing. Please reload and try again.',
      details: {
        currentUpdatedAt: moc.updatedAt.toISOString(),
      },
    }
  }

  // Verify new files exist in S3 and validate magic bytes
  if (newFiles.length > 0) {
    for (const file of newFiles) {
      // Check file exists via HeadObject
      try {
        await deps.headObject(deps.s3Bucket, file.s3Key)
      } catch {
        return {
          success: false,
          error: 'FILE_NOT_IN_S3',
          message: `File not found in S3: ${file.filename}`,
          details: {
            filename: file.filename,
            s3Key: file.s3Key,
          },
        }
      }

      // Download first 8KB for magic bytes validation
      try {
        const buffer = await deps.getObject(deps.s3Bucket, file.s3Key, 'bytes=0-8191')
        const isValid = deps.validateMagicBytes(buffer, file.mimeType)

        if (!isValid) {
          return {
            success: false,
            error: 'INVALID_FILE_CONTENT',
            message: `File content does not match expected type for ${file.filename}`,
            details: {
              filename: file.filename,
              s3Key: file.s3Key,
            },
          }
        }
      } catch (error) {
        // If we can't validate, continue (file might be valid)
        // This is a defensive check, not a hard requirement
      }
    }
  }

  // Verify removed files belong to this MOC
  if (removedFileIds.length > 0) {
    const existingFiles = await deps.db.getMocFiles(mocId, removedFileIds)

    for (const file of existingFiles) {
      if (file.mocId !== mocId) {
        return {
          success: false,
          error: 'FORBIDDEN',
          message: 'Cannot delete files that do not belong to this MOC',
        }
      }
    }
  }

  // Track edit keys for cleanup on failure
  const editKeys = newFiles.map(f => f.s3Key)

  // Compute permanent paths upfront
  const filesWithPermanentPaths = newFiles.map(f => ({
    ...f,
    permanentS3Key: editKeyToPermanentKey(f.s3Key),
  }))

  // Atomic transaction: update metadata, insert files, soft-delete removed
  let updatedMoc: MocRow | null = null

  try {
    updatedMoc = await deps.db.transaction(async tx => {
      const now = new Date()

      // Build metadata updates
      const metadataUpdates: Record<string, unknown> = {
        updatedAt: now,
      }

      if (title !== undefined) metadataUpdates.title = title
      if (description !== undefined) metadataUpdates.description = description
      if (tags !== undefined) metadataUpdates.tags = tags
      if (theme !== undefined) metadataUpdates.theme = theme
      if (slug !== undefined) metadataUpdates.slug = slug

      // Update MOC with optimistic lock
      const updated = await deps.db.updateMocWithLock(
        tx,
        mocId,
        new Date(expectedUpdatedAt),
        metadataUpdates,
      )

      if (!updated) {
        throw new Error('CONCURRENT_EDIT')
      }

      // Insert new file records with permanent paths
      if (filesWithPermanentPaths.length > 0) {
        const fileRecords = filesWithPermanentPaths.map(f => ({
          mocId,
          fileType: f.category === 'image' ? 'gallery-image' : f.category,
          fileUrl: `https://${deps.s3Bucket}.s3.amazonaws.com/${f.permanentS3Key}`,
          originalFilename: f.filename,
          mimeType: f.mimeType,
        }))

        await deps.db.insertMocFiles(tx, fileRecords)
      }

      // Soft-delete removed files
      if (removedFileIds.length > 0) {
        await deps.db.softDeleteFiles(tx, mocId, removedFileIds)
      }

      return updated
    })
  } catch (error) {
    // Best-effort cleanup of edit files on transaction failure
    if (editKeys.length > 0) {
      try {
        await deps.deleteObjects(deps.s3Bucket, editKeys)
      } catch {
        // Ignore cleanup errors
      }
    }

    if (error instanceof Error && error.message === 'CONCURRENT_EDIT') {
      return {
        success: false,
        error: 'CONCURRENT_EDIT',
        message: 'MOC was modified by another process. Please reload and try again.',
      }
    }

    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Database error',
    }
  }

  // Move files from edit/ to permanent path
  if (editKeys.length > 0) {
    for (const editKey of editKeys) {
      try {
        const permanentKey = editKeyToPermanentKey(editKey)
        await deps.copyObject(deps.s3Bucket, editKey, permanentKey)
        await deps.deleteObject(deps.s3Bucket, editKey)
      } catch {
        // Log but don't fail - cleanup job will handle orphans
      }
    }
  }

  // Re-index OpenSearch (fail-open)
  if (deps.updateOpenSearch && updatedMoc) {
    try {
      await deps.updateOpenSearch(updatedMoc)
    } catch {
      // Fail-open: reconciliation job will catch up
    }
  }

  // Fetch active files for response
  const activeFiles = await deps.db.getMocFiles(mocId)
  const nonDeletedFiles = activeFiles.filter(f => !f.deletedAt)

  // Generate presigned GET URLs for files
  const filesWithUrls = await Promise.all(
    nonDeletedFiles.map(async file => {
      let presignedUrl: string | null = null

      if (deps.generatePresignedGetUrl && file.fileUrl) {
        try {
          const s3Key = extractS3KeyFromUrl(file.fileUrl)
          presignedUrl = await deps.generatePresignedGetUrl(deps.s3Bucket, s3Key, 3600)
        } catch {
          // Ignore presigned URL errors
        }
      }

      return {
        id: file.id,
        fileType: file.fileType,
        filename: file.originalFilename,
        mimeType: file.mimeType,
        url: file.fileUrl,
        presignedUrl,
        createdAt: file.createdAt?.toISOString() || null,
      }
    }),
  )

  return {
    success: true,
    data: {
      moc: {
        id: updatedMoc!.id,
        title: updatedMoc!.title,
        description: updatedMoc!.description,
        slug: updatedMoc!.slug,
        tags: updatedMoc!.tags,
        theme: updatedMoc!.theme,
        status: updatedMoc!.status,
        updatedAt: updatedMoc!.updatedAt.toISOString(),
      },
      files: filesWithUrls,
    },
  }
}
