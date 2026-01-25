/**
 * Vercel API Route: /api/moc-instructions/:mocId/parts-lists/:id/parse
 *
 * Handles POST for parsing CSV content and importing parts.
 */

import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { eq } from 'drizzle-orm'
import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import loggerPkg from '@repo/logger'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'

const { logger } = loggerPkg

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Constants
const MAX_ROWS = 10000
const BATCH_SIZE = 1000

// ============================================================
// ZOD SCHEMAS
// ============================================================

const ParseCsvInputSchema = z.object({
  csvContent: z.string().min(1, 'CSV content is required'),
})

const CsvRowSchema = z.object({
  'Part ID': z.string().min(1, 'Part ID is required'),
  'Part Name': z.string().min(1, 'Part Name is required'),
  Quantity: z.string().regex(/^\d+$/, 'Quantity must be a positive integer'),
  Color: z.string().min(1, 'Color is required'),
})

type CsvRow = z.infer<typeof CsvRowSchema>

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
// CSV PARSING
// ============================================================

function parseCsvContent(csvContent: string): { rows: CsvRow[]; error?: string } {
  const lines = csvContent.trim().split('\n')

  if (lines.length === 0) {
    return { rows: [], error: 'CSV file is empty' }
  }

  // Parse header
  const headerLine = lines[0].trim()
  const headers = headerLine.split(',').map(h => h.trim())

  // Validate required columns
  const requiredColumns = ['Part ID', 'Part Name', 'Quantity', 'Color']
  const missingColumns = requiredColumns.filter(col => !headers.includes(col))

  if (missingColumns.length > 0) {
    return { rows: [], error: `Missing required columns: ${missingColumns.join(', ')}` }
  }

  // Find column indices
  const partIdIdx = headers.indexOf('Part ID')
  const partNameIdx = headers.indexOf('Part Name')
  const quantityIdx = headers.indexOf('Quantity')
  const colorIdx = headers.indexOf('Color')

  const rows: CsvRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Check row limit
    if (rows.length >= MAX_ROWS) {
      return { rows: [], error: `CSV exceeds maximum ${MAX_ROWS} rows` }
    }

    const values = line.split(',').map(v => v.trim())

    const row = {
      'Part ID': values[partIdIdx] || '',
      'Part Name': values[partNameIdx] || '',
      Quantity: values[quantityIdx] || '',
      Color: values[colorIdx] || '',
    }

    // Validate row
    const validation = CsvRowSchema.safeParse(row)
    if (!validation.success) {
      const errors = validation.error.issues.map(issue => issue.message).join(', ')
      return { rows: [], error: `Row ${i + 1}: ${errors}` }
    }

    // Validate quantity is positive
    const quantity = parseInt(row.Quantity, 10)
    if (quantity <= 0) {
      return { rows: [], error: `Row ${i + 1}: Quantity must be greater than 0` }
    }

    rows.push(row)
  }

  if (rows.length === 0) {
    return { rows: [], error: 'CSV contains no valid data rows' }
  }

  return { rows }
}

// ============================================================
// MAIN HANDLER
// ============================================================

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only allow POST
  if (req.method !== 'POST') {
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
  const parseInputResult = ParseCsvInputSchema.safeParse(req.body)
  if (!parseInputResult.success) {
    const errors = parseInputResult.error.issues.map(e => e.message).join(', ')
    res.status(400).json({ error: 'VALIDATION_ERROR', message: errors })
    return
  }

  const { csvContent } = parseInputResult.data

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

    // Parse CSV content
    const { rows, error } = parseCsvContent(csvContent)
    if (error) {
      res.status(400).json({ error: 'VALIDATION_ERROR', message: error })
      return
    }

    // Calculate total parts
    const totalParts = rows.reduce((sum, row) => sum + parseInt(row.Quantity, 10), 0)
    const now = new Date()

    // Delete existing parts
    await db.delete(mocParts).where(eq(mocParts.partsListId, partsListId))

    // Insert new parts in batches
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE)
      const partRecords = batch.map(row => ({
        id: crypto.randomUUID(),
        partsListId,
        partId: row['Part ID'],
        partName: row['Part Name'],
        quantity: parseInt(row.Quantity, 10),
        color: row.Color,
        createdAt: now,
      }))

      await db.insert(mocParts).values(partRecords)
    }

    // Update parts list total count
    await db
      .update(mocPartsLists)
      .set({
        totalPartsCount: totalParts.toString(),
        updatedAt: now,
      })
      .where(eq(mocPartsLists.id, partsListId))

    logger.info('Parse CSV complete', {
      userId,
      mocId,
      partsListId,
      rowsProcessed: rows.length,
      totalParts,
    })

    res.status(200).json({
      partsListId,
      totalParts,
      rowsProcessed: rows.length,
    })
  } catch (error) {
    logger.error('Parse CSV handler error', {
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
