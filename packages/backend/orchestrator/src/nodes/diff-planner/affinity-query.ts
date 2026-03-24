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
// TODO(WINT-0250): wint.model_affinity has no canonical schema target — table does not exist in any migration.
// Implement analytics.model_affinity migration before restoring this constant. See GAP-1/GAP-2 in ELABORATION artifact.
export const DB_SCHEMA = 'analytics' // pending migration
export const DB_TABLE = 'model_affinity' // table not yet migrated to analytics schema
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

  // TODO(WINT-0250): wint.model_affinity has no canonical schema target — table does not exist in any migration.
  // Implement analytics.model_affinity migration before restoring this query. See GAP-1/GAP-2 in ELABORATION artifact.
  void db
  void sql
  return null
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

  // TODO(WINT-0250): wint.model_affinity has no canonical schema target — table does not exist in any migration.
  // Implement analytics.model_affinity migration before restoring this query. See GAP-1/GAP-2 in ELABORATION artifact.
  void db
  void sql
  return []
}
