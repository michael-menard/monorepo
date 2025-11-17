/**
 * Update Wishlist Item Lambda Handler
 *
 * PATCH /api/wishlist/:id
 *
 * Updates wishlist item metadata with validation.
 * Updates OpenSearch index and invalidates Redis caches.
 *
 * Story 3.6 AC #4: Updates item metadata with validation
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import { getUserIdFromEvent } from '@monorepo/lambda-auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { UpdateWishlistItemSchema, WishlistItemIdSchema } from '@/lib/validation/wishlist-schemas'
import { db } from '@/lib/db/client'
import { getRedisClient } from '@/lib/cache/redis-client'
import { indexDocument } from '@/lib/search/opensearch-client'
import { wishlistItems } from '@/db/schema'

/**
 * Helper function to invalidate all user's wishlist caches
 * Clears both the main list cache and category-specific caches
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
 * Update Wishlist Item Handler
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

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}')
    const validatedData = UpdateWishlistItemSchema.parse(body)

    // Check if item exists and user owns it
    const [existingItem] = await db.select().from(wishlistItems).where(eq(wishlistItems.id, itemId))

    if (!existingItem) {
      return createErrorResponse(404, 'NOT_FOUND', 'Wishlist item not found')
    }

    if (existingItem.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'You do not have permission to update this item')
    }

    // Update item in database
    const [updatedItem] = await db
      .update(wishlistItems)
      .set({
        title: validatedData.title ?? existingItem.title,
        description:
          validatedData.description !== undefined
            ? validatedData.description
            : existingItem.description,
        productLink:
          validatedData.productLink !== undefined
            ? validatedData.productLink
            : existingItem.productLink,
        imageUrl:
          validatedData.imageUrl !== undefined ? validatedData.imageUrl : existingItem.imageUrl,
        category:
          validatedData.category !== undefined ? validatedData.category : existingItem.category,
        sortOrder: validatedData.sortOrder ?? existingItem.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(wishlistItems.id, itemId))
      .returning()

    // Update in OpenSearch
    await indexDocument({
      index: 'wishlist_items',
      id: updatedItem.id,
      body: {
        id: updatedItem.id,
        userId: updatedItem.userId,
        title: updatedItem.title,
        description: updatedItem.description,
        category: updatedItem.category,
        sortOrder: updatedItem.sortOrder,
        createdAt: updatedItem.createdAt,
      },
    })

    // Invalidate all user's wishlist caches
    await invalidateWishlistCaches(userId)

    // Invalidate item cache
    const redis = await getRedisClient()
    await redis.del(`wishlist:item:${itemId}`)

    return createSuccessResponse(updatedItem, 200, 'Wishlist item updated successfully')
  } catch (error) {
    logger.error('Update wishlist item error:', error)
    if (
      error instanceof Error &&
      (error.message.includes('Validation') || error.message.includes('Invalid item ID'))
    ) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to update wishlist item')
  }
}
