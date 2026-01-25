/**
 * Vercel API Route: POST /api/mocs/:id/files
 *
 * Upload file(s) to a MOC via multipart form data.
 *
 * Features:
 * - Max file size: 4MB (Vercel limit is 4.5MB)
 * - Max 10 files per request
 * - Per-file type mapping via fileType_0, fileType_1, etc.
 * - Sanitized S3 uploads
 * - Creates moc_files records
 *
 * STORY-016: MOC File Upload Management
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { parseVercelMultipart, MultipartParseError } from '@repo/vercel-multipart'
import { validateMagicBytes } from '@repo/file-validator'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { v4 as uuidv4 } from 'uuid'
import { sanitizeFilenameForS3 } from '../../../../../core/utils/filename-sanitizer'
import { isMimeTypeAllowed } from '../../../../../core/config/upload'

const { logger } = loggerPkg

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Constants
const MAX_FILE_SIZE = 4 * 1024 * 1024 // 4MB
const MAX_FILES = 10

// ─────────────────────────────────────────────────────────────────────────────
// Inline Schema
// ─────────────────────────────────────────────────────────────────────────────

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
  releaseYear: integer('release_year'),
  retired: boolean('retired'),
  partsCount: integer('parts_count'),
  tags: jsonb('tags').$type<string[]>(),
  thumbnailUrl: text('thumbnail_url'),
  status: text('status').notNull().default('draft'),
  publishedAt: timestamp('published_at'),
  finalizedAt: timestamp('finalized_at'),
  finalizingAt: timestamp('finalizing_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

const mocFiles = pgTable('moc_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  mocId: uuid('moc_id').notNull(),
  fileType: text('file_type').notNull(),
  fileUrl: text('file_url').notNull(),
  originalFilename: text('original_filename'),
  mimeType: text('mime_type'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
})

// ─────────────────────────────────────────────────────────────────────────────
// Database Client (singleton)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// S3 Client (singleton)
// ─────────────────────────────────────────────────────────────────────────────

let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return s3Client
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Helper
// ─────────────────────────────────────────────────────────────────────────────

function getAuthUserId(): string | null {
  if (process.env.AUTH_BYPASS === 'true') {
    return process.env.DEV_USER_SUB ?? 'dev-user-00000000-0000-0000-0000-000000000001'
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  // Check authentication
  const userId = getAuthUserId()
  if (!userId) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    })
    return
  }

  // Get and validate MOC ID
  const mocId = req.query.id as string
  if (!mocId || !uuidRegex.test(mocId)) {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'MOC not found',
    })
    return
  }

  // Check content-length before parsing (early rejection for >4MB)
  const contentLength = parseInt(req.headers['content-length'] || '0', 10)
  if (contentLength > MAX_FILE_SIZE * MAX_FILES + 1024 * 100) {
    // Allow overhead for multipart
    res.status(413).json({
      error: 'PAYLOAD_TOO_LARGE',
      message: 'Request size exceeds limit. Use presigned URL pattern for larger files.',
    })
    return
  }

  const db = getDb()

  // Verify MOC exists and ownership
  const [moc] = await db
    .select()
    .from(mocInstructions)
    .where(eq(mocInstructions.id, mocId))
    .limit(1)

  if (!moc) {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'MOC not found',
    })
    return
  }

  if (moc.userId !== userId) {
    res.status(403).json({
      error: 'FORBIDDEN',
      message: 'You do not own this MOC',
    })
    return
  }

  logger.info('Upload MOC files', {
    userId,
    mocId,
    contentLength,
  })

  try {
    // Parse multipart form data
    const formData = await parseVercelMultipart(req, {
      maxFileSize: MAX_FILE_SIZE,
      maxFiles: MAX_FILES,
      maxFields: 50,
    })

    const files = formData.files
    const fields = formData.fields

    if (files.length === 0) {
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'No files provided',
      })
      return
    }

    if (files.length > MAX_FILES) {
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: `Maximum ${MAX_FILES} files allowed per request`,
      })
      return
    }

    // Get S3 bucket
    const s3Bucket = process.env.MOC_BUCKET || process.env.LEGO_API_BUCKET_NAME
    if (!s3Bucket) {
      res.status(500).json({
        error: 'CONFIGURATION_ERROR',
        message: 'S3 bucket not configured',
      })
      return
    }

    const s3Region = process.env.AWS_REGION || 'us-east-1'
    const stage = process.env.STAGE || 'dev'

    // Process each file
    const uploaded: Array<{
      id: string
      fileType: string
      filename: string
      url: string
    }> = []
    const failed: Array<{
      filename: string
      error: string
    }> = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Get file type from form fields (fileType or fileType_0, fileType_1, etc.)
      let fileType = fields.fileType || fields[`fileType_${i}`] || 'instruction'

      // Map file type to internal representation
      if (fileType === 'image') fileType = 'gallery-image'

      try {
        // Validate magic bytes
        if (!validateMagicBytes(file.buffer, file.mimetype)) {
          failed.push({
            filename: file.filename,
            error: 'File content does not match declared type',
          })
          continue
        }

        // Validate MIME type against allowlist
        if (!isMimeTypeAllowed(fileType as any, file.mimetype)) {
          failed.push({
            filename: file.filename,
            error: `Invalid MIME type ${file.mimetype} for ${fileType}`,
          })
          continue
        }

        // Generate S3 key
        const fileId = uuidv4()
        const sanitizedFilename = sanitizeFilenameForS3(file.filename)
        const lastDot = sanitizedFilename.lastIndexOf('.')
        const extension = lastDot > 0 ? sanitizedFilename.substring(lastDot + 1) : ''
        const fileKey = extension ? `${fileId}.${extension}` : fileId

        const s3Key = `${stage}/moc-instructions/${userId}/${mocId}/${fileType}/${fileKey}`

        // Upload to S3
        await getS3Client().send(
          new PutObjectCommand({
            Bucket: s3Bucket,
            Key: s3Key,
            Body: file.buffer,
            ContentType: file.mimetype,
            Metadata: {
              mocId,
              userId,
              originalFilename: file.filename,
              fileType,
            },
          }),
        )

        const fileUrl = `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${s3Key}`

        // Create database record
        const [fileRecord] = await db
          .insert(mocFiles)
          .values({
            mocId,
            fileType,
            fileUrl,
            originalFilename: file.filename,
            mimeType: file.mimetype,
          })
          .returning()

        uploaded.push({
          id: fileRecord.id,
          fileType: fileRecord.fileType,
          filename: file.filename,
          url: fileUrl,
        })
      } catch (error) {
        failed.push({
          filename: file.filename,
          error: error instanceof Error ? error.message : 'Upload failed',
        })
      }
    }

    // Update MOC timestamp
    await db
      .update(mocInstructions)
      .set({ updatedAt: new Date() })
      .where(eq(mocInstructions.id, mocId))

    logger.info('Files uploaded', {
      userId,
      mocId,
      uploadedCount: uploaded.length,
      failedCount: failed.length,
    })

    // Return response
    if (uploaded.length === 1 && failed.length === 0) {
      // Single file success
      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        file: uploaded[0],
      })
    } else {
      // Multi-file or partial success
      res.status(200).json({
        success: failed.length === 0,
        message:
          failed.length === 0
            ? `${uploaded.length} file(s) uploaded successfully`
            : `${uploaded.length} uploaded, ${failed.length} failed`,
        uploaded,
        failed,
      })
    }
  } catch (error) {
    if (error instanceof MultipartParseError) {
      const statusCode =
        error.code === 'FILE_TOO_LARGE' ? 413 : error.code === 'FILES_LIMIT_EXCEEDED' ? 400 : 400

      res.status(statusCode).json({
        error: error.code,
        message: error.message,
      })
      return
    }

    logger.error('Upload files error', {
      userId,
      mocId,
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
