/**
 * ConcurrencyConfig Zod schema for parallel worktree concurrency.
 *
 * AC-1: Defines maxWorktrees (1–3), conflictPolicy ('reject' only),
 * and per-worktree circuit breaker thresholds.
 * AC-12: maxWorktrees defaults to 1 (APIP-0020 single-story regression safety).
 *
 * @module supervisor/__types__/concurrency-config
 */

import { z } from 'zod'

/**
 * Configuration schema for the PipelineSupervisor concurrency model.
 *
 * maxWorktrees: 1  → Phase 0 serial behavior (APIP-0020 regression safe)
 * maxWorktrees: 2–3 → Parallel worktree execution
 *
 * conflictPolicy: 'reject' — overlapping stories are nacked and requeued with delay.
 * (gap-3 decision: 'queue' variant deferred until APIP-1020 ChangeSpec is stable)
 */
export const ConcurrencyConfigSchema = z.object({
  /**
   * Maximum number of concurrent git worktrees.
   * 1 = serial (APIP-0020 behavior), 2–3 = parallel.
   * Default: 1 (preserves Phase 0 behavior).
   */
  maxWorktrees: z.number().int().min(1).max(3).default(1),

  /**
   * Policy for stories with overlapping file path prefixes.
   * 'reject' = nack job and requeue with delay (gap-3 decision: only 'reject' for now).
   */
  conflictPolicy: z.enum(['reject']).default('reject'),

  /**
   * Per-worktree circuit breaker configuration.
   * Each active worktree slot gets its own isolated NodeCircuitBreaker instance.
   */
  worktreeCircuitBreaker: z
    .object({
      /** Number of consecutive failures before circuit opens. Default: 2. */
      failureThreshold: z.number().int().min(1).default(2),
      /** Time in ms before attempting circuit recovery. Default: 60000 (1 min). */
      recoveryTimeoutMs: z.number().int().min(1000).default(60000),
    })
    .default({}),
})

export type ConcurrencyConfig = z.infer<typeof ConcurrencyConfigSchema>
export type ConcurrencyConfigInput = z.input<typeof ConcurrencyConfigSchema>

/**
 * Default concurrency configuration.
 * maxWorktrees: 1 preserves APIP-0020 serial behavior by default.
 */
export const DEFAULT_CONCURRENCY_CONFIG: ConcurrencyConfig = ConcurrencyConfigSchema.parse({})
