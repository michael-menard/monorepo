/**
 * Semantic Search using pgvector
 *
 * Executes vector similarity search using pgvector's cosine distance operator.
 * Results are filtered by similarity threshold and optional filters.
 *
 * @see KNOW-004 AC1, AC8 for acceptance criteria
 */

import { logger } from '@repo/logger'
import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '../db/schema.js'
import {
  type ScoredEntry,
  type SearchFilters,
  SEMANTIC_SIMILARITY_THRESHOLD,
  INTERNAL_FETCH_LIMIT,
} from './schemas.js'

/**
 * Execute semantic search using pgvector cosine similarity.
 *
 * Uses the `<=>` operator for cosine distance and filters results
 * by the similarity threshold (0.3 by default).
 *
 * @param db - Drizzle database client
 * @param queryEmbedding - 1536-dimensional embedding vector for the query
 * @param filters - Optional filters for role, tags, entry_type, min_confidence
 * @param limit - Maximum results to return (internal limit, typically 100)
 * @returns Array of scored entries sorted by similarity descending
 */
export async function semanticSearch(
  db: NodePgDatabase<typeof schema>,
  queryEmbedding: number[],
  filters: SearchFilters,
  limit: number = INTERNAL_FETCH_LIMIT,
): Promise<ScoredEntry[]> {
  const startTime = Date.now()

  // Convert embedding to PostgreSQL vector format
  const embeddingStr = `[${queryEmbedding.join(',')}]`

  // Log forward-looking filters that aren't yet implemented
  if (filters.entry_type) {
    logger.debug('Entry type filter requested but not yet implemented', {
      entry_type: filters.entry_type,
    })
  }

  if (filters.min_confidence !== undefined && filters.min_confidence > 0) {
    logger.debug('Confidence filter requested but not yet implemented', {
      min_confidence: filters.min_confidence,
    })
  }

  try {
    // Execute the raw query with parameters
    // We need to use db.execute with properly formatted SQL
    const result = await db.execute(sql`
      SELECT
        id,
        content,
        role,
        tags,
        created_at as "createdAt",
        updated_at as "updatedAt",
        1 - (embedding <=> ${embeddingStr}::vector) as score
      FROM knowledge_entries
      WHERE 1 - (embedding <=> ${embeddingStr}::vector) >= ${SEMANTIC_SIMILARITY_THRESHOLD}
        ${filters.role ? sql`AND (role = ${filters.role} OR role = 'all')` : sql``}
        ${filters.tags && filters.tags.length > 0 ? sql`AND tags && ${filters.tags}::text[]` : sql``}
      ORDER BY embedding <=> ${embeddingStr}::vector ASC
      LIMIT ${limit}
    `)

    const elapsed = Date.now() - startTime

    logger.debug('Semantic search completed', {
      resultCount: result.rows.length,
      elapsed_ms: elapsed,
      threshold: SEMANTIC_SIMILARITY_THRESHOLD,
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

    logger.error('Semantic search failed', {
      error: error instanceof Error ? error.message : String(error),
      elapsed_ms: elapsed,
    })

    throw error
  }
}
