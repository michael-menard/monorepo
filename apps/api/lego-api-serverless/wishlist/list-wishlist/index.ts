/**
 * List Wishlist Items Lambda Handler
 *
 * GET /api/wishlist
 *
 * Returns all wishlist items for authenticated user, sorted by sortOrder.
 * Optional category filter supported.
 * Results cached in Redis for 5 minutes.
 *
 * Story 3.6 AC #2: Returns all user's items sorted by sortOrder with optional category filter
 * Story 3.6 AC #8: Redis caching with pattern: wishlist:user:{userId}:all
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq, and, asc } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import { getUserIdFromEvent } from '@/lib/auth/jwt-utils'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { ListWishlistQuerySchema } from '@/lib/validation/wishlist-schemas'
import { db } from '@/lib/db/client'
import { getRedisClient } from '@/lib/cache/redis-client'
import { wishlistItems } from '@/db/schema'

/**
 * Main Lambda Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Validate query parameters
    const queryParams = ListWishlistQuerySchema.parse(event.queryStringParameters || {})
    const { category } = queryParams

    // Generate cache key
    const cacheKey = category
      ? `wishlist:user:${userId}:category:${category}`
      : `wishlist:user:${userId}:all`

    // Check Redis cache
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) {
      logger.info('Cache hit', { userId, category })
      return createSuccessResponse(JSON.parse(cached))
    }

    // Build query conditions
    const conditions = [eq(wishlistItems.userId, userId)]
    if (category) {
      conditions.push(eq(wishlistItems.category, category))
    }

    // Query database sorted by sortOrder
    const items = await db
      .select()
      .from(wishlistItems)
      .where(and(...conditions))
      .orderBy(asc(wishlistItems.sortOrder))

    const response = {
      data: items,
      total: items.length,
    }

    // Cache result for 5 minutes
    await redis.setEx(cacheKey, 300, JSON.stringify(response))

    logger.info('Wishlist items retrieved', { userId, category, count: items.length })

    return createSuccessResponse(response)
  } catch (error) {
    logger.error('List wishlist error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to list wishlist items')
  }
}
