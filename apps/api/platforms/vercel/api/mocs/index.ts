/**
 * Vercel API Route: /api/mocs
 *
 * Handles GET for listing MOCs with pagination, search, and tag filter.
 * - GET: Returns paginated array of user's MOCs
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - search: Optional search term (ILIKE on title/description)
 * - tag: Optional tag filter
 *
 * Requires authentication (returns 401 without valid token).
 * Returns only authenticated user's MOCs.
 * Sort by updatedAt DESC (most recent first).
 *
 * STORY-011: MOC Instructions - Read Operations
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { and, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { logger } = loggerPkg

// Inline Schema (matches apps/api/core/database/schema/index.ts)
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
  releaseYear: text('release_year'),
  retired: text('retired'),
  partsCount: text('parts_count'),
  tags: jsonb('tags').$type<string[]>(),
  thumbnailUrl: text('thumbnail_url'),
  status: text('status').notNull().default('draft'),
  publishedAt: timestamp('published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
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

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  // Require authentication
  const userId = getAuthUserId()
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' })
    return
  }

  // Parse query params
  const pageParam = parseInt(req.query.page as string, 10)
  const limitParam = parseInt(req.query.limit as string, 10)
  const search = (req.query.search as string)?.trim()
  const tag = (req.query.tag as string)?.trim()

  // Validate pagination params (return 422 for invalid)
  if (req.query.page !== undefined && (isNaN(pageParam) || pageParam < 1)) {
    res.status(422).json({ error: 'Validation Error', message: 'page must be >= 1' })
    return
  }
  if (req.query.limit !== undefined && (isNaN(limitParam) || limitParam < 1)) {
    res.status(422).json({ error: 'Validation Error', message: 'limit must be >= 1' })
    return
  }
  if (req.query.limit !== undefined && limitParam > 100) {
    res.status(422).json({ error: 'Validation Error', message: 'limit must be <= 100' })
    return
  }

  const page = isNaN(pageParam) ? 1 : Math.max(1, pageParam)
  const limit = isNaN(limitParam) ? 20 : Math.min(100, Math.max(1, limitParam))

  try {
    const db = getDb()

    // Build where condition
    const conditions = [eq(mocInstructions.userId, userId)]

    // Add search condition (ILIKE on title and description)
    if (search) {
      const searchPattern = `%${search}%`
      conditions.push(
        or(
          ilike(mocInstructions.title, searchPattern),
          ilike(mocInstructions.description, searchPattern),
        )!,
      )
    }

    // Add tag filter condition (JSONB array containment)
    if (tag) {
      conditions.push(sql`${mocInstructions.tags} @> ${JSON.stringify([tag])}::jsonb`)
    }

    const whereCondition = and(...conditions)

    // Get total count
    const [countResult] = await db
      .select({ count: count() })
      .from(mocInstructions)
      .where(whereCondition)

    const total = Number(countResult?.count ?? 0)

    // Get paginated MOCs
    const offset = (page - 1) * limit
    const mocs = await db
      .select({
        id: mocInstructions.id,
        title: mocInstructions.title,
        description: mocInstructions.description,
        slug: mocInstructions.slug,
        tags: mocInstructions.tags,
        theme: mocInstructions.theme,
        thumbnailUrl: mocInstructions.thumbnailUrl,
        status: mocInstructions.status,
        createdAt: mocInstructions.createdAt,
        updatedAt: mocInstructions.updatedAt,
      })
      .from(mocInstructions)
      .where(whereCondition)
      .orderBy(desc(mocInstructions.updatedAt))
      .limit(limit)
      .offset(offset)

    // Transform to API format
    const transformedMocs = mocs.map(moc => ({
      id: moc.id,
      title: moc.title,
      description: moc.description,
      slug: moc.slug,
      tags: moc.tags,
      theme: moc.theme,
      thumbnailUrl: moc.thumbnailUrl,
      status: moc.status,
      createdAt: moc.createdAt.toISOString(),
      updatedAt: moc.updatedAt.toISOString(),
    }))

    logger.info('List MOCs', { userId, page, limit, search, tag, total })

    res.status(200).json({
      data: transformedMocs,
      page,
      limit,
      total,
    })
  } catch (error) {
    logger.error('List MOCs error', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
