/**
 * Wishlist Lambda Handler
 *
 * Handles wishlist operations including CRUD operations, image upload, and reordering.
 * Uses S3 for storage, Redis for caching, OpenSearch for search indexing.
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { ZodError } from 'zod'
import { getUserIdFromEvent } from '@/lib/auth/jwt-utils'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import {
  CreateWishlistItemSchema,
  UpdateWishlistItemSchema,
  ReorderWishlistSchema,
  ListWishlistQuerySchema,
  WishlistItemIdSchema,
} from '@/lib/validation/wishlist-schemas'
import { db } from '@/lib/db/client'
import { getS3Client } from '@/lib/storage/s3-client'
import { getRedisClient } from '@/lib/cache/redis-client'
import { indexDocument, deleteDocument } from '@/lib/search/opensearch-client'
import { wishlistItems } from '@/db/schema'
import { eq, and, asc, inArray } from 'drizzle-orm'
import { parseMultipartForm, getFile } from '@/lib/utils/multipart-parser'
import { uploadImage, ImageUploadOptionsSchema } from '@/lib/services/image-upload-service'

/**
 * Main Wishlist Lambda Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract route information
    const method = event.requestContext.http.method
    const path = event.requestContext.http.path
    const pathParams = event.pathParameters || {}

    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Route to appropriate handler
    if (path === '/api/wishlist' && method === 'GET') {
      return handleListWishlist(event, userId)
    }

    if (path === '/api/wishlist' && method === 'POST') {
      return handleCreateWishlistItem(event, userId)
    }

    if (path.startsWith('/api/wishlist/') && method === 'GET' && !path.includes('/image')) {
      return handleGetWishlistItem(event, userId, pathParams.id!)
    }

    if (path.startsWith('/api/wishlist/') && method === 'PATCH') {
      return handleUpdateWishlistItem(event, userId, pathParams.id!)
    }

    if (path.startsWith('/api/wishlist/') && method === 'DELETE') {
      return handleDeleteWishlistItem(event, userId, pathParams.id!)
    }

    if (path === '/api/wishlist/reorder' && method === 'POST') {
      return handleReorderWishlist(event, userId)
    }

    if (path.includes('/image') && method === 'POST') {
      return handleUploadWishlistImage(event, userId, pathParams.id!)
    }

    return createErrorResponse(404, 'NOT_FOUND', 'Route not found')
  } catch (error) {
    console.error('Wishlist handler error:', error)
    return createErrorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred')
  }
}

/**
 * GET /api/wishlist - List wishlist items
 * Story 3.6 AC #2: Returns all user's items sorted by sortOrder with optional category filter
 * Story 3.6 AC #8: Redis caching with pattern: wishlist:user:{userId}:all
 */
async function handleListWishlist(
  event: APIGatewayProxyEventV2,
  userId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    // Validate query parameters
    const queryParams = ListWishlistQuerySchema.parse(event.queryStringParameters || {})
    const { category } = queryParams

    // Generate cache key
    const cacheKey = category
      ? `wishlist:user:${userId}:category:${category}`
      : `wishlist:user:${userId}:all`

    // Check Redis cache
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) {
      return createSuccessResponse(JSON.parse(cached))
    }

    // Build query conditions
    const conditions = [eq(wishlistItems.userId, userId)]
    if (category) {
      conditions.push(eq(wishlistItems.category, category))
    }

    // Query database sorted by sortOrder
    const items = await db
      .select()
      .from(wishlistItems)
      .where(and(...conditions))
      .orderBy(asc(wishlistItems.sortOrder))

    const response = {
      data: items,
      total: items.length,
    }

    // Cache result for 5 minutes
    await redis.setEx(cacheKey, 300, JSON.stringify(response))

    return createSuccessResponse(response)
  } catch (error) {
    console.error('List wishlist error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to list wishlist items')
  }
}

/**
 * POST /api/wishlist - Create wishlist item
 * Story 3.6 AC #1: Creates item with fields: title, description, productLink, imageUrl, category, sortOrder
 */
async function handleCreateWishlistItem(
  event: APIGatewayProxyEventV2,
  userId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
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
    console.error('Create wishlist item error:', error)
    if (error instanceof ZodError) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to create wishlist item')
  }
}

/**
 * GET /api/wishlist/:id - Get single wishlist item
 * Story 3.6 AC #3: Returns single item with ownership check
 */
async function handleGetWishlistItem(
  _event: APIGatewayProxyEventV2,
  userId: string,
  itemId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    // Validate item ID
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
        return createErrorResponse(403, 'FORBIDDEN', 'You do not have permission to access this item')
      }
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

    return createSuccessResponse(item)
  } catch (error) {
    console.error('Get wishlist item error:', error)
    if (error instanceof Error && error.message.includes('Invalid item ID')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Invalid item ID format')
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get wishlist item')
  }
}

/**
 * PATCH /api/wishlist/:id - Update wishlist item
 * Story 3.6 AC #4: Updates item metadata with validation
 */
async function handleUpdateWishlistItem(
  event: APIGatewayProxyEventV2,
  userId: string,
  itemId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    // Validate item ID
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
        description: validatedData.description !== undefined ? validatedData.description : existingItem.description,
        productLink: validatedData.productLink !== undefined ? validatedData.productLink : existingItem.productLink,
        imageUrl: validatedData.imageUrl !== undefined ? validatedData.imageUrl : existingItem.imageUrl,
        category: validatedData.category !== undefined ? validatedData.category : existingItem.category,
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
    console.error('Update wishlist item error:', error)
    if (error instanceof Error && (error.message.includes('Validation') || error.message.includes('Invalid item ID'))) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to update wishlist item')
  }
}

/**
 * DELETE /api/wishlist/:id - Delete wishlist item
 * Story 3.6 AC #5: Removes item and S3 image if present
 */
async function handleDeleteWishlistItem(
  _event: APIGatewayProxyEventV2,
  userId: string,
  itemId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    // Validate item ID
    WishlistItemIdSchema.parse({ id: itemId })

    // Check if item exists and user owns it
    const [existingItem] = await db.select().from(wishlistItems).where(eq(wishlistItems.id, itemId))

    if (!existingItem) {
      return createErrorResponse(404, 'NOT_FOUND', 'Wishlist item not found')
    }

    if (existingItem.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'You do not have permission to delete this item')
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
        console.error('S3 delete error (non-fatal):', s3Error)
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

    return createSuccessResponse({ id: itemId }, 200, 'Wishlist item deleted successfully')
  } catch (error) {
    console.error('Delete wishlist item error:', error)
    if (error instanceof Error && error.message.includes('Invalid item ID')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Invalid item ID format')
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to delete wishlist item')
  }
}

/**
 * POST /api/wishlist/reorder - Reorder wishlist items
 * Story 3.6 AC #6: Updates sortOrder for multiple items in batch transaction
 */
async function handleReorderWishlist(
  event: APIGatewayProxyEventV2,
  userId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    // Parse and validate request body
    const body = JSON.parse(event.body || '{}')
    const validatedData = ReorderWishlistSchema.parse(body)

    // Verify all items belong to user before updating
    const itemIds = validatedData.items.map((item) => item.id)
    const existingItems = await db
      .select()
      .from(wishlistItems)
      .where(and(eq(wishlistItems.userId, userId), inArray(wishlistItems.id, itemIds)))

    if (existingItems.length !== itemIds.length) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'One or more items not found or not owned by user')
    }

    // Update items in transaction
    await db.transaction(async (tx) => {
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
    await Promise.all(itemIds.map((id) => redis.del(`wishlist:item:${id}`)))

    return createSuccessResponse(
      { updated: itemIds.length },
      200,
      'Wishlist items reordered successfully',
    )
  } catch (error) {
    console.error('Reorder wishlist error:', error)
    if (error instanceof ZodError) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to reorder wishlist items')
  }
}

/**
 * POST /api/wishlist/:id/image - Upload wishlist item image
 * Story 3.7: Image upload with Sharp processing
 *
 * Features:
 * - Validates image (JPEG/PNG/WebP, max 5MB)
 * - Processes with Sharp (resize to 800px, convert to WebP, 80% quality)
 * - Uploads to S3: wishlist/{userId}/{itemId}.webp
 * - Deletes previous image if exists
 * - Updates database imageUrl field
 * - Invalidates Redis caches
 */
async function handleUploadWishlistImage(
  event: APIGatewayProxyEventV2,
  userId: string,
  itemId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    // Validate item ID
    WishlistItemIdSchema.parse({ id: itemId })

    // Check if item exists and verify ownership
    const [existingItem] = await db.select().from(wishlistItems).where(eq(wishlistItems.id, itemId))

    if (!existingItem) {
      return createErrorResponse(404, 'NOT_FOUND', 'Wishlist item not found')
    }

    if (existingItem.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'You do not have permission to upload images for this item')
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
    console.error('Upload wishlist image error:', error)

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
      await Promise.all(keys.map((key) => redis.del(key)))
    }
  } catch (error) {
    console.error('Cache invalidation error (non-fatal):', error)
    // Non-fatal error - don't throw
  }
}
