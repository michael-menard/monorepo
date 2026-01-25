/**
 * Vercel API Route: /api/mocs/:id/gallery-images
 *
 * Handles gallery image linking for MOC Instructions:
 * - GET: Returns all gallery images linked to a MOC
 * - POST: Links an existing gallery image to a MOC
 *
 * Access rules:
 * - Authentication required for all operations
 * - Only MOC owner can list/link gallery images
 * - Cross-user gallery image linking permitted (link any image to your MOC)
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

const galleryImages = pgTable('gallery_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  tags: jsonb('tags').$type<string[]>(),
  imageUrl: text('image_url').notNull(),
  thumbnailUrl: text('thumbnail_url'),
  albumId: uuid('album_id'),
  flagged: text('flagged'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastUpdatedAt: timestamp('last_updated_at').notNull().defaultNow(),
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
  // Route by method
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else {
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' })
    return
  }
}

/**
 * GET /api/mocs/:id/gallery-images
 * Returns all gallery images linked to a MOC
 */
async function handleGet(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Check auth
  const userId = getAuthUserId()
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' })
    return
  }

  // Extract MOC ID from query params
  const mocId = req.query.id as string
  if (!mocId) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'MOC ID is required' })
    return
  }

  // Validate UUID format
  if (!uuidRegex.test(mocId)) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid MOC ID format' })
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

    // Get linked gallery images with full image data
    const linkedImages = await db
      .select({
        id: galleryImages.id,
        title: galleryImages.title,
        description: galleryImages.description,
        url: galleryImages.imageUrl,
        tags: galleryImages.tags,
        createdAt: galleryImages.createdAt,
        lastUpdatedAt: galleryImages.lastUpdatedAt,
      })
      .from(mocGalleryImages)
      .innerJoin(galleryImages, eq(mocGalleryImages.galleryImageId, galleryImages.id))
      .where(eq(mocGalleryImages.mocId, mocId))
      .orderBy(galleryImages.createdAt)

    // Format response with ISO date strings
    const formattedImages = linkedImages.map(img => ({
      id: img.id,
      title: img.title,
      description: img.description,
      url: img.url,
      tags: img.tags,
      createdAt: img.createdAt.toISOString(),
      lastUpdatedAt: img.lastUpdatedAt.toISOString(),
    }))

    logger.info(`Retrieved ${linkedImages.length} gallery images for MOC ${mocId}`, {
      userId,
      mocId,
      count: linkedImages.length,
    })

    res.status(200).json({
      images: formattedImages,
      total: formattedImages.length,
    })
  } catch (error) {
    logger.error('Error in get-moc-gallery-images handler:', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to get gallery images' })
  }
}

/**
 * POST /api/mocs/:id/gallery-images
 * Links an existing gallery image to a MOC
 */
async function handlePost(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Check auth
  const userId = getAuthUserId()
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' })
    return
  }

  // Extract MOC ID from query params
  const mocId = req.query.id as string
  if (!mocId) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'MOC ID is required' })
    return
  }

  // Validate MOC ID UUID format
  if (!uuidRegex.test(mocId)) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid MOC ID format' })
    return
  }

  // Parse request body
  let body: { galleryImageId?: string }
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
  } catch {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON body' })
    return
  }

  const { galleryImageId } = body

  // Validate galleryImageId is present
  if (!galleryImageId) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'galleryImageId is required' })
    return
  }

  // Validate galleryImageId UUID format
  if (!uuidRegex.test(galleryImageId)) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid galleryImageId format' })
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

    // Verify gallery image exists (cross-user linking permitted)
    const [image] = await db
      .select({ id: galleryImages.id })
      .from(galleryImages)
      .where(eq(galleryImages.id, galleryImageId))
      .limit(1)

    if (!image) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Gallery image not found' })
      return
    }

    // Check if link already exists
    const [existingLink] = await db
      .select({ id: mocGalleryImages.id })
      .from(mocGalleryImages)
      .where(
        and(eq(mocGalleryImages.mocId, mocId), eq(mocGalleryImages.galleryImageId, galleryImageId)),
      )
      .limit(1)

    if (existingLink) {
      res.status(409).json({ error: 'CONFLICT', message: 'Image is already linked to this MOC' })
      return
    }

    // Create the link
    const [link] = await db
      .insert(mocGalleryImages)
      .values({
        mocId,
        galleryImageId,
      })
      .returning()

    logger.info(`Gallery image linked to MOC: ${galleryImageId} -> ${mocId}`, {
      userId,
      mocId,
      galleryImageId,
    })

    res.status(201).json({
      message: 'Gallery image linked successfully',
      link: {
        id: link.id,
        mocId: link.mocId,
        galleryImageId: link.galleryImageId,
      },
    })
  } catch (error) {
    logger.error('Error in link-gallery-image handler:', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to link gallery image' })
  }
}
