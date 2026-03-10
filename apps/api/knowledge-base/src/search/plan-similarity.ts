/**
 * Plan Similarity Search using pgvector
 *
 * Finds plans similar to a given query using embedding cosine similarity.
 * Uses the same text-embedding-3-small model as stories.embedding.
 *
 * @see PDBM Phase 0 for implementation requirements
 */

import { logger } from '@repo/logger'
import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '../db/schema.js'

/**
 * Result shape for similar plan queries.
 */
export interface SimilarPlanResult {
  plan_slug: string
  title: string
  plan_type: string | null
  status: string | null
  similarity_score: number
}

/**
 * Find plans similar to a query string using embedding cosine similarity.
 *
 * @param db - Drizzle database client
 * @param queryEmbedding - 1536-dimensional embedding vector for the query
 * @param limit - Maximum results to return (default 5)
 * @param typeFilter - Optional plan_type filter to narrow results
 * @returns Array of similar plans sorted by similarity descending
 */
export async function findSimilarPlans(
  db: NodePgDatabase<typeof schema>,
  queryEmbedding: number[],
  limit = 5,
  typeFilter?: string,
): Promise<SimilarPlanResult[]> {
  const startTime = Date.now()
  const embeddingStr = `[${queryEmbedding.join(',')}]`

  const result = await db.execute(sql`
    SELECT
      plan_slug,
      title,
      plan_type,
      status,
      1 - (embedding <=> ${embeddingStr}::vector) as similarity_score
    FROM public.plans
    WHERE deleted_at IS NULL
      AND embedding IS NOT NULL
      ${typeFilter ? sql`AND plan_type = ${typeFilter}` : sql``}
    ORDER BY embedding <=> ${embeddingStr}::vector ASC
    LIMIT ${limit}
  `)

  const elapsed = Date.now() - startTime
  logger.debug('Plan similarity search completed', {
    resultCount: result.rows.length,
    elapsed_ms: elapsed,
    typeFilter,
  })

  return (result.rows as Array<Record<string, unknown>>).map(row => ({
    plan_slug: row.plan_slug as string,
    title: row.title as string,
    plan_type: row.plan_type as string | null,
    status: row.status as string | null,
    similarity_score: parseFloat(row.similarity_score as string),
  }))
}

/**
 * Generate embedding text for a plan from its title, summary, tags, and type.
 *
 * @param title - Plan title
 * @param summary - Plan summary
 * @param tags - Plan tags
 * @param planType - Plan type (feature, refactor, etc.)
 * @returns Concatenated text suitable for embedding
 */
export function buildPlanEmbeddingText(
  title: string,
  summary?: string | null,
  tags?: string[] | null,
  planType?: string | null,
): string {
  const parts = [title]

  if (planType) {
    parts.push(`Type: ${planType}`)
  }

  if (summary) {
    parts.push(summary)
  }

  if (tags && tags.length > 0) {
    parts.push(`Tags: ${tags.join(', ')}`)
  }

  return parts.join('\n')
}
