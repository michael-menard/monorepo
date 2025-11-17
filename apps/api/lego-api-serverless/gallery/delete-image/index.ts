/**
 * Delete Gallery Image Lambda Handler
 *
 * DELETE /api/images/:id
 * Deletes image from S3, database, and search index
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import { getUserIdFromEvent } from '@/lib/auth/jwt-utils'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { GalleryImageIdSchema } from '@/lib/validation/gallery-schemas'
import { db } from '@monorepo/db/client'
import { getS3Client } from '@/lib/storage/s3-client'
import { getRedisClient } from '@/lib/cache/redis-client'
import { deleteDocument } from '@/lib/search/opensearch-client'
import { galleryImages } from '@monorepo/db/schema'
import { getEnv } from '@/lib/utils/env'

/**
 * Delete Gallery Image Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Extract and validate image ID from path parameters
    const imageId = event.pathParameters?.id
    if (!imageId) {
      return createErrorResponse(400, 'BAD_REQUEST', 'Image ID is required')
    }

    GalleryImageIdSchema.parse({ id: imageId })

    // Check if image exists and verify ownership
    const [existingImage] = await db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.id, imageId))

    if (!existingImage) {
      return createErrorResponse(404, 'NOT_FOUND', 'Image not found')
    }

    if (existingImage.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'Access denied to this image')
    }

    // Delete from S3 (image and thumbnail)
    const s3 = await getS3Client()
    const env = getEnv()

    // Extract key from URL (handle both formats: https://bucket.s3.region.amazonaws.com/key and https://bucket/key)
    const imageUrl = existingImage.imageUrl
    let imageKey: string
    try {
      const url = new URL(imageUrl)
      imageKey = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname
    } catch (error) {
      logger.error('Failed to parse image URL:', error)
      return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to delete image from S3')
    }

    // Delete main image
    await s3.send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET!,
        Key: imageKey,
      }),
    )

    // Delete thumbnail if exists (reconstruct thumbnail key from image key)
    if (existingImage.thumbnailUrl) {
      try {
        const thumbnailUrl = new URL(existingImage.thumbnailUrl)
        const thumbnailKey = thumbnailUrl.pathname.startsWith('/')
          ? thumbnailUrl.pathname.substring(1)
          : thumbnailUrl.pathname

        await s3.send(
          new DeleteObjectCommand({
            Bucket: env.S3_BUCKET!,
            Key: thumbnailKey,
          }),
        )
      } catch (err) {
        logger.warn('Thumbnail deletion failed (may not exist):', err)
      }
    }

    // Delete from database
    await db.delete(galleryImages).where(eq(galleryImages.id, imageId))

    // Delete from OpenSearch
    try {
      await deleteDocument({
        index: 'gallery_images',
        id: imageId,
      })
    } catch (error) {
      logger.error('OpenSearch delete failed (non-critical):', error)
      // Don't fail the request if deletion fails
    }

    // Invalidate caches
    const redis = await getRedisClient()
    await redis.del(`gallery:image:detail:${imageId}`)

    // Invalidate list caches for this user
    try {
      const pattern = `gallery:images:user:${userId}:*`
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(keys)
        logger.info(`Invalidated ${keys.length} list cache keys for user ${userId}`)
      }
    } catch (error) {
      logger.error('Redis list cache invalidation failed (non-critical):', error)
    }

    return createSuccessResponse({ message: 'Image deleted successfully' }, 204)
  } catch (error) {
    logger.error('Delete image error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to delete image')
  }
}
