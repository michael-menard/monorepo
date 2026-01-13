import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { z } from 'zod'
import { DeleteObjectsCommand, S3Client } from '@aws-sdk/client-s3'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { errorResponse, noContentResponse } from '@/core/utils/responses'
import { db } from '@/core/database/client'
import { sets, setImages } from '@/core/database/schema'

/**
 * Delete Set Image
 *
 * DELETE /api/sets/:id/images/:imageId
 */

const PathParamsSchema = z.object({
  id: z.string().uuid('Invalid set ID'),
  imageId: z.string().uuid('Invalid image ID'),
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
      return errorResponse(400, 'BAD_REQUEST', 'Set ID and image ID are required')
    }

    const { id: setId, imageId } = pathParams.data

    // Verify set exists and is owned by user
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

    // Load image for S3 cleanup
    const [imageRow] = await db
      .select({ imageUrl: setImages.imageUrl, thumbnailUrl: setImages.thumbnailUrl })
      .from(setImages)
      .where(and(eq(setImages.id, imageId), eq(setImages.setId, setId)))
      .limit(1)

    if (!imageRow) {
      return errorResponse(404, 'NOT_FOUND', 'Image not found')
    }

    // Delete DB record
    await db
      .delete(setImages)
      .where(and(eq(setImages.id, imageId), eq(setImages.setId, setId)))

    const bucket = process.env.SETS_BUCKET

    if (bucket) {
      const keys: string[] = []

      const mainKey = extractS3KeyFromUrl(imageRow.imageUrl)
      if (mainKey) keys.push(mainKey)

      if (imageRow.thumbnailUrl) {
        const thumbKey = extractS3KeyFromUrl(imageRow.thumbnailUrl)
        if (thumbKey) keys.push(thumbKey)
      }

      if (keys.length > 0) {
        try {
          await s3Client.send(
            new DeleteObjectsCommand({
              Bucket: bucket,
              Delete: { Objects: keys.map(Key => ({ Key })) },
            }),
          )

          logger.info('Set image S3 objects deleted', {
            setId,
            imageId,
            keys,
          })
        } catch (err) {
          logger.error('Failed to delete set image from S3', {
            setId,
            imageId,
            error: err,
          })
          // Do not fail the request if S3 cleanup fails
        }
      }
    } else {
      logger.error('SETS_BUCKET environment variable is not configured for image delete')
    }

    return noContentResponse()
  } catch (error) {
    logger.error('Delete set image error:', error)

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }

    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to delete image')
  }
}

function extractS3KeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const key = parsed.pathname.startsWith('/')
      ? parsed.pathname.slice(1)
      : parsed.pathname
    return key || null
  } catch {
    return null
  }
}
