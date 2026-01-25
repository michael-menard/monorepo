/**
 * Create Parts List
 *
 * Platform-agnostic core logic for creating a new MOC parts list.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import {
  PartsListSchema,
  type PartsList,
  type PartsListRow,
  type PartRow,
  type CreatePartsListInput,
  type MocInstructionRow,
} from './__types__/index.js'

/**
 * Minimal database interface for create-parts-list operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface CreatePartsListDbClient {
  insert: (table: unknown) => {
    values: (data: Record<string, unknown> | Record<string, unknown>[]) => {
      returning: () => Promise<PartsListRow[] | PartRow[]>
    }
  }
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<MocInstructionRow[]>
    }
  }
}

/**
 * Schema references interface
 *
 * Allows injecting table references for platform independence.
 */
export interface CreatePartsListSchema {
  mocPartsLists: {
    id: unknown
    mocId: unknown
    title: unknown
    description: unknown
    built: unknown
    purchased: unknown
    notes: unknown
    costEstimate: unknown
    actualCost: unknown
    totalPartsCount: unknown
    acquiredPartsCount: unknown
    createdAt: unknown
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
 * Create Parts List Result
 *
 * Discriminated union for create operation result.
 */
export type CreatePartsListResult =
  | { success: true; data: PartsList }
  | {
      success: false
      error: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'DB_ERROR'
      message: string
    }

/**
 * Generate a UUID v4
 */
function generateUuid(): string {
  return crypto.randomUUID()
}

/**
 * Create a new parts list for a MOC
 *
 * Inserts a new parts list into the database with server-generated fields.
 * The function handles:
 * - UUID generation for parts list id
 * - Timestamp generation for createdAt/updatedAt
 * - MOC ownership verification
 * - Optional initial parts creation
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with mocPartsLists, mocParts, mocInstructions tables
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param mocId - MOC ID the parts list belongs to
 * @param input - Validated CreatePartsListInput from request body
 * @returns Created parts list or error result
 */
export async function createPartsList(
  db: CreatePartsListDbClient,
  schema: CreatePartsListSchema,
  userId: string,
  mocId: string,
  input: CreatePartsListInput,
): Promise<CreatePartsListResult> {
  const now = new Date()
  const id = generateUuid()
  const { mocPartsLists, mocParts, mocInstructions } = schema

  try {
    // Verify MOC exists and belongs to user
    const [moc] = await db
      .select({
        id: mocInstructions.id as unknown as string,
        userId: mocInstructions.userId as unknown as string,
      })
      .from(mocInstructions)
      .where((mocInstructions.id as unknown) === mocId)

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
        message: 'MOC not found', // Return 404 to not leak existence info
      }
    }

    // Calculate total parts count if parts provided
    const totalPartsCount =
      input.parts?.reduce((sum, part) => sum + part.quantity, 0).toString() ?? null

    // Prepare insert data with server-generated fields
    const insertData: Record<string, unknown> = {
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
    }

    const [inserted] = (await db
      .insert(mocPartsLists)
      .values(insertData)
      .returning()) as PartsListRow[]

    if (!inserted) {
      return {
        success: false,
        error: 'DB_ERROR',
        message: 'No row returned from insert',
      }
    }

    // Insert initial parts if provided
    if (input.parts && input.parts.length > 0) {
      const partRecords = input.parts.map(part => ({
        id: generateUuid(),
        partsListId: id,
        partId: part.partId,
        partName: part.partName,
        quantity: part.quantity,
        color: part.color,
        createdAt: now,
      }))

      await db.insert(mocParts).values(partRecords).returning()
    }

    // Transform DB row to API response format
    const partsList = PartsListSchema.parse({
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

    return { success: true, data: partsList }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
