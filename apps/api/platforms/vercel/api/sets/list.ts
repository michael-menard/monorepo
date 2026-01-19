/**
 * Vercel API Route: GET /api/sets/list
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { asc, count, desc, eq } from 'drizzle-orm'
import { boolean, decimal, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { z } from 'zod'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { logger } = loggerPkg

// Inline Schema
const sets = pgTable(
  'sets',
  {
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
  },
)

const setImages = pgTable(
  'set_images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    setId: uuid('set_id')
      .notNull()
      .references(() => sets.id, { onDelete: 'cascade' }),
    imageUrl: text('image_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    position: integer('position').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
)

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

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const userId = getAuthUserId()

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'Auth not configured' })
    return
  }

  try {
    const db = getDb()

    // Parse query params
    const page = Math.max(1, parseInt(String(req.query?.page ?? '1'), 10))
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query?.limit ?? '20'), 10)))
    const offset = (page - 1) * limit

    // Count total sets for this user
    const [countResult] = await db
      .select({ count: count() })
      .from(sets)
      .where(eq(sets.userId, userId))

    const total = Number(countResult?.count ?? 0)

    // Fetch sets with images
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
      .where(eq(sets.userId, userId))
      .orderBy(desc(sets.createdAt), asc(setImages.position))
      .limit(limit)
      .offset(offset)

    // Aggregate rows into sets with images[]
    const setMap = new Map<string, any>()
    for (const row of rows) {
      let current = setMap.get(row.id)
      if (!current) {
        current = {
          id: row.id,
          userId: row.userId,
          title: row.title,
          setNumber: row.setNumber ?? null,
          store: row.store ?? null,
          sourceUrl: row.sourceUrl ?? null,
          pieceCount: row.pieceCount ?? null,
          releaseDate: row.releaseDate?.toISOString() ?? null,
          theme: row.theme ?? null,
          tags: row.tags ?? [],
          notes: row.notes ?? null,
          isBuilt: row.isBuilt,
          quantity: row.quantity,
          purchasePrice: row.purchasePrice !== null ? Number(row.purchasePrice) : null,
          tax: row.tax !== null ? Number(row.tax) : null,
          shipping: row.shipping !== null ? Number(row.shipping) : null,
          purchaseDate: row.purchaseDate?.toISOString() ?? null,
          wishlistItemId: row.wishlistItemId ?? null,
          images: [],
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        }
        setMap.set(row.id, current)
      }
      if (row.imageId && row.imageUrl) {
        current.images.push({
          id: row.imageId,
          imageUrl: row.imageUrl,
          thumbnailUrl: row.thumbnailUrl ?? null,
          position: row.position ?? 0,
        })
      }
    }

    res.status(200).json({
      items: Array.from(setMap.values()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
