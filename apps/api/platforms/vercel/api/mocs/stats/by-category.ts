/**
 * Vercel API Route: /api/mocs/stats/by-category
 *
 * Handles GET for MOC statistics aggregated by category.
 * - GET: Returns top 10 categories sorted by count descending
 *
 * Requires authentication (returns 401 without valid token).
 * Aggregates by theme (for sets) and tags (for MOCs).
 *
 * STORY-011: MOC Instructions - Read Operations
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { and, eq, sql } from 'drizzle-orm'
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { logger } = loggerPkg

// Inline Schema (matches apps/api/core/database/schema/index.ts)
const mocInstructions = pgTable('moc_instructions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  type: text('type').notNull(),
  theme: text('theme'),
  tags: jsonb('tags').$type<string[]>(),
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

  try {
    const db = getDb()

    // Get stats by theme
    const themeStats = await db
      .select({
        category: mocInstructions.theme,
        count: sql<number>`count(*)::int`,
      })
      .from(mocInstructions)
      .where(
        and(
          eq(mocInstructions.userId, userId),
          sql`${mocInstructions.theme} IS NOT NULL AND ${mocInstructions.theme} != ''`,
        ),
      )
      .groupBy(mocInstructions.theme)

    // Get MOCs with tags for tag aggregation
    const mocsWithTags = await db
      .select({
        tags: mocInstructions.tags,
      })
      .from(mocInstructions)
      .where(
        and(
          eq(mocInstructions.userId, userId),
          eq(mocInstructions.type, 'moc'),
          sql`${mocInstructions.tags} IS NOT NULL`,
        ),
      )

    // Process tags to extract categories
    const tagCounts: Record<string, number> = {}
    mocsWithTags.forEach(moc => {
      if (moc.tags && Array.isArray(moc.tags)) {
        moc.tags.forEach(tag => {
          const category = String(tag).toLowerCase()
          tagCounts[category] = (tagCounts[category] || 0) + 1
        })
      }
    })

    // Convert tag counts to stat format
    const tagStats = Object.entries(tagCounts).map(([category, count]) => ({
      category,
      count,
    }))

    // Combine theme stats and tag stats, avoiding duplicates (case-insensitive)
    const allStats = themeStats
      .filter(stat => stat.category !== null)
      .map(stat => ({ category: stat.category as string, count: stat.count }))

    tagStats.forEach(tagStat => {
      const existingTheme = allStats.find(
        stat => stat.category.toLowerCase() === tagStat.category.toLowerCase(),
      )
      if (!existingTheme) {
        allStats.push(tagStat)
      }
    })

    // Sort by count descending and take top 10
    const sortedStats = allStats
      .filter(stat => stat.category && stat.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const total = sortedStats.reduce((sum, stat) => sum + stat.count, 0)

    logger.info('Get MOC stats by category', { userId, categories: sortedStats.length })

    res.status(200).json({
      success: true,
      data: sortedStats,
      total,
    })
  } catch (error) {
    logger.error('Get MOC stats by category error', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'Database error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
