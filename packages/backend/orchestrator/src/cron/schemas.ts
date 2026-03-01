/**
 * Cron Module Schemas
 *
 * Defines Zod schemas for the cron scheduler module.
 * APIP-3090: Cron Scheduler Infrastructure
 */

import { z } from 'zod'

// ============================================================================
// CronJobDefinitionSchema
// ============================================================================

/**
 * Defines a single cron job with its schedule, timeout, and run function.
 */
export const CronJobDefinitionSchema = z.object({
  /** Unique identifier for the job (e.g., 'pattern-miner') */
  jobName: z.string().min(1),

  /** Cron expression (e.g., '* /15 * * * *' for every 15 minutes) */
  schedule: z.string().min(1),

  /** Timeout in milliseconds for the job's run function */
  timeoutMs: z.number().int().positive(),

  /**
   * Run function for the job. This is the actual implementation.
   * Note: z.function() is a structural marker only — runtime validation
   * does not enforce function signatures; use TypeScript types for that.
   */
  runFn: z.function().args(z.any()).returns(z.promise(z.void())),
})

export type CronJobDefinition = z.infer<typeof CronJobDefinitionSchema>

// ============================================================================
// CronScheduleRegistrySchema
// ============================================================================

/**
 * Registry of all cron jobs to be scheduled.
 */
export const CronScheduleRegistrySchema = z.object({
  /** All jobs registered in this cron instance */
  jobs: z.array(CronJobDefinitionSchema),
})

export type CronScheduleRegistry = z.infer<typeof CronScheduleRegistrySchema>

// ============================================================================
// CronRunResultSchema
// ============================================================================

/**
 * Status of a completed cron job run.
 */
export const CronRunStatusSchema = z.enum(['SUCCESS', 'FAILED', 'TIMEOUT', 'SKIPPED'])
export type CronRunStatus = z.infer<typeof CronRunStatusSchema>

/**
 * Result of a single cron job run, used for structured logging.
 */
export const CronRunResultSchema = z.object({
  /** Name of the job that ran */
  jobName: z.string().min(1),

  /** ISO timestamp when the job started */
  startedAt: z.string().datetime(),

  /** ISO timestamp when the job completed (null if not yet complete) */
  completedAt: z.string().datetime().nullable(),

  /** Duration of the run in milliseconds (null if not yet complete) */
  durationMs: z.number().int().nonnegative().nullable(),

  /** Final status of the run */
  status: CronRunStatusSchema,

  /** Error message if the run failed (null otherwise) */
  error: z.string().nullable(),
})

export type CronRunResult = z.infer<typeof CronRunResultSchema>
