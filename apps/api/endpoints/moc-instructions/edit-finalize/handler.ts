/**
 * Edit Finalize MOC Lambda Function
 *
 * Story 3.1.36: Edit Finalize Endpoint
 *
 * Route: POST /api/mocs/:mocId/edit/finalize
 *
 * Features:
 * - Accepts metadata changes, new file keys, removed file IDs
 * - Verifies new files exist in S3 with magic bytes validation
 * - Soft-deletes removed files (marks deletedAt)
 * - Updates MOC record atomically with optimistic locking
 * - Idempotent via updatedAt comparison (prevents duplicate submissions)
 * - Re-indexes in OpenSearch (fail-open)
 * - Returns updated MOC data with presigned file URLs
 *
 * Authentication: JWT via AWS Cognito (required)
 * Authorization: User must own the MOC
 */

import { z } from 'zod'
import { eq, and, inArray, isNull } from 'drizzle-orm'
import {
  HeadObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { db } from '@/core/database/client'
import { mocInstructions, mocFiles } from '@/core/database/schema'
import {
  successResponse,
  errorResponse,
  errorResponseFromError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  ConflictError,
  BadRequestError,
  type APIGatewayProxyResult,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'
import { updateMocIndex } from '@/endpoints/moc-instructions/_shared/opensearch-moc'
import { validateMagicBytes } from '@repo/file-validator'
import type { MocInstruction } from '@repo/api-types/moc'
import { createRateLimiter, generateDailyKey, RATE_LIMIT_WINDOWS } from '@repo/rate-limit'
import { createPostgresRateLimitStore } from '@/core/rate-limit/postgres-store'
import { getUploadConfig } from '@/core/config/upload'

const logger = createLogger('moc-edit-finalize')

// ─────────────────────────────────────────────────────────────────────────────
// Request/Response Schemas
// ─────────────────────────────────────────────────────────────────────────────

const MocIdSchema = z.string().uuid()

const NewFileSchema = z.object({
  s3Key: z.string().min(1, 'S3 key is required'),
  category: z.enum(['instruction', 'image', 'parts-list', 'thumbnail']),
  filename: z.string().min(1, 'Filename is required'),
  size: z.number().positive('Size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required'),
})

const EditFinalizeRequestSchema = z.object({
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
  newFiles: z.array(NewFileSchema).optional().default([]),
  removedFileIds: z.array(z.string().uuid()).optional().default([]),

  // Idempotency - for conflict detection
  expectedUpdatedAt: z.string().datetime('Invalid datetime format'),
})

export type EditFinalizeRequest = z.infer<typeof EditFinalizeRequestSchema>

// ─────────────────────────────────────────────────────────────────────────────
// API Gateway Event Interface
// ─────────────────────────────────────────────────────────────────────────────

interface APIGatewayEvent {
  requestContext: {
    http: {
      method: string
      path: string
    }
    authorizer?: {
      jwt?: {
        claims: {
          sub: string
          email?: string
        }
      }
    }
    requestId: string
  }
  headers?: Record<string, string | undefined>
  pathParameters?: Record<string, string>
  body?: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// S3 Client
// ─────────────────────────────────────────────────────────────────────────────

const s3Client = new S3Client({})

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId

  try {
    logger.info('Edit Finalize MOC invoked', {
      requestId,
      path: event.requestContext.http.path,
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Auth Check
    // ─────────────────────────────────────────────────────────────────────────

    const userId = event.requestContext.authorizer?.jwt?.claims.sub
    if (!userId) {
      logger.warn('Unauthorized access attempt', { requestId })
      throw new UnauthorizedError('Authentication required')
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Task 1: Extract and Validate Request (AC: 1)
    // ─────────────────────────────────────────────────────────────────────────

    const mocId = event.pathParameters?.mocId || event.pathParameters?.id
    if (!mocId) {
      throw new NotFoundError('MOC ID is required')
    }

    const mocIdResult = MocIdSchema.safeParse(mocId)
    if (!mocIdResult.success) {
      throw new NotFoundError('MOC not found')
    }

    if (!event.body) {
      throw new BadRequestError('Request body is required')
    }

    let parsedBody: unknown
    try {
      parsedBody = JSON.parse(event.body)
    } catch {
      throw new BadRequestError('Invalid JSON in request body')
    }

    const bodyResult = EditFinalizeRequestSchema.safeParse(parsedBody)
    if (!bodyResult.success) {
      const issues = bodyResult.error.issues
      const errors = issues.map(e => `${e.path?.join('.') || ''}: ${e.message}`).join(', ')
      return errorResponse(400, 'VALIDATION_ERROR', `Validation failed: ${errors}`, requestId)
    }

    const { title, description, tags, theme, slug, newFiles, removedFileIds, expectedUpdatedAt } =
      bodyResult.data

    logger.info('Edit finalize request validated', {
      requestId,
      mocId,
      hasMetadataChanges: !!(title || description || tags || theme || slug),
      newFileCount: newFiles.length,
      removedFileCount: removedFileIds.length,
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Verify MOC Exists and Ownership
    // ─────────────────────────────────────────────────────────────────────────

    const [existingMoc] = await db
      .select()
      .from(mocInstructions)
      .where(eq(mocInstructions.id, mocId))
      .limit(1)

    if (!existingMoc) {
      logger.info('MOC not found', { requestId, mocId })
      throw new NotFoundError('MOC not found')
    }

    if (existingMoc.userId !== userId) {
      logger.warn('Forbidden access attempt', { requestId, mocId, userId })
      throw new ForbiddenError('You do not have permission to edit this MOC')
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Story 3.1.37: Rate Limiting (shared with upload, only finalize increments)
    // ─────────────────────────────────────────────────────────────────────────

    const uploadConfig = getUploadConfig()
    const store = createPostgresRateLimitStore()
    const rateLimiter = createRateLimiter(store)
    const rateLimitKey = generateDailyKey('moc-upload', userId) // Shared with create uploads

    const rateLimitResult = await rateLimiter.checkLimit(rateLimitKey, {
      maxRequests: uploadConfig.rateLimitPerDay,
      windowMs: RATE_LIMIT_WINDOWS.DAY,
    })

    if (!rateLimitResult.allowed) {
      logger.warn('moc.edit.rate_limited', {
        correlationId: requestId,
        requestId,
        ownerId: userId,
        mocId,
        currentCount: rateLimitResult.currentCount,
        limit: uploadConfig.rateLimitPerDay,
        resetAt: rateLimitResult.resetAt.toISOString(),
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      })

      return {
        statusCode: 429,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
          'Retry-After': String(rateLimitResult.retryAfterSeconds),
        },
        body: JSON.stringify({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Daily upload/edit limit reached. Please try again tomorrow.',
          retryAfterSeconds: rateLimitResult.retryAfterSeconds,
          resetAt: rateLimitResult.resetAt.toISOString(),
          usage: {
            current: rateLimitResult.currentCount,
            limit: uploadConfig.rateLimitPerDay,
          },
          correlationId: requestId,
        }),
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Task 4: Idempotency Check - updatedAt Comparison (AC: 5)
    // ─────────────────────────────────────────────────────────────────────────

    if (existingMoc.updatedAt.toISOString() !== expectedUpdatedAt) {
      logger.info('Concurrent edit detected', {
        requestId,
        mocId,
        expectedUpdatedAt,
        currentUpdatedAt: existingMoc.updatedAt.toISOString(),
      })

      return {
        statusCode: 409,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': 'true',
        },
        body: JSON.stringify({
          code: 'CONCURRENT_EDIT',
          message:
            'This MOC was modified since you started editing. Please reload and try again.',
          currentUpdatedAt: existingMoc.updatedAt.toISOString(),
          correlationId: requestId,
        }),
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Task 2: Verify New Files in S3 (AC: 2)
    // ─────────────────────────────────────────────────────────────────────────

    const bucketName = process.env.LEGO_API_BUCKET_NAME
    if (!bucketName && newFiles.length > 0) {
      throw new Error('S3 bucket not configured')
    }

    if (newFiles.length > 0) {
      logger.info('Verifying new files in S3', {
        requestId,
        mocId,
        fileCount: newFiles.length,
      })

      for (const file of newFiles) {
        // Check file exists via HeadObject
        try {
          const headCommand = new HeadObjectCommand({
            Bucket: bucketName,
            Key: file.s3Key,
          })
          await s3Client.send(headCommand)
        } catch (error) {
          logger.error('File not found in S3', {
            requestId,
            mocId,
            s3Key: file.s3Key,
            error,
          })
          return errorResponse(
            400,
            'VALIDATION_ERROR',
            `File not found in S3: ${file.filename}`,
            requestId,
          )
        }

        // Download first 8KB for magic bytes validation
        try {
          const getCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: file.s3Key,
            Range: 'bytes=0-8191',
          })
          const getResponse = await s3Client.send(getCommand)
          const bodyBytes = await getResponse.Body?.transformToByteArray()

          if (bodyBytes) {
            const buffer = Buffer.from(bodyBytes)
            const isValid = validateMagicBytes(buffer, file.mimeType)

            if (!isValid) {
              logger.error('File magic bytes validation failed', {
                requestId,
                mocId,
                s3Key: file.s3Key,
                expectedMime: file.mimeType,
              })
              return errorResponse(
                400,
                'VALIDATION_ERROR',
                `File content does not match expected type for ${file.filename}`,
                requestId,
              )
            }
          }
        } catch (error) {
          logger.error('Error validating file content', {
            requestId,
            mocId,
            s3Key: file.s3Key,
            error,
          })
          return errorResponse(
            400,
            'VALIDATION_ERROR',
            `Could not validate file: ${file.filename}`,
            requestId,
          )
        }

        logger.info('File verified in S3', {
          requestId,
          mocId,
          s3Key: file.s3Key,
          category: file.category,
        })
      }
    }

    // Track original edit keys for cleanup on failure
    const originalEditKeys = newFiles.map(f => f.s3Key)

    // ─────────────────────────────────────────────────────────────────────────
    // Task 3: Verify Removed Files Belong to This MOC (AC: 3)
    // ─────────────────────────────────────────────────────────────────────────

    if (removedFileIds.length > 0) {
      const existingFiles = await db
        .select({ id: mocFiles.id, mocId: mocFiles.mocId })
        .from(mocFiles)
        .where(
          and(
            inArray(mocFiles.id, removedFileIds),
            isNull(mocFiles.deletedAt),
          ),
        )

      // Verify all files belong to this MOC
      for (const file of existingFiles) {
        if (file.mocId !== mocId) {
          logger.warn('Attempt to delete file from wrong MOC', {
            requestId,
            mocId,
            fileId: file.id,
            actualMocId: file.mocId,
          })
          throw new ForbiddenError('Cannot delete files that do not belong to this MOC')
        }
      }

      // Check if any requested files don't exist
      const foundFileIds = existingFiles.map(f => f.id)
      const missingFileIds = removedFileIds.filter(id => !foundFileIds.includes(id))
      if (missingFileIds.length > 0) {
        logger.warn('Some files to remove not found', {
          requestId,
          mocId,
          missingFileIds,
        })
        // Don't fail - files may have already been deleted
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Task 4: Atomic Transaction Update (AC: 4)
    // Story 3.1.38: Wrap in try-catch for cleanup on failure
    // ─────────────────────────────────────────────────────────────────────────

    const now = new Date()

    // Compute permanent paths upfront (for database records)
    const filesWithPermanentPaths = newFiles.map(f => ({
      ...f,
      permanentS3Key: editKeyToPermanentKey(f.s3Key),
    }))

    logger.info('Starting atomic transaction', {
      requestId,
      mocId,
    })

    let result
    try {
      result = await db.transaction(async tx => {
        // 1. Update MOC metadata with optimistic lock
        const metadataUpdates: Record<string, unknown> = {
          updatedAt: now,
          lastUpdatedByUserId: userId,
        }

        if (title !== undefined) metadataUpdates.title = title
        if (description !== undefined) metadataUpdates.description = description
        if (tags !== undefined) metadataUpdates.tags = tags
        if (theme !== undefined) metadataUpdates.theme = theme
        if (slug !== undefined) metadataUpdates.slug = slug

        const [updatedMoc] = await tx
          .update(mocInstructions)
          .set(metadataUpdates)
          .where(
            and(
              eq(mocInstructions.id, mocId),
              eq(mocInstructions.updatedAt, new Date(expectedUpdatedAt)),
            ),
          )
          .returning()

        if (!updatedMoc) {
          // Another process updated the MOC since our check
          throw new ConflictError(
            'MOC was modified by another process. Please reload and try again.',
          )
        }

        // 2. Insert new file records with PERMANENT paths
        if (filesWithPermanentPaths.length > 0) {
          const fileRecords = filesWithPermanentPaths.map(f => ({
            mocId,
            fileType: f.category === 'image' ? 'gallery-image' : f.category,
            fileUrl: `https://${bucketName}.s3.amazonaws.com/${f.permanentS3Key}`,
            originalFilename: f.filename,
            mimeType: f.mimeType,
            createdAt: now,
            updatedAt: now,
          }))

          await tx.insert(mocFiles).values(fileRecords)

          logger.info('Inserted new file records', {
            requestId,
            mocId,
            count: fileRecords.length,
          })
        }

        // 3. Soft-delete removed files
        if (removedFileIds.length > 0) {
          await tx
            .update(mocFiles)
            .set({ deletedAt: now, updatedAt: now })
            .where(
              and(
                eq(mocFiles.mocId, mocId),
                inArray(mocFiles.id, removedFileIds),
                isNull(mocFiles.deletedAt),
              ),
            )

          logger.info('Soft-deleted file records', {
            requestId,
            mocId,
            count: removedFileIds.length,
          })
        }

        return updatedMoc
      })
    } catch (transactionError) {
      // Story 3.1.38: Best-effort cleanup of edit files on transaction failure
      if (bucketName && originalEditKeys.length > 0) {
        await cleanupEditFilesOnFailure(bucketName, originalEditKeys, requestId, mocId)
      }
      throw transactionError
    }

    logger.info('Transaction completed successfully', {
      requestId,
      mocId,
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Story 3.1.38: Move files from edit/ to permanent path
    // ─────────────────────────────────────────────────────────────────────────

    if (bucketName && originalEditKeys.length > 0) {
      logger.info('Moving files from edit to permanent path', {
        requestId,
        mocId,
        fileCount: originalEditKeys.length,
      })

      for (const editKey of originalEditKeys) {
        try {
          await moveFileFromEditToPermanent(bucketName, editKey, requestId)
        } catch (moveError) {
          // Log but don't fail - files will be accessible via presigned URLs once moved
          // Orphan cleanup job will eventually clean up any stragglers
          logger.warn('Failed to move file from edit to permanent path', {
            requestId,
            mocId,
            editKey,
            error: moveError instanceof Error ? moveError.message : 'Unknown',
          })
        }
      }

      logger.info('Files moved to permanent path', {
        requestId,
        mocId,
        fileCount: originalEditKeys.length,
      })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Task 5: Re-index OpenSearch (AC: 6)
    // ─────────────────────────────────────────────────────────────────────────

    try {
      await updateMocIndex(result as unknown as MocInstruction)
      logger.info('OpenSearch re-indexed', { requestId, mocId })
    } catch (error) {
      // Fail-open: log warning but don't fail the request
      logger.warn('OpenSearch update failed, reconciliation job will catch up', {
        requestId,
        mocId,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Task 6: Return Updated Data with Presigned URLs (AC: 7)
    // ─────────────────────────────────────────────────────────────────────────

    // Fetch all active files (excluding deleted)
    const activeFiles = await db
      .select()
      .from(mocFiles)
      .where(
        and(
          eq(mocFiles.mocId, mocId),
          isNull(mocFiles.deletedAt),
        ),
      )

    // Generate presigned GET URLs for files
    const filesWithUrls = await Promise.all(
      activeFiles.map(async file => {
        let presignedUrl: string | null = null

        if (bucketName && file.fileUrl) {
          try {
            const s3Key = extractS3KeyFromUrl(file.fileUrl)
            const getCommand = new GetObjectCommand({
              Bucket: bucketName,
              Key: s3Key,
            })
            presignedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 })
          } catch (error) {
            logger.warn('Failed to generate presigned URL', {
              requestId,
              fileId: file.id,
              error,
            })
          }
        }

        return {
          id: file.id,
          fileType: file.fileType,
          filename: file.originalFilename,
          mimeType: file.mimeType,
          url: file.fileUrl,
          presignedUrl,
          createdAt: file.createdAt?.toISOString(),
        }
      }),
    )

    // Story 3.1.37: Structured log event
    // Track which metadata fields were changed (field names only, not values)
    const metadataChanged: string[] = []
    if (title !== undefined) metadataChanged.push('title')
    if (description !== undefined) metadataChanged.push('description')
    if (tags !== undefined) metadataChanged.push('tags')
    if (theme !== undefined) metadataChanged.push('theme')
    if (slug !== undefined) metadataChanged.push('slug')

    logger.info('moc.edit.finalize', {
      correlationId: requestId,
      requestId,
      ownerId: userId,
      mocId,
      newFileCount: newFiles.length,
      removedFileCount: removedFileIds.length,
      metadataChanged,
      activeFileCount: filesWithUrls.length,
    })

    return successResponse(200, {
      success: true,
      data: {
        moc: {
          id: result.id,
          title: result.title,
          description: result.description,
          slug: result.slug,
          tags: result.tags as string[] | null,
          theme: result.theme,
          status: result.status,
          updatedAt: result.updatedAt.toISOString(),
        },
        files: filesWithUrls,
      },
    })
  } catch (error) {
    logger.error('Edit Finalize MOC error', error, { requestId })
    return errorResponseFromError(error, requestId)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract S3 key from full S3 URL
 */
function extractS3KeyFromUrl(fileUrl: string): string {
  try {
    const url = new URL(fileUrl)
    return url.pathname.substring(1) // Remove leading slash
  } catch {
    throw new BadRequestError(`Invalid S3 URL: ${fileUrl}`)
  }
}

/**
 * Story 3.1.38: Convert edit S3 key to permanent key
 *
 * Edit path:      {env}/moc-instructions/{ownerId}/{mocId}/edit/{category}/{uuid}.{ext}
 * Permanent path: {env}/moc-instructions/{ownerId}/{mocId}/{category}/{uuid}.{ext}
 */
function editKeyToPermanentKey(editKey: string): string {
  // Replace /edit/ with / in the path
  return editKey.replace('/edit/', '/')
}

/**
 * Story 3.1.38: Move file from edit path to permanent path in S3
 * Returns the new permanent S3 key
 */
async function moveFileFromEditToPermanent(
  bucket: string,
  editKey: string,
  requestId: string,
): Promise<string> {
  const permanentKey = editKeyToPermanentKey(editKey)

  // Copy to new location
  await s3Client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${editKey}`,
      Key: permanentKey,
    }),
  )

  // Delete from old location
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: editKey,
    }),
  )

  logger.debug('Moved file from edit to permanent path', {
    requestId,
    editKey,
    permanentKey,
  })

  return permanentKey
}

/**
 * Story 3.1.38: Best-effort cleanup of edit files on failure
 * Called when the finalize transaction fails to clean up orphaned S3 objects
 */
async function cleanupEditFilesOnFailure(
  bucket: string,
  s3Keys: string[],
  requestId: string,
  mocId: string,
): Promise<void> {
  if (s3Keys.length === 0) return

  try {
    // Use batch delete for efficiency (up to 1000 objects per request)
    const MAX_BATCH = 1000
    for (let i = 0; i < s3Keys.length; i += MAX_BATCH) {
      const batch = s3Keys.slice(i, i + MAX_BATCH)

      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: batch.map(key => ({ Key: key })),
          },
        }),
      )
    }

    logger.info('edit.cleanup.sync.success', {
      correlationId: requestId,
      requestId,
      mocId,
      cleanedFileCount: s3Keys.length,
    })
  } catch (cleanupError) {
    // Don't throw - cleanup is best-effort
    logger.warn('edit.cleanup.sync.failed', {
      correlationId: requestId,
      requestId,
      mocId,
      attemptedFileCount: s3Keys.length,
      error: cleanupError instanceof Error ? cleanupError.message : 'Unknown',
    })
  }
}
