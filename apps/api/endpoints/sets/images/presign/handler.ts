import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { z } from 'zod'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { db } from '@/core/database/client'
import { sets } from '@/core/database/schema'
import { sanitizeFilenameForS3 } from '@/core/utils/filename-sanitizer'
import { eq } from 'drizzle-orm'

/**
 * Presign Set Image Upload
 *
 * POST /api/sets/:id/images/presign
 *
 * Returns a presigned S3 URL and final image URL for a given set image.
 */

const PathParamsSchema = z.object({
  id: z.string().uuid('Invalid set ID'),
})

const PresignBodySchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  contentType: z.string().min(1, 'Content type is required'),
})

const s3Client = new S3Client({})

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    const pathParams = PathParamsSchema.safeParse(event.pathParameters ?? {})
    if (!pathParams.success) {
      return errorResponse(400, 'BAD_REQUEST', 'Set ID is required')
    }

    const { id: setId } = pathParams.data

    if (!event.body) {
      return errorResponse(400, 'BAD_REQUEST', 'Request body is required')
    }

    let parsedBody: unknown
    try {
      parsedBody = JSON.parse(event.body)
    } catch {
      return errorResponse(400, 'BAD_REQUEST', 'Invalid JSON in request body')
    }

    const body = PresignBodySchema.parse(parsedBody)

    // Verify set exists and is owned by the current user
    const [setRow] = await db
      .select({ id: sets.id, userId: sets.userId })
      .from(sets)
      .where(eq(sets.id, setId))
      .limit(1)

    if (!setRow) {
      return errorResponse(404, 'NOT_FOUND', 'Set not found')
    }

    if (setRow.userId !== userId) {
      return errorResponse(403, 'FORBIDDEN', 'You do not have permission to modify this set')
    }

    const bucket = process.env.SETS_BUCKET
    if (!bucket) {
      logger.error('SETS_BUCKET environment variable is not configured')
      return errorResponse(500, 'INTERNAL_ERROR', 'Image upload bucket not configured')
    }

    const region = process.env.AWS_REGION || 'us-east-1'
    const sanitizedFilename = sanitizeFilenameForS3(body.filename)
    const timestamp = Date.now()
    const key = `sets/${setId}/${timestamp}-${sanitizedFilename}`

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: body.contentType,
      Metadata: {
        setId,
        userId,
        originalFilename: body.filename,
      },
    })

    const expiresInSeconds = 300 // 5 minutes
    const uploadUrl = await getSignedUrl(s3Client as any, command, { expiresIn: expiresInSeconds })

    const imageUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`

    logger.info('Set image presign generated', {
      userId,
      setId,
      bucket,
      key,
    })

    return successResponse({ uploadUrl, imageUrl, key })
  } catch (error) {
    logger.error('Presign set image error:', error)

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }

    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to generate image upload URL')
  }
}
