/**
 * Mark Wishlist Item As Purchased Lambda Handler
 *
 * POST /api/wishlist/:id/purchased
 *
 * Marks a wishlist item as purchased, optionally creating a Set record.
 * Removes item from wishlist unless keepOnWishlist is true.
 *
 * Story wish-2004: Got It Flow Modal
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq } from 'drizzle-orm'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import {
  WishlistItemIdSchema,
  MarkPurchasedRequestSchema,
} from '@/endpoints/wishlist/schemas'
import { db } from '@/core/database/client'
import { getRedisClient } from '@/core/cache/redis'
import { deleteDocument } from '@/core/search/opensearch'
import { wishlistItems } from '@/core/database/schema'

/**
 * Helper function to invalidate all user's wishlist caches
 */
async function invalidateWishlistCaches(userId: string): Promise<void> {
  try {
    const redis = await getRedisClient()
    const pattern = `wishlist:user:${userId}:*`
    const keys = await redis.keys(pattern)

    if (keys.length > 0) {
      await Promise.all(keys.map(key => redis.del(key)))
    }
  } catch (error) {
    logger.error('Cache invalidation error (non-fatal):', error)
  }
}

/**
 * Generate an undo token that expires in 5 seconds
 * Token format: base64(itemId:userId:expiry)
 */
function generateUndoToken(itemId: string, userId: string): string {
  const expiry = Date.now() + 5000 // 5 seconds
  const payload = `${itemId}:${userId}:${expiry}`
  return Buffer.from(payload).toString('base64')
}

/**
 * Mark Wishlist Item As Purchased Handler
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

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}')
    const validatedData = MarkPurchasedRequestSchema.parse(body)

    // Check if item exists and user owns it
    const [existingItem] = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.id, itemId))

    if (!existingItem) {
      return errorResponse(404, 'NOT_FOUND', 'Wishlist item not found')
    }

    if (existingItem.userId !== userId) {
      return errorResponse(403, 'FORBIDDEN', 'You do not have permission to modify this item')
    }

    let newSetId: string | null = null

    // Try to create Set record if Sets API is available
    // This is a placeholder - actual implementation depends on Sets API
    try {
      // TODO: When Sets API is available (Epic 7), create a Set record:
      // newSetId = await createSetFromWishlist(existingItem, validatedData)
      logger.info('Would create Set from wishlist item:', {
        wishlistItemId: existingItem.id,
        title: existingItem.title,
        setNumber: existingItem.setNumber,
        purchasePrice: validatedData.purchasePrice,
        quantity: validatedData.quantity,
      })
    } catch {
      // Sets API not available - continue anyway
      logger.info('Sets API not available, skipping Set creation')
    }

    let undoToken: string | undefined

    // Remove from wishlist if not keeping
    if (!validatedData.keepOnWishlist) {
      // Generate undo token before deletion
      undoToken = generateUndoToken(itemId, userId)

      // Store undo data in Redis with 5-second TTL
      try {
        const redis = await getRedisClient()
        await redis.set(
          `wishlist:undo:${itemId}`,
          JSON.stringify({
            item: existingItem,
            purchaseData: validatedData,
            newSetId,
          }),
          { EX: 5 }, // 5 second expiry
        )
      } catch (redisError) {
        logger.error('Failed to store undo data (non-fatal):', redisError)
        // Continue without undo capability
        undoToken = undefined
      }

      // Delete from database
      await db.delete(wishlistItems).where(eq(wishlistItems.id, itemId))

      // Delete from OpenSearch
      await deleteDocument({
        index: 'wishlist_items',
        id: itemId,
      })

      // Invalidate caches
      await invalidateWishlistCaches(userId)

      const redis = await getRedisClient()
      await redis.del(`wishlist:item:${itemId}`)
    }

    return successResponse(200, {
      message: 'Item marked as purchased',
      newSetId,
      removedFromWishlist: !validatedData.keepOnWishlist,
      undoToken,
    })
  } catch (error) {
    logger.error('Mark as purchased error:', error)
    if (error instanceof Error && error.message.includes('Invalid')) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to mark item as purchased')
  }
}
