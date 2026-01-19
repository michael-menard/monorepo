/**
 * Reorder Wishlist Items
 *
 * Platform-agnostic core logic for reordering wishlist items.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import { eq, inArray } from 'drizzle-orm'
import type { ReorderWishlistInput } from './__types__/index.js'

/**
 * Minimal row type for existence/ownership check
 */
interface WishlistRowMinimal {
  id: string
  userId: string
}

/**
 * Minimal database interface for reorder-wishlist-items operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface ReorderWishlistDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<WishlistRowMinimal[]>
    }
  }
  update: (table: unknown) => {
    set: (data: Record<string, unknown>) => {
      where: (condition: unknown) => Promise<{ rowCount: number }>
    }
  }
}

/**
 * Schema references interface
 *
 * Allows injecting table references for platform independence.
 */
export interface ReorderWishlistSchema {
  wishlistItems: {
    id: unknown
    userId: unknown
    sortOrder: unknown
    updatedAt: unknown
  }
}

/**
 * Reorder Wishlist Items Result
 *
 * Discriminated union for reorder wishlist operation result.
 */
export type ReorderWishlistResult =
  | { success: true; updated: number }
  | { success: false; error: 'FORBIDDEN' | 'NOT_FOUND' | 'DB_ERROR'; message: string }

/**
 * Reorder wishlist items for a user
 *
 * Updates sortOrder for each item in the array.
 * The function handles:
 * - Validation that all items exist and belong to authenticated user
 * - Batch update of sortOrder values
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with wishlistItems table
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param input - Validated ReorderWishlistInput from request body
 * @returns Success with update count or error result
 */
export async function reorderWishlistItems(
  db: ReorderWishlistDbClient,
  schema: ReorderWishlistSchema,
  userId: string,
  input: ReorderWishlistInput,
): Promise<ReorderWishlistResult> {
  const { wishlistItems } = schema
  const { items } = input

  try {
    // Get all requested item IDs
    const itemIds = items.map(item => item.id)

    // Verify all items exist and belong to user
    const existing = await db
      .select({
        id: wishlistItems.id,
        userId: wishlistItems.userId,
      })
      .from(wishlistItems)
      .where(inArray(wishlistItems.id as any, itemIds))

    // Check if all items were found
    const foundIds = new Set(existing.map(e => e.id))
    const missingIds = itemIds.filter(id => !foundIds.has(id))
    if (missingIds.length > 0) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: `Wishlist items not found: ${missingIds.join(', ')}`,
      }
    }

    // Check ownership for all items
    const notOwned = existing.filter(e => e.userId !== userId)
    if (notOwned.length > 0) {
      return {
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to reorder some of these wishlist items',
      }
    }

    // Update sortOrder for each item
    const now = new Date()
    let updated = 0

    for (const item of items) {
      await db
        .update(wishlistItems)
        .set({
          sortOrder: item.sortOrder,
          updatedAt: now,
        })
        .where(eq(wishlistItems.id as any, item.id))
      updated++
    }

    return { success: true, updated }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
