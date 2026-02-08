import { eq, and, or, ilike, sql, inArray, notInArray, isNull, desc, asc } from 'drizzle-orm'
import type { PgDatabase } from 'drizzle-orm/pg-core'
import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import { logger } from '@repo/logger'
import type {
  InspirationRepository,
  AlbumRepository,
  AlbumItemRepository,
  AlbumParentRepository,
  MocLinkRepository,
} from '../ports/index.js'
import type {
  Inspiration,
  Album,
  AlbumWithMetadata,
  UpdateInspirationInput,
  UpdateAlbumInput,
  InspirationError,
  AlbumError,
} from '../types.js'

// Type for the schema with inspiration tables
type InspirationSchema = {
  inspirations: typeof import('@repo/database-schema').inspirations
  inspirationAlbums: typeof import('@repo/database-schema').inspirationAlbums
  inspirationAlbumItems: typeof import('@repo/database-schema').inspirationAlbumItems
  albumParents: typeof import('@repo/database-schema').albumParents
  inspirationMocs: typeof import('@repo/database-schema').inspirationMocs
  albumMocs: typeof import('@repo/database-schema').albumMocs
}

/**
 * Create Inspiration Repository
 *
 * Drizzle ORM implementation of InspirationRepository.
 */
export function createInspirationRepository(
  db: PgDatabase<Record<string, never>>,
  schema: InspirationSchema,
): InspirationRepository {
  return {
    async insert(data) {
      const [result] = await db
        .insert(schema.inspirations)
        .values({
          userId: data.userId,
          title: data.title,
          description: data.description,
          imageUrl: data.imageUrl,
          thumbnailUrl: data.thumbnailUrl,
          sourceUrl: data.sourceUrl,
          tags: data.tags,
          sortOrder: data.sortOrder,
        })
        .returning()

      return {
        id: result.id,
        userId: result.userId,
        title: result.title,
        description: result.description,
        imageUrl: result.imageUrl,
        thumbnailUrl: result.thumbnailUrl,
        sourceUrl: result.sourceUrl,
        tags: result.tags as string[] | null,
        sortOrder: result.sortOrder,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      }
    },

    async findById(id) {
      const [result] = await db
        .select()
        .from(schema.inspirations)
        .where(eq(schema.inspirations.id, id))
        .limit(1)

      if (!result) {
        return err('NOT_FOUND')
      }

      return ok({
        id: result.id,
        userId: result.userId,
        title: result.title,
        description: result.description,
        imageUrl: result.imageUrl,
        thumbnailUrl: result.thumbnailUrl,
        sourceUrl: result.sourceUrl,
        tags: result.tags as string[] | null,
        sortOrder: result.sortOrder,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      })
    },

    async findByUserId(userId, pagination, filters) {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      // Build where conditions
      const conditions = [eq(schema.inspirations.userId, userId)]

      if (filters?.search) {
        conditions.push(
          or(
            ilike(schema.inspirations.title, `%${filters.search}%`),
            ilike(schema.inspirations.description, `%${filters.search}%`),
          )!,
        )
      }

      if (filters?.tags && filters.tags.length > 0) {
        // Check if any of the specified tags are in the tags array
        conditions.push(
          sql`${schema.inspirations.tags} ?| ${sql.raw(`ARRAY[${filters.tags.map(t => `'${t}'`).join(',')}]`)}`,
        )
      }

      if (filters?.albumId) {
        // Filter by album membership via subquery
        const albumItemIds = db
          .select({ id: schema.inspirationAlbumItems.inspirationId })
          .from(schema.inspirationAlbumItems)
          .where(eq(schema.inspirationAlbumItems.albumId, filters.albumId))

        conditions.push(inArray(schema.inspirations.id, albumItemIds))
      }

      if (filters?.unassigned) {
        // Only items not in any album
        const allAlbumItemIds = db
          .select({ id: schema.inspirationAlbumItems.inspirationId })
          .from(schema.inspirationAlbumItems)

        conditions.push(notInArray(schema.inspirations.id, allAlbumItemIds))
      }

      // Build order by
      const sortField = filters?.sort || 'sortOrder'
      const sortOrder = filters?.order || 'asc'
      const orderBy =
        sortOrder === 'desc'
          ? desc(schema.inspirations[sortField as keyof typeof schema.inspirations.$inferSelect])
          : asc(schema.inspirations[sortField as keyof typeof schema.inspirations.$inferSelect])

      // Execute query
      const [items, countResult] = await Promise.all([
        db
          .select()
          .from(schema.inspirations)
          .where(and(...conditions))
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.inspirations)
          .where(and(...conditions)),
      ])

      const total = countResult[0]?.count || 0

      return {
        items: items.map(item => ({
          id: item.id,
          userId: item.userId,
          title: item.title,
          description: item.description,
          imageUrl: item.imageUrl,
          thumbnailUrl: item.thumbnailUrl,
          sourceUrl: item.sourceUrl,
          tags: item.tags as string[] | null,
          sortOrder: item.sortOrder,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    },

    async getMaxSortOrder(userId) {
      const [result] = await db
        .select({ max: sql<number>`COALESCE(MAX(sort_order), 0)` })
        .from(schema.inspirations)
        .where(eq(schema.inspirations.userId, userId))

      return result?.max || 0
    },

    async update(id, data) {
      const updateData: Partial<typeof schema.inspirations.$inferInsert> = {
        updatedAt: new Date(),
      }

      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl
      if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl
      if (data.sourceUrl !== undefined) updateData.sourceUrl = data.sourceUrl
      if (data.tags !== undefined) updateData.tags = data.tags
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

      const [result] = await db
        .update(schema.inspirations)
        .set(updateData)
        .where(eq(schema.inspirations.id, id))
        .returning()

      if (!result) {
        return err('NOT_FOUND')
      }

      return ok({
        id: result.id,
        userId: result.userId,
        title: result.title,
        description: result.description,
        imageUrl: result.imageUrl,
        thumbnailUrl: result.thumbnailUrl,
        sourceUrl: result.sourceUrl,
        tags: result.tags as string[] | null,
        sortOrder: result.sortOrder,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      })
    },

    async updateSortOrders(userId, items) {
      try {
        // Use a transaction to update all sort orders atomically
        let updated = 0
        for (const item of items) {
          const [result] = await db
            .update(schema.inspirations)
            .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
            .where(and(eq(schema.inspirations.id, item.id), eq(schema.inspirations.userId, userId)))
            .returning()

          if (result) updated++
        }

        return ok(updated)
      } catch (error) {
        logger.error('Failed to update sort orders:', error)
        return err('DB_ERROR')
      }
    },

    async delete(id) {
      const [result] = await db
        .delete(schema.inspirations)
        .where(eq(schema.inspirations.id, id))
        .returning()

      if (!result) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },

    async verifyOwnership(userId, ids) {
      if (ids.length === 0) return true

      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.inspirations)
        .where(and(inArray(schema.inspirations.id, ids), eq(schema.inspirations.userId, userId)))

      return result?.count === ids.length
    },
  }
}

/**
 * Create Album Repository
 *
 * Drizzle ORM implementation of AlbumRepository.
 */
export function createAlbumRepository(
  db: PgDatabase<Record<string, never>>,
  schema: InspirationSchema,
): AlbumRepository {
  return {
    async insert(data) {
      const [result] = await db
        .insert(schema.inspirationAlbums)
        .values({
          userId: data.userId,
          title: data.title,
          description: data.description,
          coverImageId: data.coverImageId,
          tags: data.tags,
          sortOrder: data.sortOrder,
        })
        .returning()

      return {
        id: result.id,
        userId: result.userId,
        title: result.title,
        description: result.description,
        coverImageId: result.coverImageId,
        tags: result.tags as string[] | null,
        sortOrder: result.sortOrder,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      }
    },

    async findById(id) {
      const [result] = await db
        .select()
        .from(schema.inspirationAlbums)
        .where(eq(schema.inspirationAlbums.id, id))
        .limit(1)

      if (!result) {
        return err('NOT_FOUND')
      }

      return ok({
        id: result.id,
        userId: result.userId,
        title: result.title,
        description: result.description,
        coverImageId: result.coverImageId,
        tags: result.tags as string[] | null,
        sortOrder: result.sortOrder,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      })
    },

    async findByIdWithMetadata(id) {
      const [albumResult] = await db
        .select()
        .from(schema.inspirationAlbums)
        .where(eq(schema.inspirationAlbums.id, id))
        .limit(1)

      if (!albumResult) {
        return err('NOT_FOUND')
      }

      // Get cover image if set
      let coverImage: Inspiration | null = null
      if (albumResult.coverImageId) {
        const [coverResult] = await db
          .select()
          .from(schema.inspirations)
          .where(eq(schema.inspirations.id, albumResult.coverImageId))
          .limit(1)

        if (coverResult) {
          coverImage = {
            id: coverResult.id,
            userId: coverResult.userId,
            title: coverResult.title,
            description: coverResult.description,
            imageUrl: coverResult.imageUrl,
            thumbnailUrl: coverResult.thumbnailUrl,
            sourceUrl: coverResult.sourceUrl,
            tags: coverResult.tags as string[] | null,
            sortOrder: coverResult.sortOrder,
            createdAt: coverResult.createdAt,
            updatedAt: coverResult.updatedAt,
          }
        }
      }

      // Get item count
      const [itemCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.inspirationAlbumItems)
        .where(eq(schema.inspirationAlbumItems.albumId, id))

      // Get child album count
      const [childCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.albumParents)
        .where(eq(schema.albumParents.parentAlbumId, id))

      return ok({
        id: albumResult.id,
        userId: albumResult.userId,
        title: albumResult.title,
        description: albumResult.description,
        coverImageId: albumResult.coverImageId,
        tags: albumResult.tags as string[] | null,
        sortOrder: albumResult.sortOrder,
        createdAt: albumResult.createdAt,
        updatedAt: albumResult.updatedAt,
        coverImage,
        itemCount: itemCountResult?.count || 0,
        childAlbumCount: childCountResult?.count || 0,
      })
    },

    async findByUserId(userId, pagination, filters) {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      // Build where conditions
      const conditions = [eq(schema.inspirationAlbums.userId, userId)]

      if (filters?.search) {
        conditions.push(
          or(
            ilike(schema.inspirationAlbums.title, `%${filters.search}%`),
            ilike(schema.inspirationAlbums.description, `%${filters.search}%`),
          )!,
        )
      }

      if (filters?.tags && filters.tags.length > 0) {
        conditions.push(
          sql`${schema.inspirationAlbums.tags} ?| ${sql.raw(`ARRAY[${filters.tags.map(t => `'${t}'`).join(',')}]`)}`,
        )
      }

      if (filters?.parentAlbumId) {
        // Filter by parent album
        const childIds = db
          .select({ id: schema.albumParents.albumId })
          .from(schema.albumParents)
          .where(eq(schema.albumParents.parentAlbumId, filters.parentAlbumId))

        conditions.push(inArray(schema.inspirationAlbums.id, childIds))
      }

      if (filters?.rootOnly) {
        // Only albums with no parents
        const allChildIds = db.select({ id: schema.albumParents.albumId }).from(schema.albumParents)

        conditions.push(notInArray(schema.inspirationAlbums.id, allChildIds))
      }

      // Build order by
      const sortField = filters?.sort || 'sortOrder'
      const sortOrder = filters?.order || 'asc'
      const orderBy =
        sortOrder === 'desc'
          ? desc(
              schema.inspirationAlbums[
                sortField as keyof typeof schema.inspirationAlbums.$inferSelect
              ],
            )
          : asc(
              schema.inspirationAlbums[
                sortField as keyof typeof schema.inspirationAlbums.$inferSelect
              ],
            )

      // Execute query
      const [albums, countResult] = await Promise.all([
        db
          .select()
          .from(schema.inspirationAlbums)
          .where(and(...conditions))
          .orderBy(orderBy)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(schema.inspirationAlbums)
          .where(and(...conditions)),
      ])

      const total = countResult[0]?.count || 0

      // Fetch metadata for each album
      const items: AlbumWithMetadata[] = await Promise.all(
        albums.map(async album => {
          // Get item count
          const [itemCountResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(schema.inspirationAlbumItems)
            .where(eq(schema.inspirationAlbumItems.albumId, album.id))

          // Get child album count
          const [childCountResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(schema.albumParents)
            .where(eq(schema.albumParents.parentAlbumId, album.id))

          return {
            id: album.id,
            userId: album.userId,
            title: album.title,
            description: album.description,
            coverImageId: album.coverImageId,
            tags: album.tags as string[] | null,
            sortOrder: album.sortOrder,
            createdAt: album.createdAt,
            updatedAt: album.updatedAt,
            itemCount: itemCountResult?.count || 0,
            childAlbumCount: childCountResult?.count || 0,
          }
        }),
      )

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      }
    },

    async existsByTitle(userId, title, excludeId) {
      const conditions = [
        eq(schema.inspirationAlbums.userId, userId),
        eq(schema.inspirationAlbums.title, title),
      ]

      if (excludeId) {
        conditions.push(sql`${schema.inspirationAlbums.id} != ${excludeId}`)
      }

      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.inspirationAlbums)
        .where(and(...conditions))

      return (result?.count || 0) > 0
    },

    async getMaxSortOrder(userId) {
      const [result] = await db
        .select({ max: sql<number>`COALESCE(MAX(sort_order), 0)` })
        .from(schema.inspirationAlbums)
        .where(eq(schema.inspirationAlbums.userId, userId))

      return result?.max || 0
    },

    async update(id, data) {
      const updateData: Partial<typeof schema.inspirationAlbums.$inferInsert> = {
        updatedAt: new Date(),
      }

      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.coverImageId !== undefined) updateData.coverImageId = data.coverImageId
      if (data.tags !== undefined) updateData.tags = data.tags
      if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

      const [result] = await db
        .update(schema.inspirationAlbums)
        .set(updateData)
        .where(eq(schema.inspirationAlbums.id, id))
        .returning()

      if (!result) {
        return err('NOT_FOUND')
      }

      return ok({
        id: result.id,
        userId: result.userId,
        title: result.title,
        description: result.description,
        coverImageId: result.coverImageId,
        tags: result.tags as string[] | null,
        sortOrder: result.sortOrder,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      })
    },

    async updateSortOrders(userId, items) {
      try {
        let updated = 0
        for (const item of items) {
          const [result] = await db
            .update(schema.inspirationAlbums)
            .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
            .where(
              and(
                eq(schema.inspirationAlbums.id, item.id),
                eq(schema.inspirationAlbums.userId, userId),
              ),
            )
            .returning()

          if (result) updated++
        }

        return ok(updated)
      } catch (error) {
        logger.error('Failed to update album sort orders:', error)
        return err('DB_ERROR')
      }
    },

    async delete(id) {
      const [result] = await db
        .delete(schema.inspirationAlbums)
        .where(eq(schema.inspirationAlbums.id, id))
        .returning()

      if (!result) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },

    async verifyOwnership(userId, albumId) {
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.inspirationAlbums)
        .where(
          and(
            eq(schema.inspirationAlbums.id, albumId),
            eq(schema.inspirationAlbums.userId, userId),
          ),
        )

      return (result?.count || 0) > 0
    },

    async verifyOwnershipMultiple(userId, albumIds) {
      if (albumIds.length === 0) return true

      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.inspirationAlbums)
        .where(
          and(
            inArray(schema.inspirationAlbums.id, albumIds),
            eq(schema.inspirationAlbums.userId, userId),
          ),
        )

      return result?.count === albumIds.length
    },
  }
}

/**
 * Create Album Item Repository
 *
 * Manages the many-to-many relationship between inspirations and albums.
 */
export function createAlbumItemRepository(
  db: PgDatabase<Record<string, never>>,
  schema: InspirationSchema,
): AlbumItemRepository {
  return {
    async addToAlbum(albumId, inspirationIds) {
      try {
        // Get the current max sort order in this album
        const [maxResult] = await db
          .select({ max: sql<number>`COALESCE(MAX(sort_order), 0)` })
          .from(schema.inspirationAlbumItems)
          .where(eq(schema.inspirationAlbumItems.albumId, albumId))

        let sortOrder = (maxResult?.max || 0) + 1

        // Insert all items (ignoring duplicates)
        const values = inspirationIds.map(inspirationId => ({
          inspirationId,
          albumId,
          sortOrder: sortOrder++,
        }))

        await db.insert(schema.inspirationAlbumItems).values(values).onConflictDoNothing()

        return ok(inspirationIds.length)
      } catch (error) {
        logger.error('Failed to add items to album:', error)
        return err('DB_ERROR')
      }
    },

    async removeFromAlbum(albumId, inspirationIds) {
      try {
        const result = await db
          .delete(schema.inspirationAlbumItems)
          .where(
            and(
              eq(schema.inspirationAlbumItems.albumId, albumId),
              inArray(schema.inspirationAlbumItems.inspirationId, inspirationIds),
            ),
          )
          .returning()

        return ok(result.length)
      } catch (error) {
        logger.error('Failed to remove items from album:', error)
        return err('DB_ERROR')
      }
    },

    async updateSortOrders(albumId, items) {
      try {
        let updated = 0
        for (const item of items) {
          const [result] = await db
            .update(schema.inspirationAlbumItems)
            .set({ sortOrder: item.sortOrder })
            .where(
              and(
                eq(schema.inspirationAlbumItems.albumId, albumId),
                eq(schema.inspirationAlbumItems.inspirationId, item.id),
              ),
            )
            .returning()

          if (result) updated++
        }

        return ok(updated)
      } catch (error) {
        logger.error('Failed to update album item sort orders:', error)
        return err('DB_ERROR')
      }
    },

    async getAlbumsForInspiration(inspirationId) {
      const results = await db
        .select({
          album: schema.inspirationAlbums,
        })
        .from(schema.inspirationAlbumItems)
        .innerJoin(
          schema.inspirationAlbums,
          eq(schema.inspirationAlbumItems.albumId, schema.inspirationAlbums.id),
        )
        .where(eq(schema.inspirationAlbumItems.inspirationId, inspirationId))

      return results.map(r => ({
        id: r.album.id,
        userId: r.album.userId,
        title: r.album.title,
        description: r.album.description,
        coverImageId: r.album.coverImageId,
        tags: r.album.tags as string[] | null,
        sortOrder: r.album.sortOrder,
        createdAt: r.album.createdAt,
        updatedAt: r.album.updatedAt,
      }))
    },

    async isInAlbum(inspirationId, albumId) {
      const [result] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.inspirationAlbumItems)
        .where(
          and(
            eq(schema.inspirationAlbumItems.inspirationId, inspirationId),
            eq(schema.inspirationAlbumItems.albumId, albumId),
          ),
        )

      return (result?.count || 0) > 0
    },
  }
}

/**
 * Create Album Parent Repository
 *
 * Manages the DAG hierarchy between albums.
 */
export function createAlbumParentRepository(
  db: PgDatabase<Record<string, never>>,
  schema: InspirationSchema,
): AlbumParentRepository {
  return {
    async addParent(albumId, parentAlbumId) {
      try {
        await db
          .insert(schema.albumParents)
          .values({ albumId, parentAlbumId })
          .onConflictDoNothing()

        return ok(undefined)
      } catch (error) {
        logger.error('Failed to add album parent:', error)
        return err('DB_ERROR')
      }
    },

    async removeParent(albumId, parentAlbumId) {
      try {
        await db
          .delete(schema.albumParents)
          .where(
            and(
              eq(schema.albumParents.albumId, albumId),
              eq(schema.albumParents.parentAlbumId, parentAlbumId),
            ),
          )

        return ok(undefined)
      } catch (error) {
        logger.error('Failed to remove album parent:', error)
        return err('DB_ERROR')
      }
    },

    async getParents(albumId) {
      const results = await db
        .select({
          album: schema.inspirationAlbums,
        })
        .from(schema.albumParents)
        .innerJoin(
          schema.inspirationAlbums,
          eq(schema.albumParents.parentAlbumId, schema.inspirationAlbums.id),
        )
        .where(eq(schema.albumParents.albumId, albumId))

      return results.map(r => ({
        id: r.album.id,
        userId: r.album.userId,
        title: r.album.title,
        description: r.album.description,
        coverImageId: r.album.coverImageId,
        tags: r.album.tags as string[] | null,
        sortOrder: r.album.sortOrder,
        createdAt: r.album.createdAt,
        updatedAt: r.album.updatedAt,
      }))
    },

    async getChildren(albumId) {
      const results = await db
        .select({
          album: schema.inspirationAlbums,
        })
        .from(schema.albumParents)
        .innerJoin(
          schema.inspirationAlbums,
          eq(schema.albumParents.albumId, schema.inspirationAlbums.id),
        )
        .where(eq(schema.albumParents.parentAlbumId, albumId))

      return results.map(r => ({
        id: r.album.id,
        userId: r.album.userId,
        title: r.album.title,
        description: r.album.description,
        coverImageId: r.album.coverImageId,
        tags: r.album.tags as string[] | null,
        sortOrder: r.album.sortOrder,
        createdAt: r.album.createdAt,
        updatedAt: r.album.updatedAt,
      }))
    },

    async getAncestors(albumId) {
      // Use recursive CTE to get all ancestors
      const result = await db.execute(sql`
        WITH RECURSIVE ancestors AS (
          SELECT parent_album_id as id
          FROM album_parents
          WHERE album_id = ${albumId}

          UNION

          SELECT ap.parent_album_id
          FROM album_parents ap
          INNER JOIN ancestors a ON ap.album_id = a.id
        )
        SELECT DISTINCT id FROM ancestors
      `)

      return (result.rows as Array<{ id: string }>).map(row => row.id)
    },

    async getDepth(albumId) {
      // Use recursive CTE to calculate max depth
      const result = await db.execute(sql`
        WITH RECURSIVE depth_calc AS (
          SELECT album_id, 1 as depth
          FROM album_parents
          WHERE album_id = ${albumId}

          UNION ALL

          SELECT ap.album_id, dc.depth + 1
          FROM album_parents ap
          INNER JOIN depth_calc dc ON ap.parent_album_id = dc.album_id
        )
        SELECT COALESCE(MAX(depth), 0) as max_depth FROM depth_calc
      `)

      return (result.rows[0] as { max_depth: number })?.max_depth || 0
    },
  }
}

/**
 * Create MOC Link Repository
 *
 * Manages links between inspirations/albums and MOC instructions.
 */
export function createMocLinkRepository(
  db: PgDatabase<Record<string, never>>,
  schema: InspirationSchema & {
    mocInstructions: typeof import('@repo/database-schema').mocInstructions
  },
): MocLinkRepository {
  return {
    async linkInspirationToMoc(inspirationId, mocId, notes) {
      try {
        await db
          .insert(schema.inspirationMocs)
          .values({ inspirationId, mocId, notes: notes ?? null })
          .onConflictDoNothing()

        return ok(undefined)
      } catch (error) {
        logger.error('Failed to link inspiration to MOC:', error)
        return err('DB_ERROR')
      }
    },

    async unlinkInspirationFromMoc(inspirationId, mocId) {
      try {
        await db
          .delete(schema.inspirationMocs)
          .where(
            and(
              eq(schema.inspirationMocs.inspirationId, inspirationId),
              eq(schema.inspirationMocs.mocId, mocId),
            ),
          )

        return ok(undefined)
      } catch (error) {
        logger.error('Failed to unlink inspiration from MOC:', error)
        return err('DB_ERROR')
      }
    },

    async linkAlbumToMoc(albumId, mocId, notes) {
      try {
        await db
          .insert(schema.albumMocs)
          .values({ albumId, mocId, notes: notes ?? null })
          .onConflictDoNothing()

        return ok(undefined)
      } catch (error) {
        logger.error('Failed to link album to MOC:', error)
        return err('DB_ERROR')
      }
    },

    async unlinkAlbumFromMoc(albumId, mocId) {
      try {
        await db
          .delete(schema.albumMocs)
          .where(and(eq(schema.albumMocs.albumId, albumId), eq(schema.albumMocs.mocId, mocId)))

        return ok(undefined)
      } catch (error) {
        logger.error('Failed to unlink album from MOC:', error)
        return err('DB_ERROR')
      }
    },

    async getMocsForInspiration(inspirationId) {
      const results = await db
        .select({ mocId: schema.inspirationMocs.mocId })
        .from(schema.inspirationMocs)
        .where(eq(schema.inspirationMocs.inspirationId, inspirationId))

      return results.map(r => r.mocId)
    },

    async getMocsForAlbum(albumId) {
      const results = await db
        .select({ mocId: schema.albumMocs.mocId })
        .from(schema.albumMocs)
        .where(eq(schema.albumMocs.albumId, albumId))

      return results.map(r => r.mocId)
    },

    async getInspirationsForMoc(mocId) {
      const results = await db
        .select({ inspiration: schema.inspirations })
        .from(schema.inspirationMocs)
        .innerJoin(
          schema.inspirations,
          eq(schema.inspirationMocs.inspirationId, schema.inspirations.id),
        )
        .where(eq(schema.inspirationMocs.mocId, mocId))

      return results.map(r => ({
        id: r.inspiration.id,
        userId: r.inspiration.userId,
        title: r.inspiration.title,
        description: r.inspiration.description,
        imageUrl: r.inspiration.imageUrl,
        thumbnailUrl: r.inspiration.thumbnailUrl,
        sourceUrl: r.inspiration.sourceUrl,
        tags: r.inspiration.tags as string[] | null,
        sortOrder: r.inspiration.sortOrder,
        createdAt: r.inspiration.createdAt,
        updatedAt: r.inspiration.updatedAt,
      }))
    },

    async getAlbumsForMoc(mocId) {
      const results = await db
        .select({ album: schema.inspirationAlbums })
        .from(schema.albumMocs)
        .innerJoin(
          schema.inspirationAlbums,
          eq(schema.albumMocs.albumId, schema.inspirationAlbums.id),
        )
        .where(eq(schema.albumMocs.mocId, mocId))

      return results.map(r => ({
        id: r.album.id,
        userId: r.album.userId,
        title: r.album.title,
        description: r.album.description,
        coverImageId: r.album.coverImageId,
        tags: r.album.tags as string[] | null,
        sortOrder: r.album.sortOrder,
        createdAt: r.album.createdAt,
        updatedAt: r.album.updatedAt,
      }))
    },
  }
}
