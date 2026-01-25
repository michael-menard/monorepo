/**
 * Vercel API Route: /api/user/parts-lists/summary
 *
 * Handles GET for aggregated user statistics across all MOCs.
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const { logger } = loggerPkg

// ============================================================
// INLINE SCHEMA
// ============================================================

const mocInstructions = pgTable('moc_instructions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
})

const mocPartsLists = pgTable('moc_parts_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  mocId: uuid('moc_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  built: boolean('built').default(false),
  purchased: boolean('purchased').default(false),
  notes: text('notes'),
  costEstimate: text('cost_estimate'),
  actualCost: text('actual_cost'),
  totalPartsCount: text('total_parts_count'),
  acquiredPartsCount: text('acquired_parts_count').default('0'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================================
// DATABASE CLIENT
// ============================================================

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

// ============================================================
// AUTH
// ============================================================

function getAuthUserId(): string | null {
  if (process.env.AUTH_BYPASS === 'true') {
    return process.env.DEV_USER_SUB ?? 'dev-user-00000000-0000-0000-0000-000000000001'
  }
  return null
}

// ============================================================
// MAIN HANDLER
// ============================================================

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const userId = getAuthUserId()
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' })
    return
  }

  try {
    const db = getDb()

    // Get all parts lists for user's MOCs using a join
    const partsLists = await db
      .select({
        id: mocPartsLists.id,
        built: mocPartsLists.built,
        purchased: mocPartsLists.purchased,
        totalPartsCount: mocPartsLists.totalPartsCount,
      })
      .from(mocPartsLists)
      .innerJoin(mocInstructions, eq(mocPartsLists.mocId, mocInstructions.id))
      .where(eq(mocInstructions.userId, userId))

    // Calculate aggregates
    let totalLists = 0
    let totalParts = 0
    let listsBuilt = 0
    let listsPurchased = 0

    for (const list of partsLists) {
      totalLists++

      if (list.totalPartsCount) {
        totalParts += parseInt(list.totalPartsCount, 10) || 0
      }

      if (list.built === true) {
        listsBuilt++
      }

      if (list.purchased === true) {
        listsPurchased++
      }
    }

    logger.info('Get user summary', { userId, totalLists })

    res.status(200).json({
      totalLists,
      totalParts,
      listsBuilt,
      listsPurchased,
    })
  } catch (error) {
    logger.error('User summary handler error', {
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
