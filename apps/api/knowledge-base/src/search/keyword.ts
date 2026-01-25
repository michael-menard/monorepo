/**
 * Keyword Search using PostgreSQL Full-Text Search
 *
 * Executes FTS using plainto_tsquery for safe query parsing and
 * ts_rank_cd for cover density ranking.
 *
 * @see KNOW-004 AC9 for acceptance criteria
 */

import { logger } from '@repo/logger'
import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '../db/schema.js'
import { type ScoredEntry, type SearchFilters, INTERNAL_FETCH_LIMIT } from './schemas.js'

/**
 * Execute keyword search using PostgreSQL full-text search.
 *
 * Uses plainto_tsquery for safe query parsing (handles special characters)
 * and ts_rank_cd for cover density ranking (considers term proximity).
 *
 * @param db - Drizzle database client
 * @param query - Natural language search query
 * @param filters - Optional filters for role, tags, entry_type, min_confidence
 * @param limit - Maximum results to return (internal limit, typically 100)
 * @returns Array of scored entries sorted by keyword rank descending
 */
export async function keywordSearch(
  db: NodePgDatabase<typeof schema>,
  query: string,
  filters: SearchFilters,
  limit: number = INTERNAL_FETCH_LIMIT,
): Promise<ScoredEntry[]> {
  const startTime = Date.now()

  // Handle empty or whitespace-only queries
  if (!query.trim()) {
    logger.debug('Keyword search skipped - empty query')
    return []
  }

  try {
    // Execute FTS query with filters
    // plainto_tsquery safely handles special characters
    // ts_rank_cd uses cover density ranking with document length normalization
    const result = await db.execute(sql`
      SELECT
        id,
        content,
        role,
        tags,
        created_at as "createdAt",
        updated_at as "updatedAt",
        ts_rank_cd(
          to_tsvector('english', content),
          plainto_tsquery('english', ${query}),
          32
        ) as score
      FROM knowledge_entries
      WHERE to_tsvector('english', content) @@ plainto_tsquery('english', ${query})
        ${filters.role ? sql`AND (role = ${filters.role} OR role = 'all')` : sql``}
        ${filters.tags && filters.tags.length > 0 ? sql`AND tags && ${filters.tags}::text[]` : sql``}
      ORDER BY score DESC, updated_at DESC
      LIMIT ${limit}
    `)

    const elapsed = Date.now() - startTime

    logger.debug('Keyword search completed', {
      query,
      resultCount: result.rows.length,
      elapsed_ms: elapsed,
      filters: {
        role: filters.role,
        tags: filters.tags,
      },
    })

    // Map results to ScoredEntry type
    return (result.rows as Array<Record<string, unknown>>).map(row => ({
      id: row.id as string,
      content: row.content as string,
      role: row.role as 'pm' | 'dev' | 'qa' | 'all',
      tags: row.tags as string[] | null,
      createdAt: new Date(row.createdAt as string),
      updatedAt: new Date(row.updatedAt as string),
      score: parseFloat(row.score as string),
    }))
  } catch (error) {
    const elapsed = Date.now() - startTime

    logger.error('Keyword search failed', {
      error: error instanceof Error ? error.message : String(error),
      elapsed_ms: elapsed,
      query,
    })

    throw error
  }
}

/**
 * Check if query will produce any FTS matches without executing full search.
 * Useful for fallback logic to avoid unnecessary queries.
 *
 * @param db - Drizzle database client
 * @param query - Natural language search query
 * @returns true if query would match at least one entry
 */
export async function hasKeywordMatches(
  db: NodePgDatabase<typeof schema>,
  query: string,
): Promise<boolean> {
  if (!query.trim()) {
    return false
  }

  try {
    const result = await db.execute(sql`
      SELECT EXISTS(
        SELECT 1
        FROM knowledge_entries
        WHERE to_tsvector('english', content) @@ plainto_tsquery('english', ${query})
        LIMIT 1
      ) as has_matches
    `)

    return (result.rows[0] as { has_matches: boolean })?.has_matches ?? false
  } catch (error) {
    logger.warn('Failed to check keyword matches', {
      error: error instanceof Error ? error.message : String(error),
      query,
    })
    return false
  }
}
