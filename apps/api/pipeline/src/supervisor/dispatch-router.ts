/**
 * Dispatch Router
 *
 * Core job processor for PipelineSupervisor. Handles:
 * - Thread ID derivation (AC-3)
 * - Stage-to-graph routing (AC-4, AC-5)
 * - Wall clock timeout via Promise.race() (AC-6)
 * - Two-catch pattern: WallClockTimeoutError BEFORE error classification (AC-15)
 * - Error classification: PERMANENT → immediate fail, TRANSIENT → BullMQ retry (AC-7)
 * - Per-graph circuit breaker check (AC-8)
 * - Structured lifecycle event logging (AC-9)
 *
 * APIP-0020: Supervisor Loop (Plain TypeScript)
 */

import type { Job } from 'bullmq'
import { logger } from '@repo/logger'
import { isRetryableNodeError, getErrorCategory } from '@repo/orchestrator'
import type {
  SynthesizedStory,
  StoryRequest,
  BaselineReality,
  ElaborationConfig,
  StoryCreationConfig,
  ElaborationResult,
  StoryCreationResult,
} from './graph-types.js'
import type { PipelineJobData, PipelineSupervisorConfig } from './__types__/index.js'
import { WallClockTimeoutError, withWallClockTimeout } from './wall-clock-timeout.js'
import { createCircuitBreakers, type GraphCircuitBreakers } from './graph-circuit-breakers.js'
import { loadGraphRunners } from './graph-loader.js'

// ─────────────────────────────────────────────────────────────────────────────
// Injectable graph runners — type aliases for graph functions
// ─────────────────────────────────────────────────────────────────────────────

export type RunElaborationFn = (
  currentStory: SynthesizedStory,
  previousStory: SynthesizedStory | null,
  config: Partial<ElaborationConfig>,
) => Promise<ElaborationResult>

export type RunStoryCreationFn = (
  request: StoryRequest,
  baseline: BaselineReality | null,
  config: Partial<StoryCreationConfig>,
) => Promise<StoryCreationResult>

/**
 * Injectable graph runners — swapped in tests to avoid real graph execution.
 */
export interface GraphRunners {
  runElaboration: RunElaborationFn
  runStoryCreation: RunStoryCreationFn
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level circuit breaker cache
// ─────────────────────────────────────────────────────────────────────────────

let _circuitBreakers: GraphCircuitBreakers | null = null

function getOrCreateCircuitBreakers(config: PipelineSupervisorConfig): GraphCircuitBreakers {
  if (!_circuitBreakers) {
    _circuitBreakers = createCircuitBreakers(config)
  }
  return _circuitBreakers
}

/**
 * Reset module-level circuit breakers (for testing only).
 */
export function resetDispatcherState(): void {
  _circuitBreakers = null
}

// ─────────────────────────────────────────────────────────────────────────────
// Core dispatch function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dispatch a validated pipeline job to the appropriate graph.
 *
 * Supervisor state machine:
 *   Job received → thread ID derived → circuit check
 *     → [circuit OPEN] → re-queue as delayed → log circuit_open
 *     → [circuit CLOSED/HALF_OPEN] → dispatch to graph
 *       → Promise.race([graph, wallClockTimeout])
 *         → [graph complete] → log completed → BullMQ complete
 *         → [timeout] → log timeout → BullMQ fail (wall_clock_timeout)
 *         → [graph error] → classify
 *           → [PERMANENT] → log failed → BullMQ immediate fail
 *           → [TRANSIENT] → re-throw → BullMQ retry
 *
 * @param job - BullMQ job instance
 * @param data - Zod-validated job payload
 * @param config - Supervisor configuration
 * @param runners - Optional injectable graph runners (for testing)
 */
export async function dispatchJob(
  job: Job,
  data: PipelineJobData,
  config: PipelineSupervisorConfig,
  runners?: GraphRunners,
): Promise<void> {
  // ADR: Thread ID Convention (APIP-0020)
  // Format: {storyId}:{stage}:{attemptNumber}
  // Example: "APIP-001:elaboration:1"
  // IRREVERSIBLE: Changing this convention post-Phase 0 requires LangGraph checkpoint data migration.
  const threadId = `${data.storyId}:${data.stage}:${data.attemptNumber}`

  const startMs = Date.now()

  // AC-9: Log job_received lifecycle event
  logger.info('job_received', {
    event: 'job_received',
    storyId: data.storyId,
    stage: data.stage,
    threadId,
    attemptNumber: data.attemptNumber,
    jobId: job.id,
    durationMs: 0,
  })

  const circuitBreakers = getOrCreateCircuitBreakers(config)
  const circuitBreaker =
    data.stage === 'elaboration' ? circuitBreakers.elaboration : circuitBreakers.storyCreation

  // AC-8: Circuit breaker check — if OPEN, re-queue as delayed (not failed)
  if (!circuitBreaker.canExecute()) {
    const durationMs = Date.now() - startMs

    // AC-9: Log circuit_open event
    logger.warn('circuit_open', {
      event: 'circuit_open',
      storyId: data.storyId,
      stage: data.stage,
      threadId,
      attemptNumber: data.attemptNumber,
      durationMs,
      circuitState: circuitBreaker.getState(),
    })

    // Re-queue as delayed — let the circuit recover before retrying
    await job.moveToDelayed(Date.now() + config.circuitBreakerRecoveryTimeoutMs)
    return
  }

  // AC-9: Log dispatching event
  logger.info('dispatching', {
    event: 'dispatching',
    storyId: data.storyId,
    stage: data.stage,
    threadId,
    attemptNumber: data.attemptNumber,
    durationMs: Date.now() - startMs,
  })

  // Resolve graph runners — injected in tests, loaded via graph-loader in production
  // Tests mock './graph-loader' via vi.mock() to avoid loading real LangGraph modules.
  const graphRunners: GraphRunners = runners ?? (await loadGraphRunners())

  try {
    // Build graph invocation promise based on stage
    let graphPromise: Promise<ElaborationResult | StoryCreationResult>

    if (data.stage === 'elaboration') {
      // AC-4, AC-13: Extract SynthesizedStory from job.data.payload; pass to runElaboration
      // previousStory is null for Phase 0 (APIP-ADR)
      graphPromise = graphRunners.runElaboration(data.payload as SynthesizedStory, null, {})
    } else {
      // AC-5, AC-13: Extract StoryRequest from job.data.payload; pass to runStoryCreation
      // Do NOT call createStoryCreationGraph() directly — use runStoryCreation() runner (AC-5)
      graphPromise = graphRunners.runStoryCreation(data.payload as StoryRequest, null, {})
    }

    // AC-6, AC-15: Wrap with wall clock timeout via Promise.race()
    await withWallClockTimeout(graphPromise, config.stageTimeoutMs, data.stage)

    // Graph completed successfully — reset circuit breaker
    circuitBreaker.recordSuccess()
    const durationMs = Date.now() - startMs

    // AC-9: Log completed event with all required fields
    logger.info('completed', {
      event: 'completed',
      storyId: data.storyId,
      stage: data.stage,
      threadId,
      attemptNumber: data.attemptNumber,
      durationMs,
    })
  } catch (e) {
    const durationMs = Date.now() - startMs

    // AC-15: Two-catch pattern — WallClockTimeoutError is caught FIRST,
    // BEFORE general error classification branch.
    // WallClockTimeoutError bypasses isRetryableNodeError() entirely.
    if (e instanceof WallClockTimeoutError) {
      circuitBreaker.recordFailure()

      // AC-9: Log timeout lifecycle event with threadId for checkpoint inspection
      logger.error('timeout', {
        event: 'timeout',
        storyId: data.storyId,
        stage: data.stage,
        threadId,
        attemptNumber: data.attemptNumber,
        durationMs,
        timeoutMs: e.timeoutMs,
        // Log threadId so LangGraph checkpoint can be inspected or abandoned (APIP-2010)
        checkpointThreadId: threadId,
      })

      // Mark BullMQ job as failed with wall_clock_timeout reason (AC-6)
      throw new Error(`wall_clock_timeout: graph stage '${data.stage}' exceeded ${e.timeoutMs}ms`)
    }

    // AC-7, AC-15: Error classification — applies ONLY in this else branch.
    // WallClockTimeoutError has already been handled above (two-catch pattern).
    const isRetryable = isRetryableNodeError(e)
    const errorCategory = getErrorCategory(e)

    if (!isRetryable) {
      // PERMANENT error — fail the job immediately with no retry
      circuitBreaker.recordFailure()

      // AC-9: Log failed event
      logger.error('failed', {
        event: 'failed',
        storyId: data.storyId,
        stage: data.stage,
        threadId,
        attemptNumber: data.attemptNumber,
        durationMs,
        errorCategory,
        retryable: false,
        error: e instanceof Error ? e.message : String(e),
      })

      // Re-throw — BullMQ marks job as permanently failed (no retry)
      throw e
    }

    // TRANSIENT error — propagate for BullMQ retry per queue config
    circuitBreaker.recordFailure()

    // AC-9: Log failed event (retryable — BullMQ will schedule retry)
    logger.error('failed', {
      event: 'failed',
      storyId: data.storyId,
      stage: data.stage,
      threadId,
      attemptNumber: data.attemptNumber,
      durationMs,
      errorCategory,
      retryable: true,
      error: e instanceof Error ? e.message : String(e),
    })

    // Re-throw TRANSIENT error — BullMQ handles retry per queue retry config
    throw e
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// APIP-2030: Circuit breaker summary for health endpoint
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a summary of the current circuit breaker states.
 * Used by the health service to report circuitBreakerState in GET /health.
 *
 * Returns null if circuit breakers have not been initialized yet (pre-first-job).
 */
export function getCircuitBreakerSummary(
  config: import('./__types__/index.js').PipelineSupervisorConfig,
): import('./health/__types__/index.js').CircuitBreakerSummary {
  const cbs = getOrCreateCircuitBreakers(config)
  return {
    elaboration: cbs.elaboration.getState() as import('./health/__types__/index.js').CircuitBreakerState,
    storyCreation: cbs.storyCreation.getState() as import('./health/__types__/index.js').CircuitBreakerState,
  }
}
