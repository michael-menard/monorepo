/**
 * Vercel API Route: /api/sets/:id/images/:imageId
 *
 * DELETE: Deletes an image from the set_images table with best-effort S3 cleanup.
 *
 * - Removes DB record
 * - Attempts to delete S3 object(s) (image and thumbnail if exists)
 * - S3 cleanup failures are logged but do not fail the request (AC-18)
 * - Returns 204 No Content on success
 * - Returns 400 for invalid UUID, 404 if set/image not found, 403 if owned by another user
 *
 * STORY-009: Image Uploads - Phase 1
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { and, eq } from 'drizzle-orm'
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
import { S3Client, DeleteObjectsCommand } from '@aws-sdk/client-s3'

const { logger } = loggerPkg

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

// S3 client (lazy singleton)
let s3Client: S3Client | null = null

function getS3Client(): S3Client | null {
  if (s3Client) return s3Client

  const region = process.env.AWS_REGION ?? 'us-east-1'
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

  if (!accessKeyId || !secretAccessKey) {
    logger.warn('AWS credentials not configured, skipping S3 cleanup')
    return null
  }

  s3Client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })

  return s3Client
}

/**
 * Extract S3 key from full URL
 * URL format: https://bucket.s3.region.amazonaws.com/key
 */
function extractS3KeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const key = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname
    return key || null
  } catch {
    logger.warn('Failed to parse S3 URL', { url })
    return null
  }
}

/**
 * Best-effort S3 deletion - logs failures but does not throw
 */
async function deleteFromS3(imageUrl: string, thumbnailUrl: string | null): Promise<void> {
  const client = getS3Client()
  const bucket = process.env.SETS_BUCKET

  if (!client || !bucket) {
    logger.warn('S3 not configured, skipping cleanup')
    return
  }

  const keys: string[] = []

  const mainKey = extractS3KeyFromUrl(imageUrl)
  if (mainKey) keys.push(mainKey)

  if (thumbnailUrl) {
    const thumbKey = extractS3KeyFromUrl(thumbnailUrl)
    if (thumbKey) keys.push(thumbKey)
  }

  if (keys.length === 0) {
    return
  }

  try {
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: keys.map(Key => ({ Key })) },
      }),
    )
    logger.info('Set image S3 objects deleted', { keys })
  } catch (error) {
    logger.error('Failed to delete set image from S3', {
      keys,
      error: error instanceof Error ? error.message : String(error),
    })
    // Best-effort: do not fail the request
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only allow DELETE
  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const userId = getAuthUserId()

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' })
    return
  }

  // Extract set ID and image ID from query params
  const setId = req.query.id as string
  const imageId = req.query.imageId as string

  if (!setId) {
    res.status(400).json({ error: 'Bad Request', message: 'Set ID is required' })
    return
  }

  if (!imageId) {
    res.status(400).json({ error: 'Bad Request', message: 'Image ID is required' })
    return
  }

  // Validate UUID formats
  if (!uuidRegex.test(setId)) {
    res.status(400).json({ error: 'Bad Request', message: 'Invalid set ID format' })
    return
  }

  if (!uuidRegex.test(imageId)) {
    res.status(400).json({ error: 'Bad Request', message: 'Invalid image ID format' })
    return
  }

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

    // Load image for S3 cleanup
    const [imageRow] = await db
      .select({
        imageUrl: setImages.imageUrl,
        thumbnailUrl: setImages.thumbnailUrl,
      })
      .from(setImages)
      .where(and(eq(setImages.id, imageId), eq(setImages.setId, setId)))

    if (!imageRow) {
      res.status(404).json({ error: 'Not Found', message: 'Image not found' })
      return
    }

    // Delete DB record
    await db.delete(setImages).where(and(eq(setImages.id, imageId), eq(setImages.setId, setId)))

    logger.info('Set image deleted from DB', {
      userId,
      setId,
      imageId,
    })

    // Best-effort S3 cleanup (AC-18)
    await deleteFromS3(imageRow.imageUrl, imageRow.thumbnailUrl)

    res.status(204).end()
  } catch (error) {
    logger.error('Delete set image error', {
      setId,
      imageId,
      error: error instanceof Error ? error.message : String(error),
    })

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to delete image',
    })
  }
}
