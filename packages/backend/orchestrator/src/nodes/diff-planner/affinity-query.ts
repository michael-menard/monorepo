/**
 * Affinity Query Module
 *
 * Queries the wint.model_affinity table to load affinity profiles
 * for a given (model_id, change_type) pair. Read-only; never writes.
 *
 * Fallback paths:
 *   - no rows → returns null (cold-start)
 *   - DB error → logs warning + returns null
 *   - Zod parse failure → logs warning + returns null
 *
 * APIP-3030: Learning-Aware Diff Planner
 */

import { logger } from '@repo/logger'
import { AffinityProfileSchema } from './__types__/index.js'
import type { AffinityProfile } from './__types__/index.js'

// ============================================================================
// Column Name Constants
// ============================================================================

/**
 * Column names for the wint.model_affinity table.
 * Defined as top-level constants for easy updates if the schema changes.
 */
export const COL_MODEL_ID = 'model_id'
export const COL_CHANGE_TYPE = 'change_type'
export const COL_SUCCESS_RATE = 'success_rate'
export const COL_CONFIDENCE = 'confidence'
export const COL_SAMPLE_COUNT = 'sample_count'
export const COL_STRONG_PATTERNS = 'strong_patterns'
export const COL_WEAK_PATTERNS = 'weak_patterns'
export const COL_UPDATED_AT = 'updated_at'

// ============================================================================
// DB Client Interface
// ============================================================================

/**
 * Minimal DB query interface required by affinity query.
 * Allows injection of mock clients in tests.
 */
export const DB_SCHEMA = 'wint'
export const DB_TABLE = 'model_affinity'
export const DB_FULL_TABLE = `${DB_SCHEMA}.${DB_TABLE}`

export interface DbQueryResult {
  rows: Record<string, unknown>[]
}

export interface DbClient {
  query(sql: string, params?: unknown[]): Promise<DbQueryResult>
}

// ============================================================================
// Query Function
// ============================================================================

/**
 * Queries wint.model_affinity for a single (model_id, change_type) pair.
 *
 * Fallback matrix:
 *   - No rows returned: cold-start case → returns null
 *   - DB throws: logs warning → returns null
 *   - Zod parse fails: logs warning → returns null
 *
 * @param db - Database client
 * @param modelId - Model identifier to query
 * @param changeType - Change type to query
 * @returns Parsed AffinityProfile or null on any failure/cold-start
 */
export async function queryAffinityProfile(
  db: DbClient,
  modelId: string,
  changeType: string,
): Promise<AffinityProfile | null> {
  const sql = `
    SELECT
      ${COL_MODEL_ID},
      ${COL_CHANGE_TYPE},
      ${COL_SUCCESS_RATE},
      ${COL_CONFIDENCE},
      ${COL_SAMPLE_COUNT},
      ${COL_STRONG_PATTERNS},
      ${COL_WEAK_PATTERNS},
      ${COL_UPDATED_AT}
    FROM ${DB_FULL_TABLE}
    WHERE ${COL_MODEL_ID} = $1
      AND ${COL_CHANGE_TYPE} = $2
    LIMIT 1
  `

  let result: DbQueryResult

  try {
    result = await db.query(sql, [modelId, changeType])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn('diff-planner:affinity-query', {
      event: 'db_error',
      model_id: modelId,
      change_type: changeType,
      error: message,
    })
    return null
  }

  if (result.rows.length === 0) {
    // Cold-start: no affinity data for this (model_id, change_type) pair
    return null
  }

  const row = result.rows[0]
  const parsed = AffinityProfileSchema.safeParse(row)

  if (!parsed.success) {
    logger.warn('diff-planner:affinity-query', {
      event: 'parse_error',
      model_id: modelId,
      change_type: changeType,
      error: parsed.error.message,
    })
    return null
  }

  return parsed.data
}

/**
 * Queries wint.model_affinity for all change types for a given model.
 *
 * Returns an empty array on DB error or parse failure (never throws).
 *
 * @param db - Database client
 * @param modelId - Model identifier to query
 * @returns Array of valid AffinityProfiles (may be empty on cold-start or errors)
 */
export async function queryAffinityProfilesByModel(
  db: DbClient,
  modelId: string,
): Promise<AffinityProfile[]> {
  const sql = `
    SELECT
      ${COL_MODEL_ID},
      ${COL_CHANGE_TYPE},
      ${COL_SUCCESS_RATE},
      ${COL_CONFIDENCE},
      ${COL_SAMPLE_COUNT},
      ${COL_STRONG_PATTERNS},
      ${COL_WEAK_PATTERNS},
      ${COL_UPDATED_AT}
    FROM ${DB_FULL_TABLE}
    WHERE ${COL_MODEL_ID} = $1
    ORDER BY ${COL_CHANGE_TYPE}
  `

  let result: DbQueryResult

  try {
    result = await db.query(sql, [modelId])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.warn('diff-planner:affinity-query', {
      event: 'db_error_bulk',
      model_id: modelId,
      error: message,
    })
    return []
  }

  if (result.rows.length === 0) {
    return []
  }

  const profiles: AffinityProfile[] = []

  for (const row of result.rows) {
    const parsed = AffinityProfileSchema.safeParse(row)
    if (parsed.success) {
      profiles.push(parsed.data)
    } else {
      logger.warn('diff-planner:affinity-query', {
        event: 'row_parse_error',
        model_id: modelId,
        change_type: row[COL_CHANGE_TYPE],
        error: parsed.error.message,
      })
    }
  }

  return profiles
}
