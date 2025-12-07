/**
 * Finalize MOC with Files Lambda Function
 *
 * Phase 2 of two-phase MOC creation with file uploads.
 * Confirms file uploads and finalizes MOC record.
 *
 * Route: POST /api/mocs/{mocId}/finalize
 *
 * Features:
 * - Idempotent: Safe to retry (Story 3.1.7)
 * - Two-phase lock: Atomic lock acquisition with TTL-based stale lock rescue
 * - Verifies files were uploaded to S3
 * - Sets first image as thumbnail
 * - Indexes MOC in Elasticsearch
 * - Returns complete MOC with all file records
 *
 * Flow:
 * 1. Client uploads files to S3 using presigned URLs from initialize
 * 2. Client calls this endpoint to confirm uploads
 * 3. Lambda acquires transient lock (or short-circuits if already finalized)
 * 4. Lambda verifies files exist in S3
 * 5. Lambda updates MOC record (thumbnail, finalizedAt, etc.)
 * 6. Lambda indexes MOC in Elasticsearch
 * 7. Returns complete MOC data (or idempotent response)
 *
 * Authentication: JWT via AWS Cognito
 * Authorization: User must own the MOC
 */

import {
  successResponse,
  errorResponseFromError,
  errorResponse,
  type APIGatewayProxyResult,
} from '@/core/utils/responses'
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'
import { db } from '@/core/database/client'
import { mocInstructions, mocFiles } from '@/core/database/schema'
import { eq, and, isNull, or, lt } from 'drizzle-orm'
import { z } from 'zod'
import { HeadObjectCommand, GetObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getUploadConfig, getFileSizeLimit } from '@/core/config/upload'
import { validateMagicBytes } from '@repo/file-validator'
import { checkAndIncrementDailyLimit } from '@/core/rate-limit/upload-rate-limit'

const logger = createLogger('finalize-with-files')

/**
 * File upload confirmation schema
 */
const FileUploadConfirmationSchema = z.object({
  fileId: z.string().uuid('Invalid file ID'),
  success: z.boolean(),
})

/**
 * Finalize MOC schema
 */
const FinalizeMocWithFilesSchema = z.object({
  uploadedFiles: z.array(FileUploadConfirmationSchema).min(1, 'At least one file is required'),
})

/**
 * API Gateway Event Interface
 */
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
  pathParameters?: Record<string, string>
  body?: string | null
}

/**
 * Main Lambda Handler
 */
export async function handler(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  try {
    logger.info('Finalize MOC with Files Lambda invoked', {
      requestId: event.requestContext.requestId,
      method: event.requestContext.http.method,
      path: event.requestContext.http.path,
    })

    // Verify authentication
    const userId = getUserIdFromEvent(event)

    // Get MOC ID from path
    const mocId = event.pathParameters?.mocId
    if (!mocId) {
      throw new BadRequestError('MOC ID is required')
    }

    // Parse and validate request body
    if (!event.body) {
      throw new BadRequestError('Request body is required')
    }

    const body = JSON.parse(event.body)
    const validation = FinalizeMocWithFilesSchema.safeParse(body)

    if (!validation.success) {
      throw new ValidationError('Invalid request body', {
        errors: validation.error.flatten(),
      })
    }

    const { uploadedFiles } = validation.data
    const requestId = event.requestContext.requestId

    logger.info('Finalizing MOC with files', {
      requestId,
      ownerId: userId,
      mocId,
      fileCount: uploadedFiles.length,
    })

    // Check rate limit BEFORE any side effects (Story 3.1.6)
    const uploadConfig = getUploadConfig()
    const rateLimitResult = await checkAndIncrementDailyLimit(userId, uploadConfig.rateLimitPerDay)

    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for finalize', {
        requestId,
        ownerId: userId,
        mocId,
        currentCount: rateLimitResult.currentCount,
        maxPerDay: uploadConfig.rateLimitPerDay,
        nextAllowedAt: rateLimitResult.nextAllowedAt.toISOString(),
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      })

      return errorResponse(429, 'TOO_MANY_REQUESTS', 'Daily upload limit exceeded', {
        message: `You have reached your daily upload limit of ${uploadConfig.rateLimitPerDay}. Please try again tomorrow.`,
        nextAllowedAt: rateLimitResult.nextAllowedAt.toISOString(),
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      })
    }

    logger.info('Rate limit check passed', {
      requestId,
      ownerId: userId,
      remaining: rateLimitResult.remaining,
    })

    // Verify MOC exists and user owns it
    const [moc] = await db
      .select()
      .from(mocInstructions)
      .where(eq(mocInstructions.id, mocId))
      .limit(1)

    if (!moc) {
      throw new NotFoundError('MOC not found')
    }
    if (moc.userId !== userId) {
      throw new ForbiddenError('You do not own this MOC')
    }

    // Story 3.1.7: Check if already finalized (idempotent short-circuit)
    if (moc.finalizedAt) {
      logger.info('MOC already finalized (idempotent)', {
        requestId,
        ownerId: userId,
        mocId,
        idempotent: true,
        finalizedAt: moc.finalizedAt.toISOString(),
      })

      const fileRecords = await db.select().from(mocFiles).where(eq(mocFiles.mocId, mocId))
      const images = buildImagesArray(fileRecords)

      return successResponse(200, {
        message: 'MOC already finalized',
        idempotent: true,
        data: {
          moc: {
            ...moc,
            files: fileRecords,
            images,
          },
        },
      })
    }

    // Story 3.1.7: Try to acquire finalize lock
    // Lock is acquired only if: finalizedAt IS NULL AND (finalizingAt IS NULL OR finalizingAt is stale)
    const lockTtlMinutes = uploadConfig.finalizeLockTtlMinutes
    const staleCutoff = new Date(Date.now() - lockTtlMinutes * 60 * 1000)

    const [lockedMoc] = await db
      .update(mocInstructions)
      .set({ finalizingAt: new Date() })
      .where(
        and(
          eq(mocInstructions.id, mocId),
          isNull(mocInstructions.finalizedAt),
          or(isNull(mocInstructions.finalizingAt), lt(mocInstructions.finalizingAt, staleCutoff)),
        ),
      )
      .returning()

    // If no row returned, another process holds the lock or it's already finalized
    if (!lockedMoc) {
      // Re-fetch to determine current state
      const [currentMoc] = await db
        .select()
        .from(mocInstructions)
        .where(eq(mocInstructions.id, mocId))
        .limit(1)

      if (currentMoc?.finalizedAt) {
        // Already finalized by another process
        logger.info('MOC finalized by another process (idempotent)', {
          requestId,
          ownerId: userId,
          mocId,
          idempotent: true,
          finalizedAt: currentMoc.finalizedAt.toISOString(),
        })

        const fileRecords = await db.select().from(mocFiles).where(eq(mocFiles.mocId, mocId))
        const images = buildImagesArray(fileRecords)

        return successResponse(200, {
          message: 'MOC already finalized',
          idempotent: true,
          data: {
            moc: {
              ...currentMoc,
              files: fileRecords,
              images,
            },
          },
        })
      }

      // Another process is currently finalizing
      logger.info('MOC finalize in progress by another process', {
        requestId,
        ownerId: userId,
        mocId,
        idempotent: true,
        status: 'finalizing',
        finalizingAt: currentMoc?.finalizingAt?.toISOString(),
      })

      return successResponse(200, {
        message: 'MOC finalization in progress',
        idempotent: true,
        status: 'finalizing',
      })
    }

    // We have the lock - proceed with side effects
    // Wrap in try/finally to ensure lock is cleared on failure
    try {
      // Verify all files were uploaded successfully
      const successfulFiles = uploadedFiles.filter(f => f.success)
      if (successfulFiles.length === 0) {
        throw new BadRequestError('No files were successfully uploaded')
      }

      // Verify files exist in S3
      await verifyFilesInS3(
        successfulFiles.map(f => f.fileId),
        mocId,
      )

      // Get all file records
      const fileRecords = await db.select().from(mocFiles).where(eq(mocFiles.mocId, mocId))

      logger.info('File records retrieved', {
        mocId,
        fileCount: fileRecords.length,
      })

      // Set first image as thumbnail
      let thumbnailUrl: string | null = null
      const imageFiles = fileRecords.filter(
        f => f.fileType === 'gallery-image' || f.fileType === 'thumbnail',
      )

      if (imageFiles.length > 0) {
        // Mark first image as thumbnail
        thumbnailUrl = imageFiles[0].fileUrl
        await db
          .update(mocFiles)
          .set({ fileType: 'thumbnail' })
          .where(eq(mocFiles.id, imageFiles[0].id))

        logger.info('Thumbnail set', {
          fileId: imageFiles[0].id,
          thumbnailUrl,
        })
      }

      // Update MOC with thumbnail, finalizedAt, and clear finalizingAt
      const now = new Date()
      const updateData: Record<string, unknown> = {
        thumbnailUrl,
        updatedAt: now,
        lastUpdatedByUserId: userId,
        finalizedAt: now,
        finalizingAt: null, // Clear the lock
      }

      // If status is still draft, update to published now that files are uploaded
      if (lockedMoc.status === 'draft' || !lockedMoc.status) {
        updateData.status = 'published'
        if (!lockedMoc.publishedAt) {
          updateData.publishedAt = now
        }
      }

      // Set instructionsMetadata.hasInstructions to true since we have files
      if (!lockedMoc.instructionsMetadata || !lockedMoc.instructionsMetadata.hasInstructions) {
        const instructionFiles = fileRecords.filter(f => f.fileType === 'instruction')
        if (instructionFiles.length > 0) {
          updateData.instructionsMetadata = {
            ...(lockedMoc.instructionsMetadata || {}),
            hasInstructions: true,
          }
        }
      }

      const [updatedMoc] = await db
        .update(mocInstructions)
        .set(updateData)
        .where(eq(mocInstructions.id, mocId))
        .returning()

      // Index in OpenSearch
      const { indexDocument } = await import('@/core/search/opensearch')
      await indexDocument({
        index: 'mocs',
        id: updatedMoc.id,
        body: updatedMoc,
      })

      logger.info('MOC indexed in Elasticsearch', { mocId })

      // Create images array for frontend consistency
      const images = buildImagesArray(fileRecords)

      logger.info('MOC finalized successfully', {
        requestId,
        ownerId: userId,
        mocId,
        totalFiles: fileRecords.length,
        imageCount: images.length,
        hasThumbnail: !!thumbnailUrl,
      })

      return successResponse(200, {
        message: 'MOC created successfully with files',
        data: {
          moc: {
            ...updatedMoc,
            files: fileRecords,
            images,
          },
        },
      })
    } catch (error) {
      // Clear the lock on failure so retry can proceed
      await db
        .update(mocInstructions)
        .set({ finalizingAt: null })
        .where(eq(mocInstructions.id, mocId))

      logger.error('Finalize side effects failed, lock cleared', {
        requestId,
        ownerId: userId,
        mocId,
        error,
      })

      throw error
    }
  } catch (error) {
    logger.error('Finalize MOC with files error:', error)
    return errorResponseFromError(error)
  }
}

/**
 * Extract user ID from JWT claims
 */
function getUserIdFromEvent(event: APIGatewayEvent): string {
  const userId = event.requestContext.authorizer?.jwt?.claims.sub

  if (!userId) {
    throw new UnauthorizedError('Authentication required')
  }

  return userId
}

/**
 * Build images array for frontend consistency
 */
function buildImagesArray(
  fileRecords: Array<{
    id: string
    fileType: string
    fileUrl: string
    originalFilename: string | null
  }>,
) {
  return fileRecords
    .filter(file => file.fileType === 'thumbnail' || file.fileType === 'gallery-image')
    .map(file => ({
      id: file.id,
      url: file.fileUrl,
      alt: file.originalFilename || 'MOC Image',
      caption: file.originalFilename || 'MOC Image',
    }))
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

/**
 * Verify files exist in S3 with size and magic bytes validation
 * Story 3.1.8: Enhanced verification
 */
async function verifyFilesInS3(fileIds: string[], mocId: string): Promise<void> {
  const bucketName = process.env.LEGO_API_BUCKET_NAME
  if (!bucketName) {
    throw new Error('S3 bucket not configured')
  }

  const s3Client = new S3Client({})

  // Get file records
  const fileRecords = await db
    .select()
    .from(mocFiles)
    .where(
      and(
        eq(mocFiles.mocId, mocId),
        // Filter by fileIds
      ),
    )

  // Filter to only successful uploads
  const recordsToVerify = fileRecords.filter(f => fileIds.includes(f.id))

  logger.info('Verifying files in S3', {
    mocId,
    fileCount: recordsToVerify.length,
  })

  for (const file of recordsToVerify) {
    const s3Key = extractS3KeyFromUrl(file.fileUrl)

    try {
      // Story 3.1.8: HeadObject for existence and size check
      const headCommand = new HeadObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      })

      const headResponse = await s3Client.send(headCommand)
      const contentLength = headResponse.ContentLength ?? 0

      // Validate file size against config limits
      const fileType = file.fileType as 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image'
      const maxSize = getFileSizeLimit(fileType)

      if (contentLength > maxSize) {
        logger.error('File exceeds size limit', {
          fileId: file.id,
          filename: file.originalFilename,
          actualSize: contentLength,
          maxSize,
          fileType,
        })

        throw new BadRequestError(
          `File ${file.originalFilename} exceeds size limit (${Math.round(contentLength / 1024 / 1024)}MB > ${Math.round(maxSize / 1024 / 1024)}MB)`,
        )
      }

      // Story 3.1.8: GetObject Range for magic bytes validation
      // Only validate magic bytes for file types that have defined signatures
      const shouldValidateMagicBytes = ['instruction', 'thumbnail', 'gallery-image'].includes(
        fileType,
      )

      if (shouldValidateMagicBytes && contentLength > 0) {
        const getCommand = new GetObjectCommand({
          Bucket: bucketName,
          Key: s3Key,
          Range: 'bytes=0-511', // First 512 bytes for magic bytes
        })

        const getResponse = await s3Client.send(getCommand)
        const bodyBytes = await getResponse.Body?.transformToByteArray()

        if (bodyBytes) {
          const buffer = Buffer.from(bodyBytes)
          const expectedMime = getExpectedMimeType(fileType, file.mimeType)

          // Validate magic bytes
          const isValidMagicBytes = validateMagicBytes(buffer, expectedMime)

          if (!isValidMagicBytes) {
            logger.error('File magic bytes validation failed', {
              fileId: file.id,
              filename: file.originalFilename,
              expectedMime,
              fileType,
            })

            throw new BadRequestError(
              `File ${file.originalFilename} content does not match expected type "${expectedMime}". The file may be corrupted or have an incorrect extension.`,
            )
          }
        }
      }

      logger.info('File verified in S3', {
        fileId: file.id,
        s3Key,
        contentLength,
        fileType,
      })
    } catch (error) {
      // Re-throw BadRequestError as-is
      if (error instanceof BadRequestError) {
        throw error
      }

      logger.error('File verification failed', {
        fileId: file.id,
        fileUrl: file.fileUrl,
        error,
      })

      throw new BadRequestError(
        `File ${file.originalFilename} was not uploaded successfully. Please try again.`,
      )
    }
  }

  logger.info('All files verified in S3', { mocId, fileCount: recordsToVerify.length })
}

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
