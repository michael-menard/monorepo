/**
 * Vercel API Route: POST /api/mocs/:id/edit/presign
 *
 * Generate presigned S3 URLs for editing a MOC.
 * Part 1 of two-phase edit: presign -> client S3 upload -> finalize.
 *
 * Features:
 * - Max 20 files per request
 * - Validates file counts, sizes, and MIME types per category
 * - Generates presigned URLs with edit-specific S3 path
 * - Rate limit check (not increment - finalize increments)
 *
 * STORY-016: MOC File Upload Management
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createRateLimiter, generateDailyKey } from '@repo/rate-limit'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  editPresign,
  EditPresignInputSchema,
  type EditPresignDeps,
  type MocRow,
} from '@repo/moc-instructions-core'
import { v4 as uuidv4 } from 'uuid'
import { createPostgresRateLimitStore } from '../../../../../core/rate-limit/postgres-store'
import {
  getUploadConfig,
  isMimeTypeAllowed,
  getAllowedMimeTypes,
  getFileSizeLimit,
  getFileCountLimit,
} from '../../../../../core/config/upload'
import { sanitizeFilenameForS3 } from '../../../../../core/utils/filename-sanitizer'

const { logger } = loggerPkg

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ─────────────────────────────────────────────────────────────────────────────
// Inline Schema
// ─────────────────────────────────────────────────────────────────────────────

const mocInstructions = pgTable('moc_instructions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  title: text('title').notNull(),
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

  // Parse and validate request body
  if (!req.body) {
    res.status(400).json({
      error: 'BAD_REQUEST',
      message: 'Request body is required',
    })
    return
  }

  const validation = EditPresignInputSchema.safeParse(req.body)
  if (!validation.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details: { errors: validation.error.flatten() },
    })
    return
  }

  const { files } = validation.data

  logger.info('Edit presign', {
    userId,
    mocId,
    fileCount: files.length,
  })

  try {
    // Get config and S3 bucket
    const uploadConfig = getUploadConfig()
    const s3Bucket = process.env.MOC_BUCKET || process.env.LEGO_API_BUCKET_NAME

    if (!s3Bucket) {
      res.status(500).json({
        error: 'CONFIGURATION_ERROR',
        message: 'S3 bucket not configured',
      })
      return
    }

    const db = getDb()

    // Construct dependencies
    const deps: EditPresignDeps = {
      db: {
        getMoc: async (mocId: string) => {
          const [moc] = await db
            .select()
            .from(mocInstructions)
            .where(eq(mocInstructions.id, mocId))
            .limit(1)
          return moc ? (moc as unknown as MocRow) : null
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
        // Only check, don't increment
        const currentCount = await rateLimiter.getCount(rateLimitKey)
        const limit = uploadConfig.rateLimitPerDay
        return {
          allowed: currentCount < limit,
          currentCount,
          limit,
        }
      },
      isMimeTypeAllowed: (fileType, mimeType) => isMimeTypeAllowed(fileType as any, mimeType),
      getAllowedMimeTypes: fileType => getAllowedMimeTypes(fileType as any),
      getFileSizeLimit: fileType => getFileSizeLimit(fileType as any),
      getFileCountLimit: fileType => getFileCountLimit(fileType as any),
      sanitizeFilename: sanitizeFilenameForS3,
      generateUuid: uuidv4,
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
      s3Bucket,
    }

    // Call core function
    const result = await editPresign(mocId, userId, files, deps)

    if (result.success) {
      logger.info('Edit presign success', {
        userId,
        mocId,
        fileCount: result.data.files.length,
        sessionExpiresAt: result.data.sessionExpiresAt,
      })

      res.status(200).json({
        success: true,
        ...result.data,
      })
    } else {
      const statusCode = mapErrorToStatus(result.error)

      logger.warn('Edit presign failed', {
        userId,
        mocId,
        error: result.error,
        message: result.message,
      })

      res.status(statusCode).json({
        error: result.error,
        message: result.message,
        ...result.details,
      })
    }
  } catch (error) {
    logger.error('Edit presign error', {
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
    case 'RATE_LIMIT_EXCEEDED':
      return 429
    case 'FILE_TOO_LARGE':
      return 413
    case 'INVALID_MIME_TYPE':
      return 415
    case 'VALIDATION_ERROR':
      return 400
    case 'S3_ERROR':
    default:
      return 500
  }
}
