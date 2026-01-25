/**
 * Vercel API Route: /api/mocs/:id
 *
 * Handles GET for a single MOC by ID with ownership-aware access.
 * - GET: Returns MOC object with files, isOwner flag
 *
 * Access rules:
 * - Published MOCs visible to anyone (anonymous or authenticated)
 * - Draft/archived/pending_review MOCs only visible to owner
 * - Returns 404 (not 403) for non-owner access to prevent existence leak
 *
 * STORY-011: MOC Instructions - Read Operations
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, and, isNull } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { logger } = loggerPkg

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Inline Schema (matches apps/api/core/database/schema/index.ts)
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
  releaseYear: text('release_year'),
  retired: text('retired'),
  partsCount: text('parts_count'),
  tags: jsonb('tags').$type<string[]>(),
  thumbnailUrl: text('thumbnail_url'),
  status: text('status').notNull().default('draft'), // 'draft' | 'published' | 'archived' | 'pending_review'
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

const mocFiles = pgTable('moc_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  mocId: uuid('moc_id').notNull(),
  fileType: text('file_type').notNull(), // 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image'
  fileUrl: text('file_url').notNull(),
  originalFilename: text('original_filename'),
  mimeType: text('mime_type'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
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

/**
 * Get user ID from AUTH_BYPASS or return null for anonymous.
 * Unlike other endpoints, this one allows anonymous access for published MOCs.
 */
function getAuthUserId(): string | null {
  if (process.env.AUTH_BYPASS === 'true') {
    return process.env.DEV_USER_SUB ?? 'dev-user-00000000-0000-0000-0000-000000000001'
  }
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  // Get user ID (null for anonymous)
  const userId = getAuthUserId()

  // Extract MOC ID from query params (Vercel passes dynamic route params as query)
  const mocId = req.query.id as string
  if (!mocId) {
    res.status(404).json({ error: 'Not Found', message: 'MOC not found' })
    return
  }

  // Validate UUID format - return 404 for invalid (same as non-existent)
  if (!uuidRegex.test(mocId)) {
    res.status(404).json({ error: 'Not Found', message: 'MOC not found' })
    return
  }

  try {
    const db = getDb()

    // Get MOC
    const [moc] = await db
      .select({
        id: mocInstructions.id,
        userId: mocInstructions.userId,
        title: mocInstructions.title,
        description: mocInstructions.description,
        slug: mocInstructions.slug,
        tags: mocInstructions.tags,
        theme: mocInstructions.theme,
        status: mocInstructions.status,
        publishedAt: mocInstructions.publishedAt,
        createdAt: mocInstructions.createdAt,
        updatedAt: mocInstructions.updatedAt,
      })
      .from(mocInstructions)
      .where(eq(mocInstructions.id, mocId))

    if (!moc) {
      res.status(404).json({ error: 'Not Found', message: 'MOC not found' })
      return
    }

    // Determine ownership
    const isOwner = Boolean(userId && moc.userId === userId)

    // Access control: Draft/archived/pending_review only visible to owner
    // Return 404 (not 403) to prevent existence leak
    if (moc.status !== 'published' && !isOwner) {
      logger.info('MOC access denied - non-owner accessing non-published', {
        mocId,
        status: moc.status,
        isOwner,
      })
      res.status(404).json({ error: 'Not Found', message: 'MOC not found' })
      return
    }

    // Get files (excluding soft-deleted)
    const files = await db
      .select({
        id: mocFiles.id,
        fileType: mocFiles.fileType,
        fileUrl: mocFiles.fileUrl,
        originalFilename: mocFiles.originalFilename,
        mimeType: mocFiles.mimeType,
        createdAt: mocFiles.createdAt,
      })
      .from(mocFiles)
      .where(and(eq(mocFiles.mocId, mocId), isNull(mocFiles.deletedAt)))

    // Build response (CDN URLs for MVP - no presigned URLs)
    const response = {
      id: moc.id,
      title: moc.title,
      description: moc.description,
      slug: moc.slug,
      tags: moc.tags,
      theme: moc.theme,
      status: moc.status,
      createdAt: moc.createdAt.toISOString(),
      updatedAt: moc.updatedAt.toISOString(),
      publishedAt: moc.publishedAt?.toISOString() ?? null,
      files: files.map(file => ({
        id: file.id,
        category: file.fileType,
        filename: file.originalFilename || 'file',
        mimeType: file.mimeType,
        url: file.fileUrl,
        uploadedAt: file.createdAt.toISOString(),
      })),
      isOwner,
    }

    logger.info('Get MOC', { mocId, isOwner, filesCount: files.length })

    res.status(200).json({
      success: true,
      data: response,
    })
  } catch (error) {
    logger.error('Get MOC error', {
      mocId,
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
