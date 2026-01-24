/**
 * Vercel API Route: POST /api/wishlist
 *
 * Creates a new wishlist item for the authenticated user.
 * Required fields: title, store
 * Optional fields: setNumber, sourceUrl, price, currency, pieceCount, releaseDate, tags, priority, notes
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, max } from 'drizzle-orm'
import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

const { logger } = loggerPkg

// Inline input schema (matches @repo/wishlist-core CreateWishlistInputSchema)
const CreateWishlistInputSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  store: z.string().min(1, 'Store is required'),
  setNumber: z.string().optional(),
  sourceUrl: z.string().optional(),
  price: z.string().optional(),
  currency: z.string().optional(),
  pieceCount: z.number().int().positive().optional(),
  releaseDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
  priority: z.number().int().min(0).max(5).optional(),
  notes: z.string().optional(),
})

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
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const userId = getAuthUserId()

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'Auth not configured' })
    return
  }

  try {
    // Validate request body
    const parseResult = CreateWishlistInputSchema.safeParse(req.body)
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map(e => e.message).join(', ')
      res.status(400).json({ error: 'Bad Request', message: errors })
      return
    }

    const input = parseResult.data
    const db = getDb()
    const now = new Date()
    const id = crypto.randomUUID()

    // Get max sortOrder for user
    const [sortOrderResult] = await db
      .select({ maxSortOrder: max(wishlistItems.sortOrder) })
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, userId))

    // sortOrder is MAX + 1, or 0 if no items exist
    const sortOrder = (sortOrderResult?.maxSortOrder ?? -1) + 1

    // Prepare insert data
    const insertData = {
      id,
      userId,
      title: input.title,
      store: input.store,
      setNumber: input.setNumber ?? null,
      sourceUrl: input.sourceUrl ?? null,
      imageUrl: null,
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

    const [inserted] = await db.insert(wishlistItems).values(insertData).returning()

    if (!inserted) {
      res.status(500).json({ error: 'Database error', message: 'No row returned from insert' })
      return
    }

    // Transform to API response format
    const item = {
      id: inserted.id,
      userId: inserted.userId,
      title: inserted.title,
      store: inserted.store,
      setNumber: inserted.setNumber ?? null,
      sourceUrl: inserted.sourceUrl ?? null,
      imageUrl: inserted.imageUrl ?? null,
      price: inserted.price ?? null,
      currency: inserted.currency ?? null,
      pieceCount: inserted.pieceCount ?? null,
      releaseDate: inserted.releaseDate?.toISOString() ?? null,
      tags: inserted.tags ?? null,
      priority: inserted.priority ?? null,
      notes: inserted.notes ?? null,
      sortOrder: inserted.sortOrder,
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
    }

    logger.info('Create wishlist item', {
      userId,
      itemId: inserted.id,
      title: inserted.title,
    })

    res.status(201).json(item)
  } catch (error) {
    logger.error('Create wishlist item error', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
