/**
 * Register File Lambda Function
 *
 * Story 3.1.11: Upload Session Endpoint — Validation, Owner Keys, TTL
 *
 * Registers a file within an upload session and initiates S3 multipart upload.
 * Returns fileId and uploadId for subsequent part uploads.
 *
 * Route: POST /api/mocs/uploads/sessions/:sessionId/files
 */

import { eq, and } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { CreateMultipartUploadCommand } from '@aws-sdk/client-s3'
import { RegisterFileRequestSchema, type RegisterFileResponse } from '../_shared/schemas'
import {
  successResponse,
  errorResponseFromError,
  type APIGatewayProxyResult,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'
import { getDbAsync } from '@/core/database/client'
import { uploadSessions, uploadSessionFiles } from '@/core/database/schema'
import { getS3Client } from '@/core/storage/s3'
import { getEnv } from '@/core/utils/env'
import { getUploadConfig, isMimeTypeAllowed, getAllowedMimeTypes } from '@/core/config/upload'

const logger = createLogger('register-upload-file')

interface APIGatewayEvent {
  requestContext: {
    http: { method: string; path: string }
    authorizer?: { jwt?: { claims: { sub: string } } }
    requestId: string
  }
  pathParameters?: { sessionId?: string }
  body?: string | null
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext.requestId

  try {
    logger.info('Register file invoked', { requestId })

    // Auth check
    const userId = event.requestContext.authorizer?.jwt?.claims.sub
    if (!userId) throw new UnauthorizedError('Authentication required')

    // Get session ID from path
    const sessionId = event.pathParameters?.sessionId
    if (!sessionId) throw new BadRequestError('Session ID is required')

    // Parse body
    if (!event.body) throw new BadRequestError('Request body is required')
    let body: unknown
    try {
      body = JSON.parse(event.body)
    } catch {
      throw new BadRequestError('Invalid JSON body')
    }

    const validation = RegisterFileRequestSchema.safeParse(body)
    if (!validation.success) {
      throw new ValidationError('Invalid request body', { errors: validation.error.flatten() })
    }

    const { category, name, size, type, ext } = validation.data
    const db = await getDbAsync()

    // Verify session exists and belongs to user
    const [session] = await db
      .select()
      .from(uploadSessions)
      .where(and(eq(uploadSessions.id, sessionId), eq(uploadSessions.userId, userId)))
      .limit(1)

    if (!session) throw new NotFoundError('Upload session not found')
    if (session.status !== 'active') throw new BadRequestError('Session is not active')
    if (new Date() > session.expiresAt) throw new BadRequestError('Session has expired')

    // Validate file against config
    const config = getUploadConfig()
    const fileType =
      category === 'instruction'
        ? 'instruction'
        : category === 'parts-list'
          ? 'parts-list'
          : 'gallery-image'

    let maxSize: number
    switch (category) {
      case 'instruction':
        maxSize = config.pdfMaxBytes
        break
      case 'parts-list':
        maxSize = config.partsListMaxBytes
        break
      default:
        maxSize = config.imageMaxBytes
    }

    if (size > maxSize) {
      throw new BadRequestError(`File exceeds size limit for ${category}`, { statusCode: 413 })
    }

    if (!isMimeTypeAllowed(fileType, type)) {
      const allowed = getAllowedMimeTypes(fileType)
      throw new BadRequestError(`Invalid MIME type. Allowed: ${allowed.join(', ')}`, {
        statusCode: 415,
        allowedTypes: allowed,
      })
    }

    // Generate S3 key: {env}/moc-instructions/{ownerId}/{sessionId}/{category}/{uuid.ext}
    const env = getEnv()
    const fileId = uuidv4()
    const s3Key = `${env.STAGE || 'dev'}/moc-instructions/${userId}/${sessionId}/${category}/${fileId}.${ext}`

    // Initiate S3 multipart upload
    const s3 = await getS3Client()
    const bucket = env.S3_BUCKET
    const createCmd = new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: s3Key,
      ContentType: type,
      ServerSideEncryption: 'AES256',
    })
    const createResult = await s3.send(createCmd)
    const uploadId = createResult.UploadId

    if (!uploadId) throw new Error('Failed to initiate multipart upload')

    // Insert file record
    await db.insert(uploadSessionFiles).values({
      id: fileId,
      sessionId,
      category,
      name,
      size,
      mimeType: type,
      extension: ext,
      s3Key,
      uploadId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    logger.info('File registered', { requestId, sessionId, fileId, category, s3Key })

    const response: RegisterFileResponse = { fileId, uploadId }
    return successResponse(201, { data: response })
  } catch (error) {
    logger.error('Register file error', { requestId, error })
    return errorResponseFromError(error)
  }
}
