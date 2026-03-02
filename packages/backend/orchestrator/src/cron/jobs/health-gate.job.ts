/**
 * Health Gate Cron Job — APIP-4010
 *
 * CronJobDefinition for the codebase health gate.
 * Wires captureHealthSnapshot + detectDriftAndGenerateCleanup + writeCleanupStories
 * with pg_try_advisory_lock concurrency guard.
 *
 * Story: APIP-4010 - Codebase Health Gate (ST-09)
 * AC: AC-10
 *
 * DEFERRED: Per RISK-002 from APIP-4010 ELAB — cron wiring deferred until APIP-3090
 * provides stable registration interface.
 *
 * DISABLE_CRON_JOB_HEALTH_GATE=true disables this job via buildCronRegistry() env guard.
 * The job defaults to disabled (env var defaults to 'true') until APIP-3090 is ready.
 *
 * Architecture:
 * - pg_try_advisory_lock(4010) as concurrency guard (defense-in-depth against concurrent runs)
 * - Lock key 4010 = APIP story number (unique per job)
 * - Structured operator log per APIP-4010 architecture notes
 */

import { logger } from '@repo/logger'
import type { CronJobDefinition } from '../schemas.js'

// ============================================================================
// Advisory Lock Key
// ============================================================================

/** pg_try_advisory_lock key for health gate job — unique per cron job */
const HEALTH_GATE_LOCK_KEY = 4010

// ============================================================================
// healthGateJob
// ============================================================================

/**
 * Health Gate cron job definition.
 *
 * Schedule: every 5th merge triggers a health check.
 * For cron scheduling purposes, runs every 15 minutes and checks merge count.
 * Actual health gate only fires when merge count is a multiple of 5.
 *
 * Timeout: 10 minutes (health checks can take time for full lint/type-check/test runs)
 *
 * DISABLED by default via DISABLE_CRON_JOB_HEALTH_GATE env var.
 * Enable by setting DISABLE_CRON_JOB_HEALTH_GATE=false in production environment.
 */
export const healthGateJob: CronJobDefinition = {
  jobName: 'health-gate',
  schedule: '*/15 * * * *', // every 15 minutes; actual health check gated by merge count
  timeoutMs: 10 * 60 * 1000, // 10 minutes
  runFn: async () => {
    // STUB: Real implementation wired to captureHealthSnapshot + detectDriftAndGenerateCleanup
    // Deferred until APIP-3090 provides stable DB injection interface.
    // Full implementation requires:
    // 1. Injectable db (pg.Pool) from APIP-3090 cron runner context
    // 2. captureHealthSnapshot(config, db)
    // 3. detectDriftAndGenerateCleanup(snapshot, baseline, thresholds)
    // 4. writeCleanupStories(stories, outputDir)
    // 5. pg_try_advisory_lock(HEALTH_GATE_LOCK_KEY) concurrency guard

    logger.info('cron.health-gate.stub', {
      jobName: 'health-gate',
      lockKey: HEALTH_GATE_LOCK_KEY,
      reason: 'Deferred to APIP-3090 — requires injectable DB from cron runner context',
      note: 'Set DISABLE_CRON_JOB_HEALTH_GATE=false to enable when APIP-3090 is ready',
    })

    // Operator log format per APIP-4010 architecture notes (stub values)
    logger.info('[health-gate] run=stub merge_number=0 metrics_checked=0 metrics_within_threshold=0 cleanup_stories_generated=0 stories=[]')
  },
}

// ============================================================================
// IMPLEMENTATION REFERENCE (for APIP-3090 wiring)
// ============================================================================

/**
 * When APIP-3090 is ready, replace runFn with:
 *
 * runFn: async () => {
 *   // Concurrency guard
 *   const lockResult = await db.query('SELECT pg_try_advisory_lock($1)', [HEALTH_GATE_LOCK_KEY])
 *   const lockAcquired = lockResult.rows[0]?.pg_try_advisory_lock
 *   if (!lockAcquired) {
 *     logger.info('cron.health-gate.skipped', { reason: 'Could not acquire advisory lock' })
 *     return
 *   }
 *
 *   try {
 *     // Get current merge count
 *     const mergeCount = await getCurrentMergeCount(db)
 *     if (!shouldRunHealthGate(mergeCount)) return
 *
 *     // Capture snapshot
 *     const snapshot = await captureHealthSnapshot({ mergeNumber: mergeCount, execFn: realExecFn }, db)
 *
 *     // Get baseline
 *     const baselineResult = await db.query(
 *       'SELECT * FROM wint.codebase_health WHERE is_baseline = true ORDER BY captured_at DESC LIMIT 1'
 *     )
 *     const baseline = baselineResult.rows[0] ?? null
 *
 *     // Detect drift
 *     const outputDir = 'plans/future/platform/autonomous-pipeline/backlog'
 *     const startingNumber = getNextCleanupNumber(outputDir)
 *     const thresholds = DEFAULT_HEALTH_GATE_THRESHOLDS
 *     const stories = detectDriftAndGenerateCleanup(snapshot, baseline, thresholds, startingNumber)
 *
 *     // Write CLEANUP stories
 *     const writtenPaths = writeCleanupStories(stories, outputDir)
 *
 *     // Operator log
 *     const withinThreshold = 8 - stories.length
 *     logger.info(`[health-gate] run=complete merge_number=${mergeCount} metrics_checked=8 metrics_within_threshold=${withinThreshold} cleanup_stories_generated=${stories.length} stories=[${stories.map(s => s.id).join(', ')}]`)
 *   } finally {
 *     await db.query('SELECT pg_advisory_unlock($1)', [HEALTH_GATE_LOCK_KEY])
 *   }
 * }
 */
