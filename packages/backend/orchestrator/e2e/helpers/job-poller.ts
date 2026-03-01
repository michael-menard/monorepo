import { z } from 'zod'
import { logger } from '@repo/logger'
import type { Queue } from 'bullmq'

// ─────────────────────────────────────────────────────────────────────────────
// Error Types (Zod-first)
// ─────────────────────────────────────────────────────────────────────────────

export const PollTimeoutErrorSchema = z.object({
  name: z.literal('PollTimeoutError'),
  message: z.string(),
  jobId: z.string(),
  maxWaitMs: z.number().int().positive(),
  elapsedMs: z.number().int().min(0),
})

export type PollTimeoutError = z.infer<typeof PollTimeoutErrorSchema>

/**
 * Error thrown when a BullMQ job does not reach a terminal state within maxWaitMs.
 */
export class PollTimeoutError extends Error {
  readonly name = 'PollTimeoutError' as const
  readonly jobId: string
  readonly maxWaitMs: number
  readonly elapsedMs: number

  constructor(jobId: string, maxWaitMs: number, elapsedMs: number) {
    super(`Job ${jobId} did not reach terminal state within ${maxWaitMs}ms (elapsed: ${elapsedMs}ms)`)
    this.jobId = jobId
    this.maxWaitMs = maxWaitMs
    this.elapsedMs = elapsedMs
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Poller Config Schema
// ─────────────────────────────────────────────────────────────────────────────

export const PipelineJobPollerConfigSchema = z.object({
  /** Initial polling interval in milliseconds (default: 5000) */
  pollIntervalMs: z.number().int().positive().default(5000),
  /** Maximum time to wait for a terminal state in milliseconds (default: 1800000 = 30 min) */
  maxWaitMs: z.number().int().positive().default(1800000),
  /** Maximum polling interval after exponential back-off (default: 60000 = 1 min) */
  maxPollIntervalMs: z.number().int().positive().default(60000),
})

export type PipelineJobPollerConfig = z.infer<typeof PipelineJobPollerConfigSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Terminal States
// ─────────────────────────────────────────────────────────────────────────────

const TERMINAL_STATES = new Set(['completed', 'failed'])

export type JobTerminalState = 'completed' | 'failed'

// ─────────────────────────────────────────────────────────────────────────────
// PipelineJobPoller
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Polls a BullMQ job until it reaches a terminal state (completed or failed).
 *
 * Uses exponential back-off starting from pollIntervalMs, doubling each poll,
 * capped at maxPollIntervalMs. Throws PollTimeoutError if maxWaitMs is exceeded.
 *
 * Never uses synchronous polling — each interval is awaited with setTimeout.
 */
export async function pollJobCompletion(
  queue: Queue,
  jobId: string,
  maxWaitMs: number,
  config: Partial<PipelineJobPollerConfig> = {},
): Promise<JobTerminalState> {
  const resolvedConfig = PipelineJobPollerConfigSchema.parse({
    ...config,
    maxWaitMs,
  })

  const startTime = Date.now()
  let currentInterval = resolvedConfig.pollIntervalMs
  let pollCount = 0

  logger.info('[PipelineJobPoller] Starting poll', {
    jobId,
    maxWaitMs: resolvedConfig.maxWaitMs,
    pollIntervalMs: resolvedConfig.pollIntervalMs,
    maxPollIntervalMs: resolvedConfig.maxPollIntervalMs,
  })

  while (true) {
    const elapsed = Date.now() - startTime

    if (elapsed >= resolvedConfig.maxWaitMs) {
      logger.warn('[PipelineJobPoller] Timeout exceeded', { jobId, elapsed, maxWaitMs: resolvedConfig.maxWaitMs })
      throw new PollTimeoutError(jobId, resolvedConfig.maxWaitMs, elapsed)
    }

    const job = await queue.getJob(jobId)

    if (!job) {
      logger.warn('[PipelineJobPoller] Job not found', { jobId, pollCount })
    } else {
      const state = await job.getState()
      pollCount++

      logger.info('[PipelineJobPoller] Poll result', {
        jobId,
        state,
        pollCount,
        elapsed,
        nextInterval: currentInterval,
      })

      if (TERMINAL_STATES.has(state)) {
        logger.info('[PipelineJobPoller] Job reached terminal state', { jobId, state, pollCount, elapsed })
        return state as JobTerminalState
      }
    }

    // Check remaining time before sleeping to avoid waiting past maxWaitMs
    const remainingMs = resolvedConfig.maxWaitMs - (Date.now() - startTime)
    if (remainingMs <= 0) {
      const finalElapsed = Date.now() - startTime
      throw new PollTimeoutError(jobId, resolvedConfig.maxWaitMs, finalElapsed)
    }

    const sleepMs = Math.min(currentInterval, remainingMs)
    await sleep(sleepMs)

    // Exponential back-off: double the interval, capped at maxPollIntervalMs
    currentInterval = Math.min(currentInterval * 2, resolvedConfig.maxPollIntervalMs)
  }
}

/**
 * Promise-based sleep (non-blocking delay)
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Get the next exponential back-off interval given the current interval.
 * Exported for unit testing purposes.
 */
export function getNextInterval(currentIntervalMs: number, maxPollIntervalMs: number): number {
  return Math.min(currentIntervalMs * 2, maxPollIntervalMs)
}
