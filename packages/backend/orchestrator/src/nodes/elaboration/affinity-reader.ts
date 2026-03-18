/**
 * Affinity Reader
 *
 * Queries the wint.model_affinity table to retrieve model affinity guidance
 * for a set of ChangeOutlineItems. Provides per-item AffinityGuidance mapped
 * by item ID (CO-N), with try/catch graceful fallback.
 *
 * APIP-3050 AC-2, AC-3: AffinityGuidanceSchema and readAffinityProfiles()
 *
 * Model identifier format:
 *   Short form: 'haiku', 'sonnet', 'opus' (from ClaudeModelSchema in config/model-assignments.ts)
 *   These match the modelId values stored in wint.model_affinity.modelId.
 *
 * Query deduplication:
 *   Groups input items by (changeType, fileType) to avoid N+1 queries.
 *   Results are fanned back to individual items by their CO id.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// Schemas
// ============================================================================

/**
 * Guidance returned for a single ChangeOutlineItem.
 * APIP-3050 AC-3: AffinityGuidanceSchema with all required fields.
 */
export const AffinityGuidanceSchema = z.object({
  /** Model identifier (short form: 'haiku', 'sonnet', 'opus') */
  modelId: z.string().min(1),
  /** The change type this guidance applies to */
  changeType: z.string().min(1),
  /** The file type this guidance applies to */
  fileType: z.string().min(1),
  /**
   * Recommended change pattern for this (model, changeType, fileType) triple.
   * Derived from the highest-confidence affinity row.
   * Example: 'create-new-file', 'modify-in-place', 'extract-and-modify'
   */
  preferredChangePattern: z.string().min(1),
  /** Weighted success rate (0.0–1.0) from wint.model_affinity.successRate */
  successRate: z.number().min(0).max(1),
  /** Sample count backing this profile */
  sampleCount: z.number().int().min(0),
  /**
   * Numeric confidence score derived from confidence_level enum:
   *   'high'    → 0.9
   *   'medium'  → 0.6
   *   'low'     → 0.3
   *   'unknown' → 0.0
   */
  confidence: z.number().min(0).max(1),
})

export type AffinityGuidance = z.infer<typeof AffinityGuidanceSchema>

/**
 * Key used for deduplicating DB queries by (changeType, fileType) pair.
 */
const PAIR_SEPARATOR = '|~|'

/**
 * Maps confidence_level enum strings to numeric scores.
 */
const CONFIDENCE_LEVEL_SCORES: Record<string, number> = {
  high: 0.9,
  medium: 0.6,
  low: 0.3,
  unknown: 0.0,
}

/**
 * Converts a confidence_level string to a numeric confidence score.
 *
 * @param confidenceLevel - The confidence_level enum value from the DB
 * @returns Numeric confidence (0.0–1.0)
 */
function confidenceLevelToScore(confidenceLevel: string): number {
  return CONFIDENCE_LEVEL_SCORES[confidenceLevel] ?? 0.0
}

/**
 * Derives a preferredChangePattern string from the changeType.
 * This is a heuristic mapping — the primary signal is the successRate and
 * confidence from the affinity profile. The pattern name is informational.
 *
 * @param changeType - The change type from the item ('create', 'modify', 'delete')
 * @returns A human-readable change pattern string
 */
function deriveChangePattern(changeType: string): string {
  switch (changeType) {
    case 'create':
      return 'create-new-file'
    case 'modify':
      return 'modify-in-place'
    case 'delete':
      return 'delete-file'
    default:
      return `${changeType}-file`
  }
}

/**
 * Extracts file extension from a file path.
 * Returns 'unknown' if path has no extension.
 *
 * @param filePath - File path like 'src/handlers/auth.ts'
 * @returns Extension without dot, e.g. 'ts', 'tsx', 'sql', 'unknown'
 */
export function extractFileType(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.')
  if (lastDot === -1 || lastDot === filePath.length - 1) return 'unknown'
  return filePath.slice(lastDot + 1).toLowerCase()
}

// ============================================================================
// DB query type (drizzle-compatible, typed loosely for injection pattern)
// ============================================================================

/**
 * Minimal shape of a row returned from wint.model_affinity.
 */
const AffinityRowSchema = z.object({
  modelId: z.string(),
  changeType: z.string(),
  fileType: z.string(),
  successRate: z.union([z.string(), z.number()]),
  sampleCount: z.number(),
  confidenceLevel: z.string(),
})
type AffinityRow = z.infer<typeof AffinityRowSchema>

// ============================================================================
// Input type
// ============================================================================

/**
 * Input item shape expected by readAffinityProfiles.
 * Matches the relevant subset of ChangeOutlineItem.
 */
export interface AffinityQueryItem {
  /** Item ID (e.g. "CO-1") */
  id: string
  /** Change type ('create' | 'modify' | 'delete') */
  changeType: string
  /** File path — used to derive fileType via extension */
  filePath: string
}

// ============================================================================
// Result type
// ============================================================================

/**
 * Result from readAffinityProfiles().
 */
export interface AffinityReadResult {
  /** Map from item ID (CO-N) to AffinityGuidance or null if no guidance available */
  map: Map<string, AffinityGuidance | null>
  /** True if fallback was used (DB error or empty table) */
  fallbackUsed: boolean
  /** Reason for fallback (for logging) */
  fallbackReason?: string
}

// ============================================================================
// Main function
// ============================================================================

/**
 * Reads affinity profiles from wint.model_affinity for the given items.
 *
 * APIP-3050 AC-2: readAffinityProfiles() — queries wint.model_affinity
 * once per distinct (changeType, fileType) pair, fans results back to items.
 *
 * Query deduplication approach:
 *   1. Group items by (changeType, fileType) pair
 *   2. For each unique pair, query DB once
 *   3. Fan the result row back to all items with that pair
 *   4. Items with no matching row get null guidance
 *
 * @param items - Array of ChangeOutlineItems (need id, changeType, filePath)
 * @param db - Drizzle DB client (injected via affinityDb from ElaborationConfigSchema)
 * @param storyId - Story ID for logging context
 * @returns AffinityReadResult with map and fallbackUsed flag
 */
export async function readAffinityProfiles(
  items: AffinityQueryItem[],
  db: unknown,
  storyId: string = 'unknown',
): Promise<AffinityReadResult> {
  const resultMap = new Map<string, AffinityGuidance | null>()

  // Initialize all items to null (no guidance available until proven otherwise)
  for (const item of items) {
    resultMap.set(item.id, null)
  }

  if (!db) {
    logger.warn('readAffinityProfiles: db is null/undefined — skipping affinity lookup', {
      storyId,
    })
    return { map: resultMap, fallbackUsed: true, fallbackReason: 'db-null' }
  }

  try {
    // Group items by (changeType, fileType) pair for deduplication
    const pairToItemIds = new Map<string, string[]>()

    for (const item of items) {
      const fileType = extractFileType(item.filePath)
      const pairKey = `${item.changeType}${PAIR_SEPARATOR}${fileType}`
      const existing = pairToItemIds.get(pairKey) ?? []
      existing.push(item.id)
      pairToItemIds.set(pairKey, existing)
    }

    if (pairToItemIds.size === 0) {
      return { map: resultMap, fallbackUsed: false }
    }

    const dbClient = db as {
      execute: (query: { queryChunks?: unknown; sql?: string; params?: unknown[] }) => Promise<{
        rows: unknown[]
      }>
    }

    for (const [pairKey, itemIds] of pairToItemIds) {
      const separatorIdx = pairKey.indexOf(PAIR_SEPARATOR)
      const changeType = pairKey.slice(0, separatorIdx)
      const fileType = pairKey.slice(separatorIdx + PAIR_SEPARATOR.length)

      let rows: AffinityRow[] = []

      try {
        // TODO(AUDIT-5): verify wint.model_affinity table exists in target DB
        const { sql } = await import('drizzle-orm')
        const result = await dbClient.execute(
          sql`SELECT model_id AS "modelId", change_type AS "changeType", file_type AS "fileType",
                     success_rate AS "successRate", sample_count AS "sampleCount",
                     confidence_level AS "confidenceLevel"
              FROM wint.model_affinity
              WHERE change_type = ${changeType} AND file_type = ${fileType}`,
        )
        rows = result.rows as AffinityRow[]
      } catch (queryError) {
        const queryMsg = queryError instanceof Error ? queryError.message : String(queryError)
        logger.warn('readAffinityProfiles: DB query error for pair', {
          storyId,
          changeType,
          fileType,
          error: queryMsg,
        })
        // Continue — leave items as null for this pair
        continue
      }

      if (rows.length === 0) {
        // Cold-start: no affinity data for this pair
        logger.info('readAffinityProfiles: no affinity rows for pair (cold-start)', {
          storyId,
          changeType,
          fileType,
        })
        continue
      }

      // Pick the highest-confidence row for this pair
      const bestRow = rows.reduce<AffinityRow>((best, row) => {
        const bestScore = confidenceLevelToScore(best.confidenceLevel)
        const rowScore = confidenceLevelToScore(row.confidenceLevel)
        return rowScore > bestScore ? row : best
      }, rows[0])

      const confidence = confidenceLevelToScore(bestRow.confidenceLevel)
      const successRate =
        typeof bestRow.successRate === 'string'
          ? parseFloat(bestRow.successRate)
          : bestRow.successRate

      const guidance = AffinityGuidanceSchema.parse({
        modelId: bestRow.modelId,
        changeType: bestRow.changeType,
        fileType: bestRow.fileType,
        preferredChangePattern: deriveChangePattern(bestRow.changeType),
        successRate: isNaN(successRate) ? 0 : Math.min(1, Math.max(0, successRate)),
        sampleCount: bestRow.sampleCount,
        confidence,
      })

      // Fan guidance back to all items with this pair
      for (const itemId of itemIds) {
        resultMap.set(itemId, guidance)
      }
    }

    // Check if ALL items ended up with null (cold-start / empty table scenario)
    const allNull = [...resultMap.values()].every(v => v === null)
    if (allNull && items.length > 0) {
      logger.info(
        'readAffinityProfiles: all items have null guidance (cold-start or empty table)',
        {
          storyId,
          itemCount: items.length,
        },
      )
      return { map: resultMap, fallbackUsed: true, fallbackReason: 'cold-start' }
    }

    return { map: resultMap, fallbackUsed: false }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.warn('readAffinityProfiles: unexpected error — using fallback (no affinity guidance)', {
      storyId,
      error: errorMessage,
    })
    return { map: resultMap, fallbackUsed: true, fallbackReason: `error: ${errorMessage}` }
  }
}
