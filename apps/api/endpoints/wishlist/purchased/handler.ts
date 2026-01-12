import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { and, eq } from 'drizzle-orm'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { db } from '@/core/database/client'
import { getRedisClient } from '@/core/cache/redis'
import { wishlistItems } from '@/core/database/schema'
import {
  MarkWishlistItemPurchasedSchema,
  WishlistItemIdSchema,
  type MarkWishlistItemPurchasedRequest,
} from '@/endpoints/wishlist/schemas'
import { createSet } from '@/endpoints/sets/_shared/sets-service'

/**
 * Helper function to invalidate all user's wishlist caches
 * Mirrors the pattern used in other wishlist handlers.
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

interface MarkPurchasedResponse {
  message: string
  newSetId: string | null
  removedFromWishlist: boolean
}

/**
 * Mark Wishlist Item Purchased Handler
 *
 * POST /api/wishlist/:id/purchased
 */
export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    const itemId = event.pathParameters?.id
    if (!itemId) {
      return errorResponse(400, 'BAD_REQUEST', 'Item ID is required')
    }

    WishlistItemIdSchema.parse({ id: itemId })

    if (!event.body) {
      return errorResponse(400, 'BAD_REQUEST', 'Request body is required')
    }

    const parsedBody = JSON.parse(event.body) as unknown
    const purchaseData: MarkWishlistItemPurchasedRequest =
      MarkWishlistItemPurchasedSchema.parse(parsedBody)

    const [existingItem] = await db
      .select()
      .from(wishlistItems)
      .where(and(eq(wishlistItems.id, itemId), eq(wishlistItems.userId, userId)))

    if (!existingItem) {
      return errorResponse(404, 'NOT_FOUND', 'Wishlist item not found')
    }

    // Create a Set record from the wishlist item and purchase data.
    // This uses the shared sets-service so we keep all validation and defaults
    // in one place.
    let newSetId: string | null = null

    try {
      const createdSet = await createSet(userId, {
        title: existingItem.title,
        description: existingItem.notes ?? undefined,
        theme: undefined,
        tags: existingItem.tags ?? [],
        partsCount: existingItem.pieceCount ?? undefined,
        isBuilt: false,
        quantity: purchaseData.quantity,
        brand: existingItem.store ?? undefined,
        setNumber: existingItem.setNumber ?? undefined,
        releaseYear: undefined,
        retired: undefined,
        store: existingItem.store ?? undefined,
        sourceUrl: existingItem.sourceUrl ?? undefined,
        purchasePrice:
          purchaseData.purchasePrice !== undefined
            ? purchaseData.purchasePrice.toFixed(2)
            : existingItem.price ?? undefined,
        tax:
          purchaseData.purchaseTax !== undefined
            ? purchaseData.purchaseTax.toFixed(2)
            : undefined,
        shipping:
          purchaseData.purchaseShipping !== undefined
            ? purchaseData.purchaseShipping.toFixed(2)
            : undefined,
        purchaseDate: purchaseData.purchaseDate,
      })

      newSetId = createdSet.id

      logger.info('Created Set from wishlist purchase', {
        userId,
        itemId,
        newSetId,
      })
    } catch (setError) {
      // If Sets API fails, we still mark the item as purchased in wishlist
      // and continue. Frontend can use newSetId === null as a signal.
      logger.error('Failed to create Set from wishlist purchase (non-fatal)', {
        userId,
        itemId,
        error: setError,
      })
    }

    let removedFromWishlist = false

    if (!purchaseData.keepOnWishlist) {
      await db.delete(wishlistItems).where(eq(wishlistItems.id, itemId))
      removedFromWishlist = true
    }

    await invalidateWishlistCaches(userId)

    const redis = await getRedisClient()
    await redis.del(`wishlist:item:${itemId}`)

    const response: MarkPurchasedResponse = {
      message: 'Wishlist item marked as purchased',
      newSetId,
      removedFromWishlist,
    }

    return successResponse(200, response, response.message)
  } catch (error) {
    logger.error('Mark wishlist item purchased error:', error)

    if (error instanceof Error && error.message.includes('Invalid item ID')) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Invalid item ID format')
    }

    if (error instanceof Error && error.message.includes('Validation')) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }

    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to mark wishlist item as purchased')
  }
}
