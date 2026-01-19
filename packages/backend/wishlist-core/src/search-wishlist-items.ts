/**
 * Search Wishlist Items
 *
 * Platform-agnostic core logic for searching wishlist items by title.
 * Uses PostgreSQL ILIKE for case-insensitive search.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import { and, count, desc, eq, ilike } from 'drizzle-orm'
import {
  WishlistItemSchema,
  WishlistListResponseSchema,
  type SearchWishlistFilters,
  type WishlistListResponse,
  type WishlistRow,
} from './__types__/index.js'

/**
 * Minimal database interface for search-wishlist-items operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface SearchWishlistDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      // For count queries - returns Promise directly
      where: (condition: unknown) => Promise<Array<{ count: number }>> & {
        // For data queries - returns chained methods
        orderBy: (...orders: unknown[]) => {
          limit: (n: number) => {
            offset: (n: number) => Promise<WishlistRow[]>
          }
        }
      }
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
 * Search wishlist items by title
 *
 * Returns paginated list of wishlist items matching the search query.
 * Search is case-insensitive (uses PostgreSQL ILIKE).
 * Only searches the title field.
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with wishlistItems table
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param filters - Search query and pagination options
 * @returns WishlistListResponse with matching items and pagination
 */
export async function searchWishlistItems(
  db: SearchWishlistDbClient,
  schema: WishlistSchema,
  userId: string,
  filters: SearchWishlistFilters,
): Promise<WishlistListResponse> {
  const { wishlistItems } = schema
  const { q, page = 1, limit = 20 } = filters

  // Cap limit at 100
  const cappedLimit = Math.min(limit, 100)

  // Escape special characters for ILIKE
  const escapedQuery = q.replace(/[%_\\]/g, '\\$&')

  // Build search condition: user owns item AND title matches
  const searchCondition = and(
    eq(wishlistItems.userId as any, userId),
    ilike(wishlistItems.title as any, `%${escapedQuery}%`),
  )

  // Get total count for pagination
  const [countResult] = await db
    .select({ count: count() })
    .from(wishlistItems)
    .where(searchCondition!)

  const total = Number(countResult?.count ?? 0)

  // Get paginated search results
  const offset = (page - 1) * cappedLimit
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
    .where(searchCondition!)
    .orderBy(desc(wishlistItems.createdAt as any))
    .limit(cappedLimit)
    .offset(offset)) as WishlistRow[]

  // Transform rows to API response format
  const items = rows.map(row =>
    WishlistItemSchema.parse({
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
    }),
  )

  const response: WishlistListResponse = {
    items,
    pagination: {
      page,
      limit: cappedLimit,
      total,
      totalPages: Math.ceil(total / cappedLimit),
    },
  }

  // Runtime validation
  WishlistListResponseSchema.parse(response)

  return response
}
