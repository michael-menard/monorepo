/**
 * Vercel API Route: /api/wishlist/:id/image
 *
 * POST: Uploads wishlist item image with Sharp processing.
 *
 * - Validates image (JPEG/PNG/WebP, max 5MB - AC-12)
 * - Processes with Sharp (resize to 800px, convert to WebP, 80% quality - AC-4)
 * - Uploads to S3: wishlist/{userId}/{itemId}.webp
 * - Deletes previous image if exists (best-effort)
 * - Updates database imageUrl field
 *
 * Returns 400 for invalid UUID/file, 404 if item not found, 403 if owned by another user
 *
 * STORY-009: Image Uploads - Phase 1
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { processImage } from '@repo/image-processing'
import { parseVercelMultipart, getFile, MultipartParseError } from '@repo/vercel-multipart'

const { logger } = loggerPkg

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// File size limit: 5MB (AC-12)
const MAX_FILE_SIZE = 5 * 1024 * 1024

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

// S3 client (lazy singleton)
let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (s3Client) return s3Client

  const region = process.env.AWS_REGION ?? 'us-east-1'
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials not configured')
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
 */
function extractS3KeyFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    const key = parsed.pathname.startsWith('/') ? parsed.pathname.slice(1) : parsed.pathname
    return key || null
  } catch {
    return null
  }
}

/**
 * Delete old image from S3 (best-effort)
 */
async function deleteOldImage(imageUrl: string | null): Promise<void> {
  if (!imageUrl) return

  const bucket = process.env.WISHLIST_BUCKET
  if (!bucket) return

  const key = extractS3KeyFromUrl(imageUrl)
  if (!key) return

  try {
    const client = getS3Client()
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    logger.info('Deleted old wishlist image from S3', { key })
  } catch (error) {
    // Best-effort: log but don't fail
    logger.warn('Failed to delete old wishlist image', {
      key,
      error: error instanceof Error ? error.message : String(error),
    })
  }
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

  // Extract item ID from query params
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

    // Check if item exists and verify ownership
    const [existingItem] = await db
      .select({
        id: wishlistItems.id,
        userId: wishlistItems.userId,
        imageUrl: wishlistItems.imageUrl,
      })
      .from(wishlistItems)
      .where(eq(wishlistItems.id, itemId))

    if (!existingItem) {
      res.status(404).json({ error: 'Not Found', message: 'Wishlist item not found' })
      return
    }

    if (existingItem.userId !== userId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'You do not have permission to upload images for this item',
      })
      return
    }

    // Parse multipart form data
    let formData
    try {
      formData = await parseVercelMultipart(req, {
        maxFileSize: MAX_FILE_SIZE,
        maxFiles: 1,
        allowedMimeTypes: ALLOWED_IMAGE_TYPES,
      })
    } catch (error) {
      if (error instanceof MultipartParseError) {
        if (error.code === 'INVALID_CONTENT_TYPE') {
          res
            .status(400)
            .json({ error: 'Bad Request', message: 'Content-Type must be multipart/form-data' })
          return
        }
        if (error.code === 'FILE_TOO_LARGE') {
          res
            .status(400)
            .json({ error: 'VALIDATION_ERROR', message: `File size exceeds maximum of 5MB` })
          return
        }
        if (error.code === 'INVALID_MIME_TYPE') {
          res.status(400).json({
            error: 'VALIDATION_ERROR',
            message: 'Invalid file type. Allowed: JPEG, PNG, WebP',
          })
          return
        }
        if (error.code === 'EMPTY_FILE') {
          res.status(400).json({ error: 'Bad Request', message: 'File is empty' })
          return
        }
      }
      throw error
    }

    const file = getFile(formData)
    if (!file) {
      res.status(400).json({ error: 'Bad Request', message: 'No file uploaded' })
      return
    }

    // Get S3 configuration
    const bucket = process.env.WISHLIST_BUCKET
    if (!bucket) {
      logger.error('WISHLIST_BUCKET environment variable is not configured')
      res
        .status(500)
        .json({ error: 'INTERNAL_ERROR', message: 'Image upload bucket not configured' })
      return
    }

    // Process image with Sharp (800px max, WebP, 80% quality) - AC-4
    let processedImage
    try {
      processedImage = await processImage(file.buffer, {
        maxWidth: 800,
        quality: 80,
        format: 'webp',
      })
    } catch (error) {
      logger.error('Image processing error', {
        error: error instanceof Error ? error.message : String(error),
      })
      res.status(400).json({
        error: 'FILE_ERROR',
        message: 'Failed to process image. File may be corrupted.',
      })
      return
    }

    // Upload to S3
    const region = process.env.AWS_REGION ?? 'us-east-1'
    const s3Key = `wishlist/${userId}/${itemId}.webp`

    const client = getS3Client()
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: processedImage.buffer,
        ContentType: 'image/webp',
        Metadata: {
          userId,
          itemId,
          originalFilename: file.filename,
        },
      }),
    )

    const imageUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`

    // Delete old image (best-effort)
    await deleteOldImage(existingItem.imageUrl)

    // Update database with new image URL
    await db
      .update(wishlistItems)
      .set({
        imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(wishlistItems.id, itemId))

    logger.info('Wishlist image uploaded', {
      userId,
      itemId,
      imageUrl,
      processedSize: processedImage.size,
    })

    res.status(200).json({ imageUrl })
  } catch (error) {
    logger.error('Upload wishlist image error', {
      itemId,
      error: error instanceof Error ? error.message : String(error),
    })

    if (error instanceof MultipartParseError) {
      res.status(400).json({ error: 'Bad Request', message: error.message })
      return
    }

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to upload wishlist image',
    })
  }
}
