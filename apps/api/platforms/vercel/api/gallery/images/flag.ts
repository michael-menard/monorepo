/**
 * Vercel API Route: /api/gallery/images/flag
 *
 * Handles POST for flagging a gallery image for moderation.
 * - POST: Creates a flag record
 *
 * Body:
 * - imageId: Required UUID of image to flag
 * - reason: Optional reason for flagging
 *
 * Returns 201 with flag confirmation on success.
 * Returns 400 for invalid imageId format.
 * Returns 404 if image doesn't exist.
 * Returns 409 if user has already flagged this image.
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { and, eq } from 'drizzle-orm'
import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

const { logger } = loggerPkg

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Input validation schema
const FlagImageInputSchema = z.object({
  imageId: z.string().regex(uuidRegex, 'Invalid image ID format'),
  reason: z.string().max(1000).optional().nullable(),
})

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

const galleryFlags = pgTable(
  'gallery_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    imageId: uuid('image_id').notNull(),
    userId: text('user_id').notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
  },
  table => ({
    userIdx: index('idx_gallery_flags_user_id_lazy').on(table.userId),
    imageIdx: index('idx_gallery_flags_image_id').on(table.imageId),
    uniqueImageUser: uniqueIndex('gallery_flags_image_user_unique').on(table.imageId, table.userId),
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
    res.status(401).json({ error: 'Unauthorized', message: 'Auth not configured' })
    return
  }

  // Validate request body
  const parseResult = FlagImageInputSchema.safeParse(req.body)
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map(e => e.message).join(', ')
    res.status(400).json({ error: 'Bad Request', message: errors })
    return
  }

  const { imageId, reason } = parseResult.data

  try {
    const db = getDb()

    // Check if image exists
    const [image] = await db
      .select({ id: galleryImages.id })
      .from(galleryImages)
      .where(eq(galleryImages.id, imageId))

    if (!image) {
      res.status(404).json({ error: 'Not Found', message: 'Image not found' })
      return
    }

    // Check if user has already flagged this image
    const [existingFlag] = await db
      .select({ id: galleryFlags.id })
      .from(galleryFlags)
      .where(and(eq(galleryFlags.imageId, imageId), eq(galleryFlags.userId, userId)))

    if (existingFlag) {
      res.status(409).json({ error: 'Conflict', message: 'You have already flagged this image' })
      return
    }

    // Insert flag record
    const [flag] = await db
      .insert(galleryFlags)
      .values({
        imageId,
        userId,
        reason: reason ?? null,
      })
      .returning()

    logger.info('Flag gallery image', { userId, imageId, flagId: flag.id })

    res.status(201).json({
      id: flag.id,
      imageId: flag.imageId,
      userId: flag.userId,
      reason: flag.reason,
      createdAt: flag.createdAt.toISOString(),
      lastUpdatedAt: flag.lastUpdatedAt.toISOString(),
    })
  } catch (error) {
    // Check for unique constraint violation (PostgreSQL error code 23505)
    if (error instanceof Error && error.message.includes('23505')) {
      res.status(409).json({ error: 'Conflict', message: 'You have already flagged this image' })
      return
    }

    logger.error('Flag image error', {
      imageId,
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
