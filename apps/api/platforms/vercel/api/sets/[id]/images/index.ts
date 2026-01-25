/**
 * Vercel API Route: /api/sets/:id/images
 *
 * POST: Registers an uploaded image in the set_images table.
 *
 * - Creates a new set_images row with auto-increment position
 * - Returns SetImage object with id, imageUrl, thumbnailUrl, position
 * - Returns 400 for invalid UUID, 404 if set not found, 403 if owned by another user
 *
 * STORY-009: Image Uploads - Phase 1
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { desc, eq } from 'drizzle-orm'
import {
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
} from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

const { logger } = loggerPkg

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Request body schema
const RegisterBodySchema = z.object({
  imageUrl: z.string().url('imageUrl must be a valid URL'),
  key: z.string().min(1, 'S3 key is required'),
  thumbnailUrl: z.string().url().optional(),
})

// Inline Schema (matches apps/api/core/database/schema/sets.ts)
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
  table => ({
    setIdIdx: index('set_images_set_id_idx').on(table.setId),
  }),
)

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
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' })
    return
  }

  // Extract set ID from query params (Vercel passes dynamic route params as query)
  const setId = req.query.id as string
  if (!setId) {
    res.status(400).json({ error: 'Bad Request', message: 'Set ID is required' })
    return
  }

  // Validate UUID format
  if (!uuidRegex.test(setId)) {
    res.status(400).json({ error: 'Bad Request', message: 'Invalid set ID format' })
    return
  }

  // Validate request body
  if (!req.body) {
    res.status(400).json({ error: 'Bad Request', message: 'Request body is required' })
    return
  }

  const parseResult = RegisterBodySchema.safeParse(req.body)
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map(e => e.message).join(', ')
    res.status(400).json({ error: 'VALIDATION_ERROR', message: errors })
    return
  }

  const body = parseResult.data

  try {
    const db = getDb()

    // Verify set exists and is owned by the current user
    const [setRow] = await db
      .select({
        id: sets.id,
        userId: sets.userId,
      })
      .from(sets)
      .where(eq(sets.id, setId))

    if (!setRow) {
      res.status(404).json({ error: 'Not Found', message: 'Set not found' })
      return
    }

    if (setRow.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to modify this set',
      })
      return
    }

    // Determine next image position (0-based, auto-increment)
    // Find the maximum position for this set
    const [lastImage] = await db
      .select({ position: setImages.position })
      .from(setImages)
      .where(eq(setImages.setId, setId))
      .orderBy(desc(setImages.position))
      .limit(1)

    // If there are existing images, next position is max + 1
    // If no images, start at 0
    const nextPosition = lastImage ? lastImage.position + 1 : 0

    // Insert the new image record
    const [imageRow] = await db
      .insert(setImages)
      .values({
        setId,
        imageUrl: body.imageUrl,
        thumbnailUrl: body.thumbnailUrl ?? null,
        position: nextPosition,
      })
      .returning()

    if (!imageRow) {
      res.status(500).json({ error: 'Database error', message: 'Failed to create image record' })
      return
    }

    const image = {
      id: imageRow.id,
      imageUrl: imageRow.imageUrl,
      thumbnailUrl: imageRow.thumbnailUrl ?? null,
      position: imageRow.position,
    }

    logger.info('Set image registered', {
      userId,
      setId,
      imageId: image.id,
      position: image.position,
    })

    res.status(201).json(image)
  } catch (error) {
    logger.error('Register set image error', {
      setId,
      error: error instanceof Error ? error.message : String(error),
    })

    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: error.message })
      return
    }

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to register image',
    })
  }
}
