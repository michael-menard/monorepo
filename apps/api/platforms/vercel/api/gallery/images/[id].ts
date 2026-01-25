/**
 * Vercel API Route: /api/gallery/images/:id
 *
 * Handles GET, PATCH, DELETE for a single gallery image.
 * - GET: Returns image object
 * - PATCH: Updates image metadata (title, description, tags, albumId)
 * - DELETE: Deletes image and attempts S3 cleanup (best-effort)
 *
 * Returns 400 for invalid UUID, 404 if not found, 403 if owned by another user.
 *
 * STORY-008: Gallery - Images Write (No Upload)
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3'

const { logger } = loggerPkg

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Input validation schema for PATCH (STORY-008)
const UpdateImageInputSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .nullable()
    .optional(),
  tags: z
    .array(z.string().max(50, 'Each tag must be 50 characters or less'))
    .max(20, 'Maximum 20 tags allowed')
    .nullable()
    .optional(),
  albumId: z.string().regex(uuidRegex, 'Invalid album ID format').nullable().optional(),
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

const galleryAlbums = pgTable('gallery_albums', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  coverImageId: uuid('cover_image_id'),
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

// S3 client for cleanup (lazy initialization)
let s3Client: S3Client | null = null

function getS3Client(): S3Client | null {
  if (s3Client) return s3Client

  const region = process.env.AWS_REGION
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

  if (!region || !accessKeyId || !secretAccessKey) {
    logger.warn('S3 credentials not configured, skipping S3 cleanup')
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

function getS3Bucket(): string | null {
  return process.env.GALLERY_BUCKET ?? process.env.AWS_S3_BUCKET ?? null
}

/**
 * Extract S3 key from full URL
 * URL format: https://bucket.s3.region.amazonaws.com/key
 */
function extractS3Key(url: string): string | null {
  try {
    const parsed = new URL(url)
    const key = parsed.pathname.startsWith('/') ? parsed.pathname.substring(1) : parsed.pathname
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
  const bucket = getS3Bucket()

  if (!client || !bucket) {
    logger.warn('S3 not configured, skipping cleanup')
    return
  }

  // Delete main image
  const imageKey = extractS3Key(imageUrl)
  if (imageKey) {
    try {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: imageKey }))
      logger.info('Deleted image from S3', { key: imageKey })
    } catch (error) {
      logger.error('Failed to delete image from S3', {
        key: imageKey,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Delete thumbnail if exists
  if (thumbnailUrl) {
    const thumbnailKey = extractS3Key(thumbnailUrl)
    if (thumbnailKey) {
      try {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: thumbnailKey }))
        logger.info('Deleted thumbnail from S3', { key: thumbnailKey })
      } catch (error) {
        logger.error('Failed to delete thumbnail from S3', {
          key: thumbnailKey,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  }
}

// GET handler - returns image
async function handleGet(
  res: VercelResponse,
  db: ReturnType<typeof drizzle>,
  userId: string,
  imageId: string,
): Promise<void> {
  // Get image
  const [image] = await db
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
    .where(eq(galleryImages.id, imageId))

  if (!image) {
    res.status(404).json({ error: 'Not Found', message: 'Image not found' })
    return
  }

  if (image.userId !== userId) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to access this image',
    })
    return
  }

  logger.info('Get gallery image', { userId, imageId })

  res.status(200).json({
    id: image.id,
    userId: image.userId,
    title: image.title,
    description: image.description,
    tags: image.tags,
    imageUrl: image.imageUrl,
    thumbnailUrl: image.thumbnailUrl,
    albumId: image.albumId,
    flagged: image.flagged,
    createdAt: image.createdAt.toISOString(),
    lastUpdatedAt: image.lastUpdatedAt.toISOString(),
  })
}

// PATCH handler - updates image metadata (STORY-008)
async function handlePatch(
  req: VercelRequest,
  res: VercelResponse,
  db: ReturnType<typeof drizzle>,
  userId: string,
  imageId: string,
): Promise<void> {
  // Validate request body
  const parseResult = UpdateImageInputSchema.safeParse(req.body)
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map(e => e.message).join(', ')
    res.status(400).json({ error: 'Bad Request', message: errors })
    return
  }

  const input = parseResult.data

  // Check if image exists and get ownership
  const [existing] = await db
    .select({
      id: galleryImages.id,
      userId: galleryImages.userId,
    })
    .from(galleryImages)
    .where(eq(galleryImages.id, imageId))

  if (!existing) {
    res.status(404).json({ error: 'Not Found', message: 'Image not found' })
    return
  }

  if (existing.userId !== userId) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to update this image',
    })
    return
  }

  // If albumId provided (and not null), validate it exists and belongs to user (AC-3)
  if (input.albumId !== undefined && input.albumId !== null) {
    const [album] = await db
      .select({
        id: galleryAlbums.id,
        userId: galleryAlbums.userId,
      })
      .from(galleryAlbums)
      .where(eq(galleryAlbums.id, input.albumId))

    if (!album) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Album not found',
      })
      return
    }

    if (album.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Album belongs to another user',
      })
      return
    }
  }

  // Build update data - only include provided fields
  // Always update lastUpdatedAt (per AC-4: even for empty body)
  const updateData: Record<string, unknown> = {
    lastUpdatedAt: new Date(),
  }

  if (input.title !== undefined) updateData.title = input.title
  if (input.description !== undefined) updateData.description = input.description
  if (input.tags !== undefined) updateData.tags = input.tags
  if (input.albumId !== undefined) updateData.albumId = input.albumId

  const [updated] = await db
    .update(galleryImages)
    .set(updateData)
    .where(eq(galleryImages.id, imageId))
    .returning()

  if (!updated) {
    res.status(500).json({ error: 'Database error', message: 'No row returned from update' })
    return
  }

  logger.info('Update gallery image', { userId, imageId })

  res.status(200).json({
    id: updated.id,
    userId: updated.userId,
    title: updated.title,
    description: updated.description,
    tags: updated.tags,
    imageUrl: updated.imageUrl,
    thumbnailUrl: updated.thumbnailUrl,
    albumId: updated.albumId,
    flagged: updated.flagged,
    createdAt: updated.createdAt.toISOString(),
    lastUpdatedAt: updated.lastUpdatedAt.toISOString(),
  })
}

// DELETE handler - deletes image with S3 cleanup (STORY-008)
async function handleDelete(
  res: VercelResponse,
  db: ReturnType<typeof drizzle>,
  userId: string,
  imageId: string,
): Promise<void> {
  // Check if image exists, get ownership, and get URLs for S3 cleanup
  const [existing] = await db
    .select({
      id: galleryImages.id,
      userId: galleryImages.userId,
      imageUrl: galleryImages.imageUrl,
      thumbnailUrl: galleryImages.thumbnailUrl,
    })
    .from(galleryImages)
    .where(eq(galleryImages.id, imageId))

  if (!existing) {
    res.status(404).json({ error: 'Not Found', message: 'Image not found' })
    return
  }

  if (existing.userId !== userId) {
    res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have permission to delete this image',
    })
    return
  }

  // Clear coverImageId on any album that uses this image as cover (AC-6)
  // This must happen BEFORE deletion to avoid FK constraint issues
  await db
    .update(galleryAlbums)
    .set({ coverImageId: null })
    .where(eq(galleryAlbums.coverImageId, imageId))

  // Delete the image
  // gallery_flags and moc_gallery_images are cascade-deleted via FK constraints
  await db.delete(galleryImages).where(eq(galleryImages.id, imageId))

  logger.info('Delete gallery image', { userId, imageId })

  // S3 cleanup (best-effort, AC-7) - after DB deletion
  // Do not await completion, return 204 immediately
  // Actually, we should await but not fail if it errors
  await deleteFromS3(existing.imageUrl, existing.thumbnailUrl)

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

  // Extract image ID from query params (Vercel passes dynamic route params as query)
  const imageId = req.query.id as string
  if (!imageId) {
    res.status(400).json({ error: 'Bad Request', message: 'Image ID is required' })
    return
  }

  // Validate UUID format
  if (!uuidRegex.test(imageId)) {
    res.status(400).json({ error: 'Bad Request', message: 'Invalid image ID format' })
    return
  }

  try {
    const db = getDb()

    switch (req.method) {
      case 'GET':
        await handleGet(res, db, userId, imageId)
        break
      case 'PATCH':
        await handlePatch(req, res, db, userId, imageId)
        break
      case 'DELETE':
        await handleDelete(res, db, userId, imageId)
        break
    }
  } catch (error) {
    logger.error('Image error', {
      method: req.method,
      imageId,
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
