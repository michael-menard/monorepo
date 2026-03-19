/**
 * Story Similarity Search using pgvector
 *
 * Finds stories similar to a given query using embedding cosine similarity.
 * Queries workflow.story_embeddings JOIN workflow.stories for correct schema.
 *
 * @see CDTS-2010 for implementation requirements
 * @see CDBE-4010 for embedding table foundation
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '../db/schema.js'

/**
 * Result shape for similar story queries.
 */
export const SimilarStoryResultSchema = z.object({
  story_id: z.string(),
  title: z.string(),
  feature: z.string().nullable(),
  state: z.string().nullable(),
  similarity_score: z.number(),
})

export type SimilarStoryResult = z.infer<typeof SimilarStoryResultSchema>

/**
 * Find stories similar to a query string using embedding cosine similarity.
 *
 * @param db - Drizzle database client
 * @param queryEmbedding - 1536-dimensional embedding vector for the query
 * @param limit - Maximum results to return (default 5)
 * @param featureFilter - Optional feature filter to narrow results
 * @returns Array of similar stories sorted by similarity descending
 */
export async function findSimilarStories(
  db: NodePgDatabase<typeof schema>,
  queryEmbedding: number[],
  limit = 5,
  featureFilter?: string,
): Promise<SimilarStoryResult[]> {
  const startTime = Date.now()
  const embeddingStr = `[${queryEmbedding.join(',')}]`

  const result = await db.execute(sql`
    SELECT
      s.story_id,
      s.title,
      s.feature,
      s.state,
      1 - (se.embedding <=> ${embeddingStr}::vector) as similarity_score
    FROM workflow.story_embeddings se
    JOIN workflow.stories s ON s.story_id = se.story_id
    WHERE se.embedding IS NOT NULL
      ${featureFilter ? sql`AND s.feature = ${featureFilter}` : sql``}
    ORDER BY se.embedding <=> ${embeddingStr}::vector ASC
    LIMIT ${limit}
  `)

  const elapsed = Date.now() - startTime
  logger.debug('Story similarity search completed', {
    resultCount: result.rows.length,
    elapsed_ms: elapsed,
    featureFilter,
  })

  return (result.rows as Array<Record<string, unknown>>).map(row => ({
    story_id: row.story_id as string,
    title: row.title as string,
    feature: row.feature as string | null,
    state: row.state as string | null,
    similarity_score: parseFloat(row.similarity_score as string),
  }))
}

/**
 * Generate embedding text for a story from its title, feature, and acceptance criteria.
 *
 * @param title - Story title
 * @param feature - Feature/epic name
 * @param acceptanceCriteria - AC as JSON (array of objects or strings)
 * @returns Concatenated text suitable for embedding
 */
export function buildStoryEmbeddingText(
  title: string,
  feature?: string | null,
  acceptanceCriteria?: unknown,
): string {
  const parts = [title]

  if (feature) {
    parts.push(`Feature: ${feature}`)
  }

  if (acceptanceCriteria) {
    try {
      const ac = Array.isArray(acceptanceCriteria) ? acceptanceCriteria : [acceptanceCriteria]
      const acText = ac
        .map(item => {
          if (typeof item === 'string') return item
          if (typeof item === 'object' && item !== null && 'text' in item)
            return (item as { text: string }).text
          return JSON.stringify(item)
        })
        .join(' ')
      if (acText.trim()) {
        parts.push(`Acceptance Criteria: ${acText}`)
      }
    } catch {
      // Skip malformed AC
    }
  }

  return parts.join('\n')
}
