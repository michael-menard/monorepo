/**
 * Create Wishlist Item
 *
 * Platform-agnostic core logic for creating a new wishlist item.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import { max } from 'drizzle-orm'
import {
  WishlistItemSchema,
  type CreateWishlistInput,
  type WishlistItem,
  type WishlistRow,
} from './__types__/index.js'

/**
 * Minimal database interface for create-wishlist-item operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface CreateWishlistDbClient {
  insert: (table: unknown) => {
    values: (data: Record<string, unknown>) => {
      returning: () => Promise<WishlistRow[]>
    }
  }
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<Array<{ maxSortOrder: number | null }>>
    }
  }
}

/**
 * Schema references interface
 *
 * Allows injecting table references for platform independence.
 */
export interface CreateWishlistSchema {
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
 * Create Wishlist Item Result
 *
 * Discriminated union for create wishlist operation result.
 */
export type CreateWishlistResult =
  | { success: true; data: WishlistItem }
  | { success: false; error: 'VALIDATION_ERROR' | 'DB_ERROR'; message: string }

/**
 * Generate a UUID v4
 */
function generateUuid(): string {
  return crypto.randomUUID()
}

/**
 * Create a new wishlist item for a user
 *
 * Inserts a new wishlist item into the database with server-generated fields.
 * The function handles:
 * - UUID generation for item id
 * - Timestamp generation for createdAt/updatedAt
 * - sortOrder calculation as MAX(sortOrder) + 1 for the user (or 0 if first item)
 * - Default values for currency (USD) and priority (0)
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with wishlistItems table
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param input - Validated CreateWishlistInput from request body
 * @returns Created wishlist item or error result
 */
export async function createWishlistItem(
  db: CreateWishlistDbClient,
  schema: CreateWishlistSchema,
  userId: string,
  input: CreateWishlistInput,
): Promise<CreateWishlistResult> {
  const now = new Date()
  const id = generateUuid()
  const { wishlistItems } = schema

  try {
    // Get max sortOrder for user
    const [sortOrderResult] = await db
      .select({ maxSortOrder: max(wishlistItems.sortOrder as any) })
      .from(wishlistItems)
      .where((wishlistItems.userId as any) === userId ? true : false)

    // sortOrder is MAX + 1, or 0 if no items exist
    const sortOrder = (sortOrderResult?.maxSortOrder ?? -1) + 1

    // Prepare insert data with server-generated fields
    const insertData: Record<string, unknown> = {
      id,
      userId,
      title: input.title,
      store: input.store,
      setNumber: input.setNumber ?? null,
      sourceUrl: input.sourceUrl ?? null,
      imageUrl: null, // Image upload handled separately
      price: input.price ?? null,
      currency: input.currency ?? 'USD',
      pieceCount: input.pieceCount ?? null,
      releaseDate: input.releaseDate ? new Date(input.releaseDate) : null,
      tags: input.tags ?? [],
      priority: input.priority ?? 0,
      notes: input.notes ?? null,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    }

    const [inserted] = await db.insert(schema.wishlistItems).values(insertData).returning()

    if (!inserted) {
      return {
        success: false,
        error: 'DB_ERROR',
        message: 'No row returned from insert',
      }
    }

    // Transform DB row to API response format
    const item = WishlistItemSchema.parse({
      id: inserted.id,
      userId: inserted.userId,
      title: inserted.title,
      store: inserted.store,
      setNumber: inserted.setNumber,
      sourceUrl: inserted.sourceUrl,
      imageUrl: inserted.imageUrl,
      price: inserted.price,
      currency: inserted.currency,
      pieceCount: inserted.pieceCount,
      releaseDate: inserted.releaseDate ? inserted.releaseDate.toISOString() : null,
      tags: inserted.tags,
      priority: inserted.priority,
      notes: inserted.notes,
      sortOrder: inserted.sortOrder,
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
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
