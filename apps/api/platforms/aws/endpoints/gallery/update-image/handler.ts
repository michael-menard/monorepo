/**
 * Update Gallery Image Lambda Handler
 *
 * PATCH /api/images/:id
 * Updates image metadata (title, description, tags, albumId)
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq } from 'drizzle-orm'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { logger } from '@/core/observability/logger'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { UpdateGalleryImageSchema, GalleryImageIdSchema } from '@/endpoints/gallery/schemas'
import { db } from '@/core/database/client'
import { getRedisClient } from '@/core/cache/redis'
import { indexDocument } from '@/core/search/opensearch'
import { galleryImages } from '@/core/database/schema'

/**
 * Update Gallery Image Handler
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

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}')
    const updateData = UpdateGalleryImageSchema.parse(body)

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

    // Update image
    const [updatedImage] = await db
      .update(galleryImages)
      .set({
        ...updateData,
        lastUpdatedAt: new Date(),
      })
      .where(eq(galleryImages.id, imageId))
      .returning()

    // Update OpenSearch index
    try {
      await indexDocument({
        index: 'gallery_images',
        id: imageId,
        body: {
          userId: updatedImage.userId,
          title: updatedImage.title,
          description: updatedImage.description || '',
          tags: updatedImage.tags || [],
          albumId: updatedImage.albumId || null,
          createdAt: updatedImage.createdAt.toISOString(),
        },
      })
    } catch (error) {
      logger.error('OpenSearch update failed (non-critical):', error)
      // Don't fail the request if indexing fails
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

    return successResponse(updatedImage)
  } catch (error) {
    logger.error('Update image error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to update image')
  }
}
