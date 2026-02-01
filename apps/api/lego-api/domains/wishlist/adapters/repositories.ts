import { eq, and, ilike, or, sql, desc, asc, inArray, max } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import { ok, err, paginate } from '@repo/api-core'
import type * as schema from '@repo/database-schema'
import type { WishlistRepository } from '../ports/index.js'
import type { WishlistItem, UpdateWishlistItemInput } from '../types.js'

type Schema = typeof schema

/**
 * Create a WishlistRepository implementation using Drizzle
 */
export function createWishlistRepository(
  db: NodePgDatabase<Schema>,
  schema: Schema,
): WishlistRepository {
  const { wishlistItems } = schema

  return {
    async findById(id: string): Promise<Result<WishlistItem, 'NOT_FOUND'>> {
      const row = await db.query.wishlistItems.findFirst({
        where: eq(wishlistItems.id, id),
      })

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToWishlistItem(row))
    },

    async findByUserId(
      userId: string,
      pagination: PaginationInput,
      filters?: {
        search?: string
        store?: string
        tags?: string[]
        priority?: number
        sort?:
          | 'createdAt'
          | 'title'
          | 'price'
          | 'pieceCount'
          | 'sortOrder'
          | 'priority'
          | 'bestValue'
          | 'expiringSoon'
          | 'hiddenGems'
        order?: 'asc' | 'desc'
      },
    ): Promise<PaginatedResult<WishlistItem>> {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      // Build conditions
      const conditions = [eq(wishlistItems.userId, userId)]

      if (filters?.search) {
        const searchPattern = `%${filters.search}%`
        conditions.push(
          or(
            ilike(wishlistItems.title, searchPattern),
            ilike(wishlistItems.setNumber, searchPattern),
            ilike(wishlistItems.notes, searchPattern),
          )!,
        )
      }

      if (filters?.store) {
        conditions.push(
          eq(wishlistItems.store, filters.store as (typeof wishlistItems.store.enumValues)[number]),
        )
      }

      if (filters?.priority !== undefined) {
        conditions.push(eq(wishlistItems.priority, filters.priority))
      }

      if (filters?.tags && filters.tags.length > 0) {
        // Filter by tags (items must have at least one matching tag)
        conditions.push(
          sql`${wishlistItems.tags} && ARRAY[${sql.join(
            filters.tags.map(t => sql`${t}`),
            sql`,`,
          )}]::text[]`,
        )
      }

      // Build sort order - supports smart sorting algorithms (WISH-2014)
      const sortMode = filters?.sort ?? 'sortOrder'
      const orderDirection = filters?.order ?? 'asc'
      let orderByClause

      if (sortMode === 'bestValue') {
        // Best Value: price / pieceCount ratio (lowest first by default)
        // Items with null price, null pieceCount, or pieceCount=0 placed at end
        // Uses NULLIF to prevent division by zero
        if (orderDirection === 'desc') {
          orderByClause = sql`
            CASE
              WHEN ${wishlistItems.price} IS NULL OR ${wishlistItems.pieceCount} IS NULL OR ${wishlistItems.pieceCount} = 0
              THEN 1
              ELSE 0
            END ASC,
            CASE
              WHEN ${wishlistItems.price} IS NOT NULL AND ${wishlistItems.pieceCount} > 0
              THEN ${wishlistItems.price}::numeric / ${wishlistItems.pieceCount}
              ELSE NULL
            END DESC NULLS LAST
          `
        } else {
          orderByClause = sql`
            CASE
              WHEN ${wishlistItems.price} IS NULL OR ${wishlistItems.pieceCount} IS NULL OR ${wishlistItems.pieceCount} = 0
              THEN 1
              ELSE 0
            END ASC,
            CASE
              WHEN ${wishlistItems.price} IS NOT NULL AND ${wishlistItems.pieceCount} > 0
              THEN ${wishlistItems.price}::numeric / ${wishlistItems.pieceCount}
              ELSE NULL
            END ASC NULLS LAST
          `
        }
      } else if (sortMode === 'expiringSoon') {
        // Expiring Soon: oldest release date first (asc default)
        // Items with null releaseDate placed at end
        if (orderDirection === 'desc') {
          orderByClause = sql`
            CASE WHEN ${wishlistItems.releaseDate} IS NULL THEN 1 ELSE 0 END ASC,
            ${wishlistItems.releaseDate} DESC NULLS LAST
          `
        } else {
          orderByClause = sql`
            CASE WHEN ${wishlistItems.releaseDate} IS NULL THEN 1 ELSE 0 END ASC,
            ${wishlistItems.releaseDate} ASC NULLS LAST
          `
        }
      } else if (sortMode === 'hiddenGems') {
        // Hidden Gems: (5 - priority) * pieceCount (highest first by default - desc)
        // Items with null pieceCount placed at end
        // Lower priority (0-2) + higher piece count = higher score
        if (orderDirection === 'asc') {
          orderByClause = sql`
            CASE WHEN ${wishlistItems.pieceCount} IS NULL THEN 1 ELSE 0 END ASC,
            (5 - COALESCE(${wishlistItems.priority}, 0)) * COALESCE(${wishlistItems.pieceCount}, 0) ASC
          `
        } else {
          orderByClause = sql`
            CASE WHEN ${wishlistItems.pieceCount} IS NULL THEN 1 ELSE 0 END ASC,
            (5 - COALESCE(${wishlistItems.priority}, 0)) * COALESCE(${wishlistItems.pieceCount}, 0) DESC
          `
        }
      } else {
        // Standard column sort
        const sortColumn = {
          createdAt: wishlistItems.createdAt,
          title: wishlistItems.title,
          price: wishlistItems.price,
          pieceCount: wishlistItems.pieceCount,
          sortOrder: wishlistItems.sortOrder,
          priority: wishlistItems.priority,
        }[sortMode]

        const orderFn = orderDirection === 'desc' ? desc : asc
        orderByClause = orderFn(sortColumn)
      }

      // Get items using raw query for smart sorting (orderBy doesn't support SQL fragments directly)
      const rows = await db.query.wishlistItems.findMany({
        where: and(...conditions),
        orderBy: orderByClause,
        limit,
        offset,
      })

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(wishlistItems)
        .where(and(...conditions))

      const total = countResult[0]?.count ?? 0

      return paginate(rows.map(mapRowToWishlistItem), total, pagination)
    },

    async insert(data): Promise<WishlistItem> {
      const [row] = await db
        .insert(wishlistItems)
        .values({
          userId: data.userId,
          title: data.title,
          store: data.store as (typeof wishlistItems.store.enumValues)[number],
          setNumber: data.setNumber ?? null,
          sourceUrl: data.sourceUrl ?? null,
          imageUrl: data.imageUrl ?? null,
          price: data.price ?? null,
          currency: (data.currency ?? 'USD') as (typeof wishlistItems.currency.enumValues)[number],
          pieceCount: data.pieceCount ?? null,
          releaseDate: data.releaseDate ?? null,
          tags: data.tags ?? [],
          priority: data.priority ?? 0,
          notes: data.notes ?? null,
          sortOrder: data.sortOrder,
        })
        .returning()

      return mapRowToWishlistItem(row)
    },

    async update(
      id: string,
      data: Partial<UpdateWishlistItemInput>,
    ): Promise<Result<WishlistItem, 'NOT_FOUND'>> {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      }

      if (data.title !== undefined) updateData.title = data.title
      if (data.store !== undefined) updateData.store = data.store
      if (data.setNumber !== undefined) updateData.setNumber = data.setNumber
      if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl
      if (data.price !== undefined) updateData.price = data.price
      if (data.currency !== undefined) updateData.currency = data.currency
      if (data.pieceCount !== undefined) updateData.pieceCount = data.pieceCount
      if (data.releaseDate !== undefined) {
        updateData.releaseDate = data.releaseDate ? new Date(data.releaseDate) : null
      }
      if (data.tags !== undefined) updateData.tags = data.tags
      if (data.priority !== undefined) updateData.priority = data.priority
      if (data.notes !== undefined) updateData.notes = data.notes
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

      const [row] = await db
        .update(wishlistItems)
        .set(updateData)
        .where(eq(wishlistItems.id, id))
        .returning()

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToWishlistItem(row))
    },

    async delete(id: string): Promise<Result<void, 'NOT_FOUND'>> {
      const result = await db.delete(wishlistItems).where(eq(wishlistItems.id, id))

      if (result.rowCount === 0) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },

    async getMaxSortOrder(userId: string): Promise<number> {
      const result = await db
        .select({ maxSort: max(wishlistItems.sortOrder) })
        .from(wishlistItems)
        .where(eq(wishlistItems.userId, userId))

      return result[0]?.maxSort ?? -1
    },

    async updateSortOrders(
      userId: string,
      items: Array<{ id: string; sortOrder: number }>,
    ): Promise<Result<number, 'VALIDATION_ERROR'>> {
      // Verify all items belong to user before updating
      const itemIds = items.map(item => item.id)
      const existingItems = await db
        .select()
        .from(wishlistItems)
        .where(and(eq(wishlistItems.userId, userId), inArray(wishlistItems.id, itemIds)))

      if (existingItems.length !== itemIds.length) {
        return err('VALIDATION_ERROR')
      }

      // Update items in transaction
      await db.transaction(async tx => {
        for (const item of items) {
          await tx
            .update(wishlistItems)
            .set({
              sortOrder: item.sortOrder,
              updatedAt: new Date(),
            })
            .where(and(eq(wishlistItems.id, item.id), eq(wishlistItems.userId, userId)))
        }
      })

      return ok(items.length)
    },

    async verifyOwnership(userId: string, itemIds: string[]): Promise<boolean> {
      const existingItems = await db
        .select({ id: wishlistItems.id })
        .from(wishlistItems)
        .where(and(eq(wishlistItems.userId, userId), inArray(wishlistItems.id, itemIds)))

      return existingItems.length === itemIds.length
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Map a database row to a WishlistItem.
 *
 * Uses a flexible type with optional imageVariants to support both
 * pre-migration data (no imageVariants column) and post-migration data.
 *
 * WISH-2016: Added imageVariants field
 */
function mapRowToWishlistItem(row: {
  id: string
  userId: string
  title: string
  store: string
  setNumber: string | null
  sourceUrl: string | null
  imageUrl: string | null
  imageVariants?: unknown // Optional - may not exist until migration runs
  price: string | null
  currency: string | null
  pieceCount: number | null
  releaseDate: Date | null
  tags: unknown
  priority: number | null
  notes: string | null
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}): WishlistItem {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    store: row.store,
    setNumber: row.setNumber,
    sourceUrl: row.sourceUrl,
    imageUrl: row.imageUrl,
    imageVariants: (row.imageVariants as WishlistItem['imageVariants']) ?? null,
    price: row.price,
    currency: row.currency,
    pieceCount: row.pieceCount,
    releaseDate: row.releaseDate,
    tags: (row.tags as string[] | null) ?? [],
    priority: row.priority,
    notes: row.notes,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}
