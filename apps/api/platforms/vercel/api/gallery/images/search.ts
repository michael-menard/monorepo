/**
 * Vercel API Route: /api/gallery/images/search
 *
 * Handles GET for searching gallery images using PostgreSQL ILIKE.
 * - GET: Returns paginated array of matching images
 *
 * Query params:
 * - search: Required search term (searches title, description, tags)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 *
 * Returns 400 if search param is missing or empty.
 * Returns empty array (not error) when no matches found.
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { logger } = loggerPkg

// Inline Schema (matches apps/api/core/database/schema/index.ts)
const galleryImages = pgTable('gallery_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  tags: jsonb('tags').$type<string[]>(),
  imageUrl: text('image_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  albumId: uuid('album_id'),
  flagged: boolean('flagged').default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
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

  // Get search term - required
  const search = (req.query.search as string)?.trim()
  if (!search) {
    res.status(400).json({ error: 'Bad Request', message: 'Search term is required' })
    return
  }

  // Parse pagination params
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20))

  try {
    const db = getDb()

    // Build ILIKE search pattern
    const searchPattern = `%${search}%`

    // Build where condition for search across title, description, and tags
    // tags is JSONB array, so we cast to text for ILIKE search
    const whereCondition = and(
      eq(galleryImages.userId, userId),
      or(
        ilike(galleryImages.title, searchPattern),
        ilike(galleryImages.description, searchPattern),
        sql`${galleryImages.tags}::text ILIKE ${searchPattern}`,
      ),
    )

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(galleryImages)
      .where(whereCondition)

    const total = Number(countResult?.count ?? 0)

    // Get paginated images
    const offset = (page - 1) * limit
    const images = await db
      .select({
        id: galleryImages.id,
        userId: galleryImages.userId,
        title: galleryImages.title,
        description: galleryImages.description,
        tags: galleryImages.tags,
        imageUrl: galleryImages.imageUrl,
        thumbnailUrl: galleryImages.thumbnailUrl,
        albumId: galleryImages.albumId,
        flagged: galleryImages.flagged,
        createdAt: galleryImages.createdAt,
        lastUpdatedAt: galleryImages.lastUpdatedAt,
      })
      .from(galleryImages)
      .where(whereCondition)
      .orderBy(desc(galleryImages.createdAt))
      .limit(limit)
      .offset(offset)

    // Transform to API format
    const transformedImages = images.map(img => ({
      id: img.id,
      userId: img.userId,
      title: img.title,
      description: img.description,
      tags: img.tags,
      imageUrl: img.imageUrl,
      thumbnailUrl: img.thumbnailUrl,
      albumId: img.albumId,
      flagged: img.flagged,
      createdAt: img.createdAt.toISOString(),
      lastUpdatedAt: img.lastUpdatedAt.toISOString(),
    }))

    logger.info('Search gallery images', { userId, search, page, limit, total })

    res.status(200).json({
      data: transformedImages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      },
    })
  } catch (error) {
    logger.error('Search images error', {
      search,
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
