/**
 * Vercel API Route: POST /api/mocs/:id/upload-parts-list
 *
 * Upload and parse a parts list file (CSV/XML) for a MOC.
 *
 * Features:
 * - Parses CSV/XML with automatic header detection
 * - Calculates total piece count from quantity columns
 * - Creates moc_files record with type 'parts-list'
 * - Creates moc_parts_lists record with parsed data
 * - Updates moc_instructions.totalPieceCount
 *
 * STORY-016: MOC File Upload Management
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { parseVercelMultipart, MultipartParseError } from '@repo/vercel-multipart'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  uploadPartsList,
  parsePartsListFile,
  type UploadPartsListDeps,
  type MocRow,
  type MocFileRow,
  type MocPartsListRow,
} from '@repo/moc-instructions-core'
import { v4 as uuidv4 } from 'uuid'
import { sanitizeFilenameForS3 } from '../../../../core/utils/filename-sanitizer'

const { logger } = loggerPkg

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB for parts lists

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
  updatedAt: timestamp('updated_at'),
})

const mocPartsLists = pgTable('moc_parts_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  mocId: uuid('moc_id').notNull(),
  fileId: uuid('file_id'),
  title: text('title').notNull(),
  description: text('description'),
  totalPartsCount: text('total_parts_count'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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

  logger.info('Upload parts list', {
    userId,
    mocId,
  })

  try {
    // Parse multipart form data
    const formData = await parseVercelMultipart(req, {
      maxFileSize: MAX_FILE_SIZE,
      maxFiles: 1,
      maxFields: 10,
    })

    const file = formData.files[0]
    if (!file) {
      res.status(400).json({
        error: 'BAD_REQUEST',
        message: 'No file provided',
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
    const db = getDb()

    // Construct dependencies
    const deps: UploadPartsListDeps = {
      db: {
        getMoc: async (mocId: string) => {
          const [moc] = await db
            .select()
            .from(mocInstructions)
            .where(eq(mocInstructions.id, mocId))
            .limit(1)
          return moc ? (moc as unknown as MocRow) : null
        },
        createMocFile: async data => {
          const [fileRecord] = await db
            .insert(mocFiles)
            .values({
              mocId: data.mocId,
              fileType: data.fileType,
              fileUrl: data.fileUrl,
              originalFilename: data.originalFilename,
              mimeType: data.mimeType,
            })
            .returning()
          return fileRecord as unknown as MocFileRow
        },
        createPartsList: async data => {
          const [partsListRecord] = await db
            .insert(mocPartsLists)
            .values({
              mocId: data.mocId,
              fileId: data.fileId,
              title: data.title,
              description: data.description,
              totalPartsCount: data.totalPartsCount,
            })
            .returning()
          return partsListRecord as unknown as MocPartsListRow
        },
        updateMocPieceCount: async (mocId: string, pieceCount: number) => {
          const [updated] = await db
            .update(mocInstructions)
            .set({
              partsCount: pieceCount,
              updatedAt: new Date(),
            })
            .where(eq(mocInstructions.id, mocId))
            .returning()
          return updated as unknown as MocRow
        },
      },
      uploadToS3: async (bucket: string, key: string, buffer: Buffer, contentType: string) => {
        await getS3Client().send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
          }),
        )
        return `https://${bucket}.s3.${s3Region}.amazonaws.com/${key}`
      },
      parsePartsListFile,
      sanitizeFilename: sanitizeFilenameForS3,
      generateUuid: uuidv4,
      s3Bucket,
      s3Region,
    }

    // Call core function
    const result = await uploadPartsList(
      mocId,
      userId,
      {
        buffer: file.buffer,
        filename: file.filename,
        mimeType: file.mimetype,
      },
      deps,
    )

    if (result.success) {
      logger.info('Parts list uploaded', {
        userId,
        mocId,
        fileId: result.data.file.id,
        partsListId: result.data.partsList.id,
        totalPieceCount: result.data.parsing.totalPieceCount,
        uniqueParts: result.data.parsing.uniqueParts,
      })

      res.status(201).json({
        success: true,
        message: 'Parts list uploaded and processed successfully',
        data: result.data,
      })
    } else {
      const statusCode = mapErrorToStatus(result.error)

      logger.warn('Parts list upload failed', {
        userId,
        mocId,
        error: result.error,
        message: result.message,
      })

      res.status(statusCode).json({
        error: result.error,
        message: result.message,
        details: result.details,
      })
    }
  } catch (error) {
    if (error instanceof MultipartParseError) {
      res.status(error.code === 'FILE_TOO_LARGE' ? 413 : 400).json({
        error: error.code,
        message: error.message,
      })
      return
    }

    logger.error('Upload parts list error', {
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

function mapErrorToStatus(error: string): number {
  switch (error) {
    case 'NOT_FOUND':
      return 404
    case 'FORBIDDEN':
      return 403
    case 'VALIDATION_ERROR':
    case 'PARSE_ERROR':
      return 400
    case 'DB_ERROR':
    case 'S3_ERROR':
    default:
      return 500
  }
}
