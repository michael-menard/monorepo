/**
 * Delete Wishlist Item Lambda Handler
 *
 * DELETE /api/wishlist/:id
 *
 * Deletes wishlist item, removes S3 image if present, and cleans up search index.
 * Invalidates Redis caches.
 *
 * Story 3.6 AC #5: Removes item and S3 image if present
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { eq } from 'drizzle-orm'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@monorepo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { WishlistItemIdSchema } from '@/endpoints/wishlist/schemas'
import { db } from '@/core/database/client'
import { getS3Client } from '@/core/storage/s3'
import { getRedisClient } from '@/core/cache/redis'
import { deleteDocument } from '@/core/search/opensearch'
import { wishlistItems } from '@/core/database/schema'

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
 * Delete Wishlist Item Handler
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

    // Check if item exists and user owns it
    const [existingItem] = await db.select().from(wishlistItems).where(eq(wishlistItems.id, itemId))

    if (!existingItem) {
      return errorResponse(404, 'NOT_FOUND', 'Wishlist item not found')
    }

    if (existingItem.userId !== userId) {
      return errorResponse(403, 'FORBIDDEN', 'You do not have permission to delete this item')
    }

    // Delete S3 image if present
    if (existingItem.imageUrl) {
      try {
        const s3Client = await getS3Client()
        const bucketName = process.env.LEGO_API_BUCKET_NAME

        // Extract key from URL (format: https://bucket.s3.region.amazonaws.com/key)
        const urlParts = existingItem.imageUrl.split('/')
        const key = urlParts.slice(3).join('/')

        if (bucketName && key) {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: bucketName,
              Key: key,
            }),
          )
        }
      } catch (s3Error) {
        logger.error('S3 delete error (non-fatal):', s3Error)
        // Continue with deletion even if S3 fails
      }
    }

    // Delete item from database
    await db.delete(wishlistItems).where(eq(wishlistItems.id, itemId))

    // Delete from OpenSearch
    await deleteDocument({
      index: 'wishlist_items',
      id: itemId,
    })

    // Invalidate all user's wishlist caches
    await invalidateWishlistCaches(userId)

    // Invalidate item cache
    const redis = await getRedisClient()
    await redis.del(`wishlist:item:${itemId}`)

    return successResponse(200, { id: itemId }, 'Wishlist item deleted successfully')
  } catch (error) {
    logger.error('Delete wishlist item error:', error)
    if (error instanceof Error && error.message.includes('Invalid item ID')) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Invalid item ID format')
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to delete wishlist item')
  }
}
