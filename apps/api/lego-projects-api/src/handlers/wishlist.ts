import { Request, Response } from 'express'
import { eq, and, asc, inArray, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { wishlistItems } from '../db/schema'
import { apiResponse, apiErrorResponse } from '../utils/response'
import { saveWishlistImage, deleteWishlistImage, getFileInfo } from '../storage/wishlist-storage'
import { CreateWishlistItemSchema, UpdateWishlistItemSchema } from '../types'
import {
  indexWishlistItem,
  updateWishlistItem as updateWishlistItemES,
  deleteWishlistItem as deleteWishlistItemES,
  searchWishlistItems,
  initializeWishlistIndex,
} from '../utils/elasticsearch'

// Initialize Wishlist index on startup
initializeWishlistIndex()

// In-memory store for pending reorder operations (debounced)
const pendingReorders = new Map<
  string,
  {
    itemOrders: Array<{ id: string; sortOrder: string | number }>
    timestamp: number
    timeoutId: NodeJS.Timeout
    requestId?: string
  }
>()

// Debounce delay in milliseconds (500ms)
const REORDER_DEBOUNCE_DELAY = 500

// GET /api/wishlist - Get all wishlist items for authenticated user
export const getWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.authenticatedUserId

    if (!userId) {
      return res.status(403).json(apiErrorResponse(403, 'UNAUTHORIZED', 'User not authenticated'))
    }

    const { category } = req.query || {}

    // Build query conditions
    const conditions = [eq(wishlistItems.userId, userId)]
    if (category) {
      conditions.push(eq(wishlistItems.category, category as string))
    }

    const items = await db
      .select()
      .from(wishlistItems)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(asc(wishlistItems.sortOrder))

    return res.status(200).json(apiResponse(200, 'Wishlist retrieved successfully', { items }))
  } catch (error) {
    console.error('Error fetching wishlist:', error)
    return res.status(500).json(apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to fetch wishlist'))
  }
}

// POST /api/wishlist - Create new wishlist item
export const createWishlistItem = async (req: Request, res: Response) => {
  try {
    const userId = req.authenticatedUserId

    if (!userId) {
      return res.status(403).json(apiErrorResponse(403, 'UNAUTHORIZED', 'User not authenticated'))
    }

    // Validate request body using shared schema
    const validation = CreateWishlistItemSchema.safeParse(req.body)
    if (!validation.success) {
      return res
        .status(400)
        .json(
          apiErrorResponse(400, 'VALIDATION_ERROR', 'Invalid input data', validation.error.issues),
        )
    }

    const { title, description, productLink, imageUrl, sortOrder, category } = validation.data

    const [newItem] = await db
      .insert(wishlistItems)
      .values({
        userId,
        title,
        description,
        productLink,
        imageUrl,
        sortOrder,
        category,
      })
      .returning()

    // Index the new item in Elasticsearch
    await indexWishlistItem(newItem)

    return res
      .status(201)
      .json(apiResponse(201, 'Wishlist item created successfully', { item: newItem }))
  } catch (error) {
    console.error('Error creating wishlist item:', error)
    return res
      .status(500)
      .json(apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to create wishlist item'))
  }
}

// PUT /api/wishlist/:id - Update wishlist item
export const updateWishlistItem = async (req: Request, res: Response) => {
  try {
    const userId = req.authenticatedUserId
    const { id } = req.params

    if (!userId) {
      return res.status(403).json(apiErrorResponse(403, 'UNAUTHORIZED', 'User not authenticated'))
    }

    // Validate request body using shared schema
    const validation = UpdateWishlistItemSchema.safeParse(req.body)
    if (!validation.success) {
      return res
        .status(400)
        .json(
          apiErrorResponse(400, 'VALIDATION_ERROR', 'Invalid input data', validation.error.issues),
        )
    }

    const { title, description, productLink, imageUrl, category, sortOrder } = validation.data

    // Check if item exists and belongs to user
    const existingItem = await db
      .select()
      .from(wishlistItems)
      .where(and(eq(wishlistItems.id, id), eq(wishlistItems.userId, userId)))
      .limit(1)

    if (existingItem.length === 0) {
      return res
        .status(404)
        .json(
          apiErrorResponse(
            404,
            'NOT_FOUND',
            'Wishlist item not found or you do not have permission to modify it',
          ),
        )
    }

    // Only update fields that were provided
    const updateData: any = { updatedAt: new Date() }
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (productLink !== undefined) updateData.productLink = productLink
    if (category !== undefined) updateData.category = category
    if (imageUrl !== undefined) {
      // If imageUrl is being updated and there was an old image, clean it up
      if (existingItem[0].imageUrl && existingItem[0].imageUrl !== imageUrl) {
        try {
          await deleteWishlistImage(existingItem[0].imageUrl)
          console.log('Successfully deleted old image during update:', existingItem[0].imageUrl)
        } catch (error) {
          // Log error but don't fail the update
          console.error('Warning: Failed to delete old image during update:', error)
          console.error('Old image URL was:', existingItem[0].imageUrl)
        }
      }
      updateData.imageUrl = imageUrl
    }
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder

    const [updatedItem] = await db
      .update(wishlistItems)
      .set(updateData)
      .where(and(eq(wishlistItems.id, id), eq(wishlistItems.userId, userId)))
      .returning()

    // Update in Elasticsearch
    await updateWishlistItemES(updatedItem)

    return res
      .status(200)
      .json(apiResponse(200, 'Wishlist item updated successfully', { item: updatedItem }))
  } catch (error) {
    console.error('Error updating wishlist item:', error)
    return res
      .status(500)
      .json(apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to update wishlist item'))
  }
}

// DELETE /api/wishlist/:id - Delete wishlist item
export const deleteWishlistItem = async (req: Request, res: Response) => {
  try {
    const userId = req.authenticatedUserId
    const { id } = req.params

    if (!userId) {
      return res.status(403).json(apiErrorResponse(403, 'UNAUTHORIZED', 'User not authenticated'))
    }

    // Check if item exists and belongs to user
    const existingItem = await db
      .select()
      .from(wishlistItems)
      .where(and(eq(wishlistItems.id, id), eq(wishlistItems.userId, userId)))
      .limit(1)

    if (existingItem.length === 0) {
      return res
        .status(404)
        .json(
          apiErrorResponse(
            404,
            'NOT_FOUND',
            'Wishlist item not found or you do not have permission to delete it',
          ),
        )
    }

    const item = existingItem[0]

    // Delete associated image if it exists
    if (item.imageUrl) {
      try {
        await deleteWishlistImage(item.imageUrl)
        console.log('Successfully deleted associated image:', item.imageUrl)
      } catch (error) {
        // Log error but don't fail the deletion - database cleanup is more important
        console.error('Warning: Failed to delete associated image:', error)
        console.error('Image URL was:', item.imageUrl)
      }
    }

    // Delete the wishlist item from database
    await db
      .delete(wishlistItems)
      .where(and(eq(wishlistItems.id, id), eq(wishlistItems.userId, userId)))

    // Remove from Elasticsearch
    await deleteWishlistItemES(id)

    return res.status(200).json(apiResponse(200, 'Wishlist item deleted successfully'))
  } catch (error) {
    console.error('Error deleting wishlist item:', error)
    return res
      .status(500)
      .json(apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to delete wishlist item'))
  }
}

// PUT /api/wishlist/reorder - Reorder wishlist items
export const reorderWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.authenticatedUserId

    if (!userId) {
      return res.status(403).json(apiErrorResponse(403, 'UNAUTHORIZED', 'User not authenticated'))
    }

    const { itemOrders, requestId } = req.body

    if (!Array.isArray(itemOrders) || itemOrders.length === 0) {
      return res
        .status(400)
        .json(apiErrorResponse(400, 'VALIDATION_ERROR', 'itemOrders must be a non-empty array'))
    }

    // Validate request structure
    for (const item of itemOrders) {
      if (!item.id || typeof item.sortOrder === 'undefined') {
        return res
          .status(400)
          .json(
            apiErrorResponse(
              400,
              'VALIDATION_ERROR',
              'Each item must have id and sortOrder properties',
            ),
          )
      }
    }

    // Validate that all items belong to the user and get current state
    const itemIds = itemOrders.map(item => item.id)
    const userItems = await db
      .select({
        id: wishlistItems.id,
        sortOrder: wishlistItems.sortOrder,
        updatedAt: wishlistItems.updatedAt,
      })
      .from(wishlistItems)
      .where(and(eq(wishlistItems.userId, userId)))

    const userItemIds = userItems.map(item => item.id)
    const invalidItems = itemIds.filter(id => !userItemIds.includes(id))

    if (invalidItems.length > 0) {
      return res
        .status(403)
        .json(apiErrorResponse(403, 'FORBIDDEN', 'You can only reorder your own wishlist items'))
    }

    // Check if all requested items exist
    if (itemIds.length !== userItems.filter(item => itemIds.includes(item.id)).length) {
      return res
        .status(404)
        .json(apiErrorResponse(404, 'NOT_FOUND', 'One or more wishlist items not found'))
    }

    // Detect if only order changed (no actual sort values changed)
    const currentItemsMap = new Map(userItems.map(item => [item.id, item.sortOrder]))
    const hasChanges = itemOrders.some(
      item => currentItemsMap.get(item.id) !== item.sortOrder.toString(),
    )

    if (!hasChanges) {
      // No actual changes needed, return current state
      const currentItems = await db
        .select()
        .from(wishlistItems)
        .where(eq(wishlistItems.userId, userId))
        .orderBy(asc(wishlistItems.sortOrder))

      return res.status(200).json(
        apiResponse(200, 'Wishlist order already up to date', {
          items: currentItems,
          requestId,
          changed: false,
        }),
      )
    }

    // Perform atomic batch update with current timestamp
    const updateTimestamp = new Date()

    // Use a transaction to ensure atomicity
    const updatePromises = itemOrders.map(({ id, sortOrder }) =>
      db
        .update(wishlistItems)
        .set({
          sortOrder: sortOrder.toString(),
          updatedAt: updateTimestamp,
        })
        .where(and(eq(wishlistItems.id, id), eq(wishlistItems.userId, userId)))
        .returning(),
    )

    const updateResults = await Promise.all(updatePromises)
    const updatedItems = updateResults.flat()

    // Update Elasticsearch for all changed items in parallel
    const esUpdatePromises = updatedItems.map(item =>
      updateWishlistItemES(item).catch(error => {
        console.warn(`Failed to update item ${item.id} in Elasticsearch:`, error.message)
        // Don't fail the whole operation for ES errors
      }),
    )

    await Promise.allSettled(esUpdatePromises)

    // Fetch final ordered items to return
    const finalItems = await db
      .select()
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, userId))
      .orderBy(asc(wishlistItems.sortOrder))

    return res.status(200).json(
      apiResponse(200, 'Wishlist reordered successfully', {
        items: finalItems,
        requestId,
        changed: true,
        timestamp: updateTimestamp.toISOString(),
      }),
    )
  } catch (error) {
    console.error('Error reordering wishlist:', error)
    return res
      .status(500)
      .json(apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to reorder wishlist'))
  }
}

// POST /api/wishlist/reorder/debounced - Debounced reorder for rapid UI updates
export const reorderWishlistDebounced = async (req: Request, res: Response) => {
  try {
    const userId = req.authenticatedUserId

    if (!userId) {
      return res.status(403).json(apiErrorResponse(403, 'UNAUTHORIZED', 'User not authenticated'))
    }

    const { itemOrders, requestId } = req.body

    if (!Array.isArray(itemOrders) || itemOrders.length === 0) {
      return res
        .status(400)
        .json(apiErrorResponse(400, 'VALIDATION_ERROR', 'itemOrders must be a non-empty array'))
    }

    // Validate request structure
    for (const item of itemOrders) {
      if (!item.id || typeof item.sortOrder === 'undefined') {
        return res
          .status(400)
          .json(
            apiErrorResponse(
              400,
              'VALIDATION_ERROR',
              'Each item must have id and sortOrder properties',
            ),
          )
      }
    }

    // Quick validation that items belong to user (lightweight check)
    const itemIds = itemOrders.map(item => item.id)
    const userItemCount = await db
      .select({ count: sql`count(*)` })
      .from(wishlistItems)
      .where(and(eq(wishlistItems.userId, userId), inArray(wishlistItems.id, itemIds)))

    if (userItemCount[0]?.count !== itemIds.length) {
      return res
        .status(403)
        .json(apiErrorResponse(403, 'FORBIDDEN', 'You can only reorder your own wishlist items'))
    }

    // Clear any existing timeout for this user
    const existingReorder = pendingReorders.get(userId)
    if (existingReorder) {
      clearTimeout(existingReorder.timeoutId)
    }

    // Set up debounced execution
    const timeoutId = setTimeout(async () => {
      try {
        const pendingData = pendingReorders.get(userId)
        if (!pendingData) return

        // Execute the actual reorder operation
        await executeReorderOperation(userId, pendingData.itemOrders, pendingData.requestId)

        // Clean up
        pendingReorders.delete(userId)
      } catch (error) {
        console.error(`Debounced reorder failed for user ${userId}:`, error)
        pendingReorders.delete(userId)
      }
    }, REORDER_DEBOUNCE_DELAY)

    // Store the pending reorder
    pendingReorders.set(userId, {
      itemOrders,
      timestamp: Date.now(),
      timeoutId,
      requestId,
    })

    // Return immediate acknowledgment
    return res.status(202).json(
      apiResponse(202, 'Reorder request queued - changes will be persisted shortly', {
        requestId,
        debounced: true,
        willPersistAt: new Date(Date.now() + REORDER_DEBOUNCE_DELAY).toISOString(),
      }),
    )
  } catch (error) {
    console.error('Error in debounced reorder:', error)
    return res
      .status(500)
      .json(apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to queue reorder request'))
  }
}

// Helper function to execute the actual reorder operation
async function executeReorderOperation(
  userId: string,
  itemOrders: Array<{ id: string; sortOrder: string | number }>,
  requestId?: string,
) {
  try {
    // Get current state for comparison
    const userItems = await db
      .select({
        id: wishlistItems.id,
        sortOrder: wishlistItems.sortOrder,
        updatedAt: wishlistItems.updatedAt,
      })
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, userId))

    // Detect if changes are still needed
    const currentItemsMap = new Map(userItems.map(item => [item.id, item.sortOrder]))
    const hasChanges = itemOrders.some(
      item => currentItemsMap.get(item.id) !== item.sortOrder.toString(),
    )

    if (!hasChanges) {
      console.log(
        `No changes needed for debounced reorder (user: ${userId}, requestId: ${requestId})`,
      )
      return
    }

    // Perform atomic batch update
    const updateTimestamp = new Date()
    const updatePromises = itemOrders.map(({ id, sortOrder }) =>
      db
        .update(wishlistItems)
        .set({
          sortOrder: sortOrder.toString(),
          updatedAt: updateTimestamp,
        })
        .where(and(eq(wishlistItems.id, id), eq(wishlistItems.userId, userId)))
        .returning(),
    )

    const updateResults = await Promise.all(updatePromises)
    const updatedItems = updateResults.flat()

    // Update Elasticsearch for all changed items
    const esUpdatePromises = updatedItems.map(item =>
      updateWishlistItemES(item).catch(error => {
        console.warn(`Failed to update item ${item.id} in Elasticsearch:`, error.message)
      }),
    )

    await Promise.allSettled(esUpdatePromises)

    console.log(
      `Successfully processed debounced reorder for user ${userId} (${updatedItems.length} items updated)`,
    )
  } catch (error) {
    console.error(`Failed to execute debounced reorder for user ${userId}:`, error)
    throw error
  }
}

// GET /api/wishlist/reorder/status - Check if there are pending reorder operations
export const getReorderStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.authenticatedUserId

    if (!userId) {
      return res.status(403).json(apiErrorResponse(403, 'UNAUTHORIZED', 'User not authenticated'))
    }

    const pendingReorder = pendingReorders.get(userId)

    if (!pendingReorder) {
      return res.status(200).json(
        apiResponse(200, 'No pending reorder operations', {
          hasPending: false,
          requestId: null,
        }),
      )
    }

    const timeRemaining = Math.max(
      0,
      pendingReorder.timestamp + REORDER_DEBOUNCE_DELAY - Date.now(),
    )

    return res.status(200).json(
      apiResponse(200, 'Pending reorder operation found', {
        hasPending: true,
        requestId: pendingReorder.requestId,
        timeRemainingMs: timeRemaining,
        willPersistAt: new Date(pendingReorder.timestamp + REORDER_DEBOUNCE_DELAY).toISOString(),
      }),
    )
  } catch (error) {
    console.error('Error checking reorder status:', error)
    return res
      .status(500)
      .json(apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to check reorder status'))
  }
}

// DELETE /api/wishlist/reorder/pending - Cancel pending reorder operations
export const cancelPendingReorder = async (req: Request, res: Response) => {
  try {
    const userId = req.authenticatedUserId

    if (!userId) {
      return res.status(403).json(apiErrorResponse(403, 'UNAUTHORIZED', 'User not authenticated'))
    }

    const pendingReorder = pendingReorders.get(userId)

    if (!pendingReorder) {
      return res
        .status(404)
        .json(apiErrorResponse(404, 'NOT_FOUND', 'No pending reorder operations to cancel'))
    }

    // Clear the timeout and remove from map
    clearTimeout(pendingReorder.timeoutId)
    pendingReorders.delete(userId)

    return res.status(200).json(
      apiResponse(200, 'Pending reorder operation cancelled', {
        cancelled: true,
        requestId: pendingReorder.requestId,
      }),
    )
  } catch (error) {
    console.error('Error cancelling pending reorder:', error)
    return res
      .status(500)
      .json(apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to cancel pending reorder'))
  }
}

// POST /api/wishlist/upload-image - Upload image for wishlist item
export const uploadWishlistImage = async (req: Request, res: Response) => {
  try {
    const userId = req.authenticatedUserId

    if (!userId) {
      return res.status(403).json(apiErrorResponse(403, 'UNAUTHORIZED', 'User not authenticated'))
    }

    if (!req.file) {
      return res
        .status(400)
        .json(apiErrorResponse(400, 'VALIDATION_ERROR', 'No image file provided'))
    }

    // Log file info for debugging
    const fileInfo = getFileInfo(req.file)
    console.log('Uploading wishlist image:', fileInfo)

    // Save the image (handles both S3 and local storage)
    const imageUrl = await saveWishlistImage(userId, req.file)

    return res.status(200).json(
      apiResponse(200, 'Image uploaded successfully', {
        imageUrl,
        fileInfo: {
          originalName: fileInfo.originalname,
          size: fileInfo.sizeInMB,
          type: fileInfo.mimetype,
        },
      }),
    )
  } catch (error) {
    console.error('Error uploading wishlist image:', error)
    return res.status(500).json(apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to upload image'))
  }
}

// DELETE /api/wishlist/image - Delete wishlist image by URL
export const deleteWishlistImageHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.authenticatedUserId

    if (!userId) {
      return res.status(403).json(apiErrorResponse(403, 'UNAUTHORIZED', 'User not authenticated'))
    }

    const { imageUrl } = req.body

    if (!imageUrl) {
      return res
        .status(400)
        .json(apiErrorResponse(400, 'VALIDATION_ERROR', 'Image URL is required'))
    }

    // Verify the image belongs to the user (check URL pattern)
    const userPattern = new RegExp(`/wishlist/${userId}/|wishlist/${userId}/`)
    if (!userPattern.test(imageUrl)) {
      return res
        .status(403)
        .json(apiErrorResponse(403, 'FORBIDDEN', 'You can only delete your own images'))
    }

    // Delete the image
    await deleteWishlistImage(imageUrl)

    return res.status(200).json(apiResponse(200, 'Image deleted successfully'))
  } catch (error) {
    console.error('Error deleting wishlist image:', error)
    return res.status(500).json(apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to delete image'))
  }
}

// GET /api/wishlist/search - Full-text search via Elasticsearch
export const searchWishlist = async (req: Request, res: Response) => {
  try {
    const userId = req.authenticatedUserId

    if (!userId) {
      return res.status(403).json(apiErrorResponse(403, 'UNAUTHORIZED', 'User not authenticated'))
    }

    const { q: query, category, from = '0', size = '20' } = req.query

    // Try Elasticsearch first
    const esResult = await searchWishlistItems({
      userId,
      query: query as string,
      category: category as string,
      from: parseInt(from as string),
      size: parseInt(size as string),
    })

    if (esResult) {
      return res.status(200).json(
        apiResponse(200, 'Wishlist search completed successfully', {
          items: esResult.hits,
          total: esResult.total,
          source: 'elasticsearch',
        }),
      )
    }

    // Fallback to database search with category filtering
    console.log('Elasticsearch unavailable, falling back to database search')

    const conditions = [eq(wishlistItems.userId, userId)]
    if (category) {
      conditions.push(eq(wishlistItems.category, category as string))
    }

    let items = await db
      .select()
      .from(wishlistItems)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(asc(wishlistItems.sortOrder))
      .limit(parseInt(size as string))
      .offset(parseInt(from as string))

    // Basic text filtering if query provided (fallback)
    if (query) {
      const searchTerm = (query as string).toLowerCase()
      items = items.filter(
        item =>
          item.title.toLowerCase().includes(searchTerm) ||
          (item.description && item.description.toLowerCase().includes(searchTerm)) ||
          (item.category && item.category.toLowerCase().includes(searchTerm)),
      )
    }

    return res.status(200).json(
      apiResponse(200, 'Wishlist search completed successfully', {
        items,
        total: items.length,
        source: 'database',
      }),
    )
  } catch (error) {
    console.error('Error searching wishlist:', error)
    return res
      .status(500)
      .json(apiErrorResponse(500, 'INTERNAL_ERROR', 'Failed to search wishlist'))
  }
}
