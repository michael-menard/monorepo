/**
 * Reorder Wishlist Items Lambda Handler
 *
 * POST /api/wishlist/reorder
 *
 * Updates sortOrder for multiple wishlist items in a batch transaction.
 * Verifies ownership and invalidates Redis caches.
 *
 * Updated for Epic 6 PRD data model (wish-2000)
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { ZodError } from 'zod'
import { eq, and, inArray } from 'drizzle-orm'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { ReorderWishlistSchema } from '@/endpoints/wishlist/schemas'
import { db } from '@/core/database/client'
import { getRedisClient } from '@/core/cache/redis'
import { wishlistItems } from '@/core/database/schema'

/**
 * Helper function to invalidate all user's wishlist caches
 * Clears both the main list cache and store-specific caches
 */
async function invalidateWishlistCaches(userId: string): Promise<void> {
  try {
    const redis = await getRedisClient()

    // Delete all keys matching the pattern wishlist:user:{userId}:*
    const pattern = `wishlist:user:${userId}:*`
    const keys = await redis.keys(pattern)

    if (keys.length > 0) {
      // Delete keys in batch
      await Promise.all(keys.map(key => redis.del(key)))
    }
  } catch (error) {
    logger.error('Cache invalidation error (non-fatal):', error)
    // Non-fatal error - don't throw
  }
}

/**
 * Reorder Wishlist Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}')
    const validatedData = ReorderWishlistSchema.parse(body)

    // Verify all items belong to user before updating
    const itemIds = validatedData.items.map(item => item.id)
    const existingItems = await db
      .select()
      .from(wishlistItems)
      .where(and(eq(wishlistItems.userId, userId), inArray(wishlistItems.id, itemIds)))

    if (existingItems.length !== itemIds.length) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'One or more items not found or not owned by user',
      )
    }

    // Update items in transaction
    await db.transaction(async tx => {
      for (const item of validatedData.items) {
        await tx
          .update(wishlistItems)
          .set({
            sortOrder: item.sortOrder,
            updatedAt: new Date(),
          })
          .where(and(eq(wishlistItems.id, item.id), eq(wishlistItems.userId, userId)))
      }
    })

    // Invalidate all user's wishlist caches
    await invalidateWishlistCaches(userId)

    // Invalidate individual item caches
    const redis = await getRedisClient()
    await Promise.all(itemIds.map(id => redis.del(`wishlist:item:${id}`)))

    return successResponse(
      200,
      { updated: itemIds.length },
      'Wishlist items reordered successfully',
    )
  } catch (error) {
    logger.error('Reorder wishlist error:', error)
    if (error instanceof ZodError) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    if (error instanceof Error && error.message.includes('Validation')) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to reorder wishlist items')
  }
}
