/**
 * Vercel API Route: /api/gallery/images/upload
 *
 * POST: Uploads gallery image with Sharp processing + thumbnail + OpenSearch indexing.
 *
 * - Validates image (JPEG/PNG/WebP, max 10MB - AC-13)
 * - Processes with Sharp (resize to 2048px, convert to WebP, 80% quality - AC-5)
 * - Generates 400px thumbnail (AC-5)
 * - Uploads both to S3
 * - Creates gallery_images database row
 * - Indexes in OpenSearch (best-effort, non-blocking - AC-6, AC-19)
 *
 * Returns 400 for invalid file/body, 201 Created with GalleryImage on success
 *
 * STORY-009: Image Uploads - Phase 1
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { processImage, generateThumbnail } from '@repo/image-processing'
import {
  parseVercelMultipart,
  getFile,
  getField,
  MultipartParseError,
} from '@repo/vercel-multipart'
import { v4 as uuidv4 } from 'uuid'

const { logger } = loggerPkg

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Allowed image MIME types (AC-14)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// File size limit: 10MB (AC-13)
const MAX_FILE_SIZE = 10 * 1024 * 1024

// Input validation schema for form fields
const GalleryUploadMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
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
 * Index document in OpenSearch (best-effort, non-blocking)
 * AC-6, AC-19: Failures are logged but do not fail the request
 */
async function indexInOpenSearch(
  imageId: string,
  userId: string,
  metadata: {
    title: string
    description: string | null
    tags: string[] | null
    albumId: string | null
    createdAt: Date
  },
): Promise<void> {
  const opensearchEndpoint = process.env.OPENSEARCH_ENDPOINT

  if (!opensearchEndpoint) {
    logger.info('OpenSearch not configured, skipping indexing')
    return
  }

  try {
    // Build the endpoint URL
    const endpoint = opensearchEndpoint.startsWith('https://')
      ? opensearchEndpoint
      : `https://${opensearchEndpoint}`

    const indexUrl = `${endpoint}/gallery_images/_doc/${imageId}?refresh=true`

    const body = {
      userId,
      title: metadata.title,
      description: metadata.description || '',
      tags: metadata.tags || [],
      albumId: metadata.albumId || null,
      createdAt: metadata.createdAt.toISOString(),
    }

    // Use fetch for simplicity in Vercel environment
    const response = await fetch(indexUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`OpenSearch responded with status ${response.status}`)
    }

    logger.info('Gallery image indexed in OpenSearch', { imageId })
  } catch (error) {
    // AC-19: Non-blocking, best-effort
    logger.error('OpenSearch indexing failed (non-critical)', {
      imageId,
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

  try {
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
            .json({ error: 'VALIDATION_ERROR', message: 'File size exceeds maximum of 10MB' })
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

    // Parse and validate form fields
    const titleField = getField(formData, 'title')
    const descriptionField = getField(formData, 'description')
    const tagsField = getField(formData, 'tags')
    const albumIdField = getField(formData, 'albumId')

    // Parse tags if provided
    let tags: string[] | null = null
    if (tagsField) {
      try {
        // Support both JSON array and comma-separated string
        if (tagsField.startsWith('[')) {
          tags = JSON.parse(tagsField)
        } else {
          tags = tagsField
            .split(',')
            .map(t => t.trim())
            .filter(Boolean)
        }
      } catch {
        res
          .status(400)
          .json({ error: 'VALIDATION_ERROR', message: 'Invalid JSON format for tags field' })
        return
      }
    }

    const metadataParseResult = GalleryUploadMetadataSchema.safeParse({
      title: titleField,
      description: descriptionField || null,
      tags,
      albumId: albumIdField || null,
    })

    if (!metadataParseResult.success) {
      const errors = metadataParseResult.error.issues.map(e => e.message).join(', ')
      res.status(400).json({ error: 'VALIDATION_ERROR', message: errors })
      return
    }

    const metadata = metadataParseResult.data

    const db = getDb()

    // If albumId provided, validate it exists and belongs to user
    if (metadata.albumId) {
      const [album] = await db
        .select({
          id: galleryAlbums.id,
          userId: galleryAlbums.userId,
        })
        .from(galleryAlbums)
        .where(eq(galleryAlbums.id, metadata.albumId))

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

    // Get S3 configuration
    const bucket = process.env.GALLERY_BUCKET
    if (!bucket) {
      logger.error('GALLERY_BUCKET environment variable is not configured')
      res
        .status(500)
        .json({ error: 'INTERNAL_ERROR', message: 'Image upload bucket not configured' })
      return
    }

    // Process main image with Sharp (2048px max, WebP, 80% quality) - AC-5
    let processedImage
    try {
      processedImage = await processImage(file.buffer, {
        maxWidth: 2048,
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

    // Generate thumbnail (400px) - AC-5
    let thumbnail
    try {
      thumbnail = await generateThumbnail(processedImage.buffer, 400)
    } catch (error) {
      logger.error('Thumbnail generation error', {
        error: error instanceof Error ? error.message : String(error),
      })
      res.status(400).json({
        error: 'FILE_ERROR',
        message: 'Failed to generate thumbnail. File may be corrupted.',
      })
      return
    }

    // Generate unique ID for image
    const imageId = uuidv4()
    const region = process.env.AWS_REGION ?? 'us-east-1'

    // Upload main image to S3
    const imageKey = `images/${userId}/${imageId}.webp`
    const client = getS3Client()

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: imageKey,
        Body: processedImage.buffer,
        ContentType: 'image/webp',
        Metadata: {
          userId,
          imageId,
          originalFilename: file.filename,
        },
      }),
    )

    const imageUrl = `https://${bucket}.s3.${region}.amazonaws.com/${imageKey}`

    // Upload thumbnail to S3
    const thumbnailKey = `images/${userId}/thumbnails/${imageId}.webp`
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: thumbnailKey,
        Body: thumbnail.buffer,
        ContentType: 'image/webp',
        Metadata: {
          userId,
          imageId,
          type: 'thumbnail',
        },
      }),
    )

    const thumbnailUrl = `https://${bucket}.s3.${region}.amazonaws.com/${thumbnailKey}`

    // Create database record
    const now = new Date()
    const [newImage] = await db
      .insert(galleryImages)
      .values({
        id: imageId,
        userId,
        title: metadata.title,
        description: metadata.description || null,
        tags: metadata.tags || [],
        imageUrl,
        thumbnailUrl,
        albumId: metadata.albumId || null,
        flagged: false,
        createdAt: now,
        lastUpdatedAt: now,
      })
      .returning()

    if (!newImage) {
      res.status(500).json({ error: 'Database error', message: 'Failed to create image record' })
      return
    }

    logger.info('Gallery image uploaded', {
      userId,
      imageId: newImage.id,
      imageUrl,
      thumbnailUrl,
      processedSize: processedImage.size,
      thumbnailSize: thumbnail.size,
    })

    // Index in OpenSearch (best-effort, non-blocking) - AC-6, AC-19
    // Do not await - let it run in the background
    indexInOpenSearch(newImage.id, userId, {
      title: metadata.title,
      description: metadata.description || null,
      tags: metadata.tags || null,
      albumId: metadata.albumId || null,
      createdAt: now,
    }).catch(err => {
      // Already logged in indexInOpenSearch, this is just a safety net
      logger.error('OpenSearch indexing promise rejected', {
        imageId: newImage.id,
        error: err instanceof Error ? err.message : String(err),
      })
    })

    res.status(201).json({
      id: newImage.id,
      userId: newImage.userId,
      title: newImage.title,
      description: newImage.description,
      tags: newImage.tags,
      imageUrl: newImage.imageUrl,
      thumbnailUrl: newImage.thumbnailUrl,
      albumId: newImage.albumId,
      flagged: newImage.flagged,
      createdAt: newImage.createdAt.toISOString(),
      lastUpdatedAt: newImage.lastUpdatedAt.toISOString(),
    })
  } catch (error) {
    logger.error('Upload gallery image error', {
      error: error instanceof Error ? error.message : String(error),
    })

    if (error instanceof MultipartParseError) {
      res.status(400).json({ error: 'Bad Request', message: error.message })
      return
    }

    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: error.message })
      return
    }

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to upload gallery image',
    })
  }
}
