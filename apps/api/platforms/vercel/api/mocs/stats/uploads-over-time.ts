/**
 * Vercel API Route: /api/mocs/stats/uploads-over-time
 *
 * Handles GET for MOC upload statistics as time-series data.
 * - GET: Returns time-series data for last 12 months, grouped by month and theme
 *
 * Requires authentication (returns 401 without valid token).
 *
 * STORY-011: MOC Instructions - Read Operations
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { and, eq, sql } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { logger } = loggerPkg

// Inline Schema (matches apps/api/core/database/schema/index.ts)
const mocInstructions = pgTable('moc_instructions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  theme: text('theme'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
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

  try {
    const db = getDb()

    // Get MOCs grouped by month and category (last 12 months)
    const uploadsData = await db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${mocInstructions.createdAt})::text`,
        category: mocInstructions.theme,
        count: sql<number>`count(*)::int`,
      })
      .from(mocInstructions)
      .where(
        and(
          eq(mocInstructions.userId, userId),
          sql`${mocInstructions.createdAt} >= NOW() - INTERVAL '12 months'`,
        ),
      )
      .groupBy(sql`DATE_TRUNC('month', ${mocInstructions.createdAt})`, mocInstructions.theme)
      .orderBy(sql`DATE_TRUNC('month', ${mocInstructions.createdAt})`)

    // Transform to format expected by frontend: {date, category, count}
    const timeSeriesData = uploadsData
      .map(row => ({
        date: row.month ? row.month.substring(0, 7) : '', // YYYY-MM format
        category: row.category || 'Unknown',
        count: row.count,
      }))
      .filter(item => item.date && item.count > 0)

    logger.info('Get MOC uploads over time', {
      userId,
      months: new Set(timeSeriesData.map(d => d.date)).size,
    })

    res.status(200).json({
      success: true,
      data: timeSeriesData,
    })
  } catch (error) {
    logger.error('Get MOC uploads over time error', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
