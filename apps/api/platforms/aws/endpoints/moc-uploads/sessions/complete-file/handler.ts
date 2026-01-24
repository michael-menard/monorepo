/**
 * Complete File Upload Lambda Function
 *
 * Story 3.1.11: Upload Session Endpoint — Validation, Owner Keys, TTL
 *
 * Completes a multipart upload by calling S3 CompleteMultipartUpload.
 * Returns the final file URL.
 *
 * Route: POST /api/mocs/uploads/sessions/:sessionId/files/:fileId/complete
 */

import { eq, and, asc } from 'drizzle-orm'
import { CompleteMultipartUploadCommand } from '@aws-sdk/client-s3'
import { CompleteFileRequestSchema, type CompleteFileResponse } from '../_shared/schemas'
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
import { uploadSessions, uploadSessionFiles, uploadSessionParts } from '@/core/database/schema'
import { getS3Client } from '@/core/storage/s3'
import { getEnv } from '@/core/utils/env'

const logger = createLogger('complete-file-upload')

interface APIGatewayEvent {
  requestContext: {
    http: { method: string; path: string }
    authorizer?: { jwt?: { claims: { sub: string } } }
    requestId: string
  }
  pathParameters?: { sessionId?: string; fileId?: string }
  body?: string | null
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext.requestId

  try {
    logger.info('Complete file upload invoked', { requestId })

    // Auth check
    const userId = event.requestContext.authorizer?.jwt?.claims.sub
    if (!userId) throw new UnauthorizedError('Authentication required')

    // Get path parameters
    const { sessionId, fileId } = event.pathParameters || {}
    if (!sessionId) throw new BadRequestError('Session ID is required')
    if (!fileId) throw new BadRequestError('File ID is required')

    // Parse body
    if (!event.body) throw new BadRequestError('Request body is required')
    let body: unknown
    try {
      body = JSON.parse(event.body)
    } catch {
      throw new BadRequestError('Invalid JSON body')
    }

    const validation = CompleteFileRequestSchema.safeParse(body)
    if (!validation.success) {
      throw new ValidationError('Invalid request body', { errors: validation.error.flatten() })
    }

    const { parts } = validation.data
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

    // Verify file exists and belongs to session
    const [file] = await db
      .select()
      .from(uploadSessionFiles)
      .where(and(eq(uploadSessionFiles.id, fileId), eq(uploadSessionFiles.sessionId, sessionId)))
      .limit(1)

    if (!file) throw new NotFoundError('File not found')
    if (!file.uploadId) throw new BadRequestError('File upload not initialized')
    if (file.status === 'completed') throw new BadRequestError('File already completed')

    // Verify parts match what we have in DB
    const dbParts = await db
      .select()
      .from(uploadSessionParts)
      .where(eq(uploadSessionParts.fileId, fileId))
      .orderBy(asc(uploadSessionParts.partNumber))

    if (dbParts.length !== parts.length) {
      throw new BadRequestError(
        `Part count mismatch: expected ${dbParts.length}, got ${parts.length}`,
      )
    }

    // Complete multipart upload in S3
    const env = getEnv()
    const s3 = await getS3Client()
    const completeCmd = new CompleteMultipartUploadCommand({
      Bucket: env.S3_BUCKET,
      Key: file.s3Key,
      UploadId: file.uploadId,
      MultipartUpload: {
        Parts: parts.map(p => ({ PartNumber: p.partNumber, ETag: p.etag })),
      },
    })

    await s3.send(completeCmd)

    // Build file URL
    const fileUrl = `https://${env.S3_BUCKET}.s3.${env.AWS_REGION || 'us-east-1'}.amazonaws.com/${file.s3Key}`

    // Update file status
    await db
      .update(uploadSessionFiles)
      .set({ status: 'completed', fileUrl, updatedAt: new Date() })
      .where(eq(uploadSessionFiles.id, fileId))

    logger.info('File upload completed', { requestId, sessionId, fileId, fileUrl })

    const response: CompleteFileResponse = { fileId, fileUrl }
    return successResponse(200, { data: response })
  } catch (error) {
    logger.error('Complete file upload error', { requestId, error })
    return errorResponseFromError(error)
  }
}
