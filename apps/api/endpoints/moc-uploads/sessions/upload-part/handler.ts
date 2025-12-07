/**
 * Upload Part Lambda Function
 *
 * Story 3.1.11: Upload Session Endpoint — Validation, Owner Keys, TTL
 *
 * Uploads a single part of a multipart upload to S3.
 * Receives binary body and streams to S3 UploadPart.
 *
 * Route: PUT /api/mocs/uploads/sessions/:sessionId/files/:fileId/parts/:partNumber
 */

import {
  successResponse,
  errorResponseFromError,
  type APIGatewayProxyResult,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'
import { getDbAsync } from '@/core/database/client'
import { uploadSessions, uploadSessionFiles, uploadSessionParts } from '@/core/database/schema'
import { eq, and } from 'drizzle-orm'
import { getS3Client } from '@/core/storage/s3'
import { UploadPartCommand } from '@aws-sdk/client-s3'
import { getEnv } from '@/core/utils/env'
import type { UploadPartResponse } from '../_shared/schemas'

const logger = createLogger('upload-part')

interface APIGatewayEvent {
  requestContext: {
    http: { method: string; path: string }
    authorizer?: { jwt?: { claims: { sub: string } } }
    requestId: string
  }
  pathParameters?: { sessionId?: string; fileId?: string; partNumber?: string }
  body?: string | null
  isBase64Encoded?: boolean
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext.requestId

  try {
    logger.info('Upload part invoked', { requestId })

    // Auth check
    const userId = event.requestContext.authorizer?.jwt?.claims.sub
    if (!userId) throw new UnauthorizedError('Authentication required')

    // Get path parameters
    const { sessionId, fileId, partNumber: partNumberStr } = event.pathParameters || {}
    if (!sessionId) throw new BadRequestError('Session ID is required')
    if (!fileId) throw new BadRequestError('File ID is required')
    if (!partNumberStr) throw new BadRequestError('Part number is required')

    const partNumber = parseInt(partNumberStr, 10)
    if (isNaN(partNumber) || partNumber < 1) {
      throw new BadRequestError('Part number must be a positive integer')
    }

    // Get binary body
    if (!event.body) throw new BadRequestError('Request body is required')
    const bodyBuffer = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body, 'binary')

    if (bodyBuffer.length === 0) throw new BadRequestError('Empty body')

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

    // Upload part to S3
    const env = getEnv()
    const s3 = await getS3Client()
    const uploadCmd = new UploadPartCommand({
      Bucket: env.S3_BUCKET,
      Key: file.s3Key,
      UploadId: file.uploadId,
      PartNumber: partNumber,
      Body: bodyBuffer,
    })

    const result = await s3.send(uploadCmd)
    const etag = result.ETag

    if (!etag) throw new Error('S3 did not return ETag')

    // Record part in database (upsert)
    await db
      .insert(uploadSessionParts)
      .values({
        fileId,
        partNumber,
        etag,
        size: bodyBuffer.length,
        status: 'uploaded',
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [uploadSessionParts.fileId, uploadSessionParts.partNumber],
        set: { etag, size: bodyBuffer.length, status: 'uploaded' },
      })

    // Update file status to uploading
    await db
      .update(uploadSessionFiles)
      .set({ status: 'uploading', updatedAt: new Date() })
      .where(eq(uploadSessionFiles.id, fileId))

    logger.info('Part uploaded', {
      requestId,
      sessionId,
      fileId,
      partNumber,
      size: bodyBuffer.length,
    })

    const response: UploadPartResponse = { partNumber, etag }
    return successResponse(200, { data: response })
  } catch (error) {
    logger.error('Upload part error', { requestId, error })
    return errorResponseFromError(error)
  }
}
