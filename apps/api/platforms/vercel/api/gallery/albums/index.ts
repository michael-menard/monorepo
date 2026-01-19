/**
 * Vercel API Route: POST /api/gallery/albums
 *
 * Creates a new gallery album for the authenticated user.
 * Returns 201 Created with album object including imageCount: 0.
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

const { logger } = loggerPkg

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Input validation schema
const CreateAlbumInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000, 'Description must be less than 2000 characters').optional(),
  coverImageId: z.string().regex(uuidRegex, 'Invalid image ID format').optional(),
})

// Inline Schema (matches apps/api/core/database/schema/index.ts)
const galleryAlbums = pgTable('gallery_albums', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  coverImageId: uuid('cover_image_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
})

const galleryImages = pgTable('gallery_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  imageUrl: text('image_url').notNull(),
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

  // Validate request body
  const parseResult = CreateAlbumInputSchema.safeParse(req.body)
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map(e => e.message).join(', ')
    res.status(400).json({ error: 'Bad Request', message: errors })
    return
  }

  const input = parseResult.data

  try {
    const db = getDb()

    // If coverImageId provided, validate it exists and belongs to user
    if (input.coverImageId) {
      const [image] = await db
        .select({
          id: galleryImages.id,
          userId: galleryImages.userId,
        })
        .from(galleryImages)
        .where(eq(galleryImages.id, input.coverImageId))

      if (!image) {
        res.status(400).json({
          error: 'Bad Request',
          message: 'Cover image not found',
        })
        return
      }

      if (image.userId !== userId) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Cover image belongs to another user',
        })
        return
      }
    }

    // Generate UUID and timestamps
    const id = crypto.randomUUID()
    const now = new Date()

    // Insert album
    const [inserted] = await db
      .insert(galleryAlbums)
      .values({
        id,
        userId,
        title: input.title,
        description: input.description ?? null,
        coverImageId: input.coverImageId ?? null,
        createdAt: now,
        lastUpdatedAt: now,
      })
      .returning()

    if (!inserted) {
      res.status(500).json({ error: 'Database error', message: 'No row returned from insert' })
      return
    }

    logger.info('Create album', {
      userId,
      albumId: inserted.id,
      title: inserted.title,
    })

    // Return 201 Created with album object
    res.status(201).json({
      id: inserted.id,
      userId: inserted.userId,
      title: inserted.title,
      description: inserted.description,
      coverImageId: inserted.coverImageId,
      coverImageUrl: null, // New album has no cover image URL yet
      imageCount: 0, // New album has no images
      createdAt: inserted.createdAt.toISOString(),
      lastUpdatedAt: inserted.lastUpdatedAt.toISOString(),
    })
  } catch (error) {
    logger.error('Create album error', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
