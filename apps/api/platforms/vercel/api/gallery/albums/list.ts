/**
 * Vercel API Route: GET /api/gallery/albums/list
 *
 * Returns paginated list of gallery albums for the authenticated user.
 * Supports pagination via query params: page (default 1), limit (default 20, max 100)
 * Each album includes imageCount and coverImageUrl.
 * Default sort: createdAt DESC (most recent first)
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { count, desc, eq, sql } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { logger } = loggerPkg

// Inline Schema (matches apps/api/core/database/schema/index.ts)
const galleryAlbums = pgTable('gallery_albums', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  coverImageId: uuid('cover_image_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
})

const galleryImages = pgTable('gallery_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  imageUrl: text('image_url').notNull(),
  albumId: uuid('album_id'),
})

// Database client (singleton)
let dbClient: ReturnType<typeof drizzle> | null = null

function getDb() {
  if (!dbClient) {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not set')
    }
    const pool = new pg.Pool({
      connectionString: databaseUrl,
      max: 1,
    })
    dbClient = drizzle(pool)
  }
  return dbClient
}

// Simple auth for local dev - respects AUTH_BYPASS
function getAuthUserId(): string | null {
  if (process.env.AUTH_BYPASS === 'true') {
    return process.env.DEV_USER_SUB ?? 'dev-user-00000000-0000-0000-0000-000000000001'
  }
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const userId = getAuthUserId()

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'Auth not configured' })
    return
  }

  try {
    const db = getDb()

    // Parse query params with defaults
    const page = Math.max(1, parseInt(String(req.query?.page ?? '1'), 10))
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query?.limit ?? '20'), 10)))
    const offset = (page - 1) * limit

    // Count total albums for this user
    const [countResult] = await db
      .select({ count: count() })
      .from(galleryAlbums)
      .where(eq(galleryAlbums.userId, userId))

    const total = Number(countResult?.count ?? 0)

    // Get paginated albums with image count using subquery
    const albums = await db
      .select({
        id: galleryAlbums.id,
        userId: galleryAlbums.userId,
        title: galleryAlbums.title,
        description: galleryAlbums.description,
        coverImageId: galleryAlbums.coverImageId,
        createdAt: galleryAlbums.createdAt,
        lastUpdatedAt: galleryAlbums.lastUpdatedAt,
      })
      .from(galleryAlbums)
      .where(eq(galleryAlbums.userId, userId))
      .orderBy(desc(galleryAlbums.createdAt))
      .limit(limit)
      .offset(offset)

    // Get image counts for all albums in one query
    const albumIds = albums.map(a => a.id)
    let imageCounts: Record<string, number> = {}
    let coverImageUrls: Record<string, string | null> = {}

    if (albumIds.length > 0) {
      // Get image counts per album
      const imageCountResults = await db
        .select({
          albumId: galleryImages.albumId,
          count: count(),
        })
        .from(galleryImages)
        .where(
          sql`${galleryImages.albumId} IN (${sql.join(
            albumIds.map(id => sql`${id}`),
            sql`, `,
          )})`,
        )
        .groupBy(galleryImages.albumId)

      imageCounts = imageCountResults.reduce(
        (acc, row) => {
          if (row.albumId) {
            acc[row.albumId] = Number(row.count)
          }
          return acc
        },
        {} as Record<string, number>,
      )

      // Get cover image URLs
      const coverImageIds = albums.filter(a => a.coverImageId).map(a => a.coverImageId!)
      if (coverImageIds.length > 0) {
        const coverImages = await db
          .select({
            id: galleryImages.id,
            imageUrl: galleryImages.imageUrl,
          })
          .from(galleryImages)
          .where(
            sql`${galleryImages.id} IN (${sql.join(
              coverImageIds.map(id => sql`${id}`),
              sql`, `,
            )})`,
          )

        coverImageUrls = coverImages.reduce(
          (acc, img) => {
            acc[img.id] = img.imageUrl
            return acc
          },
          {} as Record<string, string | null>,
        )
      }
    }

    // Transform to API response format
    const data = albums.map(album => ({
      id: album.id,
      userId: album.userId,
      title: album.title,
      description: album.description ?? null,
      coverImageId: album.coverImageId ?? null,
      coverImageUrl: album.coverImageId ? (coverImageUrls[album.coverImageId] ?? null) : null,
      imageCount: imageCounts[album.id] ?? 0,
      createdAt: album.createdAt.toISOString(),
      lastUpdatedAt: album.lastUpdatedAt.toISOString(),
    }))

    logger.info('List albums', {
      userId,
      page,
      limit,
      total,
      returned: data.length,
    })

    res.status(200).json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    })
  } catch (error) {
    logger.error('List albums error', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
