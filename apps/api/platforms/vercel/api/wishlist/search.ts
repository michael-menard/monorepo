/**
 * Vercel API Route: GET /api/wishlist/search
 *
 * Searches wishlist items by title for the authenticated user.
 * Uses PostgreSQL ILIKE for case-insensitive search.
 * Requires query param 'q' (search query).
 * Supports pagination via query params: page (default 1), limit (default 20, max 100)
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { and, count, desc, eq, ilike } from 'drizzle-orm'
import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { logger } = loggerPkg

// Inline Schema (matches apps/api/core/database/schema/index.ts)
const wishlistItems = pgTable('wishlist_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  store: text('store').notNull(),
  setNumber: text('set_number'),
  sourceUrl: text('source_url'),
  imageUrl: text('image_url'),
  price: text('price'),
  currency: text('currency').default('USD'),
  pieceCount: integer('piece_count'),
  releaseDate: timestamp('release_date'),
  tags: jsonb('tags').$type<string[]>().default([]),
  priority: integer('priority').default(0),
  notes: text('notes'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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

    // Extract and validate search query
    const searchQuery = req.query.q as string
    if (!searchQuery || searchQuery.trim() === '') {
      res.status(400).json({ error: 'Bad Request', message: 'Search query is required' })
      return
    }

    // Parse pagination params with defaults
    const page = Math.max(1, parseInt(String(req.query?.page ?? '1'), 10))
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query?.limit ?? '20'), 10)))
    const offset = (page - 1) * limit

    // Escape special characters for ILIKE
    const escapedQuery = searchQuery.replace(/[%_\\]/g, '\\$&')

    // Build search condition
    const searchCondition = and(
      eq(wishlistItems.userId, userId),
      ilike(wishlistItems.title, `%${escapedQuery}%`),
    )

    // Count total matching items
    const [countResult] = await db
      .select({ count: count() })
      .from(wishlistItems)
      .where(searchCondition!)

    const total = Number(countResult?.count ?? 0)

    // Fetch paginated search results
    const rows = await db
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
      .orderBy(desc(wishlistItems.createdAt))
      .limit(limit)
      .offset(offset)

    // Transform to API response format
    const items = rows.map(row => ({
      id: row.id,
      userId: row.userId,
      title: row.title,
      store: row.store,
      setNumber: row.setNumber ?? null,
      sourceUrl: row.sourceUrl ?? null,
      imageUrl: row.imageUrl ?? null,
      price: row.price ?? null,
      currency: row.currency ?? null,
      pieceCount: row.pieceCount ?? null,
      releaseDate: row.releaseDate?.toISOString() ?? null,
      tags: row.tags ?? null,
      priority: row.priority ?? null,
      notes: row.notes ?? null,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))

    logger.info('Search wishlist items', {
      userId,
      query: searchQuery,
      page,
      limit,
      total,
      returned: items.length,
    })

    res.status(200).json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error('Search wishlist items error', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
