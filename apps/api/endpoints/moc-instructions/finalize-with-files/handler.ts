/**
 * Finalize MOC with Files Lambda Function
 *
 * Phase 2 of two-phase MOC creation with file uploads.
 * Confirms file uploads and finalizes MOC record.
 *
 * Route: POST /api/mocs/{mocId}/finalize
 *
 * Features:
 * - Verifies files were uploaded to S3
 * - Sets first image as thumbnail
 * - Indexes MOC in Elasticsearch
 * - Returns complete MOC with all file records
 *
 * Flow:
 * 1. Client uploads files to S3 using presigned URLs from initialize
 * 2. Client calls this endpoint to confirm uploads
 * 3. Lambda verifies files exist in S3
 * 4. Lambda updates MOC record (thumbnail, etc.)
 * 5. Lambda indexes MOC in Elasticsearch
 * 6. Returns complete MOC data
 *
 * Authentication: JWT via AWS Cognito
 * Authorization: User must own the MOC
 */

import {
  successResponse,
  errorResponseFromError,
  type APIGatewayProxyResult,
} from '@/core/utils/responses'
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from '@/core/utils/responses'
import { logger } from '@/core/observability/logger'
import { db } from '@/core/database/client'
import { mocInstructions, mocFiles } from '@/core/database/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'

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

    logger.info('Finalizing MOC with files', {
      mocId,
      userId,
      fileCount: uploadedFiles.length,
    })

    // Verify MOC exists and user owns it
    const [moc] = await db
      .select()
      .from(mocInstructions)
      .where(and(eq(mocInstructions.id, mocId), eq(mocInstructions.userId, userId)))
      .limit(1)

    if (!moc) {
      throw new NotFoundError('MOC not found or access denied')
    }

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

    // Update MOC with thumbnail
    const now = new Date()
    const [updatedMoc] = await db
      .update(mocInstructions)
      .set({
        thumbnailUrl,
        updatedAt: now,
      })
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
    const images = fileRecords
      .filter(file => file.fileType === 'thumbnail' || file.fileType === 'gallery-image')
      .map(file => ({
        id: file.id,
        url: file.fileUrl,
        alt: file.originalFilename || 'MOC Image',
        caption: file.originalFilename || 'MOC Image',
      }))

    logger.info('MOC finalized successfully', {
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
 * Verify files exist in S3
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
    try {
      // Extract S3 key from file URL
      const s3Key = extractS3KeyFromUrl(file.fileUrl)

      // Check if file exists
      const command = new HeadObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      })

      await s3Client.send(command)

      logger.info('File verified in S3', {
        fileId: file.id,
        s3Key,
      })
    } catch (error) {
      logger.error('File not found in S3', {
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
