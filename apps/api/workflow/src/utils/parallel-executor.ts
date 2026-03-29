/**
 * parallel-executor.ts
 *
 * Zod schemas for parallel worker execution with timeout and partial failure handling.
 * Used by code review (6 parallel workers) and other multi-agent phases.
 *
 * @module utils/parallel-executor
 */

import { z } from 'zod'

// ============================================================================
// Worker Status
// ============================================================================

/**
 * Status of an individual parallel worker.
 */
export const WorkerStatusSchema = z.enum(['PASS', 'FAIL', 'TIMEOUT', 'ERROR', 'PENDING', 'RUNNING'])

export type WorkerStatus = z.infer<typeof WorkerStatusSchema>

// ============================================================================
// Parallel Configuration
// ============================================================================

/**
 * Configuration for parallel worker execution.
 */
export const ParallelConfigSchema = z.object({
  /** Maximum time per worker in milliseconds (default: 5 minutes) */
  timeoutMs: z.number().int().min(1000).default(300000),

  /**
   * Fraction of workers that must pass for overall success.
   * 1.0 = all must pass, 0.5 = half must pass
   */
  partialPassThreshold: z.number().min(0).max(1).default(1.0),

  /** Stop all workers immediately on first failure */
  failFast: z.boolean().default(false),

  /** Maximum concurrent workers (0 = unlimited) */
  maxConcurrency: z.number().int().min(0).default(0),

  /** Whether to collect partial results on timeout */
  collectPartialOnTimeout: z.boolean().default(true),
})

export type ParallelConfig = z.infer<typeof ParallelConfigSchema>

/**
 * Default parallel configuration for code review (6 workers).
 */
export const DEFAULT_PARALLEL_CONFIG: ParallelConfig = {
  timeoutMs: 300000, // 5 minutes
  partialPassThreshold: 1.0, // All must pass
  failFast: false,
  maxConcurrency: 0, // Unlimited
  collectPartialOnTimeout: true,
}

// ============================================================================
// Worker Result
// ============================================================================

/**
 * Result from a single parallel worker.
 */
export const WorkerResultSchema = z.object({
  /** Worker name/identifier */
  name: z.string().min(1),

  /** Worker status */
  status: WorkerStatusSchema,

  /** Execution duration in milliseconds */
  durationMs: z.number().int().min(0),

  /** Worker output (type depends on worker) */
  output: z.unknown().optional(),

  /** Error message if failed */
  error: z.string().optional(),

  /** Timestamp when worker started */
  startedAt: z.string().datetime(),

  /** Timestamp when worker completed */
  completedAt: z.string().datetime().optional(),

  /** Number of issues found (for review workers) */
  issueCount: z.number().int().min(0).optional(),

  /** Detailed findings */
  findings: z.array(z.unknown()).optional(),
})

export type WorkerResult = z.infer<typeof WorkerResultSchema>

// ============================================================================
// Parallel Result
// ============================================================================

/**
 * Aggregated result from all parallel workers.
 */
export const ParallelResultSchema = z.object({
  /** Results from all workers */
  workers: z.array(WorkerResultSchema),

  /** Overall status based on aggregation rules */
  overall: WorkerStatusSchema,

  /** Fraction of workers that passed (0.0 - 1.0) */
  passRate: z.number().min(0).max(1),

  /** Total execution duration in milliseconds */
  totalDurationMs: z.number().int().min(0),

  /** Configuration used for this execution */
  config: ParallelConfigSchema,

  /** Summary statistics */
  summary: z.object({
    total: z.number().int().min(0),
    passed: z.number().int().min(0),
    failed: z.number().int().min(0),
    timedOut: z.number().int().min(0),
    errored: z.number().int().min(0),
  }),

  /** Timestamp when parallel execution started */
  startedAt: z.string().datetime(),

  /** Timestamp when parallel execution completed */
  completedAt: z.string().datetime(),
})

export type ParallelResult = z.infer<typeof ParallelResultSchema>

// ============================================================================
// Code Review Specific
// ============================================================================

/**
 * Code review worker names (6 parallel workers).
 */
export const CODE_REVIEW_WORKERS = [
  'code-review-lint',
  'code-review-syntax',
  'code-review-style-compliance',
  'code-review-security',
  'code-review-typecheck',
  'code-review-build',
] as const

export type CodeReviewWorker = (typeof CODE_REVIEW_WORKERS)[number]

/**
 * Code review parallel configuration.
 * All 6 workers must pass for overall PASS.
 */
export const CODE_REVIEW_PARALLEL_CONFIG: ParallelConfig = {
  timeoutMs: 300000, // 5 minutes per worker
  partialPassThreshold: 1.0, // All must pass
  failFast: false, // Run all workers even if one fails
  maxConcurrency: 6, // All 6 in parallel
  collectPartialOnTimeout: true,
}

// ============================================================================
// Aggregation Functions
// ============================================================================

/**
 * Aggregates worker results into overall status.
 *
 * Rules:
 * - All PASS → Overall PASS
 * - Any ERROR → Overall ERROR
 * - Pass rate >= threshold → PASS (with warnings for non-PASS workers)
 * - Pass rate < threshold → FAIL
 * - All TIMEOUT → Overall TIMEOUT
 */
export function aggregateWorkerResults(
  workers: WorkerResult[],
  config: ParallelConfig = DEFAULT_PARALLEL_CONFIG,
): Pick<ParallelResult, 'overall' | 'passRate' | 'summary'> {
  const summary = {
    total: workers.length,
    passed: workers.filter(w => w.status === 'PASS').length,
    failed: workers.filter(w => w.status === 'FAIL').length,
    timedOut: workers.filter(w => w.status === 'TIMEOUT').length,
    errored: workers.filter(w => w.status === 'ERROR').length,
  }

  const passRate = summary.total > 0 ? summary.passed / summary.total : 0

  // Determine overall status
  let overall: WorkerStatus

  if (summary.errored > 0) {
    overall = 'ERROR'
  } else if (summary.total === 0) {
    overall = 'PASS' // No workers = vacuously true
  } else if (passRate >= config.partialPassThreshold) {
    overall = 'PASS'
  } else if (summary.timedOut === summary.total) {
    overall = 'TIMEOUT'
  } else {
    overall = 'FAIL'
  }

  return { overall, passRate, summary }
}

/**
 * Creates a parallel result from worker results.
 */
export function createParallelResult(
  workers: WorkerResult[],
  config: ParallelConfig = DEFAULT_PARALLEL_CONFIG,
  startedAt: string,
  completedAt: string,
): ParallelResult {
  const { overall, passRate, summary } = aggregateWorkerResults(workers, config)

  // Calculate total duration
  const startTime = new Date(startedAt).getTime()
  const endTime = new Date(completedAt).getTime()
  const totalDurationMs = Math.max(0, endTime - startTime)

  return ParallelResultSchema.parse({
    workers,
    overall,
    passRate,
    totalDurationMs,
    config,
    summary,
    startedAt,
    completedAt,
  })
}

/**
 * Creates a worker result for a successful worker.
 */
export function createPassedWorkerResult(
  name: string,
  durationMs: number,
  output?: unknown,
): WorkerResult {
  const now = new Date().toISOString()
  const startTime = new Date(Date.now() - durationMs).toISOString()

  return WorkerResultSchema.parse({
    name,
    status: 'PASS',
    durationMs,
    output,
    startedAt: startTime,
    completedAt: now,
    issueCount: 0,
  })
}

/**
 * Creates a worker result for a failed worker.
 */
export function createFailedWorkerResult(
  name: string,
  durationMs: number,
  error: string,
  findings?: unknown[],
): WorkerResult {
  const now = new Date().toISOString()
  const startTime = new Date(Date.now() - durationMs).toISOString()

  return WorkerResultSchema.parse({
    name,
    status: 'FAIL',
    durationMs,
    error,
    startedAt: startTime,
    completedAt: now,
    issueCount: findings?.length ?? 0,
    findings,
  })
}

/**
 * Creates a worker result for a timed out worker.
 */
export function createTimedOutWorkerResult(
  name: string,
  timeoutMs: number,
  partialOutput?: unknown,
): WorkerResult {
  const now = new Date().toISOString()
  const startTime = new Date(Date.now() - timeoutMs).toISOString()

  return WorkerResultSchema.parse({
    name,
    status: 'TIMEOUT',
    durationMs: timeoutMs,
    output: partialOutput,
    error: `Worker exceeded timeout of ${timeoutMs}ms`,
    startedAt: startTime,
    completedAt: now,
  })
}
