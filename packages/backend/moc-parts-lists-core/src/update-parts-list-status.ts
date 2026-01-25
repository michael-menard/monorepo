/**
 * Update Parts List Status
 *
 * Platform-agnostic core logic for updating built/purchased flags.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import {
  PartsListSchema,
  type PartsList,
  type PartsListRow,
  type UpdatePartsListStatusInput,
  type MocInstructionRow,
} from './__types__/index.js'

/**
 * Minimal database interface for update-parts-list-status operations
 */
export interface UpdatePartsListStatusDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<MocInstructionRow[] | PartsListRow[]>
    }
  }
  update: (table: unknown) => {
    set: (data: Record<string, unknown>) => {
      where: (condition: unknown) => {
        returning: () => Promise<PartsListRow[]>
      }
    }
  }
}

/**
 * Schema references interface
 */
export interface UpdatePartsListStatusSchema {
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
  mocInstructions: {
    id: unknown
    userId: unknown
  }
}

/**
 * Update Parts List Status Result
 */
export type UpdatePartsListStatusResult =
  | { success: true; data: PartsList }
  | {
      success: false
      error: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'DB_ERROR'
      message: string
    }

/**
 * Update parts list built/purchased status
 *
 * @param db - Drizzle database client
 * @param schema - Database schema references
 * @param userId - Authenticated user ID
 * @param mocId - MOC ID
 * @param partsListId - Parts list ID to update
 * @param input - Status flags to update (built and/or purchased)
 * @returns Updated parts list or error
 */
export async function updatePartsListStatus(
  db: UpdatePartsListStatusDbClient,
  schema: UpdatePartsListStatusSchema,
  userId: string,
  mocId: string,
  partsListId: string,
  input: UpdatePartsListStatusInput,
): Promise<UpdatePartsListStatusResult> {
  const { mocPartsLists, mocInstructions } = schema
  const now = new Date()

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

    // Build update data - only include provided fields
    const updateData: Record<string, unknown> = {
      updatedAt: now,
    }

    if (input.built !== undefined) updateData.built = input.built
    if (input.purchased !== undefined) updateData.purchased = input.purchased

    const [updated] = await db
      .update(mocPartsLists)
      .set(updateData)
      .where((mocPartsLists.id as unknown) === partsListId)
      .returning()

    if (!updated) {
      return {
        success: false,
        error: 'DB_ERROR',
        message: 'No row returned from update',
      }
    }

    const partsList = PartsListSchema.parse({
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

    return { success: true, data: partsList }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
