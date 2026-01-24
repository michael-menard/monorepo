/**
 * Vercel API Route: GET /api/sets/:id
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { asc, eq } from 'drizzle-orm'
import { boolean, decimal, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { logger } = loggerPkg

// Inline Schema
const sets = pgTable('sets', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  setNumber: text('set_number'),
  store: text('store'),
  sourceUrl: text('source_url'),
  pieceCount: integer('piece_count'),
  releaseDate: timestamp('release_date'),
  theme: text('theme'),
  tags: text('tags').array().default([]),
  notes: text('notes'),
  isBuilt: boolean('is_built').default(false).notNull(),
  quantity: integer('quantity').default(1).notNull(),
  purchasePrice: decimal('purchase_price', { precision: 10, scale: 2 }),
  tax: decimal('tax', { precision: 10, scale: 2 }),
  shipping: decimal('shipping', { precision: 10, scale: 2 }),
  purchaseDate: timestamp('purchase_date'),
  wishlistItemId: uuid('wishlist_item_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

const setImages = pgTable('set_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  setId: uuid('set_id')
    .notNull()
    .references(() => sets.id, { onDelete: 'cascade' }),
  imageUrl: text('image_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  position: integer('position').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Database client
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
  const userId = getAuthUserId()

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'Auth not configured' })
    return
  }

  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  try {
    const db = getDb()

    // Extract set ID from query params (Vercel passes dynamic route params as query)
    const setId = req.query.id as string
    if (!setId) {
      res.status(400).json({ error: 'Bad Request', message: 'Set ID is required' })
      return
    }

    // Validate UUID format
    const uuidSchema = z.string().uuid()
    const parseResult = uuidSchema.safeParse(setId)
    if (!parseResult.success) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid set ID format' })
      return
    }

    // Query set with images
    const rows = await db
      .select({
        id: sets.id,
        userId: sets.userId,
        title: sets.title,
        setNumber: sets.setNumber,
        store: sets.store,
        sourceUrl: sets.sourceUrl,
        pieceCount: sets.pieceCount,
        releaseDate: sets.releaseDate,
        theme: sets.theme,
        tags: sets.tags,
        notes: sets.notes,
        isBuilt: sets.isBuilt,
        quantity: sets.quantity,
        purchasePrice: sets.purchasePrice,
        tax: sets.tax,
        shipping: sets.shipping,
        purchaseDate: sets.purchaseDate,
        wishlistItemId: sets.wishlistItemId,
        createdAt: sets.createdAt,
        updatedAt: sets.updatedAt,
        imageId: setImages.id,
        imageUrl: setImages.imageUrl,
        thumbnailUrl: setImages.thumbnailUrl,
        position: setImages.position,
      })
      .from(sets)
      .leftJoin(setImages, eq(setImages.setId, sets.id))
      .where(eq(sets.id, setId))
      .orderBy(asc(setImages.position))

    // Check if set exists
    if (rows.length === 0) {
      res.status(404).json({ error: 'Not Found', message: 'Set not found' })
      return
    }

    const base = rows[0]

    // Check ownership
    if (base.userId !== userId) {
      res
        .status(403)
        .json({ error: 'Forbidden', message: 'You do not have permission to access this set' })
      return
    }

    // Aggregate rows into set with images
    const setData = {
      id: base.id,
      userId: base.userId,
      title: base.title,
      setNumber: base.setNumber ?? null,
      store: base.store ?? null,
      sourceUrl: base.sourceUrl ?? null,
      pieceCount: base.pieceCount ?? null,
      releaseDate: base.releaseDate?.toISOString() ?? null,
      theme: base.theme ?? null,
      tags: base.tags ?? [],
      notes: base.notes ?? null,
      isBuilt: base.isBuilt,
      quantity: base.quantity,
      purchasePrice: base.purchasePrice !== null ? Number(base.purchasePrice) : null,
      tax: base.tax !== null ? Number(base.tax) : null,
      shipping: base.shipping !== null ? Number(base.shipping) : null,
      purchaseDate: base.purchaseDate?.toISOString() ?? null,
      wishlistItemId: base.wishlistItemId ?? null,
      images: rows
        .filter(row => row.imageId !== null)
        .map(row => ({
          id: row.imageId!,
          imageUrl: row.imageUrl!,
          thumbnailUrl: row.thumbnailUrl ?? null,
          position: row.position ?? 0,
        })),
      createdAt: base.createdAt.toISOString(),
      updatedAt: base.updatedAt.toISOString(),
    }

    res.status(200).json(setData)
  } catch (error) {
    logger.error('Get set error', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
