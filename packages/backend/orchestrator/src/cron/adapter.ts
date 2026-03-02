/**
 * Cron Scheduler Adapter
 *
 * Defines the CronSchedulerAdapter interface (as a Zod schema) and
 * the InMemoryCronAdapter test double.
 *
 * APIP-3090: Cron Scheduler Infrastructure
 *
 * Note: z.function() schemas in this file are structural markers only.
 * They document the expected shape but do NOT enforce function signatures
 * at runtime. Use TypeScript types (inferred via z.infer<>) for that.
 */

import { z } from 'zod'
import type { CronJobDefinition } from './schemas.js'

// ============================================================================
// CronSchedulerAdapterSchema
// ============================================================================

/**
 * Schema for the cron scheduler adapter.
 *
 * Note: z.function() is a structural marker only — runtime validation
 * does not enforce function argument/return types.
 */
export const CronSchedulerAdapterSchema = z.object({
  /**
   * Schedule a job with the given cron expression and callback.
   * @param jobName - Unique name for the job
   * @param schedule - Cron expression (e.g., '* /15 * * * *')
   * @param fn - Function to call on each tick
   */
  schedule: z.function().args(z.string(), z.string(), z.function()).returns(z.void()),

  /**
   * Start all scheduled jobs.
   */
  start: z.function().returns(z.void()),

  /**
   * Stop all scheduled jobs.
   */
  stop: z.function().returns(z.void()),
})

export type CronSchedulerAdapter = {
  schedule: (jobName: string, schedule: string, fn: () => Promise<void>) => void
  start: () => void
  stop: () => void
}

// ============================================================================
// InMemoryCronAdapter
// ============================================================================

/**
 * Schema for a recorded job entry in the InMemoryCronAdapter.
 */
export const InMemoryJobEntrySchema = z.object({
  jobName: z.string(),
  schedule: z.string(),
})

export type InMemoryJobEntry = z.infer<typeof InMemoryJobEntrySchema>

/**
 * In-memory cron adapter for testing.
 *
 * Records all registered jobs so tests can verify what was scheduled
 * without actually running a cron process.
 *
 * Usage:
 * ```ts
 * const adapter = new InMemoryCronAdapter()
 * registerCronJobs(adapter, registry)
 * expect(adapter.registeredJobs).toHaveLength(6)
 * ```
 */
export class InMemoryCronAdapter implements CronSchedulerAdapter {
  /** All jobs registered via schedule() */
  readonly registeredJobs: InMemoryJobEntry[] = []

  /** All job functions, keyed by jobName */
  private readonly jobFns: Map<string, () => Promise<void>> = new Map()

  schedule(jobName: string, schedule: string, fn: () => Promise<void>): void {
    this.registeredJobs.push(InMemoryJobEntrySchema.parse({ jobName, schedule }))
    this.jobFns.set(jobName, fn)
  }

  start(): void {
    // No-op in test double
  }

  stop(): void {
    // No-op in test double
  }

  /**
   * Manually trigger a job by name (useful for testing job logic).
   */
  async triggerJob(jobName: string): Promise<void> {
    const fn = this.jobFns.get(jobName)
    if (!fn) {
      throw new Error(`No job registered with name: ${jobName}`)
    }
    await fn()
  }

  /**
   * Check if a job was registered with the given name.
   */
  hasJob(jobName: string): boolean {
    return this.registeredJobs.some(j => j.jobName === jobName)
  }

  /**
   * Get the schedule for a registered job.
   */
  getSchedule(jobName: string): string | undefined {
    return this.registeredJobs.find(j => j.jobName === jobName)?.schedule
  }

  /**
   * Reset all registered jobs (useful between tests).
   */
  reset(): void {
    this.registeredJobs.length = 0
    this.jobFns.clear()
  }
}

/**
 * Helper to create a fresh InMemoryCronAdapter for tests.
 */
export function createInMemoryCronAdapter(): InMemoryCronAdapter {
  return new InMemoryCronAdapter()
}

/**
 * Register a job definition with an adapter.
 * This is a helper used internally by registerCronJobs in registry.ts.
 */
export function registerJobWithAdapter(
  adapter: CronSchedulerAdapter,
  job: CronJobDefinition,
  wrappedFn: () => Promise<void>,
): void {
  adapter.schedule(job.jobName, job.schedule, wrappedFn)
}
