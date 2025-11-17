/**
 * Upload Wishlist Image Lambda Handler
 *
 * POST /api/wishlist/:id/image
 *
 * Uploads wishlist item image with Sharp processing:
 * - Validates image (JPEG/PNG/WebP, max 5MB)
 * - Processes with Sharp (resize to 800px, convert to WebP, 80% quality)
 * - Uploads to S3: wishlist/{userId}/{itemId}.webp
 * - Deletes previous image if exists
 * - Updates database imageUrl field
 * - Invalidates Redis caches
 *
 * Story 3.7: Image upload with Sharp processing
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
import { parseMultipartForm, getFile } from '@/lib/utils/multipart-parser'
import { uploadImage, ImageUploadOptionsSchema } from '@/lib/services/image-upload-service'

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
 * Upload Wishlist Image Handler
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

    // Check if item exists and verify ownership
    const [existingItem] = await db.select().from(wishlistItems).where(eq(wishlistItems.id, itemId))

    if (!existingItem) {
      return createErrorResponse(404, 'NOT_FOUND', 'Wishlist item not found')
    }

    if (existingItem.userId !== userId) {
      return createErrorResponse(
        403,
        'FORBIDDEN',
        'You do not have permission to upload images for this item',
      )
    }

    // Parse multipart form data
    const formData = await parseMultipartForm(event)
    const file = getFile(formData)

    if (!file) {
      return createErrorResponse(400, 'BAD_REQUEST', 'No file uploaded')
    }

    // Upload image using shared upload service
    // Parse and validate upload options through Zod schema
    const uploadOptions = ImageUploadOptionsSchema.parse({
      maxFileSize: 5 * 1024 * 1024, // 5MB (smaller than gallery)
      maxWidth: 800, // 800px (smaller than gallery's 2048px)
      quality: 80,
      generateThumbnail: false, // No thumbnails for wishlist
      s3KeyPrefix: 'wishlist',
      previousImageUrl: existingItem.imageUrl, // Delete old image if exists
      uploadType: 'wishlist', // For CloudWatch metrics
      useMultipartUpload: false, // Not needed for small wishlist images
    })

    const uploadResult = await uploadImage(
      {
        fieldname: 'file',
        filename: file.filename,
        encoding: file.encoding || '7bit',
        mimetype: file.mimetype,
        buffer: file.buffer,
      },
      userId,
      itemId,
      uploadOptions,
    )

    // Update database with new image URL and dimensions
    await db
      .update(wishlistItems)
      .set({
        imageUrl: uploadResult.imageUrl,
        imageWidth: uploadResult.width,
        imageHeight: uploadResult.height,
        updatedAt: new Date(),
      })
      .where(eq(wishlistItems.id, itemId))

    // Invalidate all user's wishlist caches
    await invalidateWishlistCaches(userId)

    // Invalidate item cache
    const redis = await getRedisClient()
    await redis.del(`wishlist:item:${itemId}`)

    return createSuccessResponse(
      {
        imageUrl: uploadResult.imageUrl,
      },
      200,
      'Wishlist image uploaded successfully',
    )
  } catch (error) {
    logger.error('Upload wishlist image error:', error)

    if (error instanceof Error) {
      // File validation errors
      if (
        error.message.includes('Validation') ||
        error.message.includes('Invalid') ||
        error.message.includes('exceeds') ||
        error.message.includes('file type')
      ) {
        return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
      }

      // Image processing errors
      if (error.message.includes('Image processing') || error.message.includes('Sharp')) {
        return createErrorResponse(400, 'FILE_ERROR', error.message)
      }

      // Multipart parsing errors
      if (error.message.includes('multipart')) {
        return createErrorResponse(400, 'BAD_REQUEST', 'Invalid multipart form data')
      }
    }

    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to upload wishlist image')
  }
}
