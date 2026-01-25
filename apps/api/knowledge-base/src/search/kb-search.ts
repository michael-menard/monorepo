/**
 * kb_search - Hybrid Semantic + Keyword Search
 *
 * Main search function that orchestrates hybrid search using:
 * 1. Semantic search via pgvector cosine similarity
 * 2. Keyword search via PostgreSQL FTS
 * 3. RRF (Reciprocal Rank Fusion) to merge and rank results
 *
 * Gracefully falls back to keyword-only search when OpenAI API is unavailable.
 *
 * @see KNOW-004 for acceptance criteria
 */

import { logger } from '@repo/logger'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '../db/schema.js'
import type { EmbeddingClient } from '../embedding-client/index.js'
import { semanticSearch } from './semantic.js'
import { keywordSearch } from './keyword.js'
import { mergeWithRRF, keywordOnlyRanking } from './hybrid.js'
import {
  SearchInputSchema,
  type SearchInput,
  type SearchResult,
  type SearchResultEntry,
  type SearchFilters,
  type ScoredEntry,
  INTERNAL_FETCH_LIMIT,
  createSearchError,
} from './schemas.js'

/**
 * Dependencies for kb_search operation.
 */
export interface KbSearchDeps {
  /** Drizzle database client */
  db: NodePgDatabase<typeof schema>
  /** Embedding client for query embedding generation */
  embeddingClient: EmbeddingClient
}

/**
 * Search the knowledge base using hybrid semantic + keyword search.
 *
 * Flow:
 * 1. Validate input with Zod schema
 * 2. Try to generate query embedding via EmbeddingClient
 * 3. If embedding succeeds, execute semantic search
 * 4. Execute keyword search (always)
 * 5. Merge results with RRF (or use keyword-only if embedding failed)
 * 6. Apply limit and return with metadata
 *
 * Fallback Behavior:
 * - If EmbeddingClient throws after retries, fallback_mode is set to true
 * - Keyword-only search is executed and returned
 * - A warning is logged for monitoring
 *
 * @param input - Search input with query, filters, and options
 * @param deps - Database and embedding client dependencies
 * @returns Search results with metadata including fallback_mode flag
 *
 * @throws ZodError if input validation fails
 * @throws Error if both semantic and keyword search fail (database error)
 *
 * @example
 * ```typescript
 * const result = await kb_search(
 *   { query: 'How to order routes', role: 'dev', limit: 10 },
 *   { db, embeddingClient }
 * )
 *
 * if (result.metadata.fallback_mode) {
 *   console.log('Using keyword-only search (OpenAI unavailable)')
 * }
 * ```
 */
export async function kb_search(input: SearchInput, deps: KbSearchDeps): Promise<SearchResult> {
  const startTime = Date.now()

  // Step 1: Validate input
  const validatedInput = SearchInputSchema.parse(input)

  const { db, embeddingClient } = deps
  const { query, limit, explain } = validatedInput

  // Extract filters
  const filters: SearchFilters = {
    role: validatedInput.role,
    tags: validatedInput.tags,
    entry_type: validatedInput.entry_type,
    min_confidence: validatedInput.min_confidence,
  }

  // Timing for debug info
  let embeddingMs: number | undefined
  let semanticMs: number | undefined
  let keywordMs: number | undefined

  // Search state
  let semanticResults: ScoredEntry[] = []
  let keywordResults: ScoredEntry[] = []
  let fallbackMode = false
  const searchModesUsed: ('semantic' | 'keyword')[] = []

  // Step 2: Try to generate query embedding
  try {
    const embeddingStart = Date.now()
    const queryEmbedding = await embeddingClient.generateEmbedding(query)
    embeddingMs = Date.now() - embeddingStart

    // Step 3: Execute semantic search
    const semanticStart = Date.now()
    semanticResults = await semanticSearch(db, queryEmbedding, filters, INTERNAL_FETCH_LIMIT)
    semanticMs = Date.now() - semanticStart

    searchModesUsed.push('semantic')

    logger.debug('Semantic search phase completed', {
      query,
      resultCount: semanticResults.length,
      embedding_ms: embeddingMs,
      semantic_ms: semanticMs,
    })
  } catch (error) {
    // OpenAI API unavailable - fall back to keyword-only
    fallbackMode = true

    logger.warn('OpenAI API unavailable, using keyword-only fallback', {
      error: error instanceof Error ? error.message : String(error),
      query,
    })
  }

  // Step 4: Execute keyword search (always)
  try {
    const keywordStart = Date.now()
    keywordResults = await keywordSearch(db, query, filters, INTERNAL_FETCH_LIMIT)
    keywordMs = Date.now() - keywordStart

    searchModesUsed.push('keyword')

    logger.debug('Keyword search phase completed', {
      query,
      resultCount: keywordResults.length,
      keyword_ms: keywordMs,
    })
  } catch (error) {
    // If both searches fail, we need to throw
    if (fallbackMode && keywordResults.length === 0) {
      logger.error('Both semantic and keyword search failed', {
        error: error instanceof Error ? error.message : String(error),
        query,
      })

      throw createSearchError('DATABASE_ERROR', 'Search unavailable. Please try again later.')
    }

    // Log keyword failure but continue with semantic results
    logger.warn('Keyword search failed, using semantic results only', {
      error: error instanceof Error ? error.message : String(error),
      query,
    })
  }

  // Step 5: Merge results with RRF
  const rrfStart = Date.now()

  let rankedResults: SearchResultEntry[]

  if (fallbackMode) {
    // Keyword-only ranking
    const keywordRanked = keywordOnlyRanking(keywordResults)
    rankedResults = keywordRanked.map(entry => ({
      id: entry.id,
      content: entry.content,
      role: entry.role,
      tags: entry.tags,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      relevance_score: entry.rrf_score,
      keyword_score: entry.keyword_score,
    }))
  } else {
    // Full RRF merge
    const merged = mergeWithRRF(semanticResults, keywordResults)
    rankedResults = merged.map(entry => ({
      id: entry.id,
      content: entry.content,
      role: entry.role,
      tags: entry.tags,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      relevance_score: entry.rrf_score,
      semantic_score: entry.semantic_score,
      keyword_score: entry.keyword_score,
    }))
  }

  const rrfMs = Date.now() - rrfStart

  // Step 6: Apply limit
  const totalResults = rankedResults.length
  const limitedResults = rankedResults.slice(0, limit)

  const queryTimeMs = Date.now() - startTime

  // Log search execution at info level
  logger.info('Search completed', {
    query_time_ms: queryTimeMs,
    semantic_ms: semanticMs,
    keyword_ms: keywordMs,
    rrf_ms: rrfMs,
    result_count: limitedResults.length,
    total_before_limit: totalResults,
    fallback_mode: fallbackMode,
    search_modes_used: searchModesUsed,
  })

  // Build result
  const result: SearchResult = {
    results: limitedResults,
    metadata: {
      total: totalResults,
      fallback_mode: fallbackMode,
      query_time_ms: queryTimeMs,
      search_modes_used: searchModesUsed,
    },
  }

  // Add debug info if explain mode is enabled
  if (explain) {
    result.metadata.debug_info = {
      embedding_ms: embeddingMs,
      semantic_ms: semanticMs,
      keyword_ms: keywordMs,
      rrf_ms: rrfMs,
    }
  }

  return result
}
