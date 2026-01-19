/**
 * Update Wishlist Item
 *
 * Platform-agnostic core logic for updating an existing wishlist item.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import { eq } from 'drizzle-orm'
import {
  WishlistItemSchema,
  type UpdateWishlistInput,
  type WishlistItem,
  type WishlistRow,
} from './__types__/index.js'

/**
 * Minimal database interface for update-wishlist-item operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface UpdateWishlistDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<WishlistRow[]>
    }
  }
  update: (table: unknown) => {
    set: (data: Record<string, unknown>) => {
      where: (condition: unknown) => {
        returning: () => Promise<WishlistRow[]>
      }
    }
  }
}

/**
 * Schema references interface
 *
 * Allows injecting table references for platform independence.
 */
export interface UpdateWishlistSchema {
  wishlistItems: {
    id: unknown
    userId: unknown
    title: unknown
    store: unknown
    setNumber: unknown
    sourceUrl: unknown
    imageUrl: unknown
    price: unknown
    currency: unknown
    pieceCount: unknown
    releaseDate: unknown
    tags: unknown
    priority: unknown
    notes: unknown
    sortOrder: unknown
    createdAt: unknown
    updatedAt: unknown
  }
}

/**
 * Update Wishlist Item Result
 *
 * Discriminated union for update wishlist operation result.
 */
export type UpdateWishlistResult =
  | { success: true; data: WishlistItem }
  | { success: false; error: 'NOT_FOUND' | 'FORBIDDEN' | 'DB_ERROR'; message: string }

/**
 * Update an existing wishlist item for a user
 *
 * Updates only the provided fields (patch semantics).
 * The function handles:
 * - Ownership validation (returns FORBIDDEN if not owner)
 * - Existence check (returns NOT_FOUND if missing)
 * - updatedAt timestamp generation
 * - createdAt is never modified
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with wishlistItems table
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param itemId - UUID of the item to update
 * @param input - Validated UpdateWishlistInput from request body
 * @returns Updated wishlist item or error result
 */
export async function updateWishlistItem(
  db: UpdateWishlistDbClient,
  schema: UpdateWishlistSchema,
  userId: string,
  itemId: string,
  input: UpdateWishlistInput,
): Promise<UpdateWishlistResult> {
  const { wishlistItems } = schema

  try {
    // First, check if item exists and get ownership
    const [existing] = await db
      .select({
        id: wishlistItems.id,
        userId: wishlistItems.userId,
        title: wishlistItems.title,
        store: wishlistItems.store,
        setNumber: wishlistItems.setNumber,
        sourceUrl: wishlistItems.sourceUrl,
        imageUrl: wishlistItems.imageUrl,
        price: wishlistItems.price,
        currency: wishlistItems.currency,
        pieceCount: wishlistItems.pieceCount,
        releaseDate: wishlistItems.releaseDate,
        tags: wishlistItems.tags,
        priority: wishlistItems.priority,
        notes: wishlistItems.notes,
        sortOrder: wishlistItems.sortOrder,
        createdAt: wishlistItems.createdAt,
        updatedAt: wishlistItems.updatedAt,
      })
      .from(wishlistItems)
      .where(eq(wishlistItems.id as any, itemId))

    if (!existing) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Wishlist item not found',
      }
    }

    if (existing.userId !== userId) {
      return {
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to update this wishlist item',
      }
    }

    // Build update data - only include provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (input.title !== undefined) updateData.title = input.title
    if (input.store !== undefined) updateData.store = input.store
    if (input.setNumber !== undefined) updateData.setNumber = input.setNumber
    if (input.sourceUrl !== undefined) updateData.sourceUrl = input.sourceUrl
    if (input.price !== undefined) updateData.price = input.price
    if (input.currency !== undefined) updateData.currency = input.currency
    if (input.pieceCount !== undefined) updateData.pieceCount = input.pieceCount
    if (input.releaseDate !== undefined) {
      updateData.releaseDate = input.releaseDate ? new Date(input.releaseDate) : null
    }
    if (input.tags !== undefined) updateData.tags = input.tags
    if (input.priority !== undefined) updateData.priority = input.priority
    if (input.notes !== undefined) updateData.notes = input.notes

    const [updated] = await db
      .update(wishlistItems)
      .set(updateData)
      .where(eq(wishlistItems.id as any, itemId))
      .returning()

    if (!updated) {
      return {
        success: false,
        error: 'DB_ERROR',
        message: 'No row returned from update',
      }
    }

    // Transform DB row to API response format
    const item = WishlistItemSchema.parse({
      id: updated.id,
      userId: updated.userId,
      title: updated.title,
      store: updated.store,
      setNumber: updated.setNumber,
      sourceUrl: updated.sourceUrl,
      imageUrl: updated.imageUrl,
      price: updated.price,
      currency: updated.currency,
      pieceCount: updated.pieceCount,
      releaseDate: updated.releaseDate ? updated.releaseDate.toISOString() : null,
      tags: updated.tags,
      priority: updated.priority,
      notes: updated.notes,
      sortOrder: updated.sortOrder,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    })

    return { success: true, data: item }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
