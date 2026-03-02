/**
 * mergeCountGate
 *
 * Merge-count tracking and every-5th-merge gate logic.
 * Standalone fallback implementation using wint.merge_runs table (RISK-001 from APIP-4010 ELAB).
 *
 * Story: APIP-4010 - Codebase Health Gate (ST-08)
 * AC: AC-10
 *
 * Architecture:
 * - RISK-001: APIP-1070 has not yet added mergeCount to MergeArtifactSchema.
 *   This module provides a standalone fallback using wint.merge_runs.
 * - recordMergeRun() inserts a row into wint.merge_runs.
 * - shouldRunHealthGate() returns true when current merge is a multiple of 5.
 * - Both functions accept injectable db for testability.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// DB interface (dependency injection)
// ============================================================================

/**
 * Minimal DB interface for merge count gate.
 */
export const MergeGateDbSchema = z.object({
  query: z.function().args(z.string(), z.array(z.unknown()).optional()).returns(z.promise(z.any())),
})

export type MergeGateDb = z.infer<typeof MergeGateDbSchema>

// ============================================================================
// MergeRunRecordSchema
// ============================================================================

/**
 * Schema for a merge run record.
 */
export const MergeRunRecordSchema = z.object({
  storyId: z.string().min(1),
  mergeNumber: z.number().int().positive(),
})

export type MergeRunRecord = z.infer<typeof MergeRunRecordSchema>

// ============================================================================
// recordMergeRun
// ============================================================================

/**
 * recordMergeRun
 *
 * Inserts a row into wint.merge_runs to record that a merge occurred.
 * Fire-and-continue: on failure, logs warning but does not throw.
 *
 * @param record - The merge run record to insert
 * @param db - Injected pg-compatible database client
 * @returns Promise<void> — always resolves
 */
export async function recordMergeRun(record: MergeRunRecord, db: MergeGateDb): Promise<void> {
  try {
    const validated = MergeRunRecordSchema.parse(record)
    await db.query(
      `INSERT INTO wint.merge_runs (story_id, merge_number)
       VALUES ($1, $2)`,
      [validated.storyId, validated.mergeNumber],
    )
  } catch (err) {
    logger.warn('recordMergeRun: failed to record merge run — continuing without error', {
      err: err instanceof Error ? err.message : String(err),
      storyId: record.storyId,
      mergeNumber: record.mergeNumber,
    })
  }
}

// ============================================================================
// getCurrentMergeCount
// ============================================================================

/**
 * getCurrentMergeCount
 *
 * Returns the current total merge count from wint.merge_runs.
 * Returns 0 if the query fails or table doesn't exist yet.
 *
 * @param db - Injected pg-compatible database client
 * @returns Current merge count
 */
export async function getCurrentMergeCount(db: MergeGateDb): Promise<number> {
  try {
    const result = await db.query('SELECT COUNT(*)::int AS count FROM wint.merge_runs', [])
    const count = result?.rows?.[0]?.count
    return typeof count === 'number' ? count : 0
  } catch (err) {
    logger.warn('getCurrentMergeCount: failed to get merge count — returning 0', {
      err: err instanceof Error ? err.message : String(err),
    })
    return 0
  }
}

// ============================================================================
// shouldRunHealthGate
// ============================================================================

/**
 * shouldRunHealthGate
 *
 * Returns true when the current merge number is a multiple of 5 (every 5th merge).
 * Pure function — no DB required for the gate logic itself.
 *
 * @param mergeCount - Current total merge count
 * @param interval - Trigger interval (default: 5)
 * @returns true if health gate should run
 */
export function shouldRunHealthGate(mergeCount: number, interval = 5): boolean {
  if (mergeCount <= 0) return false
  return mergeCount % interval === 0
}

// ============================================================================
// checkAndRunHealthGate
// ============================================================================

/**
 * MergeGateHandlerFn — type for the health gate handler function.
 * Called when shouldRunHealthGate returns true.
 */
export type MergeGateHandlerFn = (mergeNumber: number) => Promise<void>

/**
 * checkAndRunHealthGate
 *
 * Combines getCurrentMergeCount + shouldRunHealthGate + handler invocation.
 * Convenience function for cron job implementations.
 *
 * @param db - Injected db for merge count query
 * @param handler - Health gate handler to call when gate fires
 * @param interval - Trigger interval (default: 5)
 */
export async function checkAndRunHealthGate(
  db: MergeGateDb,
  handler: MergeGateHandlerFn,
  interval = 5,
): Promise<void> {
  const mergeCount = await getCurrentMergeCount(db)
  const shouldRun = shouldRunHealthGate(mergeCount, interval)

  logger.info('checkAndRunHealthGate: evaluating health gate trigger', {
    mergeCount,
    interval,
    shouldRun,
  })

  if (shouldRun) {
    await handler(mergeCount)
  }
}
