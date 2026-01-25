/**
 * Parse Parts CSV
 *
 * Platform-agnostic core logic for parsing CSV content and importing parts.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import {
  CsvRowSchema,
  type CsvRow,
  type ParseCsvResult,
  type PartsListRow,
  type PartRow,
  type MocInstructionRow,
} from './__types__/index.js'

// Constants
const MAX_ROWS = 10000
const BATCH_SIZE = 1000

/**
 * Minimal database interface for parse-parts-csv operations
 */
export interface ParsePartsCsvDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<MocInstructionRow[] | PartsListRow[]>
    }
  }
  insert: (table: unknown) => {
    values: (data: Record<string, unknown> | Record<string, unknown>[]) => {
      returning: () => Promise<PartRow[]>
    }
  }
  update: (table: unknown) => {
    set: (data: Record<string, unknown>) => {
      where: (condition: unknown) => {
        returning: () => Promise<PartsListRow[]>
      }
    }
  }
  delete: (table: unknown) => {
    where: (condition: unknown) => Promise<void>
  }
  transaction: <T>(fn: (tx: ParsePartsCsvDbClient) => Promise<T>) => Promise<T>
}

/**
 * Schema references interface
 */
export interface ParsePartsCsvSchema {
  mocPartsLists: {
    id: unknown
    mocId: unknown
    totalPartsCount: unknown
    updatedAt: unknown
  }
  mocParts: {
    id: unknown
    partsListId: unknown
    partId: unknown
    partName: unknown
    quantity: unknown
    color: unknown
    createdAt: unknown
  }
  mocInstructions: {
    id: unknown
    userId: unknown
  }
}

/**
 * Parse Parts CSV Result
 */
export type ParsePartsCsvResult =
  | { success: true; data: ParseCsvResult }
  | {
      success: false
      error: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'DB_ERROR'
      message: string
    }

/**
 * Generate a UUID v4
 */
function generateUuid(): string {
  return crypto.randomUUID()
}

/**
 * Parse CSV content into rows
 *
 * Simple CSV parser that handles the expected format:
 * Part ID,Part Name,Quantity,Color
 */
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
    if (!line) continue // Skip empty lines

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

/**
 * Parse CSV and import parts into a parts list
 *
 * Replaces all existing parts in the parts list with parsed CSV data.
 * Operation is atomic - uses transaction to ensure all-or-nothing.
 *
 * @param db - Drizzle database client
 * @param schema - Database schema references
 * @param userId - Authenticated user ID
 * @param mocId - MOC ID
 * @param partsListId - Parts list ID to import into
 * @param csvContent - Raw CSV content
 * @returns Parse result with counts or error
 */
export async function parsePartsCsv(
  db: ParsePartsCsvDbClient,
  schema: ParsePartsCsvSchema,
  userId: string,
  mocId: string,
  partsListId: string,
  csvContent: string,
): Promise<ParsePartsCsvResult> {
  const { mocPartsLists, mocParts, mocInstructions } = schema

  try {
    // Verify MOC exists and belongs to user
    const [moc] = (await db
      .select({
        id: mocInstructions.id as unknown as string,
        userId: mocInstructions.userId as unknown as string,
      })
      .from(mocInstructions)
      .where((mocInstructions.id as unknown) === mocId)) as MocInstructionRow[]

    if (!moc) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'MOC not found',
      }
    }

    if (moc.userId !== userId) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'MOC not found',
      }
    }

    // Verify parts list exists and belongs to this MOC
    const [existing] = (await db
      .select({
        id: mocPartsLists.id,
        mocId: mocPartsLists.mocId,
      })
      .from(mocPartsLists)
      .where((mocPartsLists.id as unknown) === partsListId)) as PartsListRow[]

    if (!existing) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Parts list not found',
      }
    }

    if (existing.mocId !== mocId) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Parts list not found',
      }
    }

    // Parse CSV content
    const { rows, error } = parseCsvContent(csvContent)
    if (error) {
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: error,
      }
    }

    // Calculate total parts
    const totalParts = rows.reduce((sum, row) => sum + parseInt(row.Quantity, 10), 0)
    const now = new Date()

    // Execute in transaction for atomicity
    await db.transaction(async tx => {
      // Delete existing parts
      await tx.delete(mocParts).where((mocParts.partsListId as unknown) === partsListId)

      // Insert new parts in batches
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        const partRecords = batch.map(row => ({
          id: generateUuid(),
          partsListId,
          partId: row['Part ID'],
          partName: row['Part Name'],
          quantity: parseInt(row.Quantity, 10),
          color: row.Color,
          createdAt: now,
        }))

        await tx.insert(mocParts).values(partRecords).returning()
      }

      // Update parts list total count
      await tx
        .update(mocPartsLists)
        .set({
          totalPartsCount: totalParts.toString(),
          updatedAt: now,
        })
        .where((mocPartsLists.id as unknown) === partsListId)
        .returning()
    })

    return {
      success: true,
      data: {
        partsListId,
        totalParts,
        rowsProcessed: rows.length,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
