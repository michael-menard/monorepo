/**
 * Get Parts Lists
 *
 * Platform-agnostic core logic for retrieving all parts lists for a MOC.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import {
  PartsListWithPartsSchema,
  PartSchema,
  type PartsListWithParts,
  type PartsListRow,
  type PartRow,
  type MocInstructionRow,
} from './__types__/index.js'

/**
 * Minimal database interface for get-parts-lists operations
 */
export interface GetPartsListsDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<MocInstructionRow[] | PartsListRow[] | PartRow[]>
      orderBy: (order: unknown) => Promise<PartsListRow[]>
    }
  }
}

/**
 * Schema references interface
 */
export interface GetPartsListsSchema {
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
 * Get Parts Lists Result
 */
export type GetPartsListsResult =
  | { success: true; data: PartsListWithParts[] }
  | {
      success: false
      error: 'NOT_FOUND' | 'DB_ERROR'
      message: string
    }

/**
 * Get all parts lists for a MOC
 *
 * Returns all parts lists belonging to the specified MOC,
 * each with their nested parts array.
 *
 * @param db - Drizzle database client
 * @param schema - Database schema references
 * @param userId - Authenticated user ID
 * @param mocId - MOC ID to get parts lists for
 * @returns Array of parts lists with nested parts or error
 */
export async function getPartsLists(
  db: GetPartsListsDbClient,
  schema: GetPartsListsSchema,
  userId: string,
  mocId: string,
): Promise<GetPartsListsResult> {
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

    // Get all parts lists for this MOC
    const partsLists = (await db
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
      .where((mocPartsLists.mocId as unknown) === mocId)) as PartsListRow[]

    // Get all parts for all parts lists in one query
    const partsListIds = partsLists.map(pl => pl.id)

    let allParts: PartRow[] = []
    if (partsListIds.length > 0) {
      // Get parts for all parts lists
      allParts = (await db
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
        .where(partsListIds.includes(mocParts.partsListId as unknown as string))) as PartRow[]
    }

    // Group parts by parts list ID
    const partsByListId = new Map<string, PartRow[]>()
    for (const part of allParts) {
      const existing = partsByListId.get(part.partsListId) ?? []
      existing.push(part)
      partsByListId.set(part.partsListId, existing)
    }

    // Transform to API format with nested parts
    const result: PartsListWithParts[] = partsLists.map(pl => {
      const listParts = partsByListId.get(pl.id) ?? []
      const transformedParts = listParts.map(p =>
        PartSchema.parse({
          id: p.id,
          partsListId: p.partsListId,
          partId: p.partId,
          partName: p.partName,
          quantity: p.quantity,
          color: p.color,
          createdAt: p.createdAt.toISOString(),
        }),
      )

      return PartsListWithPartsSchema.parse({
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
      })
    })

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
