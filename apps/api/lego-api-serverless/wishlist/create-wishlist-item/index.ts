/**
 * Create Wishlist Item Lambda Handler
 *
 * POST /api/wishlist
 *
 * Creates a new wishlist item with title, description, productLink, imageUrl, category, and sortOrder.
 * Indexes in OpenSearch and invalidates Redis caches.
 *
 * Story 3.6 AC #1: Creates item with fields: title, description, productLink, imageUrl, category, sortOrder
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { ZodError } from 'zod'
import { logger } from '@/lib/utils/logger'
import { getUserIdFromEvent } from '@/lib/auth/jwt-utils'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { CreateWishlistItemSchema } from '@/lib/validation/wishlist-schemas'
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
 * Create Wishlist Item Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}')
    const validatedData = CreateWishlistItemSchema.parse(body)

    // Create item in database
    const [newItem] = await db
      .insert(wishlistItems)
      .values({
        userId,
        title: validatedData.title,
        description: validatedData.description || null,
        productLink: validatedData.productLink || null,
        imageUrl: validatedData.imageUrl || null,
        category: validatedData.category || null,
        sortOrder: validatedData.sortOrder,
      })
      .returning()

    // Index in OpenSearch
    await indexDocument({
      index: 'wishlist_items',
      id: newItem.id,
      body: {
        id: newItem.id,
        userId: newItem.userId,
        title: newItem.title,
        description: newItem.description,
        category: newItem.category,
        sortOrder: newItem.sortOrder,
        createdAt: newItem.createdAt,
      },
    })

    // Invalidate all user's wishlist caches
    await invalidateWishlistCaches(userId)

    return createSuccessResponse(newItem, 201, 'Wishlist item created successfully')
  } catch (error) {
    logger.error('Create wishlist item error:', error)
    if (error instanceof ZodError) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to create wishlist item')
  }
}
