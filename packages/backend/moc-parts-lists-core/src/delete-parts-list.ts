/**
 * Delete Parts List
 *
 * Platform-agnostic core logic for deleting a parts list.
 * Cascade delete of associated parts is handled by database foreign key.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import type { PartsListRow, MocInstructionRow } from './__types__/index.js'

/**
 * Minimal database interface for delete-parts-list operations
 */
export interface DeletePartsListDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<MocInstructionRow[] | PartsListRow[]>
    }
  }
  delete: (table: unknown) => {
    where: (condition: unknown) => Promise<void>
  }
}

/**
 * Schema references interface
 */
export interface DeletePartsListSchema {
  mocPartsLists: {
    id: unknown
    mocId: unknown
  }
  mocInstructions: {
    id: unknown
    userId: unknown
  }
}

/**
 * Delete Parts List Result
 */
export type DeletePartsListResult =
  | { success: true }
  | {
      success: false
      error: 'NOT_FOUND' | 'DB_ERROR'
      message: string
    }

/**
 * Delete a parts list and its associated parts (via cascade)
 *
 * @param db - Drizzle database client
 * @param schema - Database schema references
 * @param userId - Authenticated user ID
 * @param mocId - MOC ID
 * @param partsListId - Parts list ID to delete
 * @returns Success or error result
 */
export async function deletePartsList(
  db: DeletePartsListDbClient,
  schema: DeletePartsListSchema,
  userId: string,
  mocId: string,
  partsListId: string,
): Promise<DeletePartsListResult> {
  const { mocPartsLists, mocInstructions } = schema

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

    // Delete parts list (cascade will delete associated parts)
    await db.delete(mocPartsLists).where((mocPartsLists.id as unknown) === partsListId)

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
