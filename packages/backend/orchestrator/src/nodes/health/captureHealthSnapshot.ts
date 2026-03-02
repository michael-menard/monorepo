/**
 * captureHealthSnapshot
 *
 * Fire-and-forget health snapshot orchestrator.
 * Runs all 8 metric collectors, inserts a row into wint.codebase_health,
 * and returns the snapshot.
 *
 * Story: APIP-4010 - Codebase Health Gate (ST-05)
 * AC: AC-4, AC-5
 *
 * Architecture:
 * - Follows writeTelemetry() fire-and-forget pattern from APIP-3010
 * - Injectable db for testability and loose coupling
 * - On DB insert failure: logger.warn + resolve without throw (AC-5)
 * - Partial capture is OK — any metric collector that fails returns null
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { collectLintWarnings, type ExecFn } from './collectors/collectLintWarnings.js'
import { collectTypeErrors } from './collectors/collectTypeErrors.js'
import { collectAnyCount } from './collectors/collectAnyCount.js'
import { collectEslintDisableCount } from './collectors/collectEslintDisableCount.js'
import { collectTestCoverage } from './collectors/collectTestCoverage.js'
import { collectCircularDeps } from './collectors/collectCircularDeps.js'
import { collectBundleSize } from './collectors/collectBundleSize.js'
import { collectDeadExports } from './collectors/collectDeadExports.js'
import type { CodebaseHealthSnapshot, CodebaseHealthInsert } from './schemas/index.js'

// ============================================================================
// DB interface (dependency injection)
// ============================================================================

/**
 * Minimal DB interface for captureHealthSnapshot.
 * Satisfied by pg.Pool, pg.Client, or any db adapter with a query() method.
 */
export const DbQueryableSchema = z.object({
  query: z.function().args(z.string(), z.array(z.unknown()).optional()).returns(z.promise(z.any())),
})

export type DbQueryable = z.infer<typeof DbQueryableSchema>

// ============================================================================
// Config schema
// ============================================================================

/**
 * Configuration for captureHealthSnapshot.
 */
export const CaptureHealthSnapshotConfigSchema = z.object({
  /** Merge number that triggered this health check */
  mergeNumber: z.number().int().nonnegative(),

  /** Injectable exec function (defaults to real shell execution) */
  execFn: z.function().optional(),
})

export type CaptureHealthSnapshotConfig = Omit<
  z.infer<typeof CaptureHealthSnapshotConfigSchema>,
  'execFn'
> & {
  execFn?: ExecFn
}

// ============================================================================
// captureHealthSnapshot
// ============================================================================

/**
 * captureHealthSnapshot
 *
 * Captures all 8 codebase health metrics and inserts a snapshot row into
 * wint.codebase_health via the injected db.
 *
 * Fire-and-forget: on DB insert failure, logs a warning and resolves without throwing.
 * Partial capture is OK: any collector that fails returns null for its metric.
 *
 * @param config - Snapshot config (mergeNumber, optional execFn)
 * @param db - Injected pg-compatible database client
 * @returns Promise<CodebaseHealthSnapshot> — always resolves, never rejects
 */
export async function captureHealthSnapshot(
  config: CaptureHealthSnapshotConfig,
  db: DbQueryable,
): Promise<CodebaseHealthSnapshot> {
  const { mergeNumber, execFn: injectedExecFn } = config

  // Use injected execFn or default no-op (callers provide real exec in production)
  const execFn: ExecFn = injectedExecFn ?? (() => Promise.reject(new Error('execFn not provided')))

  // Collect all 8 metrics in parallel (failures return null — partial capture OK)
  const [
    lintWarnings,
    typeErrors,
    anyCount,
    eslintDisableCount,
    testCoverage,
    circularDeps,
    bundleSize,
    deadExports,
  ] = await Promise.all([
    collectLintWarnings(execFn).catch(err => {
      logger.warn('captureHealthSnapshot: collectLintWarnings threw unexpectedly', {
        err: err instanceof Error ? err.message : String(err),
      })
      return null
    }),
    collectTypeErrors(execFn).catch(err => {
      logger.warn('captureHealthSnapshot: collectTypeErrors threw unexpectedly', {
        err: err instanceof Error ? err.message : String(err),
      })
      return null
    }),
    collectAnyCount(execFn).catch(err => {
      logger.warn('captureHealthSnapshot: collectAnyCount threw unexpectedly', {
        err: err instanceof Error ? err.message : String(err),
      })
      return null
    }),
    collectEslintDisableCount(execFn).catch(err => {
      logger.warn('captureHealthSnapshot: collectEslintDisableCount threw unexpectedly', {
        err: err instanceof Error ? err.message : String(err),
      })
      return null
    }),
    collectTestCoverage(execFn).catch(err => {
      logger.warn('captureHealthSnapshot: collectTestCoverage threw unexpectedly', {
        err: err instanceof Error ? err.message : String(err),
      })
      return null
    }),
    collectCircularDeps(execFn).catch(err => {
      logger.warn('captureHealthSnapshot: collectCircularDeps threw unexpectedly', {
        err: err instanceof Error ? err.message : String(err),
      })
      return null
    }),
    collectBundleSize(execFn).catch(err => {
      logger.warn('captureHealthSnapshot: collectBundleSize threw unexpectedly', {
        err: err instanceof Error ? err.message : String(err),
      })
      return null
    }),
    collectDeadExports(execFn).catch(err => {
      logger.warn('captureHealthSnapshot: collectDeadExports threw unexpectedly', {
        err: err instanceof Error ? err.message : String(err),
      })
      return null
    }),
  ])

  const capturedAt = new Date()
  const snapshotId = crypto.randomUUID()

  const snapshot: CodebaseHealthSnapshot = {
    id: snapshotId,
    mergeNumber,
    capturedAt,
    isBaseline: false,
    lintWarnings: lintWarnings ?? null,
    typeErrors: typeErrors ?? null,
    anyCount: anyCount ?? null,
    testCoverage: testCoverage ?? null,
    circularDeps: circularDeps ?? null,
    bundleSize: bundleSize ?? null,
    deadExports: deadExports ?? null,
    eslintDisableCount: eslintDisableCount ?? null,
  }

  // Insert into DB (fire-and-forget: failures log warning but never throw)
  try {
    const insertData: CodebaseHealthInsert = {
      id: snapshotId,
      mergeNumber,
      capturedAt,
      isBaseline: false,
      lintWarnings: lintWarnings ?? null,
      typeErrors: typeErrors ?? null,
      anyCount: anyCount ?? null,
      testCoverage: testCoverage ?? null,
      circularDeps: circularDeps ?? null,
      bundleSize: bundleSize ?? null,
      deadExports: deadExports ?? null,
      eslintDisableCount: eslintDisableCount ?? null,
    }

    await db.query(
      `INSERT INTO wint.codebase_health (
        id,
        merge_number,
        captured_at,
        is_baseline,
        lint_warnings,
        type_errors,
        any_count,
        test_coverage,
        circular_deps,
        bundle_size,
        dead_exports,
        eslint_disable_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        insertData.id,
        insertData.mergeNumber,
        insertData.capturedAt,
        insertData.isBaseline,
        insertData.lintWarnings,
        insertData.typeErrors,
        insertData.anyCount,
        insertData.testCoverage,
        insertData.circularDeps,
        insertData.bundleSize,
        insertData.deadExports,
        insertData.eslintDisableCount,
      ],
    )

    // OPP-002: emit INFO log prompting operator to promote first-ever snapshot as baseline
    logger.info('captureHealthSnapshot: snapshot inserted successfully', {
      id: snapshotId,
      mergeNumber,
      tip: 'To promote as baseline, set is_baseline=true on this snapshot row.',
    })
  } catch (err) {
    // AC-5: DB failures must never propagate — log and continue
    logger.warn('captureHealthSnapshot: failed to insert snapshot row — continuing without error', {
      err: err instanceof Error ? err.message : String(err),
      mergeNumber,
      snapshotId,
    })
  }

  return snapshot
}
