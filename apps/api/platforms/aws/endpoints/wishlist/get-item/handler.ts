/**
 * Get Wishlist Item Lambda Handler
 *
 * GET /api/wishlist/:id
 *
 * Returns a single wishlist item with ownership verification.
 * Results cached in Redis for 10 minutes.
 *
 * Story 3.6 AC #3: Returns single item with ownership check
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq } from 'drizzle-orm'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { logger } from '@/core/observability/logger'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { WishlistItemIdSchema } from '@/endpoints/wishlist/schemas'
import { db } from '@/core/database/client'
import { getRedisClient } from '@/core/cache/redis'
import { wishlistItems } from '@/core/database/schema'

/**
 * Get Wishlist Item Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Extract and validate item ID from path parameters
    const itemId = event.pathParameters?.id
    if (!itemId) {
      return errorResponse(400, 'BAD_REQUEST', 'Item ID is required')
    }

    WishlistItemIdSchema.parse({ id: itemId })

    // Generate cache key
    const cacheKey = `wishlist:item:${itemId}`

    // Check Redis cache
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) {
      const item = JSON.parse(cached)
      // Verify ownership
      if (item.userId !== userId) {
        return errorResponse(403, 'FORBIDDEN', 'You do not have permission to access this item')
      }
      logger.info('Cache hit', { userId, itemId })
      return successResponse(item)
    }

    // Query database
    const [item] = await db.select().from(wishlistItems).where(eq(wishlistItems.id, itemId))

    if (!item) {
      return errorResponse(404, 'NOT_FOUND', 'Wishlist item not found')
    }

    // Check ownership
    if (item.userId !== userId) {
      return errorResponse(403, 'FORBIDDEN', 'You do not have permission to access this item')
    }

    // Cache result for 10 minutes
    await redis.setEx(cacheKey, 600, JSON.stringify(item))

    logger.info('Wishlist item retrieved', { userId, itemId })

    return successResponse(item)
  } catch (error) {
    logger.error('Get wishlist item error:', error)
    if (error instanceof Error && error.message.includes('Invalid item ID')) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Invalid item ID format')
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to get wishlist item')
  }
}
