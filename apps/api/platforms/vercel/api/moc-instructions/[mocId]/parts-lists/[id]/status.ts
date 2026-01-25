/**
 * Vercel API Route: /api/moc-instructions/:mocId/parts-lists/:id/status
 *
 * Handles PATCH for updating parts list built/purchased status.
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

const { logger } = loggerPkg

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ============================================================
// ZOD SCHEMAS
// ============================================================

const UpdatePartsListStatusInputSchema = z.object({
  built: z.boolean().optional(),
  purchased: z.boolean().optional(),
})

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
  // Only allow PATCH
  if (req.method !== 'PATCH') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const userId = getAuthUserId()
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' })
    return
  }

  // Extract IDs from query params
  const mocId = req.query.mocId as string
  const partsListId = req.query.id as string

  if (!mocId) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'MOC ID is required' })
    return
  }

  if (!partsListId) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Parts list ID is required' })
    return
  }

  // Validate UUID formats
  if (!uuidRegex.test(mocId)) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid MOC ID format' })
    return
  }

  if (!uuidRegex.test(partsListId)) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid parts list ID format' })
    return
  }

  // Validate request body
  const parseResult = UpdatePartsListStatusInputSchema.safeParse(req.body)
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map(e => e.message).join(', ')
    res.status(400).json({ error: 'VALIDATION_ERROR', message: errors })
    return
  }

  const input = parseResult.data

  try {
    const db = getDb()

    // Verify MOC exists and belongs to user
    const [moc] = await db
      .select({ id: mocInstructions.id, userId: mocInstructions.userId })
      .from(mocInstructions)
      .where(eq(mocInstructions.id, mocId))

    if (!moc) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'MOC not found' })
      return
    }

    if (moc.userId !== userId) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'MOC not found' })
      return
    }

    // Verify parts list exists and belongs to this MOC
    const [existing] = await db
      .select({ id: mocPartsLists.id, mocId: mocPartsLists.mocId })
      .from(mocPartsLists)
      .where(eq(mocPartsLists.id, partsListId))

    if (!existing) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Parts list not found' })
      return
    }

    if (existing.mocId !== mocId) {
      res.status(404).json({ error: 'NOT_FOUND', message: 'Parts list not found' })
      return
    }

    // Build update data
    const now = new Date()
    const updateData: Record<string, unknown> = { updatedAt: now }

    if (input.built !== undefined) updateData.built = input.built
    if (input.purchased !== undefined) updateData.purchased = input.purchased

    const [updated] = await db
      .update(mocPartsLists)
      .set(updateData)
      .where(eq(mocPartsLists.id, partsListId))
      .returning()

    if (!updated) {
      res.status(500).json({ error: 'INTERNAL_ERROR', message: 'No row returned from update' })
      return
    }

    logger.info('Update parts list status', {
      userId,
      mocId,
      partsListId,
      built: input.built,
      purchased: input.purchased,
    })

    res.status(200).json({
      id: updated.id,
      mocId: updated.mocId,
      title: updated.title,
      description: updated.description,
      built: updated.built ?? false,
      purchased: updated.purchased ?? false,
      notes: updated.notes,
      costEstimate: updated.costEstimate,
      actualCost: updated.actualCost,
      totalPartsCount: updated.totalPartsCount,
      acquiredPartsCount: updated.acquiredPartsCount,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (error) {
    logger.error('Parts list status handler error', {
      mocId,
      partsListId,
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
