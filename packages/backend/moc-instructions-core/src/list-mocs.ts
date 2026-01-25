/**
 * List MOCs
 *
 * Platform-agnostic core logic for listing MOCs with pagination, search, and tag filter.
 * Accepts Drizzle DB client via dependency injection for testability.
 *
 * Features:
 * - Pagination with page/limit params (default: page=1, limit=20, max limit=100)
 * - Search via PostgreSQL ILIKE on title/description
 * - Tag filtering
 * - Returns only authenticated user's MOCs (always filters by userId)
 * - Sort by updatedAt DESC (most recent first)
 */

import {
  ListMocsResponseSchema,
  type ListMocsFilters,
  type ListMocsResponse,
  type MocRow,
} from './__types__/index.js'

/**
 * Minimal database interface for list-mocs operations
 */
export interface ListMocsDbClient {
  countMocs: (userId: string, filters: ListMocsFilters) => Promise<number>
  listMocs: (userId: string, filters: ListMocsFilters, offset: number) => Promise<MocRow[]>
}

/**
 * Schema references interface
 */
export interface ListMocsSchema {
  mocInstructions: unknown
}

/**
 * List MOCs Result
 *
 * Discriminated union for list MOCs operation result.
 */
export type ListMocsResult =
  | { success: true; data: ListMocsResponse }
  | { success: false; error: 'VALIDATION_ERROR' | 'DB_ERROR'; message: string }

/**
 * List MOCs with pagination, search, and tag filter
 *
 * Returns paginated list of user's MOCs.
 * Sort by updatedAt DESC (most recent first).
 *
 * @param db - Database client with countMocs and listMocs methods
 * @param userId - Authenticated user ID (required)
 * @param filters - Pagination and filter options
 * @returns ListMocsResponse or error result
 */
export async function listMocs(
  db: ListMocsDbClient,
  userId: string,
  filters: ListMocsFilters,
): Promise<ListMocsResult> {
  try {
    const { page = 1, limit = 20 } = filters

    // Cap limit at 100
    const cappedLimit = Math.min(limit, 100)

    // Get total count
    const total = await db.countMocs(userId, { ...filters, limit: cappedLimit })

    // Get paginated MOCs
    const offset = (page - 1) * cappedLimit
    const mocs = await db.listMocs(userId, { ...filters, limit: cappedLimit }, offset)

    // Transform to API response format
    const response: ListMocsResponse = {
      data: mocs.map(moc => ({
        id: moc.id,
        title: moc.title,
        description: moc.description,
        slug: moc.slug,
        tags: moc.tags,
        theme: moc.theme,
        thumbnailUrl: moc.thumbnailUrl,
        status: moc.status,
        createdAt: moc.createdAt.toISOString(),
        updatedAt: moc.updatedAt.toISOString(),
      })),
      page,
      limit: cappedLimit,
      total,
    }

    // Runtime validation
    ListMocsResponseSchema.parse(response)

    return { success: true, data: response }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
