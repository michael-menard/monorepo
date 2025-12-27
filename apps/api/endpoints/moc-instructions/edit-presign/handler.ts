/**
 * Edit Presign Lambda Function
 *
 * Story 3.1.35: Edit Presign Endpoint
 *
 * Route: POST /api/mocs/:mocId/edit/presign
 *
 * Features:
 * - Generates presigned S3 URLs for replacement files during edit
 * - Validates file types/sizes against upload config
 * - Uses edit-specific S3 path: {env}/moc-instructions/{ownerId}/{mocId}/edit/{category}/{uuid.ext}
 * - Applies rate limiting (shared quota with create uploads)
 * - Owner-only access (401/403/404)
 *
 * Authentication: JWT via AWS Cognito (required)
 */

import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

import { db } from '@/core/database/client'
import { mocInstructions } from '@/core/database/schema'
import {
  successResponse,
  errorResponse,
  errorResponseFromError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  type APIGatewayProxyResult,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'
import {
  getUploadConfig,
  isMimeTypeAllowed,
  getAllowedMimeTypes,
  getFileSizeLimit,
  getFileCountLimit,
} from '@/core/config/upload'
import { createRateLimiter, generateDailyKey, RATE_LIMIT_WINDOWS } from '@repo/rate-limit'
import { createPostgresRateLimitStore } from '@/core/rate-limit/postgres-store'
import { sanitizeFilenameForS3 } from '@/core/utils/filename-sanitizer'

const logger = createLogger('edit-presign')

// ─────────────────────────────────────────────────────────────────────────────
// Request/Response Schemas
// ─────────────────────────────────────────────────────────────────────────────

const MocIdSchema = z.string().uuid()

/**
 * File metadata schema for edit presign
 * Using 'category' to match the API spec (vs. 'fileType' in initialize)
 */
const FileMetadataSchema = z.object({
  category: z.enum(['instruction', 'image', 'parts-list', 'thumbnail']),
  filename: z.string().min(1, 'Filename is required'),
  size: z.number().positive('File size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required'),
})

const EditPresignRequestSchema = z.object({
  files: z
    .array(FileMetadataSchema)
    .min(1, 'At least one file is required')
    .max(20, 'Maximum 20 files per request'),
})

export type EditPresignRequest = z.infer<typeof EditPresignRequestSchema>

const EditPresignResponseSchema = z.object({
  files: z.array(
    z.object({
      id: z.string().uuid(),
      category: z.string(),
      filename: z.string(),
      uploadUrl: z.string().url(),
      s3Key: z.string(),
      expiresAt: z.string().datetime(),
    }),
  ),
  sessionExpiresAt: z.string().datetime(),
})

export type EditPresignResponse = z.infer<typeof EditPresignResponseSchema>

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
// File Category Mapping
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId

  try {
    logger.info('Edit Presign invoked', {
      requestId,
      path: event.requestContext.http.path,
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Task 6: Auth Check (AC: 6)
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

    // Validate mocId format
    const mocIdResult = MocIdSchema.safeParse(mocId)
    if (!mocIdResult.success) {
      throw new NotFoundError('MOC not found')
    }

    // Parse and validate request body
    if (!event.body) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Request body is required', requestId)
    }

    let parsedBody: unknown
    try {
      parsedBody = JSON.parse(event.body)
    } catch {
      return errorResponse(400, 'VALIDATION_ERROR', 'Invalid JSON in request body', requestId)
    }

    const bodyResult = EditPresignRequestSchema.safeParse(parsedBody)
    if (!bodyResult.success) {
      const issues = bodyResult.error.issues || []
      const errors = issues.map((e: any) => `${e.path?.join('.') || ''}: ${e.message}`).join(', ')
      return errorResponse(400, 'VALIDATION_ERROR', `Validation failed: ${errors}`, requestId)
    }

    const { files } = bodyResult.data

    logger.info('Edit presign request validated', {
      requestId,
      mocId,
      ownerId: userId,
      fileCount: files.length,
      categories: [...new Set(files.map(f => f.category))],
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Task 6: Verify MOC Exists and Ownership (AC: 6)
    // ─────────────────────────────────────────────────────────────────────────

    const [existingMoc] = await db
      .select({ id: mocInstructions.id, userId: mocInstructions.userId })
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
    // Task 5: Rate Limiting (AC: 5)
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
      logger.warn('Rate limit exceeded for edit presign', {
        requestId,
        ownerId: userId,
        mocId,
        currentCount: rateLimitResult.currentCount,
        maxPerDay: uploadConfig.rateLimitPerDay,
        nextAllowedAt: rateLimitResult.nextAllowedAt.toISOString(),
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
          code: 'TOO_MANY_REQUESTS',
          message: `Daily upload limit of ${uploadConfig.rateLimitPerDay} reached. Please try again tomorrow.`,
          retryAfterSeconds: rateLimitResult.retryAfterSeconds,
          nextAllowedAt: rateLimitResult.nextAllowedAt.toISOString(),
          correlationId: requestId,
        }),
      }
    }

    logger.info('Rate limit check passed', {
      requestId,
      ownerId: userId,
      remaining: rateLimitResult.remaining,
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Task 2: File Validation (AC: 2)
    // ─────────────────────────────────────────────────────────────────────────

    // Validate file counts per category
    const categoryCounts: Record<string, number> = {}
    for (const file of files) {
      categoryCounts[file.category] = (categoryCounts[file.category] || 0) + 1
    }

    for (const [category, count] of Object.entries(categoryCounts)) {
      const fileType = mapCategoryToFileType(
        category as 'instruction' | 'image' | 'parts-list' | 'thumbnail',
      )
      const maxCount = getFileCountLimit(fileType)

      if (count > maxCount) {
        logger.warn('File count exceeded', {
          requestId,
          category,
          count,
          maxCount,
        })
        return errorResponse(
          400,
          'VALIDATION_ERROR',
          `Maximum ${maxCount} ${category} files allowed, got ${count}`,
          requestId,
        )
      }
    }

    // Validate each file's size and MIME type
    for (const file of files) {
      const fileType = mapCategoryToFileType(file.category)

      // Check file size
      const maxSize = getFileSizeLimit(fileType)
      if (file.size > maxSize) {
        const maxSizeMb = Math.round(maxSize / (1024 * 1024))
        logger.warn('File too large', {
          requestId,
          filename: file.filename,
          category: file.category,
          size: file.size,
          maxSize,
        })
        return {
          statusCode: 413,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
          },
          body: JSON.stringify({
            code: 'FILE_TOO_LARGE',
            message: `File "${file.filename}" exceeds maximum size for ${file.category} (${maxSizeMb} MB)`,
            filename: file.filename,
            category: file.category,
            maxBytes: maxSize,
            providedBytes: file.size,
            correlationId: requestId,
          }),
        }
      }

      // Check MIME type
      if (!isMimeTypeAllowed(fileType, file.mimeType)) {
        const allowedTypes = getAllowedMimeTypes(fileType)
        logger.warn('Invalid MIME type', {
          requestId,
          filename: file.filename,
          category: file.category,
          mimeType: file.mimeType,
          allowedTypes,
        })
        return {
          statusCode: 415,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Credentials': 'true',
          },
          body: JSON.stringify({
            code: 'INVALID_MIME_TYPE',
            message: `File "${file.filename}" has invalid MIME type "${file.mimeType}" for ${file.category}`,
            filename: file.filename,
            category: file.category,
            providedType: file.mimeType,
            allowedTypes,
            correlationId: requestId,
          }),
        }
      }
    }

    logger.info('File validation passed', {
      requestId,
      mocId,
      fileCount: files.length,
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Task 3 & 4: Generate S3 Keys and Presigned URLs (AC: 3, 4)
    // ─────────────────────────────────────────────────────────────────────────

    const presignedFiles = await generateEditPresignedUrls(mocId, userId, files, uploadConfig)

    const sessionExpiresAt = new Date(Date.now() + uploadConfig.sessionTtlSeconds * 1000)

    logger.info('Presigned URLs generated for edit', {
      requestId,
      mocId,
      ownerId: userId,
      fileCount: presignedFiles.length,
      sessionExpiresAt: sessionExpiresAt.toISOString(),
    })

    // ─────────────────────────────────────────────────────────────────────────
    // Build Response
    // ─────────────────────────────────────────────────────────────────────────

    const response: EditPresignResponse = {
      files: presignedFiles,
      sessionExpiresAt: sessionExpiresAt.toISOString(),
    }

    // Validate response schema
    EditPresignResponseSchema.parse(response)

    return successResponse(200, response)
  } catch (error) {
    logger.error('Edit Presign error', error, { requestId })
    return errorResponseFromError(error, requestId)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate presigned URLs for edit files
 *
 * S3 key format: {env}/moc-instructions/{ownerId}/{mocId}/edit/{category}/{uuid}.{ext}
 */
async function generateEditPresignedUrls(
  mocId: string,
  userId: string,
  files: z.infer<typeof FileMetadataSchema>[],
  config: ReturnType<typeof getUploadConfig>,
): Promise<EditPresignResponse['files']> {
  const bucketName = process.env.LEGO_API_BUCKET_NAME
  if (!bucketName) {
    throw new Error('S3 bucket not configured')
  }

  const stage = process.env.STAGE || 'dev'
  const s3Client = new S3Client({})
  const presignedFiles: EditPresignResponse['files'] = []
  const expiresIn = config.presignTtlSeconds

  for (const file of files) {
    const fileId = uuidv4()
    const sanitizedFilename = sanitizeFilenameForS3(file.filename)

    // Extract extension from sanitized filename
    const lastDot = sanitizedFilename.lastIndexOf('.')
    const extension = lastDot > 0 ? sanitizedFilename.substring(lastDot + 1) : ''
    const fileIdWithExt = extension ? `${fileId}.${extension}` : fileId

    // Edit-specific S3 key format
    const s3Key = `${stage}/moc-instructions/${userId}/${mocId}/edit/${file.category}/${fileIdWithExt}`

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: file.mimeType,
      Metadata: {
        mocId,
        userId,
        category: file.category,
        originalFilename: file.filename,
        fileId,
        mode: 'edit',
      },
    })

    const uploadUrl = await getSignedUrl(s3Client as any, command, { expiresIn })
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    presignedFiles.push({
      id: fileId,
      category: file.category,
      filename: file.filename,
      uploadUrl,
      s3Key,
      expiresAt: expiresAt.toISOString(),
    })

    logger.debug('Generated presigned URL for edit', {
      fileId,
      filename: file.filename,
      category: file.category,
      s3Key,
      expiresAt: expiresAt.toISOString(),
    })
  }

  return presignedFiles
}
