/**
 * Vercel API Route: PATCH /api/wishlist/reorder
 *
 * Bulk updates sortOrder for wishlist items.
 * Accepts: { items: [{ id, sortOrder }] }
 * Returns: { success: true, updated: number }
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, inArray } from 'drizzle-orm'
import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

const { logger } = loggerPkg

// UUID regex - accepts standard format (8-4-4-4-12 hex chars)
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Inline input schema (matches @repo/wishlist-core ReorderWishlistInputSchema)
const ReorderItemSchema = z.object({
  id: z.string().regex(uuidRegex, 'Invalid item ID format'),
  sortOrder: z.number().int().min(0),
})

const ReorderWishlistInputSchema = z.object({
  items: z.array(ReorderItemSchema).min(1, 'Items array cannot be empty'),
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
  // Only allow PATCH
  if (req.method !== 'PATCH') {
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
    const parseResult = ReorderWishlistInputSchema.safeParse(req.body)
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map(e => e.message).join(', ')
      res.status(400).json({ error: 'Bad Request', message: errors })
      return
    }

    const { items } = parseResult.data
    const db = getDb()

    // Get all requested item IDs
    const itemIds = items.map(item => item.id)

    // Verify all items exist and belong to user
    const existing = await db
      .select({
        id: wishlistItems.id,
        userId: wishlistItems.userId,
      })
      .from(wishlistItems)
      .where(inArray(wishlistItems.id, itemIds))

    // Check if all items were found
    const foundIds = new Set(existing.map(e => e.id))
    const missingIds = itemIds.filter(id => !foundIds.has(id))
    if (missingIds.length > 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: `Wishlist items not found: ${missingIds.join(', ')}`,
      })
      return
    }

    // Check ownership for all items
    const notOwned = existing.filter(e => e.userId !== userId)
    if (notOwned.length > 0) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to reorder some of these wishlist items',
      })
      return
    }

    // Update sortOrder for each item
    const now = new Date()
    let updated = 0

    for (const item of items) {
      await db
        .update(wishlistItems)
        .set({
          sortOrder: item.sortOrder,
          updatedAt: now,
        })
        .where(eq(wishlistItems.id, item.id))
      updated++
    }

    logger.info('Reorder wishlist items', {
      userId,
      itemCount: updated,
    })

    res.status(200).json({ success: true, updated })
  } catch (error) {
    logger.error('Reorder wishlist items error', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
