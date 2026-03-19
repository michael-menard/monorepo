/**
 * Scheduler Types
 *
 * Zod schemas for the SchedulerLoop configuration and state.
 * F001: Scheduler loop type definitions.
 */

import { z } from 'zod'

export const SchedulerConfigSchema = z.object({
  /** Interval between poll cycles in milliseconds */
  pollIntervalMs: z.number().int().positive().default(30_000),
  /** Maximum concurrent in-flight jobs (active + waiting in BullMQ) */
  maxConcurrent: z.number().int().min(1).max(10).default(3),
  /**
   * Finish-before-new-start ordering: stories from plans with in_progress siblings
   * are reordered to the front of the dispatch queue.
   */
  finishBeforeNewStart: z.boolean().default(true),
  /** BullMQ queue name to enqueue jobs on */
  queueName: z.string().min(1).default('apip-pipeline'),
  /**
   * Strict finish-before-new-start enforcement: when true, stories from plans with
   * no in_progress siblings are deferred until all active plans have finished their
   * in_progress work. When false (default), all eligible stories are dispatched.
   */
  strictFinishBeforeNewStart: z.boolean().default(false),
})

export type SchedulerConfig = z.infer<typeof SchedulerConfigSchema>
