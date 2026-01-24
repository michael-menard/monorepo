/**
 * Vercel API Route: /api/wishlist/:id
 *
 * Handles GET, PUT, DELETE for a single wishlist item.
 * - GET: Returns item by ID
 * - PUT: Updates item (patch semantics)
 * - DELETE: Removes item
 *
 * Returns 400 for invalid UUID, 404 if not found, 403 if owned by another user.
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

const { logger } = loggerPkg

// Inline input schema (matches @repo/wishlist-core UpdateWishlistInputSchema)
const UpdateWishlistInputSchema = z.object({
  title: z.string().min(1).optional(),
  store: z.string().min(1).optional(),
  setNumber: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  price: z.string().nullable().optional(),
  currency: z.string().nullable().optional(),
  pieceCount: z.number().int().positive().nullable().optional(),
  releaseDate: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  priority: z.number().int().min(0).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
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

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Transform DB row to API response format
function transformRow(row: any) {
  return {
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
  }
}

// GET handler
async function handleGet(
  req: VercelRequest,
  res: VercelResponse,
  db: ReturnType<typeof drizzle>,
  userId: string,
  itemId: string,
): Promise<void> {
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
    .where(eq(wishlistItems.id, itemId))

  if (rows.length === 0) {
    res.status(404).json({ error: 'Not Found', message: 'Wishlist item not found' })
    return
  }

  const row = rows[0]

  if (row.userId !== userId) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access this wishlist item',
    })
    return
  }

  logger.info('Get wishlist item', { userId, itemId })
  res.status(200).json(transformRow(row))
}

// PUT handler
async function handlePut(
  req: VercelRequest,
  res: VercelResponse,
  db: ReturnType<typeof drizzle>,
  userId: string,
  itemId: string,
): Promise<void> {
  // Validate request body
  const parseResult = UpdateWishlistInputSchema.safeParse(req.body)
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map(e => e.message).join(', ')
    res.status(400).json({ error: 'Bad Request', message: errors })
    return
  }

  const input = parseResult.data

  // Check if item exists and get ownership
  const [existing] = await db
    .select({
      id: wishlistItems.id,
      userId: wishlistItems.userId,
    })
    .from(wishlistItems)
    .where(eq(wishlistItems.id, itemId))

  if (!existing) {
    res.status(404).json({ error: 'Not Found', message: 'Wishlist item not found' })
    return
  }

  if (existing.userId !== userId) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to update this wishlist item',
    })
    return
  }

  // Build update data - only include provided fields
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (input.title !== undefined) updateData.title = input.title
  if (input.store !== undefined) updateData.store = input.store
  if (input.setNumber !== undefined) updateData.setNumber = input.setNumber
  if (input.sourceUrl !== undefined) updateData.sourceUrl = input.sourceUrl
  if (input.price !== undefined) updateData.price = input.price
  if (input.currency !== undefined) updateData.currency = input.currency
  if (input.pieceCount !== undefined) updateData.pieceCount = input.pieceCount
  if (input.releaseDate !== undefined) {
    updateData.releaseDate = input.releaseDate ? new Date(input.releaseDate) : null
  }
  if (input.tags !== undefined) updateData.tags = input.tags
  if (input.priority !== undefined) updateData.priority = input.priority
  if (input.notes !== undefined) updateData.notes = input.notes

  const [updated] = await db
    .update(wishlistItems)
    .set(updateData)
    .where(eq(wishlistItems.id, itemId))
    .returning()

  if (!updated) {
    res.status(500).json({ error: 'Database error', message: 'No row returned from update' })
    return
  }

  logger.info('Update wishlist item', { userId, itemId })
  res.status(200).json(transformRow(updated))
}

// DELETE handler
async function handleDelete(
  req: VercelRequest,
  res: VercelResponse,
  db: ReturnType<typeof drizzle>,
  userId: string,
  itemId: string,
): Promise<void> {
  // Check if item exists and get ownership
  const [existing] = await db
    .select({
      id: wishlistItems.id,
      userId: wishlistItems.userId,
    })
    .from(wishlistItems)
    .where(eq(wishlistItems.id, itemId))

  if (!existing) {
    res.status(404).json({ error: 'Not Found', message: 'Wishlist item not found' })
    return
  }

  if (existing.userId !== userId) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to delete this wishlist item',
    })
    return
  }

  // Delete the item
  await db.delete(wishlistItems).where(eq(wishlistItems.id, itemId))

  logger.info('Delete wishlist item', { userId, itemId })
  res.status(200).json({ success: true })
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only allow GET, PUT, DELETE
  if (!['GET', 'PUT', 'DELETE'].includes(req.method ?? '')) {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const userId = getAuthUserId()

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'Auth not configured' })
    return
  }

  // Extract item ID from query params (Vercel passes dynamic route params as query)
  const itemId = req.query.id as string
  if (!itemId) {
    res.status(400).json({ error: 'Bad Request', message: 'Item ID is required' })
    return
  }

  // Validate UUID format
  if (!uuidRegex.test(itemId)) {
    res.status(400).json({ error: 'Bad Request', message: 'Invalid item ID format' })
    return
  }

  try {
    const db = getDb()

    switch (req.method) {
      case 'GET':
        await handleGet(req, res, db, userId, itemId)
        break
      case 'PUT':
        await handlePut(req, res, db, userId, itemId)
        break
      case 'DELETE':
        await handleDelete(req, res, db, userId, itemId)
        break
    }
  } catch (error) {
    logger.error('Wishlist item error', {
      method: req.method,
      itemId,
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
