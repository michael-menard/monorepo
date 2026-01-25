/**
 * Hybrid Search with Reciprocal Rank Fusion (RRF)
 *
 * Merges semantic and keyword search results using RRF algorithm.
 * RRF is a well-established technique for combining ranked lists
 * without requiring score normalization.
 *
 * Reference: Cormack et al., 2009 - Reciprocal Rank Fusion
 *
 * @see KNOW-004 AC8 for acceptance criteria
 */

import { logger } from '@repo/logger'
import {
  type ScoredEntry,
  type RankedEntry,
  SEMANTIC_WEIGHT,
  KEYWORD_WEIGHT,
  RRF_K,
} from './schemas.js'

/**
 * Configuration for RRF merging.
 */
export interface RRFConfig {
  /** Weight for semantic search results (default: 0.7) */
  semanticWeight: number
  /** Weight for keyword search results (default: 0.3) */
  keywordWeight: number
  /** RRF k constant (default: 60) */
  k: number
}

/**
 * Default RRF configuration.
 */
export const DEFAULT_RRF_CONFIG: RRFConfig = {
  semanticWeight: SEMANTIC_WEIGHT,
  keywordWeight: KEYWORD_WEIGHT,
  k: RRF_K,
}

/**
 * Merge semantic and keyword search results using Reciprocal Rank Fusion.
 *
 * RRF Formula:
 * rrf_score = (semantic_weight / (k + semantic_rank)) + (keyword_weight / (k + keyword_rank))
 *
 * Where:
 * - semantic_rank is 1-indexed position in semantic results (Infinity if not present)
 * - keyword_rank is 1-indexed position in keyword results (Infinity if not present)
 * - k = 60 is the standard RRF constant
 *
 * @example
 * Entry A: rank 1 in semantic, rank 5 in keyword
 * score_A = (0.7 / (60 + 1)) + (0.3 / (60 + 5)) = 0.0115 + 0.0046 = 0.0161
 *
 * Entry B: rank 3 in semantic, not in keyword
 * score_B = (0.7 / (60 + 3)) + 0 = 0.0111
 *
 * @param semanticResults - Results from semantic search (sorted by similarity)
 * @param keywordResults - Results from keyword search (sorted by FTS rank)
 * @param config - RRF configuration (weights and k constant)
 * @returns Merged and ranked entries sorted by RRF score descending
 */
export function mergeWithRRF(
  semanticResults: ScoredEntry[],
  keywordResults: ScoredEntry[],
  config: Partial<RRFConfig> = {},
): RankedEntry[] {
  const startTime = Date.now()

  const { semanticWeight, keywordWeight, k } = {
    ...DEFAULT_RRF_CONFIG,
    ...config,
  }

  // Build rank maps (1-indexed)
  const semanticRanks = new Map<string, { rank: number; score: number; entry: ScoredEntry }>()
  semanticResults.forEach((entry, index) => {
    semanticRanks.set(entry.id, { rank: index + 1, score: entry.score, entry })
  })

  const keywordRanks = new Map<string, { rank: number; score: number; entry: ScoredEntry }>()
  keywordResults.forEach((entry, index) => {
    keywordRanks.set(entry.id, { rank: index + 1, score: entry.score, entry })
  })

  // Collect all unique entry IDs
  const allIds = new Set<string>([
    ...semanticResults.map(e => e.id),
    ...keywordResults.map(e => e.id),
  ])

  // Calculate RRF scores for each entry
  const rankedEntries: RankedEntry[] = []

  for (const id of allIds) {
    const semanticData = semanticRanks.get(id)
    const keywordData = keywordRanks.get(id)

    // Calculate RRF score components
    const semanticContribution = semanticData ? semanticWeight / (k + semanticData.rank) : 0

    const keywordContribution = keywordData ? keywordWeight / (k + keywordData.rank) : 0

    const rrfScore = semanticContribution + keywordContribution

    // Use the entry from either source (prefer semantic if both exist)
    const sourceEntry = semanticData?.entry ?? keywordData?.entry

    if (!sourceEntry) {
      continue // Should never happen, but guard just in case
    }

    rankedEntries.push({
      id: sourceEntry.id,
      content: sourceEntry.content,
      role: sourceEntry.role,
      tags: sourceEntry.tags,
      createdAt: sourceEntry.createdAt,
      updatedAt: sourceEntry.updatedAt,
      rrf_score: rrfScore,
      semantic_score: semanticData?.score,
      keyword_score: keywordData?.score,
      semantic_rank: semanticData?.rank,
      keyword_rank: keywordData?.rank,
    })
  }

  // Sort by RRF score descending, then by updatedAt descending for tie-breaking
  rankedEntries.sort((a, b) => {
    const scoreDiff = b.rrf_score - a.rrf_score
    if (Math.abs(scoreDiff) > 1e-10) {
      return scoreDiff
    }
    // Tie-breaking: more recently updated entries first
    return b.updatedAt.getTime() - a.updatedAt.getTime()
  })

  const elapsed = Date.now() - startTime

  logger.debug('RRF merge completed', {
    semanticCount: semanticResults.length,
    keywordCount: keywordResults.length,
    mergedCount: rankedEntries.length,
    elapsed_ms: elapsed,
    config: { semanticWeight, keywordWeight, k },
  })

  return rankedEntries
}

/**
 * Convert keyword-only results to ranked entries (fallback mode).
 *
 * When semantic search is unavailable, use keyword results directly
 * with keyword-only RRF scoring.
 *
 * @param keywordResults - Results from keyword search
 * @param config - RRF configuration
 * @returns Ranked entries with keyword-only scoring
 */
export function keywordOnlyRanking(
  keywordResults: ScoredEntry[],
  config: Partial<RRFConfig> = {},
): RankedEntry[] {
  const { keywordWeight, k } = {
    ...DEFAULT_RRF_CONFIG,
    ...config,
  }

  return keywordResults.map((entry, index) => {
    const rank = index + 1
    const rrfScore = keywordWeight / (k + rank)

    return {
      id: entry.id,
      content: entry.content,
      role: entry.role,
      tags: entry.tags,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      rrf_score: rrfScore,
      keyword_score: entry.score,
      keyword_rank: rank,
    }
  })
}

/**
 * Calculate the RRF score for a single entry given its ranks.
 * Useful for testing and debugging.
 *
 * @param semanticRank - 1-indexed rank in semantic results (undefined if not present)
 * @param keywordRank - 1-indexed rank in keyword results (undefined if not present)
 * @param config - RRF configuration
 * @returns Calculated RRF score
 */
export function calculateRRFScore(
  semanticRank: number | undefined,
  keywordRank: number | undefined,
  config: Partial<RRFConfig> = {},
): number {
  const { semanticWeight, keywordWeight, k } = {
    ...DEFAULT_RRF_CONFIG,
    ...config,
  }

  const semanticContribution = semanticRank !== undefined ? semanticWeight / (k + semanticRank) : 0

  const keywordContribution = keywordRank !== undefined ? keywordWeight / (k + keywordRank) : 0

  return semanticContribution + keywordContribution
}
