import { eq, and, isNull, ilike, or, sql, desc } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import { ok, err, paginate } from '@repo/api-core'
import type { ImageRepository, AlbumRepository } from './ports.js'
import type { GalleryImage, GalleryAlbum, UpdateImageInput } from './types.js'
import type * as schema from '../../db/schema.js'

type Schema = typeof schema

/**
 * Create an ImageRepository implementation using Drizzle
 */
export function createImageRepository(
  db: NodePgDatabase<Schema>,
  schema: Schema
): ImageRepository {
  const { galleryImages } = schema

  return {
    async findById(id: string): Promise<Result<GalleryImage, 'NOT_FOUND'>> {
      const row = await db.query.galleryImages.findFirst({
        where: eq(galleryImages.id, id),
      })

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToImage(row))
    },

    async findByUserId(
      userId: string,
      pagination: PaginationInput,
      filters?: { albumId?: string | null; search?: string }
    ): Promise<PaginatedResult<GalleryImage>> {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      // Build conditions
      const conditions = [eq(galleryImages.userId, userId)]

      if (filters?.albumId !== undefined) {
        if (filters.albumId === null) {
          conditions.push(isNull(galleryImages.albumId))
        } else {
          conditions.push(eq(galleryImages.albumId, filters.albumId))
        }
      }

      if (filters?.search) {
        const searchPattern = `%${filters.search}%`
        conditions.push(
          or(
            ilike(galleryImages.title, searchPattern),
            ilike(galleryImages.description, searchPattern)
          )!
        )
      }

      // Get items
      const rows = await db.query.galleryImages.findMany({
        where: and(...conditions),
        orderBy: desc(galleryImages.createdAt),
        limit,
        offset,
      })

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(galleryImages)
        .where(and(...conditions))

      const total = countResult[0]?.count ?? 0

      return paginate(rows.map(mapRowToImage), total, pagination)
    },

    async insert(data): Promise<GalleryImage> {
      const [row] = await db
        .insert(galleryImages)
        .values({
          userId: data.userId,
          title: data.title,
          description: data.description ?? null,
          tags: data.tags ?? null,
          imageUrl: data.imageUrl,
          thumbnailUrl: data.thumbnailUrl ?? null,
          albumId: data.albumId ?? null,
        })
        .returning()

      return mapRowToImage(row)
    },

    async update(id: string, data: Partial<UpdateImageInput>): Promise<Result<GalleryImage, 'NOT_FOUND'>> {
      const updateData: Record<string, unknown> = {
        lastUpdatedAt: new Date(),
      }

      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.tags !== undefined) updateData.tags = data.tags
      if (data.albumId !== undefined) updateData.albumId = data.albumId

      const [row] = await db
        .update(galleryImages)
        .set(updateData)
        .where(eq(galleryImages.id, id))
        .returning()

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToImage(row))
    },

    async delete(id: string): Promise<Result<void, 'NOT_FOUND'>> {
      const result = await db.delete(galleryImages).where(eq(galleryImages.id, id))

      if (result.rowCount === 0) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },

    async orphanByAlbumId(albumId: string): Promise<void> {
      await db
        .update(galleryImages)
        .set({ albumId: null, lastUpdatedAt: new Date() })
        .where(eq(galleryImages.albumId, albumId))
    },
  }
}

/**
 * Create an AlbumRepository implementation using Drizzle
 */
export function createAlbumRepository(
  db: NodePgDatabase<Schema>,
  schema: Schema
): AlbumRepository {
  const { galleryAlbums, galleryImages } = schema

  return {
    async findById(id: string): Promise<Result<GalleryAlbum, 'NOT_FOUND'>> {
      const row = await db.query.galleryAlbums.findFirst({
        where: eq(galleryAlbums.id, id),
      })

      if (!row) {
        return err('NOT_FOUND')
      }

      // Get image count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(galleryImages)
        .where(eq(galleryImages.albumId, id))

      const imageCount = countResult[0]?.count ?? 0

      return ok(mapRowToAlbum(row, imageCount))
    },

    async findByUserId(
      userId: string,
      pagination: PaginationInput,
      filters?: { search?: string }
    ): Promise<PaginatedResult<GalleryAlbum>> {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      // Build conditions
      const conditions = [eq(galleryAlbums.userId, userId)]

      if (filters?.search) {
        const searchPattern = `%${filters.search}%`
        conditions.push(
          or(
            ilike(galleryAlbums.title, searchPattern),
            ilike(galleryAlbums.description, searchPattern)
          )!
        )
      }

      // Get albums with image count via subquery
      const rows = await db
        .select({
          id: galleryAlbums.id,
          userId: galleryAlbums.userId,
          title: galleryAlbums.title,
          description: galleryAlbums.description,
          coverImageId: galleryAlbums.coverImageId,
          createdAt: galleryAlbums.createdAt,
          lastUpdatedAt: galleryAlbums.lastUpdatedAt,
          imageCount: sql<number>`(SELECT COUNT(*)::int FROM gallery_images WHERE album_id = ${galleryAlbums.id})`,
        })
        .from(galleryAlbums)
        .where(and(...conditions))
        .orderBy(desc(galleryAlbums.createdAt))
        .limit(limit)
        .offset(offset)

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(galleryAlbums)
        .where(and(...conditions))

      const total = countResult[0]?.count ?? 0

      const albums: GalleryAlbum[] = rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        title: row.title,
        description: row.description,
        coverImageId: row.coverImageId,
        imageCount: row.imageCount,
        createdAt: row.createdAt,
        lastUpdatedAt: row.lastUpdatedAt,
      }))

      return paginate(albums, total, pagination)
    },

    async insert(data): Promise<GalleryAlbum> {
      const [row] = await db
        .insert(galleryAlbums)
        .values({
          userId: data.userId,
          title: data.title,
          description: data.description ?? null,
          coverImageId: data.coverImageId ?? null,
        })
        .returning()

      return mapRowToAlbum(row, 0)
    },

    async update(
      id: string,
      data: Partial<{ title: string; description: string | null; coverImageId: string | null }>
    ): Promise<Result<GalleryAlbum, 'NOT_FOUND'>> {
      const updateData: Record<string, unknown> = {
        lastUpdatedAt: new Date(),
      }

      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.coverImageId !== undefined) updateData.coverImageId = data.coverImageId

      const [row] = await db
        .update(galleryAlbums)
        .set(updateData)
        .where(eq(galleryAlbums.id, id))
        .returning()

      if (!row) {
        return err('NOT_FOUND')
      }

      // Get image count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(galleryImages)
        .where(eq(galleryImages.albumId, id))

      const imageCount = countResult[0]?.count ?? 0

      return ok(mapRowToAlbum(row, imageCount))
    },

    async delete(id: string): Promise<Result<void, 'NOT_FOUND'>> {
      const result = await db.delete(galleryAlbums).where(eq(galleryAlbums.id, id))

      if (result.rowCount === 0) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function mapRowToImage(row: {
  id: string
  userId: string
  title: string
  description: string | null
  tags: unknown
  imageUrl: string
  thumbnailUrl: string | null
  albumId: string | null
  flagged: boolean | null
  createdAt: Date
  lastUpdatedAt: Date
}): GalleryImage {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description,
    tags: row.tags as string[] | null,
    imageUrl: row.imageUrl,
    thumbnailUrl: row.thumbnailUrl,
    albumId: row.albumId,
    flagged: row.flagged ?? false,
    createdAt: row.createdAt,
    lastUpdatedAt: row.lastUpdatedAt,
  }
}

function mapRowToAlbum(
  row: {
    id: string
    userId: string
    title: string
    description: string | null
    coverImageId: string | null
    createdAt: Date
    lastUpdatedAt: Date
  },
  imageCount: number
): GalleryAlbum {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description,
    coverImageId: row.coverImageId,
    imageCount,
    createdAt: row.createdAt,
    lastUpdatedAt: row.lastUpdatedAt,
  }
}
