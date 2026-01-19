/**
 * Delete Wishlist Item
 *
 * Platform-agnostic core logic for deleting a wishlist item.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import { eq } from 'drizzle-orm'

/**
 * Minimal row type for existence/ownership check
 */
interface WishlistRowMinimal {
  id: string
  userId: string
}

/**
 * Minimal database interface for delete-wishlist-item operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface DeleteWishlistDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<WishlistRowMinimal[]>
    }
  }
  delete: (table: unknown) => {
    where: (condition: unknown) => Promise<{ rowCount: number }>
  }
}

/**
 * Schema references interface
 *
 * Allows injecting table references for platform independence.
 */
export interface DeleteWishlistSchema {
  wishlistItems: {
    id: unknown
    userId: unknown
  }
}

/**
 * Delete Wishlist Item Result
 *
 * Discriminated union for delete wishlist operation result.
 */
export type DeleteWishlistResult =
  | { success: true }
  | { success: false; error: 'NOT_FOUND' | 'FORBIDDEN' | 'DB_ERROR'; message: string }

/**
 * Delete a wishlist item for a user
 *
 * Removes the item from the database.
 * The function handles:
 * - Ownership validation (returns FORBIDDEN if not owner)
 * - Existence check (returns NOT_FOUND if missing)
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with wishlistItems table
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param itemId - UUID of the item to delete
 * @returns Success or error result
 */
export async function deleteWishlistItem(
  db: DeleteWishlistDbClient,
  schema: DeleteWishlistSchema,
  userId: string,
  itemId: string,
): Promise<DeleteWishlistResult> {
  const { wishlistItems } = schema

  try {
    // First, check if item exists and get ownership
    const [existing] = await db
      .select({
        id: wishlistItems.id,
        userId: wishlistItems.userId,
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
        message: 'You do not have permission to delete this wishlist item',
      }
    }

    // Delete the item
    await db.delete(wishlistItems).where(eq(wishlistItems.id as any, itemId))

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
