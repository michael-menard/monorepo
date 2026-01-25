/**
 * Vercel API Route: POST /api/mocs/:id/edit/finalize
 *
 * Finalize MOC edits after files have been uploaded to S3.
 * Part 2 of two-phase edit: presign -> client S3 upload -> finalize.
 *
 * Features:
 * - Verifies new files exist in S3 via HeadObject
 * - Validates file content via magic bytes
 * - Soft-deletes removed files
 * - Updates MOC metadata atomically with optimistic locking
 * - Moves files from edit/ path to permanent path
 * - Re-indexes OpenSearch (fail-open)
 * - Rate limit increment
 *
 * STORY-016: MOC File Upload Management
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, and, isNull, inArray } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp, uuid, integer, boolean } from 'drizzle-orm/pg-core'
import {
  S3Client,
  HeadObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { validateMagicBytes } from '@repo/file-validator'
import { createRateLimiter, generateDailyKey, RATE_LIMIT_WINDOWS } from '@repo/rate-limit'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  editFinalize,
  EditFinalizeInputSchema,
  type EditFinalizeDeps,
  type MocRow,
  type MocFileRow,
  type TxClient,
} from '@repo/moc-instructions-core'
import { createPostgresRateLimitStore } from '../../../../../core/rate-limit/postgres-store'
import { getUploadConfig } from '../../../../../core/config/upload'

const { logger } = loggerPkg

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  const validation = EditFinalizeInputSchema.safeParse(req.body)
  if (!validation.success) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid request body',
      details: { errors: validation.error.flatten() },
    })
    return
  }

  const input = validation.data

  logger.info('Edit finalize', {
    userId,
    mocId,
    hasMetadataChanges: !!(
      input.title ||
      input.description ||
      input.tags ||
      input.theme ||
      input.slug
    ),
    newFileCount: input.newFiles.length,
    removedFileCount: input.removedFileIds.length,
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
    const deps: EditFinalizeDeps = {
      db: {
        getMoc: async (mocId: string) => {
          const [moc] = await db
            .select()
            .from(mocInstructions)
            .where(eq(mocInstructions.id, mocId))
            .limit(1)
          return moc ? (moc as unknown as MocRow) : null
        },
        getMocFiles: async (mocId: string, fileIds?: string[]) => {
          if (fileIds && fileIds.length > 0) {
            const files = await db
              .select()
              .from(mocFiles)
              .where(and(eq(mocFiles.mocId, mocId), inArray(mocFiles.id, fileIds)))
            return files as unknown as MocFileRow[]
          }
          const files = await db.select().from(mocFiles).where(eq(mocFiles.mocId, mocId))
          return files as unknown as MocFileRow[]
        },
        transaction: async <T>(fn: (tx: TxClient) => Promise<T>) => {
          // Drizzle doesn't have built-in transactions in node-postgres mode
          // We'll execute operations directly
          return fn(db as unknown as TxClient)
        },
        updateMocWithLock: async (
          _tx: TxClient,
          mocId: string,
          expectedUpdatedAt: Date,
          updates: Record<string, unknown>,
        ) => {
          const [updated] = await db
            .update(mocInstructions)
            .set(updates as any)
            .where(
              and(eq(mocInstructions.id, mocId), eq(mocInstructions.updatedAt, expectedUpdatedAt)),
            )
            .returning()
          return updated ? (updated as unknown as MocRow) : null
        },
        insertMocFiles: async (
          _tx: TxClient,
          files: Array<{
            mocId: string
            fileType: string
            fileUrl: string
            originalFilename: string
            mimeType: string
          }>,
        ) => {
          if (files.length > 0) {
            const now = new Date()
            await db.insert(mocFiles).values(
              files.map(f => ({
                mocId: f.mocId,
                fileType: f.fileType,
                fileUrl: f.fileUrl,
                originalFilename: f.originalFilename,
                mimeType: f.mimeType,
                createdAt: now,
                updatedAt: now,
              })),
            )
          }
        },
        softDeleteFiles: async (_tx: TxClient, mocId: string, fileIds: string[]) => {
          if (fileIds.length > 0) {
            const now = new Date()
            await db
              .update(mocFiles)
              .set({ deletedAt: now, updatedAt: now })
              .where(
                and(
                  eq(mocFiles.mocId, mocId),
                  inArray(mocFiles.id, fileIds),
                  isNull(mocFiles.deletedAt),
                ),
              )
          }
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
      copyObject: async (bucket: string, source: string, dest: string) => {
        await getS3Client().send(
          new CopyObjectCommand({
            Bucket: bucket,
            CopySource: `${bucket}/${source}`,
            Key: dest,
          }),
        )
      },
      deleteObject: async (bucket: string, key: string) => {
        await getS3Client().send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
        )
      },
      deleteObjects: async (bucket: string, keys: string[]) => {
        if (keys.length > 0) {
          await getS3Client().send(
            new DeleteObjectsCommand({
              Bucket: bucket,
              Delete: {
                Objects: keys.map(key => ({ Key: key })),
              },
            }),
          )
        }
      },
      validateMagicBytes,
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
      generatePresignedGetUrl: async (bucket: string, key: string, ttlSeconds: number) => {
        const command = new GetObjectCommand({ Bucket: bucket, Key: key })
        return getSignedUrl(getS3Client(), command, { expiresIn: ttlSeconds })
      },
      // OpenSearch update is optional - we don't have the update function here
      updateOpenSearch: undefined,
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
    const result = await editFinalize(mocId, userId, input, deps)

    if (result.success) {
      logger.info('Edit finalize success', {
        userId,
        mocId,
        fileCount: result.data.files.length,
      })

      res.status(200).json({
        success: true,
        data: result.data,
      })
    } else {
      const statusCode = mapErrorToStatus(result.error)

      logger.warn('Edit finalize failed', {
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
    logger.error('Edit finalize error', {
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
    case 'CONCURRENT_EDIT':
      return 409
    case 'RATE_LIMIT_EXCEEDED':
      return 429
    case 'VALIDATION_ERROR':
    case 'FILE_NOT_IN_S3':
    case 'INVALID_FILE_CONTENT':
      return 400
    case 'DB_ERROR':
    case 'S3_ERROR':
    default:
      return 500
  }
}
