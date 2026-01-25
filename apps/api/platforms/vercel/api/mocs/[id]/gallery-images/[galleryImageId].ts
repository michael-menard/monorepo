/**
 * Vercel API Route: /api/mocs/:id/gallery-images/:galleryImageId
 *
 * Handles unlinking gallery images from MOC Instructions:
 * - DELETE: Removes the association between a gallery image and a MOC
 *
 * Access rules:
 * - Authentication required
 * - Only MOC owner can unlink gallery images
 *
 * STORY-012: MOC Instructions - Gallery Linking
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, and } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { logger } = loggerPkg

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Inline Schema (matches apps/api/core/database/schema/index.ts)
const mocInstructions = pgTable('moc_instructions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  mocId: text('moc_id'),
  slug: text('slug'),
  title: text('title').notNull(),
  description: text('description'),
  author: text('author'),
  brand: text('brand'),
  theme: text('theme'),
  subtheme: text('subtheme'),
  setNumber: text('set_number'),
  releaseYear: text('release_year'),
  retired: text('retired'),
  partsCount: text('parts_count'),
  tags: jsonb('tags').$type<string[]>(),
  thumbnailUrl: text('thumbnail_url'),
  status: text('status').notNull().default('draft'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

const mocGalleryImages = pgTable('moc_gallery_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  mocId: uuid('moc_id').notNull(),
  galleryImageId: uuid('gallery_image_id').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
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

/**
 * Get user ID from AUTH_BYPASS or return null.
 * This endpoint requires authentication.
 */
function getAuthUserId(): string | null {
  if (process.env.AUTH_BYPASS === 'true') {
    return process.env.DEV_USER_SUB ?? 'dev-user-00000000-0000-0000-0000-000000000001'
  }
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only allow DELETE
  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' })
    return
  }

  // Check auth
  const userId = getAuthUserId()
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' })
    return
  }

  // Extract MOC ID and Gallery Image ID from query params
  const mocId = req.query.id as string
  const galleryImageId = req.query.galleryImageId as string

  if (!mocId) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'MOC ID is required' })
    return
  }

  if (!galleryImageId) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Gallery Image ID is required' })
    return
  }

  // Validate MOC ID UUID format
  if (!uuidRegex.test(mocId)) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid MOC ID format' })
    return
  }

  // Validate Gallery Image ID UUID format
  if (!uuidRegex.test(galleryImageId)) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid Gallery Image ID format' })
    return
  }

  try {
    const db = getDb()

    // Verify MOC exists and check ownership
    const [moc] = await db
      .select({ id: mocInstructions.id, userId: mocInstructions.userId })
      .from(mocInstructions)
      .where(eq(mocInstructions.id, mocId))
      .limit(1)

    if (!moc) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'MOC not found' })
      return
    }

    if (moc.userId !== userId) {
      res.status(403).json({ error: 'FORBIDDEN', message: 'You do not own this MOC' })
      return
    }

    // Check if link exists
    const [link] = await db
      .select({ id: mocGalleryImages.id })
      .from(mocGalleryImages)
      .where(
        and(eq(mocGalleryImages.mocId, mocId), eq(mocGalleryImages.galleryImageId, galleryImageId)),
      )
      .limit(1)

    if (!link) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Image is not linked to this MOC' })
      return
    }

    // Delete the link
    await db
      .delete(mocGalleryImages)
      .where(
        and(eq(mocGalleryImages.mocId, mocId), eq(mocGalleryImages.galleryImageId, galleryImageId)),
      )

    logger.info(`Gallery image unlinked from MOC: ${galleryImageId} -> ${mocId}`, {
      userId,
      mocId,
      galleryImageId,
    })

    res.status(200).json({
      message: 'Gallery image unlinked successfully',
    })
  } catch (error) {
    logger.error('Error in unlink-gallery-image handler:', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to unlink gallery image' })
  }
}
