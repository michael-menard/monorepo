/**
 * Test Quality Monitor Cron Job
 *
 * Weekly cron job that measures assertion density, orphaned test detection,
 * critical-path coverage floors, and decay detection. Generates test
 * improvement stories when quality metrics regress.
 *
 * Schedule: every Monday at 03:00 UTC ('0 3 * * 1')
 * Timeout: 30 minutes (1_800_000 ms)
 *
 * Disable via env: DISABLE_CRON_JOB_TEST_QUALITY_MONITOR=true
 *
 * APIP-4040 AC-10, AC-11
 */

import { logger } from '@repo/logger'
import {
  CronRunResultSchema,
  CronRunStatusSchema,
  type CronJobDefinition,
  type CronRunResult,
} from '../schemas.js'
import {
  TestQualityMonitorConfigSchema,
  type TestQualityMonitorConfig,
} from '../../nodes/test-quality/schemas.js'
import { runTestQualityMonitor } from '../../graphs/test-quality-monitor.js'

// ──────────────────────────────────────────────────────────────────────────────
// Config from env
// ──────────────────────────────────────────────────────────────────────────────

function buildConfigFromEnv(): Partial<TestQualityMonitorConfig> {
  const cfg: Partial<TestQualityMonitorConfig> = {}

  if (process.env.TEST_QUALITY_MIN_ASSERTION_DENSITY) {
    cfg.minAssertionDensity = parseFloat(process.env.TEST_QUALITY_MIN_ASSERTION_DENSITY)
  }
  if (process.env.TEST_QUALITY_MAX_ORPHANED_TESTS) {
    cfg.maxOrphanedTests = parseInt(process.env.TEST_QUALITY_MAX_ORPHANED_TESTS, 10)
  }
  if (process.env.TEST_QUALITY_COVERAGE_FLOOR) {
    cfg.criticalPathCoverageFloor = parseFloat(process.env.TEST_QUALITY_COVERAGE_FLOOR)
  }
  if (process.env.TEST_QUALITY_MUTATION_FLOOR) {
    cfg.mutationScoreFloor = parseFloat(process.env.TEST_QUALITY_MUTATION_FLOOR)
  }
  if (process.env.TEST_QUALITY_SCAN_ROOT) {
    cfg.scanRoot = process.env.TEST_QUALITY_SCAN_ROOT
  }

  // Parse and validate against schema
  return TestQualityMonitorConfigSchema.partial().parse(cfg)
}

// ──────────────────────────────────────────────────────────────────────────────
// Job definition
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Test quality monitor cron job definition.
 *
 * Schedule: Monday at 03:00 UTC
 * Timeout: 30 minutes
 *
 * Set DISABLE_CRON_JOB_TEST_QUALITY_MONITOR=true to skip.
 */
export const testQualityMonitorJob: CronJobDefinition = {
  jobName: 'test-quality-monitor',
  schedule: '0 3 * * 1',
  timeoutMs: 30 * 60 * 1000, // 30 minutes

  runFn: async () => {
    const startedAt = new Date().toISOString()
    const jobName = 'test-quality-monitor'

    // ── Disable check ──────────────────────────────────────────────────────────
    if (process.env.DISABLE_CRON_JOB_TEST_QUALITY_MONITOR === 'true') {
      const skipped: CronRunResult = CronRunResultSchema.parse({
        jobName,
        startedAt,
        completedAt: new Date().toISOString(),
        durationMs: 0,
        status: CronRunStatusSchema.Enum.SKIPPED,
        error: null,
      })
      logger.info('cron.run.result', skipped)
      return
    }

    // ── Run ────────────────────────────────────────────────────────────────────
    const config = buildConfigFromEnv()

    try {
      const finalState = await runTestQualityMonitor(
        config,
        null, // No previous snapshot injected at cron level — graph uses DB lookup in future
      )

      const completedAt = new Date().toISOString()
      const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime()

      const status =
        finalState.errors.length === 0
          ? CronRunStatusSchema.Enum.SUCCESS
          : CronRunStatusSchema.Enum.FAILED

      const result: CronRunResult = CronRunResultSchema.parse({
        jobName,
        startedAt,
        completedAt,
        durationMs,
        status,
        error: finalState.errors.length > 0 ? finalState.errors.join('; ') : null,
      })

      logger.info('cron.run.result', result)

      // Log additional context for observability
      logger.info('test-quality-monitor.run.summary', {
        snapshotStatus: finalState.currentSnapshot?.status,
        decayed: finalState.decayResult?.decayed,
        decayedMetrics: finalState.decayResult?.decayedMetrics?.map(m => m.metric),
        improvementStoryId: finalState.improvementStory?.id,
        assertionDensityRatio: finalState.currentSnapshot?.assertionDensityRatio,
        orphanedTestCount: finalState.currentSnapshot?.orphanedTestCount,
        criticalPathLineCoverage: finalState.currentSnapshot?.criticalPathLineCoverage,
      })
    } catch (error) {
      const completedAt = new Date().toISOString()
      const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime()
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      const result: CronRunResult = CronRunResultSchema.parse({
        jobName,
        startedAt,
        completedAt,
        durationMs,
        status: CronRunStatusSchema.Enum.FAILED,
        error: errorMessage,
      })

      logger.info('cron.run.result', result)
    }
  },
}
