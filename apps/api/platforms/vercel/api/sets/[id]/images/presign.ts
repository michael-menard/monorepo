/**
 * Vercel API Route: /api/sets/:id/images/presign
 *
 * POST: Generates a presigned S3 PUT URL for direct browser upload.
 *
 * - Returns uploadUrl (presigned PUT URL), imageUrl (final S3 URL), and key
 * - URL expires in 5 minutes
 * - Returns 400 for invalid UUID, 404 if set not found, 403 if owned by another user
 *
 * STORY-009: Image Uploads - Phase 1
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { decimal, integer, pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const { logger } = loggerPkg

// UUID validation regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Request body schema
const PresignBodySchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  contentType: z.string().min(1, 'Content type is required'),
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
 * Sanitize filename for S3 key usage
 * Simplified inline version of core/utils/filename-sanitizer.ts
 */
function sanitizeFilenameForS3(filename: string): string {
  if (!filename || !filename.trim()) {
    return 'unnamed'
  }

  // Strip path components
  const pathParts = filename.split(/[/\\]/)
  let name = pathParts[pathParts.length - 1] || filename

  // Strip control characters (ASCII 0-31, 127-159)
  // eslint-disable-next-line no-control-regex
  name = name.replace(/[\x00-\x1F\x7F-\x9F]/g, '')

  // Replace unsafe characters (keep only alphanumeric, dash, underscore, dot)
  name = name.replace(/[^a-zA-Z0-9._-]/g, '_')

  // Collapse multiple underscores
  name = name.replace(/_+/g, '_')

  // Remove leading/trailing underscores
  name = name.replace(/^_+|_+$/g, '')

  // Lowercase
  name = name.toLowerCase()

  // Handle empty result
  if (!name || name === '.' || name === '_') {
    return 'unnamed'
  }

  // Limit length (preserve extension)
  if (name.length > 255) {
    const lastDot = name.lastIndexOf('.')
    if (lastDot > 0) {
      const ext = name.substring(lastDot)
      const baseName = name.substring(0, 255 - ext.length)
      name = baseName + ext
    } else {
      name = name.substring(0, 255)
    }
  }

  return name
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

  const parseResult = PresignBodySchema.safeParse(req.body)
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map(e => e.message).join(', ')
    res.status(400).json({ error: 'VALIDATION_ERROR', message: errors })
    return
  }

  const { filename, contentType } = parseResult.data

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

    // Get S3 configuration
    const bucket = process.env.SETS_BUCKET
    if (!bucket) {
      logger.error('SETS_BUCKET environment variable is not configured')
      res
        .status(500)
        .json({ error: 'INTERNAL_ERROR', message: 'Image upload bucket not configured' })
      return
    }

    const region = process.env.AWS_REGION ?? 'us-east-1'
    const sanitizedFilename = sanitizeFilenameForS3(filename)
    const timestamp = Date.now()
    const key = `sets/${setId}/${timestamp}-${sanitizedFilename}`

    // Generate presigned URL
    const client = getS3Client()
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
      Metadata: {
        setId,
        userId,
        originalFilename: filename,
      },
    })

    const expiresInSeconds = 300 // 5 minutes (AC-1)
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds })

    const imageUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`

    logger.info('Set image presign generated', {
      userId,
      setId,
      bucket,
      key,
    })

    res.status(200).json({ uploadUrl, imageUrl, key })
  } catch (error) {
    logger.error('Presign set image error', {
      setId,
      error: error instanceof Error ? error.message : String(error),
    })

    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: error.message })
      return
    }

    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Failed to generate image upload URL',
    })
  }
}
