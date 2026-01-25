/**
 * Vercel API Route: POST /api/mocs/with-files/initialize
 *
 * Phase 1 of two-phase MOC creation with file uploads.
 * Creates MOC record and generates presigned S3 URLs for file uploads.
 *
 * Features:
 * - Creates MOC record in database
 * - Generates presigned S3 URLs for direct client uploads
 * - Creates placeholder file records in database
 * - Returns MOC ID and upload URLs
 *
 * Flow:
 * 1. Client calls this endpoint with MOC metadata + file list
 * 2. Handler creates MOC record
 * 3. Handler generates presigned URLs for each file
 * 4. Client uploads files directly to S3 using presigned URLs
 * 5. Client calls finalize endpoint to confirm uploads
 *
 * STORY-015: MOC Instructions - Initialization & Finalization
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, and } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createRateLimiter, generateDailyKey, RATE_LIMIT_WINDOWS } from '@repo/rate-limit'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  initializeWithFiles,
  InitializeMocInputSchema,
  type InitializeWithFilesDeps,
  type MocRow,
  type MocFileRow,
} from '@repo/moc-instructions-core'
import { v4 as uuidv4 } from 'uuid'
import { createPostgresRateLimitStore } from '../../../../core/rate-limit/postgres-store'
import {
  getUploadConfig,
  isMimeTypeAllowed,
  getAllowedMimeTypes,
} from '../../../../core/config/upload'
import { sanitizeFilenameForS3 } from '../../../../core/utils/filename-sanitizer'

const { logger } = loggerPkg

// ─────────────────────────────────────────────────────────────────────────────
// Inline Schema (matches apps/api/core/database/schema/index.ts)
// ─────────────────────────────────────────────────────────────────────────────

const mocInstructions = pgTable('moc_instructions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(), // 'moc' | 'set'
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

/**
 * Get user ID from AUTH_BYPASS or return null for unauthenticated (AC-11)
 */
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

  // AC-11: Check authentication
  const userId = getAuthUserId()
  if (!userId) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    })
    return
  }

  // Parse and validate request body
  if (!req.body) {
    res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Request body is required',
    })
    return
  }

  const validation = InitializeMocInputSchema.safeParse(req.body)
  if (!validation.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details: { errors: validation.error.flatten() },
    })
    return
  }

  const input = validation.data

  logger.info('Initialize MOC with files', {
    userId,
    title: input.title,
    type: input.type,
    fileCount: input.files.length,
  })

  try {
    // Get config and S3 bucket
    const uploadConfig = getUploadConfig()
    const s3Bucket = process.env.MOC_BUCKET || process.env.LEGO_API_BUCKET_NAME
    const s3Region = process.env.AWS_REGION || 'us-east-1'

    if (!s3Bucket) {
      logger.error('S3 bucket not configured')
      res.status(500).json({
        error: 'CONFIGURATION_ERROR',
        message: 'S3 bucket not configured',
      })
      return
    }

    // Construct dependencies for core function
    const db = getDb()
    const deps: InitializeWithFilesDeps = {
      db: {
        checkDuplicateTitle: async (userId: string, title: string) => {
          const [existing] = await db
            .select({ id: mocInstructions.id })
            .from(mocInstructions)
            .where(and(eq(mocInstructions.userId, userId), eq(mocInstructions.title, title)))
            .limit(1)
          return existing || null
        },
        createMoc: async (mocData: Record<string, unknown>) => {
          const [moc] = await db
            .insert(mocInstructions)
            .values(mocData as any)
            .returning()
          return moc as unknown as MocRow
        },
        createMocFile: async (fileData: Record<string, unknown>) => {
          const [file] = await db
            .insert(mocFiles)
            .values(fileData as any)
            .returning()
          return file as unknown as MocFileRow
        },
      },
      generatePresignedUrl: async (
        bucket: string,
        key: string,
        contentType: string,
        ttlSeconds: number,
      ) => {
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: contentType,
        })
        return getSignedUrl(getS3Client(), command, { expiresIn: ttlSeconds })
      },
      checkRateLimit: async (userId: string) => {
        const store = createPostgresRateLimitStore()
        const rateLimiter = createRateLimiter(store)
        const rateLimitKey = generateDailyKey('moc-upload', userId)
        const result = await rateLimiter.checkLimit(rateLimitKey, {
          maxRequests: uploadConfig.rateLimitPerDay,
          windowMs: RATE_LIMIT_WINDOWS.DAY,
        })
        return {
          allowed: result.allowed,
          remaining: result.remaining,
          currentCount: result.currentCount,
          nextAllowedAt: result.nextAllowedAt,
          retryAfterSeconds: result.retryAfterSeconds,
        }
      },
      isMimeTypeAllowed: (fileType, mimeType) => isMimeTypeAllowed(fileType, mimeType),
      getAllowedMimeTypes: fileType => getAllowedMimeTypes(fileType),
      sanitizeFilename: filename => sanitizeFilenameForS3(filename),
      generateUuid: () => uuidv4(),
      s3Bucket,
      s3Region,
      config: {
        pdfMaxBytes: uploadConfig.pdfMaxBytes,
        imageMaxBytes: uploadConfig.imageMaxBytes,
        partsListMaxBytes: uploadConfig.partsListMaxBytes,
        pdfMaxMb: uploadConfig.pdfMaxMb,
        imageMaxMb: uploadConfig.imageMaxMb,
        partsListMaxMb: uploadConfig.partsListMaxMb,
        imageMaxCount: uploadConfig.imageMaxCount,
        partsListMaxCount: uploadConfig.partsListMaxCount,
        rateLimitPerDay: uploadConfig.rateLimitPerDay,
        presignTtlMinutes: uploadConfig.presignTtlMinutes,
        presignTtlSeconds: uploadConfig.presignTtlSeconds,
        sessionTtlMinutes: uploadConfig.sessionTtlMinutes,
        sessionTtlSeconds: uploadConfig.sessionTtlSeconds,
        finalizeLockTtlMinutes: uploadConfig.finalizeLockTtlMinutes,
      },
    }

    // Call core function
    const result = await initializeWithFiles(userId, input, deps)

    // Return response based on result
    if (result.success) {
      logger.info('MOC initialized successfully', {
        userId,
        mocId: result.data.mocId,
        uploadUrlCount: result.data.uploadUrls.length,
      })

      res.status(201).json({
        success: true,
        message: 'MOC initialized successfully. Upload files using the provided URLs.',
        data: result.data,
      })
    } else {
      // Map error codes to HTTP status codes
      const statusCode = mapErrorToStatus(result.error)

      logger.warn('Initialize MOC failed', {
        userId,
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
    logger.error('Initialize MOC error', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

/**
 * Map error codes to HTTP status codes
 */
function mapErrorToStatus(error: string): number {
  switch (error) {
    case 'RATE_LIMIT_EXCEEDED':
      return 429
    case 'DUPLICATE_TITLE':
      return 409
    case 'VALIDATION_ERROR':
      return 400
    case 'DB_ERROR':
    case 'S3_ERROR':
    default:
      return 500
  }
}
