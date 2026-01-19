/**
 * Create Wishlist Item Lambda Handler
 *
 * POST /api/wishlist
 *
 * Creates a new wishlist item with title, store, and optional metadata.
 * Indexes in OpenSearch and invalidates Redis caches.
 *
 * Updated for Epic 6 PRD data model (wish-2000)
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { ZodError } from 'zod'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { CreateWishlistItemSchema } from '@/endpoints/wishlist/schemas'
import { db } from '@/core/database/client'
import { getRedisClient } from '@/core/cache/redis'
import { indexDocument } from '@/core/search/opensearch'
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
 * Create Wishlist Item Handler
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
    const validatedData = CreateWishlistItemSchema.parse(body)

    // Create item in database
    const [newItem] = await db
      .insert(wishlistItems)
      .values({
        userId,
        title: validatedData.title,
        store: validatedData.store,
        setNumber: validatedData.setNumber || null,
        sourceUrl: validatedData.sourceUrl || null,
        imageUrl: validatedData.imageUrl || null,
        price: validatedData.price || null,
        currency: validatedData.currency,
        pieceCount: validatedData.pieceCount || null,
        releaseDate: validatedData.releaseDate ? new Date(validatedData.releaseDate) : null,
        tags: validatedData.tags,
        priority: validatedData.priority,
        notes: validatedData.notes || null,
        // sortOrder defaults to 0 from schema
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
        store: newItem.store,
        notes: newItem.notes,
        tags: newItem.tags,
        priority: newItem.priority,
        sortOrder: newItem.sortOrder,
        createdAt: newItem.createdAt,
      },
    })

    // Invalidate all user's wishlist caches
    await invalidateWishlistCaches(userId)

    return successResponse(201, newItem, 'Wishlist item created successfully')
  } catch (error) {
    logger.error('Create wishlist item error:', error)
    if (error instanceof ZodError) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    if (error instanceof Error && error.message.includes('Validation')) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to create wishlist item')
  }
}
