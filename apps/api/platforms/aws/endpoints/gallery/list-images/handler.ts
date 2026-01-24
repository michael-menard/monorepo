/**
 * List Gallery Images Lambda Handler
 *
 * GET /api/images
 * Lists gallery images for authenticated user with pagination and filtering
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq, and, isNull, desc, count } from 'drizzle-orm'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { logger } from '@/core/observability/logger'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { ListGalleryImagesQuerySchema } from '@/endpoints/gallery/schemas'
import { db } from '@/core/database/client'
import { getRedisClient } from '@/core/cache/redis'
import { galleryImages } from '@/core/database/schema'

/**
 * List Gallery Images Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Validate query parameters
    const queryParams = ListGalleryImagesQuerySchema.parse(event.queryStringParameters || {})
    const { page, limit, search, albumId } = queryParams

    // Generate cache key
    const cacheKey = `gallery:images:user:${userId}:page:${page}:limit:${limit}:search:${search || 'none'}:album:${albumId || 'none'}`

    // Check Redis cache
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) {
      return successResponse(JSON.parse(cached))
    }

    // Query database
    const offset = (page - 1) * limit

    // Build query conditions
    const conditions = [eq(galleryImages.userId, userId)]
    if (albumId) {
      conditions.push(eq(galleryImages.albumId, albumId))
    } else {
      // If no albumId specified, return standalone images (no album)
      conditions.push(isNull(galleryImages.albumId))
    }

    // Execute query with pagination
    const images = await db
      .select()
      .from(galleryImages)
      .where(and(...conditions))
      .orderBy(desc(galleryImages.createdAt))
      .limit(limit)
      .offset(offset)

    // Count total for pagination
    const [{ total }] = await db
      .select({ total: count() })
      .from(galleryImages)
      .where(and(...conditions))

    const response = {
      data: images,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    }

    // Cache result for 5 minutes
    await redis.setEx(cacheKey, 300, JSON.stringify(response))

    return successResponse(response)
  } catch (error) {
    logger.error('List images error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to list images')
  }
}
