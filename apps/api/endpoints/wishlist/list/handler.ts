/**
 * List Wishlist Items Lambda Handler
 *
 * GET /api/wishlist
 *
 * Returns all wishlist items for authenticated user, sorted by sortOrder.
 * Optional store and priority filters supported.
 * Results cached in Redis for 5 minutes.
 *
 * Updated for Epic 6 PRD data model (wish-2000)
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq, and, asc } from 'drizzle-orm'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { ListWishlistQuerySchema } from '@/endpoints/wishlist/schemas'
import { db } from '@/core/database/client'
import { getRedisClient } from '@/core/cache/redis'
import { wishlistItems } from '@/core/database/schema'

/**
 * Main Lambda Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Validate query parameters
    const queryParams = ListWishlistQuerySchema.parse(event.queryStringParameters || {})
    const { store, priority } = queryParams

    // Generate cache key
    let cacheKey = `wishlist:user:${userId}:all`
    if (store) cacheKey = `wishlist:user:${userId}:store:${store}`
    if (priority !== undefined) cacheKey = `${cacheKey}:priority:${priority}`

    // Check Redis cache
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) {
      logger.info('Cache hit', { userId, store, priority })
      return successResponse(JSON.parse(cached))
    }

    // Build query conditions
    const conditions = [eq(wishlistItems.userId, userId)]
    if (store) {
      conditions.push(eq(wishlistItems.store, store))
    }
    if (priority !== undefined) {
      conditions.push(eq(wishlistItems.priority, priority))
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

    logger.info('Wishlist items retrieved', { userId, store, priority, count: items.length })

    return successResponse(response)
  } catch (error) {
    logger.error('List wishlist error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to list wishlist items')
  }
}
