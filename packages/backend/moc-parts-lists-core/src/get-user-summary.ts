/**
 * Get User Summary
 *
 * Platform-agnostic core logic for getting aggregated user statistics.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import { UserSummarySchema, type UserSummary } from './__types__/index.js'

/**
 * Minimal database interface for get-user-summary operations
 */
export interface GetUserSummaryDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<Array<Record<string, unknown>>>
      innerJoin: (
        table: unknown,
        condition: unknown,
      ) => {
        where: (condition: unknown) => Promise<Array<Record<string, unknown>>>
      }
    }
  }
}

/**
 * Schema references interface
 */
export interface GetUserSummarySchema {
  mocPartsLists: {
    id: unknown
    mocId: unknown
    built: unknown
    purchased: unknown
    totalPartsCount: unknown
  }
  mocInstructions: {
    id: unknown
    userId: unknown
  }
}

/**
 * Get User Summary Result
 */
export type GetUserSummaryResult =
  | { success: true; data: UserSummary }
  | {
      success: false
      error: 'DB_ERROR'
      message: string
    }

/**
 * Get aggregated statistics for all parts lists owned by user
 *
 * Returns:
 * - totalLists: Count of all parts lists
 * - totalParts: Sum of all parts across all lists
 * - listsBuilt: Count of lists marked as built
 * - listsPurchased: Count of lists marked as purchased
 *
 * @param db - Drizzle database client
 * @param schema - Database schema references
 * @param userId - Authenticated user ID
 * @returns User summary statistics or error
 */
export async function getUserSummary(
  db: GetUserSummaryDbClient,
  schema: GetUserSummarySchema,
  userId: string,
): Promise<GetUserSummaryResult> {
  const { mocPartsLists, mocInstructions } = schema

  try {
    // Query to get all parts lists for user's MOCs
    const partsLists = (await db
      .select({
        id: mocPartsLists.id,
        built: mocPartsLists.built,
        purchased: mocPartsLists.purchased,
        totalPartsCount: mocPartsLists.totalPartsCount,
      })
      .from(mocPartsLists)
      .innerJoin(
        mocInstructions,
        (mocPartsLists.mocId as unknown) === (mocInstructions.id as unknown),
      )
      .where((mocInstructions.userId as unknown) === userId)) as Array<{
      id: string
      built: boolean | null
      purchased: boolean | null
      totalPartsCount: string | null
    }>

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

    const summary = UserSummarySchema.parse({
      totalLists,
      totalParts,
      listsBuilt,
      listsPurchased,
    })

    return { success: true, data: summary }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
