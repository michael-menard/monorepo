/**
 * Vercel API Route: POST /api/mocs/:mocId/finalize
 *
 * Phase 2 of two-phase MOC creation with file uploads.
 * Confirms file uploads and finalizes MOC record.
 *
 * Features:
 * - Idempotent: Safe to retry if already finalized
 * - Two-phase lock: Atomic lock acquisition with TTL-based stale lock rescue
 * - Verifies files exist in S3 via HeadObject
 * - Validates file content via magic bytes
 * - Validates parts list files (optional)
 * - Sets first image as thumbnail
 * - Updates MOC status from draft to published
 *
 * STORY-015: MOC Instructions - Initialization & Finalization
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, and, isNull, or, lt, inArray } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core'
import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { validateMagicBytes } from '@repo/file-validator'
import { createRateLimiter, generateDailyKey, RATE_LIMIT_WINDOWS } from '@repo/rate-limit'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  finalizeWithFiles,
  FinalizeMocInputSchema,
  type FinalizeWithFilesDeps,
  type MocRow,
  type MocFileRow,
} from '@repo/moc-instructions-core'
import { createPostgresRateLimitStore } from '../../../../../core/rate-limit/postgres-store'
import { getUploadConfig, getFileSizeLimit } from '../../../../../core/config/upload'

const { logger } = loggerPkg

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ─────────────────────────────────────────────────────────────────────────────
// Inline Schema (matches apps/api/core/database/schema/index.ts)
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

/**
 * Get user ID from AUTH_BYPASS or return null for unauthenticated
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

  // Check authentication
  const userId = getAuthUserId()
  if (!userId) {
    res.status(401).json({
      error: 'UNAUTHORIZED',
      message: 'Authentication required',
    })
    return
  }

  // Get and validate MOC ID from path
  const mocId = req.query.mocId as string
  if (!mocId || !uuidRegex.test(mocId)) {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'MOC not found',
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

  const validation = FinalizeMocInputSchema.safeParse(req.body)
  if (!validation.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details: { errors: validation.error.flatten() },
    })
    return
  }

  const input = validation.data

  logger.info('Finalize MOC with files', {
    userId,
    mocId,
    fileCount: input.uploadedFiles.length,
  })

  try {
    // Get config and S3 bucket
    const uploadConfig = getUploadConfig()
    const s3Bucket = process.env.MOC_BUCKET || process.env.LEGO_API_BUCKET_NAME

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
    const deps: FinalizeWithFilesDeps = {
      db: {
        getMocById: async (mocId: string) => {
          const [moc] = await db
            .select()
            .from(mocInstructions)
            .where(eq(mocInstructions.id, mocId))
            .limit(1)
          return moc ? (moc as unknown as MocRow) : null
        },
        getMocFiles: async (mocId: string, fileIds?: string[]) => {
          let query = db.select().from(mocFiles).where(eq(mocFiles.mocId, mocId))
          if (fileIds && fileIds.length > 0) {
            query = db
              .select()
              .from(mocFiles)
              .where(and(eq(mocFiles.mocId, mocId), inArray(mocFiles.id, fileIds)))
          }
          const files = await query
          return files as unknown as MocFileRow[]
        },
        acquireFinalizeLock: async (mocId: string, staleCutoff: Date) => {
          const [lockedMoc] = await db
            .update(mocInstructions)
            .set({ finalizingAt: new Date() })
            .where(
              and(
                eq(mocInstructions.id, mocId),
                isNull(mocInstructions.finalizedAt),
                or(
                  isNull(mocInstructions.finalizingAt),
                  lt(mocInstructions.finalizingAt, staleCutoff),
                ),
              ),
            )
            .returning()
          return lockedMoc ? (lockedMoc as unknown as MocRow) : null
        },
        updateMocFile: async (fileId: string, updates: Record<string, unknown>) => {
          await db
            .update(mocFiles)
            .set(updates as any)
            .where(eq(mocFiles.id, fileId))
        },
        updateMoc: async (mocId: string, updates: Record<string, unknown>) => {
          const [updated] = await db
            .update(mocInstructions)
            .set(updates as any)
            .where(eq(mocInstructions.id, mocId))
            .returning()
          return updated as unknown as MocRow
        },
        clearFinalizeLock: async (mocId: string) => {
          await db
            .update(mocInstructions)
            .set({ finalizingAt: null })
            .where(eq(mocInstructions.id, mocId))
        },
      },
      headObject: async (bucket: string, key: string) => {
        const command = new HeadObjectCommand({ Bucket: bucket, Key: key })
        const response = await getS3Client().send(command)
        return { contentLength: response.ContentLength ?? 0 }
      },
      getObject: async (bucket: string, key: string, range?: string) => {
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: key,
          Range: range,
        })
        const response = await getS3Client().send(command)
        const bodyBytes = await response.Body?.transformToByteArray()
        return Buffer.from(bodyBytes || [])
      },
      validateMagicBytes: (buffer: Buffer, mimeType: string) => {
        return validateMagicBytes(buffer, mimeType)
      },
      // Note: Parts validation is optional. Skip for MVP. Can add later if needed.
      validatePartsFile: undefined,
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
      getFileSizeLimit: fileType => getFileSizeLimit(fileType),
      s3Bucket,
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
    const result = await finalizeWithFiles(userId, mocId, input, deps)

    // Return response based on result
    if (result.success) {
      logger.info('MOC finalized successfully', {
        userId,
        mocId,
        idempotent: result.data.idempotent,
        status: result.data.status,
      })

      res.status(200).json({
        success: true,
        message: result.data.idempotent
          ? 'MOC already finalized'
          : result.data.status === 'finalizing'
            ? 'MOC finalization in progress'
            : 'MOC created successfully with files',
        idempotent: result.data.idempotent,
        status: result.data.status,
        data: {
          moc: result.data.moc,
          fileValidation: result.data.fileValidation,
          totalPieceCount: result.data.totalPieceCount,
        },
      })
    } else {
      // Map error codes to HTTP status codes
      const statusCode = mapErrorToStatus(result.error)

      logger.warn('Finalize MOC failed', {
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
    logger.error('Finalize MOC error', {
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

/**
 * Map error codes to HTTP status codes
 */
function mapErrorToStatus(error: string): number {
  switch (error) {
    case 'NOT_FOUND':
      return 404
    case 'FORBIDDEN':
      return 403
    case 'RATE_LIMIT_EXCEEDED':
      return 429
    case 'NO_SUCCESSFUL_UPLOADS':
    case 'FILE_NOT_IN_S3':
      return 400
    case 'SIZE_TOO_LARGE':
    case 'INVALID_TYPE':
    case 'PARTS_VALIDATION_ERROR':
      return 422
    case 'DB_ERROR':
    case 'S3_ERROR':
    default:
      return 500
  }
}
