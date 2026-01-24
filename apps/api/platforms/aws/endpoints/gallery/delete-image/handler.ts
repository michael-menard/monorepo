/**
 * Delete Gallery Image Lambda Handler
 *
 * DELETE /api/images/:id
 * Deletes image from S3, database, and search index
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { eq } from 'drizzle-orm'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { logger } from '@/core/observability/logger'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { GalleryImageIdSchema } from '@/endpoints/gallery/schemas'
import { db } from '@/core/database/client'
import { getS3Client } from '@/core/storage/s3'
import { getRedisClient } from '@/core/cache/redis'
import { deleteDocument } from '@/core/search/opensearch'
import { galleryImages } from '@/core/database/schema'
import { getEnv } from '@/core/utils/env'

/**
 * Delete Gallery Image Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Extract and validate image ID from path parameters
    const imageId = event.pathParameters?.id
    if (!imageId) {
      return errorResponse(400, 'BAD_REQUEST', 'Image ID is required')
    }

    GalleryImageIdSchema.parse({ id: imageId })

    // Check if image exists and verify ownership
    const [existingImage] = await db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.id, imageId))

    if (!existingImage) {
      return errorResponse(404, 'NOT_FOUND', 'Image not found')
    }

    if (existingImage.userId !== userId) {
      return errorResponse(403, 'FORBIDDEN', 'Access denied to this image')
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
      return errorResponse(500, 'INTERNAL_ERROR', 'Failed to delete image from S3')
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

    return successResponse({ message: 'Image deleted successfully' }, 204)
  } catch (error) {
    logger.error('Delete image error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to delete image')
  }
}
