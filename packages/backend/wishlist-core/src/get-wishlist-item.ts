/**
 * Get Wishlist Item by ID
 *
 * Platform-agnostic core logic for retrieving a single wishlist item.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import { eq } from 'drizzle-orm'
import { WishlistItemSchema, type WishlistItem, type WishlistRow } from './__types__/index.js'

/**
 * Minimal database interface for get-wishlist-item operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface GetWishlistDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<WishlistRow[]>
    }
  }
}

/**
 * Schema references interface
 *
 * Allows injecting table references for platform independence.
 */
export interface WishlistSchema {
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
 * Get Wishlist Item Result
 *
 * Discriminated union for get wishlist item operation result.
 */
export type GetWishlistItemResult =
  | { success: true; data: WishlistItem }
  | { success: false; error: 'NOT_FOUND' | 'FORBIDDEN' }

/**
 * Get wishlist item by ID with ownership validation
 *
 * Retrieves a wishlist item for the specified user.
 * Returns error if item not found or user doesn't own it.
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with wishlistItems table
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param itemId - UUID of the wishlist item to retrieve
 * @returns WishlistItem or error
 */
export async function getWishlistItemById(
  db: GetWishlistDbClient,
  schema: WishlistSchema,
  userId: string,
  itemId: string,
): Promise<GetWishlistItemResult> {
  const { wishlistItems } = schema

  const rows = (await db
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
    .where(eq(wishlistItems.id as any, itemId))) as WishlistRow[]

  if (rows.length === 0) {
    return { success: false, error: 'NOT_FOUND' }
  }

  const row = rows[0]

  // Check ownership
  if (row.userId !== userId) {
    return { success: false, error: 'FORBIDDEN' }
  }

  // Transform to API response format
  const item = WishlistItemSchema.parse({
    id: row.id,
    userId: row.userId,
    title: row.title,
    store: row.store,
    setNumber: row.setNumber,
    sourceUrl: row.sourceUrl,
    imageUrl: row.imageUrl,
    price: row.price,
    currency: row.currency,
    pieceCount: row.pieceCount,
    releaseDate: row.releaseDate ? row.releaseDate.toISOString() : null,
    tags: row.tags,
    priority: row.priority,
    notes: row.notes,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  })

  return { success: true, data: item }
}
