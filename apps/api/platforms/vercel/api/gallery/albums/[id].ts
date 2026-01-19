/**
 * Vercel API Route: /api/gallery/albums/:id
 *
 * Handles GET, PATCH, DELETE for a single gallery album.
 * - GET: Returns album with images array
 * - PATCH: Updates album (patch semantics)
 * - DELETE: Deletes album (orphans images)
 *
 * Returns 400 for invalid UUID, 404 if not found, 403 if owned by another user.
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { count, desc, eq } from 'drizzle-orm'
import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

const { logger } = loggerPkg

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Input validation schema for PATCH
const UpdateAlbumInputSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  coverImageId: z.string().regex(uuidRegex).nullable().optional(),
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

// GET handler - returns album with images
async function handleGet(
  req: VercelRequest,
  res: VercelResponse,
  db: ReturnType<typeof drizzle>,
  userId: string,
  albumId: string,
): Promise<void> {
  // Get album
  const [album] = await db
    .select({
      id: galleryAlbums.id,
      userId: galleryAlbums.userId,
      title: galleryAlbums.title,
      description: galleryAlbums.description,
      coverImageId: galleryAlbums.coverImageId,
      createdAt: galleryAlbums.createdAt,
      lastUpdatedAt: galleryAlbums.lastUpdatedAt,
    })
    .from(galleryAlbums)
    .where(eq(galleryAlbums.id, albumId))

  if (!album) {
    res.status(404).json({ error: 'Not Found', message: 'Album not found' })
    return
  }

  if (album.userId !== userId) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access this album',
    })
    return
  }

  // Get images in this album, ordered by createdAt DESC
  const images = await db
    .select({
      id: galleryImages.id,
      userId: galleryImages.userId,
      title: galleryImages.title,
      description: galleryImages.description,
      tags: galleryImages.tags,
      imageUrl: galleryImages.imageUrl,
      thumbnailUrl: galleryImages.thumbnailUrl,
      albumId: galleryImages.albumId,
      flagged: galleryImages.flagged,
      createdAt: galleryImages.createdAt,
      lastUpdatedAt: galleryImages.lastUpdatedAt,
    })
    .from(galleryImages)
    .where(eq(galleryImages.albumId, albumId))
    .orderBy(desc(galleryImages.createdAt))

  // Find cover image URL if coverImageId is set
  let coverImageUrl: string | null = null
  if (album.coverImageId) {
    const coverImage = images.find(img => img.id === album.coverImageId)
    coverImageUrl = coverImage?.imageUrl ?? null
  }

  // Transform images to API format
  const transformedImages = images.map(img => ({
    id: img.id,
    userId: img.userId,
    title: img.title,
    description: img.description,
    tags: img.tags,
    imageUrl: img.imageUrl,
    thumbnailUrl: img.thumbnailUrl,
    albumId: img.albumId,
    flagged: img.flagged,
    createdAt: img.createdAt.toISOString(),
    lastUpdatedAt: img.lastUpdatedAt.toISOString(),
  }))

  logger.info('Get album', { userId, albumId })

  res.status(200).json({
    id: album.id,
    userId: album.userId,
    title: album.title,
    description: album.description,
    coverImageId: album.coverImageId,
    coverImageUrl,
    imageCount: images.length,
    createdAt: album.createdAt.toISOString(),
    lastUpdatedAt: album.lastUpdatedAt.toISOString(),
    images: transformedImages,
  })
}

// PATCH handler - updates album
async function handlePatch(
  req: VercelRequest,
  res: VercelResponse,
  db: ReturnType<typeof drizzle>,
  userId: string,
  albumId: string,
): Promise<void> {
  // Validate request body
  const parseResult = UpdateAlbumInputSchema.safeParse(req.body)
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map(e => e.message).join(', ')
    res.status(400).json({ error: 'Bad Request', message: errors })
    return
  }

  const input = parseResult.data

  // Check if album exists and get ownership
  const [existing] = await db
    .select({
      id: galleryAlbums.id,
      userId: galleryAlbums.userId,
    })
    .from(galleryAlbums)
    .where(eq(galleryAlbums.id, albumId))

  if (!existing) {
    res.status(404).json({ error: 'Not Found', message: 'Album not found' })
    return
  }

  if (existing.userId !== userId) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to update this album',
    })
    return
  }

  // If coverImageId provided (and not null), validate it exists and belongs to user
  if (input.coverImageId !== undefined && input.coverImageId !== null) {
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

  // Build update data - only include provided fields
  const updateData: Record<string, unknown> = {
    lastUpdatedAt: new Date(),
  }

  if (input.title !== undefined) updateData.title = input.title
  if (input.description !== undefined) updateData.description = input.description
  if (input.coverImageId !== undefined) updateData.coverImageId = input.coverImageId

  const [updated] = await db
    .update(galleryAlbums)
    .set(updateData)
    .where(eq(galleryAlbums.id, albumId))
    .returning()

  if (!updated) {
    res.status(500).json({ error: 'Database error', message: 'No row returned from update' })
    return
  }

  // Get imageCount
  const [countResult] = await db
    .select({ count: count() })
    .from(galleryImages)
    .where(eq(galleryImages.albumId, albumId))

  const imageCount = Number(countResult?.count ?? 0)

  // Get cover image URL if set
  let coverImageUrl: string | null = null
  if (updated.coverImageId) {
    const [coverImage] = await db
      .select({
        imageUrl: galleryImages.imageUrl,
      })
      .from(galleryImages)
      .where(eq(galleryImages.id, updated.coverImageId))

    coverImageUrl = coverImage?.imageUrl ?? null
  }

  logger.info('Update album', { userId, albumId })

  res.status(200).json({
    id: updated.id,
    userId: updated.userId,
    title: updated.title,
    description: updated.description,
    coverImageId: updated.coverImageId,
    coverImageUrl,
    imageCount,
    createdAt: updated.createdAt.toISOString(),
    lastUpdatedAt: updated.lastUpdatedAt.toISOString(),
  })
}

// DELETE handler - deletes album and orphans images
async function handleDelete(
  req: VercelRequest,
  res: VercelResponse,
  db: ReturnType<typeof drizzle>,
  userId: string,
  albumId: string,
): Promise<void> {
  // Check if album exists and get ownership
  const [existing] = await db
    .select({
      id: galleryAlbums.id,
      userId: galleryAlbums.userId,
    })
    .from(galleryAlbums)
    .where(eq(galleryAlbums.id, albumId))

  if (!existing) {
    res.status(404).json({ error: 'Not Found', message: 'Album not found' })
    return
  }

  if (existing.userId !== userId) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to delete this album',
    })
    return
  }

  // Orphan images - set albumId to null for all images in this album
  await db.update(galleryImages).set({ albumId: null }).where(eq(galleryImages.albumId, albumId))

  // Delete the album
  await db.delete(galleryAlbums).where(eq(galleryAlbums.id, albumId))

  logger.info('Delete album', { userId, albumId })

  res.status(204).end()
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only allow GET, PATCH, DELETE
  if (!['GET', 'PATCH', 'DELETE'].includes(req.method ?? '')) {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const userId = getAuthUserId()

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'Auth not configured' })
    return
  }

  // Extract album ID from query params (Vercel passes dynamic route params as query)
  const albumId = req.query.id as string
  if (!albumId) {
    res.status(400).json({ error: 'Bad Request', message: 'Album ID is required' })
    return
  }

  // Validate UUID format
  if (!uuidRegex.test(albumId)) {
    res.status(400).json({ error: 'Bad Request', message: 'Invalid album ID format' })
    return
  }

  try {
    const db = getDb()

    switch (req.method) {
      case 'GET':
        await handleGet(req, res, db, userId, albumId)
        break
      case 'PATCH':
        await handlePatch(req, res, db, userId, albumId)
        break
      case 'DELETE':
        await handleDelete(req, res, db, userId, albumId)
        break
    }
  } catch (error) {
    logger.error('Album error', {
      method: req.method,
      albumId,
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
