/**
 * Get Gallery Image Lambda Handler
 *
 * GET /api/images/:id
 * Retrieves a single gallery image by ID
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import { getUserIdFromEvent } from '@/lib/auth/jwt-utils'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { GalleryImageIdSchema } from '@/lib/validation/gallery-schemas'
import { db } from '@monorepo/db/client'
import { getRedisClient } from '@/lib/cache/redis-client'
import { galleryImages } from '@monorepo/db/schema'

/**
 * Get Gallery Image Handler
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

    // Check cache
    const cacheKey = `gallery:image:detail:${imageId}`
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) {
      const image = JSON.parse(cached)
      // Verify ownership
      if (image.userId !== userId) {
        return createErrorResponse(403, 'FORBIDDEN', 'Access denied to this image')
      }
      return createSuccessResponse(image)
    }

    // Query database
    const [image] = await db.select().from(galleryImages).where(eq(galleryImages.id, imageId))

    if (!image) {
      return createErrorResponse(404, 'NOT_FOUND', 'Image not found')
    }

    // Verify ownership
    if (image.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'Access denied to this image')
    }

    // Cache for 10 minutes
    await redis.setEx(cacheKey, 600, JSON.stringify(image))

    return createSuccessResponse(image)
  } catch (error) {
    logger.error('Get image error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get image')
  }
}
