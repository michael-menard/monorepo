/**
 * Vercel API Route: DELETE /api/mocs/:id/files/:fileId
 *
 * Soft-delete a file from a MOC.
 *
 * Features:
 * - Soft-deletes file record (sets deletedAt)
 * - Updates MOC's updatedAt timestamp
 * - Owner-only access
 *
 * STORY-016: MOC File Upload Management
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, and, isNull } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  deleteMocFile,
  type DeleteMocFileDeps,
  type MocRow,
  type MocFileRow,
} from '@repo/moc-instructions-core'

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
  // Only allow DELETE
  if (req.method !== 'DELETE') {
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

  // Get and validate path parameters
  const mocId = req.query.id as string
  const fileId = req.query.fileId as string

  if (!mocId || !uuidRegex.test(mocId)) {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'MOC not found',
    })
    return
  }

  if (!fileId || !uuidRegex.test(fileId)) {
    res.status(404).json({
      error: 'NOT_FOUND',
      message: 'File not found',
    })
    return
  }

  logger.info('Delete MOC file', {
    userId,
    mocId,
    fileId,
  })

  try {
    const db = getDb()

    // Construct dependencies
    const deps: DeleteMocFileDeps = {
      db: {
        getMoc: async (mocId: string) => {
          const [moc] = await db
            .select()
            .from(mocInstructions)
            .where(eq(mocInstructions.id, mocId))
            .limit(1)
          return moc ? (moc as unknown as MocRow) : null
        },
        getFile: async (fileId: string, mocId: string) => {
          const [file] = await db
            .select()
            .from(mocFiles)
            .where(
              and(eq(mocFiles.id, fileId), eq(mocFiles.mocId, mocId), isNull(mocFiles.deletedAt)),
            )
            .limit(1)
          return file ? (file as unknown as MocFileRow) : null
        },
        softDeleteFile: async (fileId: string) => {
          await db
            .update(mocFiles)
            .set({
              deletedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(mocFiles.id, fileId))
        },
        updateMocTimestamp: async (mocId: string) => {
          await db
            .update(mocInstructions)
            .set({ updatedAt: new Date() })
            .where(eq(mocInstructions.id, mocId))
        },
      },
    }

    // Call core function
    const result = await deleteMocFile(mocId, fileId, userId, deps)

    if (result.success) {
      logger.info('File deleted successfully', {
        userId,
        mocId,
        fileId,
      })

      res.status(200).json({
        success: true,
        message: result.data.message,
        fileId: result.data.fileId,
      })
    } else {
      const statusCode = mapErrorToStatus(result.error)

      logger.warn('Delete file failed', {
        userId,
        mocId,
        fileId,
        error: result.error,
        message: result.message,
      })

      res.status(statusCode).json({
        error: result.error,
        message: result.message,
      })
    }
  } catch (error) {
    logger.error('Delete file error', {
      userId,
      mocId,
      fileId,
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
    case 'DB_ERROR':
    default:
      return 500
  }
}
