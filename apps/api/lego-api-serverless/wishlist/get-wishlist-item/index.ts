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
import { logger } from '@/lib/utils/logger'
import { getUserIdFromEvent } from '@/lib/auth/jwt-utils'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { WishlistItemIdSchema } from '@/lib/validation/wishlist-schemas'
import { db } from '@/lib/db/client'
import { getRedisClient } from '@/lib/cache/redis-client'
import { wishlistItems } from '@/db/schema'

/**
 * Get Wishlist Item Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Extract and validate item ID from path parameters
    const itemId = event.pathParameters?.id
    if (!itemId) {
      return createErrorResponse(400, 'BAD_REQUEST', 'Item ID is required')
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
        return createErrorResponse(
          403,
          'FORBIDDEN',
          'You do not have permission to access this item',
        )
      }
      logger.info('Cache hit', { userId, itemId })
      return createSuccessResponse(item)
    }

    // Query database
    const [item] = await db.select().from(wishlistItems).where(eq(wishlistItems.id, itemId))

    if (!item) {
      return createErrorResponse(404, 'NOT_FOUND', 'Wishlist item not found')
    }

    // Check ownership
    if (item.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'You do not have permission to access this item')
    }

    // Cache result for 10 minutes
    await redis.setEx(cacheKey, 600, JSON.stringify(item))

    logger.info('Wishlist item retrieved', { userId, itemId })

    return createSuccessResponse(item)
  } catch (error) {
    logger.error('Get wishlist item error:', error)
    if (error instanceof Error && error.message.includes('Invalid item ID')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Invalid item ID format')
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get wishlist item')
  }
}
