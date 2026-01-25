/**
 * Vercel API Route: /api/moc-instructions/:mocId/parts-lists
 *
 * Handles POST and GET for MOC parts lists.
 * - POST: Create a new parts list for the MOC
 * - GET: Get all parts lists for the MOC with nested parts
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq, inArray } from 'drizzle-orm'
import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

const { logger } = loggerPkg

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ============================================================
// ZOD SCHEMAS
// ============================================================

const PartInputSchema = z.object({
  partId: z.string().min(1, 'Part ID is required'),
  partName: z.string().min(1, 'Part name is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  color: z.string().min(1, 'Color is required'),
})

const CreatePartsListInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  description: z.string().max(2000).optional().nullable(),
  built: z.boolean().optional(),
  purchased: z.boolean().optional(),
  parts: z.array(PartInputSchema).optional(),
})

// ============================================================
// INLINE SCHEMA (matches apps/api/core/database/schema/index.ts)
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

const mocParts = pgTable('moc_parts', {
  id: uuid('id').primaryKey().defaultRandom(),
  partsListId: uuid('parts_list_id').notNull(),
  partId: text('part_id').notNull(),
  partName: text('part_name').notNull(),
  quantity: integer('quantity').notNull(),
  color: text('color').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
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
// HANDLERS
// ============================================================

async function handlePost(
  req: VercelRequest,
  res: VercelResponse,
  db: ReturnType<typeof drizzle>,
  userId: string,
  mocId: string,
): Promise<void> {
  // Validate request body
  const parseResult = CreatePartsListInputSchema.safeParse(req.body)
  if (!parseResult.success) {
    const errors = parseResult.error.issues.map(e => e.message).join(', ')
    res.status(400).json({ error: 'VALIDATION_ERROR', message: errors })
    return
  }

  const input = parseResult.data

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

  // Generate UUID and timestamps
  const id = crypto.randomUUID()
  const now = new Date()

  // Calculate total parts count if parts provided
  const totalPartsCount =
    input.parts?.reduce((sum, part) => sum + part.quantity, 0).toString() ?? null

  // Insert parts list
  const [inserted] = await db
    .insert(mocPartsLists)
    .values({
      id,
      mocId,
      title: input.title,
      description: input.description ?? null,
      built: input.built ?? false,
      purchased: input.purchased ?? false,
      notes: null,
      costEstimate: null,
      actualCost: null,
      totalPartsCount,
      acquiredPartsCount: '0',
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  if (!inserted) {
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'No row returned from insert' })
    return
  }

  // Insert initial parts if provided
  if (input.parts && input.parts.length > 0) {
    const partRecords = input.parts.map(part => ({
      id: crypto.randomUUID(),
      partsListId: id,
      partId: part.partId,
      partName: part.partName,
      quantity: part.quantity,
      color: part.color,
      createdAt: now,
    }))

    await db.insert(mocParts).values(partRecords)
  }

  logger.info('Create parts list', {
    userId,
    mocId,
    partsListId: inserted.id,
    title: inserted.title,
  })

  res.status(201).json({
    id: inserted.id,
    mocId: inserted.mocId,
    title: inserted.title,
    description: inserted.description,
    built: inserted.built ?? false,
    purchased: inserted.purchased ?? false,
    notes: inserted.notes,
    costEstimate: inserted.costEstimate,
    actualCost: inserted.actualCost,
    totalPartsCount: inserted.totalPartsCount,
    acquiredPartsCount: inserted.acquiredPartsCount,
    createdAt: inserted.createdAt.toISOString(),
    updatedAt: inserted.updatedAt.toISOString(),
  })
}

async function handleGet(
  req: VercelRequest,
  res: VercelResponse,
  db: ReturnType<typeof drizzle>,
  userId: string,
  mocId: string,
): Promise<void> {
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

  // Get all parts lists for this MOC
  const partsLists = await db
    .select({
      id: mocPartsLists.id,
      mocId: mocPartsLists.mocId,
      title: mocPartsLists.title,
      description: mocPartsLists.description,
      built: mocPartsLists.built,
      purchased: mocPartsLists.purchased,
      notes: mocPartsLists.notes,
      costEstimate: mocPartsLists.costEstimate,
      actualCost: mocPartsLists.actualCost,
      totalPartsCount: mocPartsLists.totalPartsCount,
      acquiredPartsCount: mocPartsLists.acquiredPartsCount,
      createdAt: mocPartsLists.createdAt,
      updatedAt: mocPartsLists.updatedAt,
    })
    .from(mocPartsLists)
    .where(eq(mocPartsLists.mocId, mocId))

  // Get all parts for all parts lists
  const partsListIds = partsLists.map(pl => pl.id)
  let allParts: Array<{
    id: string
    partsListId: string
    partId: string
    partName: string
    quantity: number
    color: string
    createdAt: Date
  }> = []

  if (partsListIds.length > 0) {
    allParts = await db
      .select({
        id: mocParts.id,
        partsListId: mocParts.partsListId,
        partId: mocParts.partId,
        partName: mocParts.partName,
        quantity: mocParts.quantity,
        color: mocParts.color,
        createdAt: mocParts.createdAt,
      })
      .from(mocParts)
      .where(inArray(mocParts.partsListId, partsListIds))
  }

  // Group parts by parts list ID
  const partsByListId = new Map<string, typeof allParts>()
  for (const part of allParts) {
    const existing = partsByListId.get(part.partsListId) ?? []
    existing.push(part)
    partsByListId.set(part.partsListId, existing)
  }

  // Transform to API format with nested parts
  const result = partsLists.map(pl => {
    const listParts = partsByListId.get(pl.id) ?? []
    const transformedParts = listParts.map(p => ({
      id: p.id,
      partsListId: p.partsListId,
      partId: p.partId,
      partName: p.partName,
      quantity: p.quantity,
      color: p.color,
      createdAt: p.createdAt.toISOString(),
    }))

    return {
      id: pl.id,
      mocId: pl.mocId,
      title: pl.title,
      description: pl.description,
      built: pl.built ?? false,
      purchased: pl.purchased ?? false,
      notes: pl.notes,
      costEstimate: pl.costEstimate,
      actualCost: pl.actualCost,
      totalPartsCount: pl.totalPartsCount,
      acquiredPartsCount: pl.acquiredPartsCount,
      createdAt: pl.createdAt.toISOString(),
      updatedAt: pl.updatedAt.toISOString(),
      parts: transformedParts,
    }
  })

  logger.info('Get parts lists', { userId, mocId, count: result.length })

  res.status(200).json(result)
}

// ============================================================
// MAIN HANDLER
// ============================================================

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only allow POST, GET
  if (!['POST', 'GET'].includes(req.method ?? '')) {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const userId = getAuthUserId()
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' })
    return
  }

  // Extract MOC ID from query params
  const mocId = req.query.mocId as string
  if (!mocId) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'MOC ID is required' })
    return
  }

  // Validate UUID format
  if (!uuidRegex.test(mocId)) {
    res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid MOC ID format' })
    return
  }

  try {
    const db = getDb()

    switch (req.method) {
      case 'POST':
        await handlePost(req, res, db, userId, mocId)
        break
      case 'GET':
        await handleGet(req, res, db, userId, mocId)
        break
    }
  } catch (error) {
    logger.error('Parts lists handler error', {
      method: req.method,
      mocId,
      error: error instanceof Error ? error.message : String(error),
    })
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}
