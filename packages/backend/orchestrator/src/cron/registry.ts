/**
 * Cron Registry
 *
 * Provides registerCronJobs() and buildCronRegistry() for wiring up
 * all cron job definitions with timeout wrapping and env-aware filtering.
 *
 * APIP-3090: Cron Scheduler Infrastructure
 * CDBE-5020: Added partitionManagerJob to ALL_CRON_JOBS
 */

import { logger } from '@repo/logger'
import { withTimeout } from '../runner/timeout.js'
import { NodeTimeoutError } from '../runner/errors.js'
import type { CronSchedulerAdapter } from './adapter.js'
import type { CronJobDefinition, CronRunResult, CronScheduleRegistry } from './schemas.js'
import { CronRunResultSchema } from './schemas.js'
import { partitionManagerJob } from './jobs/partition-manager.job.js'

// ============================================================================
// registerCronJobs
// ============================================================================

/**
 * Register all jobs from a registry with the given adapter.
 *
 * Each job is wrapped with withTimeout using a TimeoutOptions object.
 * After each run, a CronRunResult is logged via @repo/logger.
 *
 * @param adapter - The cron scheduler adapter to register jobs with
 * @param registry - The registry of job definitions to register
 */
export function registerCronJobs(
  adapter: CronSchedulerAdapter,
  registry: CronScheduleRegistry,
): void {
  for (const job of registry.jobs) {
    const wrappedFn = createWrappedJobFn(job)
    adapter.schedule(job.jobName, job.schedule, wrappedFn)
    logger.info('cron.job.registered', { jobName: job.jobName, schedule: job.schedule })
  }
}

/**
 * Create a wrapped function for a job that applies timeout handling
 * and structured CronRunResult logging.
 */
function createWrappedJobFn(job: CronJobDefinition): () => Promise<void> {
  return async () => {
    const startedAt = new Date().toISOString()
    const startMs = Date.now()

    let status: CronRunResult['status'] = 'SUCCESS'
    let error: string | null = null

    try {
      await withTimeout(() => job.runFn(undefined), {
        timeoutMs: job.timeoutMs,
        nodeName: job.jobName,
      })
    } catch (err) {
      if (err instanceof NodeTimeoutError) {
        status = 'TIMEOUT'
        error = `Job timed out after ${job.timeoutMs}ms`
      } else {
        status = 'FAILED'
        error = err instanceof Error ? err.message : String(err)
      }
    }

    const completedAt = new Date().toISOString()
    const durationMs = Date.now() - startMs

    const result: CronRunResult = CronRunResultSchema.parse({
      jobName: job.jobName,
      startedAt,
      completedAt,
      durationMs,
      status,
      error,
    })

    logger.info('cron.job.completed', result)
  }
}

// ============================================================================
// buildCronRegistry
// ============================================================================

/**
 * Build a CronScheduleRegistry from a list of job definitions,
 * filtering out any jobs disabled via DISABLE_CRON_JOB_<JOBNAME>=true.
 *
 * Environment variable format:
 *   DISABLE_CRON_JOB_PATTERN_MINER=true  → disables job named 'pattern-miner'
 *   DISABLE_CRON_JOB_CODE_AUDIT=true     → disables job named 'code-audit'
 *   DISABLE_CRON_JOB_PARTITION_MANAGER=true → disables job named 'partition-manager'
 *
 * The job name is normalized: hyphens become underscores, uppercased.
 *
 * @param jobs - All candidate job definitions
 * @param env - Environment variables (defaults to process.env)
 * @returns Filtered registry of active jobs
 */
export function buildCronRegistry(
  jobs: CronJobDefinition[],
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): CronScheduleRegistry {
  const activeJobs = jobs.filter(job => {
    const envKey = `DISABLE_CRON_JOB_${job.jobName.toUpperCase().replace(/-/g, '_')}`
    const isDisabled = env[envKey] === 'true'

    if (isDisabled) {
      logger.info('cron.job.disabled', { jobName: job.jobName, envKey })
    }

    return !isDisabled
  })

  return { jobs: activeJobs }
}

// ============================================================================
// ALL_CRON_JOBS — canonical list of all registered cron jobs (CDBE-5020)
// ============================================================================

/**
 * Canonical list of all cron jobs available in the orchestrator.
 * Pass this to buildCronRegistry() to build the active registry with
 * env-var filtering applied (DISABLE_CRON_JOB_<NAME>=true).
 *
 * Each job in this list respects the DISABLE_CRON_JOB_<JOBNAME> env var.
 * To disable partition-manager: DISABLE_CRON_JOB_PARTITION_MANAGER=true
 */
export const ALL_CRON_JOBS: CronJobDefinition[] = [partitionManagerJob]
