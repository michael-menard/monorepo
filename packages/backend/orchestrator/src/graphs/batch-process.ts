/**
 * Batch Process Graph
 *
 * Fan-out batch execution for a list of stories using the LangGraph Send API.
 * Dispatches per-story workers in parallel, aggregates results via fan-in.
 *
 * WINT-9060: batch-coordinator LangGraph graph (Send API fan-out)
 *
 * Thread ID convention: `${batchId}:batch-process:${attempt}`
 */

import { z } from 'zod'
import { Annotation, StateGraph, END, START, Send } from '@langchain/langgraph'
import { logger } from '@repo/logger'
import { createToolNode } from '../runner/node-factory.js'
import type { GraphState } from '../state/index.js'
import { updateState } from '../runner/state-helpers.js'
import { enforceMinimumPathInBatch } from '../utils/minimum-path-enforcer.js'

// ============================================================================
// Config Schema
// ============================================================================

export const BatchProcessConfigSchema = z.object({
  /** Story IDs to process in this batch */
  storyIds: z.array(z.string().min(1)).default([]),
  /** Maximum concurrent workers (for documentation; Send API runs in parallel) */
  maxConcurrency: z.number().int().positive().default(10),
  /** Maximum retries per story before marking failed */
  maxRetriesPerStory: z.number().int().min(0).default(2),
  /** Minimum batch size threshold (stories below this are processed immediately) */
  batchThreshold: z.number().int().min(1).default(1),
  /** Autonomy level for worker execution */
  autonomyLevel: z.string().default('supervised'),
  /** Whether to persist results to DB */
  persistToDb: z.boolean().default(false),
  /** Story repository (optional, injected) */
  storyRepo: z.unknown().optional(),
  /** Workflow repository (optional, injected) */
  workflowRepo: z.unknown().optional(),
  /** LangGraph checkpointer (optional, injected) */
  checkpointer: z.unknown().optional(),
  /** Injectable dev-implement node (optional, injected) */
  devImplementNode: z.unknown().optional(),
  /** Injectable cohesion prosecutor node (optional, injected) */
  cohesionProsecutorNode: z.unknown().optional(),
  /** Injectable scope defender node (optional, injected) */
  scopeDefenderNode: z.unknown().optional(),
  /** Injectable evidence judge node (optional, injected) */
  evidenceJudgeNode: z.unknown().optional(),
})

export type BatchProcessConfig = z.infer<typeof BatchProcessConfigSchema>

// ============================================================================
// Result Schemas
// ============================================================================

export const BatchWorkerResultSchema = z.object({
  storyId: z.string().min(1),
  success: z.boolean(),
  retryCount: z.number().int().min(0),
  errors: z.array(z.string()).default([]),
  durationMs: z.number().int().min(0),
  /** Whether this story is on the minimum path for its plan (APRS-1030). */
  minimumPath: z.boolean().optional(),
})

export type BatchWorkerResult = z.infer<typeof BatchWorkerResultSchema>

export const BatchProcessResultSchema = z.object({
  batchId: z.string().min(1),
  success: z.boolean(),
  storiesQueued: z.number().int().min(0),
  storiesSucceeded: z.number().int().min(0),
  storiesFailed: z.number().int().min(0),
  storiesRetried: z.number().int().min(0),
  workerResults: z.array(BatchWorkerResultSchema).default([]),
  durationMs: z.number().int().min(0),
  completedAt: z.string().datetime(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
})

export type BatchProcessResult = z.infer<typeof BatchProcessResultSchema>

// ============================================================================
// State Annotation
// ============================================================================

const overwrite = <T>(_: T, b: T): T => b
const append = <T>(current: T[], update: T[]): T[] => [...current, ...update]

export const BatchProcessStateAnnotation = Annotation.Root({
  batchId: Annotation<string>({
    reducer: overwrite,
    default: () => '',
  }),

  config: Annotation<BatchProcessConfig | null>({
    reducer: overwrite,
    default: () => null,
  }),

  startedAt: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  threadId: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Story IDs to fan out to workers */
  storyIds: Annotation<string[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Worker results collected via append reducer (fan-in) */
  workerResults: Annotation<BatchWorkerResult[]>({
    reducer: append,
    default: () => [],
  }),

  workflowComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  workflowSuccess: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  errors: Annotation<string[]>({
    reducer: append,
    default: () => [],
  }),

  warnings: Annotation<string[]>({
    reducer: append,
    default: () => [],
  }),
})

export type BatchProcessState = typeof BatchProcessStateAnnotation.State

// ============================================================================
// Extended GraphState interface
// ============================================================================

export interface GraphStateWithBatchProcess extends GraphState {
  batchProcessConfig?: BatchProcessConfig | null
  batchProcessResult?: BatchProcessResult | null
  batchProcessComplete?: boolean
}

// ============================================================================
// Fan-Out Dispatcher (Conditional Edge Function using Send API)
// ============================================================================

/**
 * Dispatcher that fans out to per-story worker nodes using the Send API.
 *
 * This is a CONDITIONAL EDGE function (not a node) — it returns an array of
 * Send objects that LangGraph dispatches to 'story_worker' in parallel.
 */
export function createBatchProcessDispatcher(_config: Partial<BatchProcessConfig> = {}) {
  return (state: BatchProcessState): Send[] => {
    if (state.storyIds.length === 0) {
      // No stories to process — route directly to fan_in
      return [new Send('fan_in', { ...state })]
    }

    return state.storyIds.map(
      storyId =>
        new Send('story_worker', {
          ...state,
          _workerStoryId: storyId,
          _workerRetryCount: 0,
        }),
    )
  }
}

// ============================================================================
// Worker Node
// ============================================================================

/**
 * Per-story worker node.
 * Receives a single story via Send API and runs the dev-implement sub-pipeline.
 * Retries up to maxRetriesPerStory on failure.
 */
export function createBatchStoryWorkerNode(config: Partial<BatchProcessConfig> = {}) {
  return async (
    state: BatchProcessState & {
      _workerStoryId?: string
      _workerRetryCount?: number
    },
  ): Promise<Partial<BatchProcessState>> => {
    const storyId = state._workerStoryId
    const maxRetries = config.maxRetriesPerStory ?? 2
    const startTime = Date.now()

    if (!storyId) {
      return {
        errors: ['Worker received no storyId'],
        warnings: [],
      }
    }

    // Check injectable nodes
    const devImpl = config.devImplementNode
    const cohesionNode = config.cohesionProsecutorNode
    const scopeNode = config.scopeDefenderNode
    const evidenceNode = config.evidenceJudgeNode

    const warnings: string[] = []

    if (!devImpl) {
      warnings.push(
        `story_worker[${storyId}]: devImplementNode not injected — skipping sub-pipeline`,
      )
      return {
        workerResults: [
          BatchWorkerResultSchema.parse({
            storyId,
            success: false,
            retryCount: 0,
            errors: ['devImplementNode not injected'],
            durationMs: Date.now() - startTime,
          }),
        ],
        warnings,
      }
    }

    if (!cohesionNode) {
      warnings.push(`story_worker[${storyId}]: cohesionProsecutorNode not injected — skipping`)
    }
    if (!scopeNode) {
      warnings.push(`story_worker[${storyId}]: scopeDefenderNode not injected — skipping`)
    }
    if (!evidenceNode) {
      warnings.push(`story_worker[${storyId}]: evidenceJudgeNode not injected — skipping`)
    }

    // Retry loop bounded by maxRetriesPerStory
    let retryCount = state._workerRetryCount ?? 0
    let lastError = ''

    while (retryCount <= maxRetries) {
      try {
        const devImplFn = devImpl as (storyId: string) => Promise<BatchWorkerResult>
        const result = await devImplFn(storyId)

        const durationMs = Date.now() - startTime

        return {
          workerResults: [
            BatchWorkerResultSchema.parse({
              storyId,
              success: result.success ?? true,
              retryCount,
              errors: result.errors ?? [],
              durationMs,
            }),
          ],
          warnings,
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error)
        retryCount++

        if (retryCount <= maxRetries) {
          warnings.push(`story_worker[${storyId}]: attempt ${retryCount} failed — retrying`)
        }
      }
    }

    const durationMs = Date.now() - startTime

    return {
      workerResults: [
        BatchWorkerResultSchema.parse({
          storyId,
          success: false,
          retryCount: maxRetries + 1,
          errors: [lastError],
          durationMs,
        }),
      ],
      errors: [`story_worker[${storyId}] failed after ${maxRetries + 1} attempt(s): ${lastError}`],
      warnings,
    }
  }
}

// ============================================================================
// Fan-In Aggregation Node
// ============================================================================

/**
 * Fan-in node that aggregates per-story worker results into batch summary.
 */
export function createBatchProcessFanInNode() {
  return async (state: BatchProcessState): Promise<Partial<BatchProcessState>> => {
    const results = state.workerResults
    const _succeeded = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const _retried = results.filter(r => r.retryCount > 0).length

    return {
      workflowComplete: true,
      workflowSuccess: failed === 0 && results.length >= 0,
    }
  }
}

// ============================================================================
// Conditional Edge Functions (exported for test access — ARCH-002)
// ============================================================================

/**
 * After fan_in: always routes to complete.
 */
export function afterBatchFanIn(_state: BatchProcessState): 'complete' {
  return 'complete'
}

// ============================================================================
// Complete Node
// ============================================================================

export function createBatchProcessCompleteNode() {
  return async (state: BatchProcessState): Promise<Partial<BatchProcessState>> => {
    const results = state.workerResults
    const accumulatedErrors: string[] = []

    // APRS-1030: Enforce minimum-path constraint — every non-empty batch must have
    // at least one story flagged as minimum_path = true.
    //
    // Worker results carry an optional `minimumPath` field. When at least one
    // result includes the flag (i.e. the caller populated it), we run the full
    // enforcement check. When none of the results carry the flag we emit a
    // warning and skip enforcement to preserve backward compatibility with
    // callers that have not yet been updated to populate minimumPath.
    if (state.storyIds.length > 0) {
      const planSlug = state.batchId ?? 'unknown'
      const storiesWithFlag = results.filter((r: BatchWorkerResult) => r.minimumPath !== undefined)

      if (storiesWithFlag.length === 0) {
        // No minimumPath metadata available — callers should populate
        // BatchWorkerResult.minimumPath for full AC-4 enforcement.
        logger.warn(
          { planSlug, storyCount: state.storyIds.length },
          'batch-process complete: no minimumPath metadata in worker results — AC-4 enforcement skipped; populate BatchWorkerResult.minimumPath to enable enforcement',
        )
      } else {
        const storyDescriptors = storiesWithFlag.map((r: BatchWorkerResult) => ({
          storyId: r.storyId,
          minimumPath: r.minimumPath ?? false,
        }))

        const enforcement = enforceMinimumPathInBatch(storyDescriptors, planSlug)
        if (!enforcement.valid && enforcement.error) {
          accumulatedErrors.push(enforcement.error)
          logger.error({ planSlug, storyCount: state.storyIds.length }, enforcement.error)
        }
      }
    }

    const failed = results.filter((r: BatchWorkerResult) => !r.success).length
    const workflowSuccess = failed === 0 && accumulatedErrors.length === 0

    return {
      workflowComplete: true,
      workflowSuccess,
      errors: accumulatedErrors,
    }
  }
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the batch-process graph.
 *
 * Graph structure (Send API fan-out):
 * START --[dispatcher]--> story_worker (×N, parallel via Send API)
 *       each worker → fan_in
 *       fan_in → complete → END
 *
 * If no stories: START --[dispatcher]--> fan_in → complete → END
 *
 * @param config - BatchProcess configuration
 * @returns Compiled StateGraph
 */
export function createBatchProcessGraph(config: Partial<BatchProcessConfig> = {}) {
  const fullConfig = BatchProcessConfigSchema.parse(config)

  const graph = new StateGraph(BatchProcessStateAnnotation)
    .addNode('story_worker', createBatchStoryWorkerNode(fullConfig))
    .addNode('fan_in', createBatchProcessFanInNode())
    .addNode('complete', createBatchProcessCompleteNode())
    .addConditionalEdges(START, createBatchProcessDispatcher(fullConfig))
    .addEdge('story_worker', 'fan_in')
    .addConditionalEdges('fan_in', afterBatchFanIn, { complete: 'complete' })
    .addEdge('complete', END)

  const checkpointer = fullConfig.checkpointer as
    | import('@langchain/langgraph').BaseCheckpointSaver
    | undefined

  return graph.compile(checkpointer ? { checkpointer } : undefined)
}

// ============================================================================
// runBatchProcess Entry Point
// ============================================================================

/**
 * Convenience function to run batch processing.
 *
 * Thread ID: `${batchId}:batch-process:${attempt}`
 *
 * @param params - BatchProcess parameters
 * @returns BatchProcessResult
 */
export async function runBatchProcess(params: {
  batchId: string
  storyIds: string[]
  config?: Partial<BatchProcessConfig>
  attempt?: number
}): Promise<BatchProcessResult> {
  const startTime = Date.now()
  const { batchId, storyIds, config = {}, attempt = 1 } = params

  const threadId = `${batchId}:batch-process:${attempt}`
  const graph = createBatchProcessGraph(config)

  logger.info('graph_started', {
    batchId,
    stage: 'batch-process',
    durationMs: 0,
    storyCount: storyIds.length,
    attempt,
  })

  const initialState: Partial<BatchProcessState> = {
    batchId,
    storyIds,
    threadId,
    startedAt: new Date().toISOString(),
  }

  try {
    const result = await graph.invoke(initialState, {
      configurable: { thread_id: threadId },
    })

    const durationMs = Date.now() - startTime
    const workerResults: BatchWorkerResult[] = result.workerResults ?? []
    const succeeded = workerResults.filter(r => r.success).length
    const failed = workerResults.filter(r => !r.success).length
    const retried = workerResults.filter(r => r.retryCount > 0).length

    logger.info('graph_completed', {
      batchId,
      stage: 'batch-process',
      durationMs,
      storiesQueued: storyIds.length,
      storiesSucceeded: succeeded,
      storiesFailed: failed,
      storiesRetried: retried,
    })

    return BatchProcessResultSchema.parse({
      batchId,
      success: result.workflowSuccess ?? false,
      storiesQueued: storyIds.length,
      storiesSucceeded: succeeded,
      storiesFailed: failed,
      storiesRetried: retried,
      workerResults,
      durationMs,
      completedAt: new Date().toISOString(),
      errors: result.errors ?? [],
      warnings: result.warnings ?? [],
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const msg = error instanceof Error ? error.message : 'Unknown error during batch-process'

    logger.error('graph_failed', {
      batchId,
      stage: 'batch-process',
      durationMs,
      error: msg,
    })

    return {
      batchId,
      success: false,
      storiesQueued: storyIds.length,
      storiesSucceeded: 0,
      storiesFailed: storyIds.length,
      storiesRetried: 0,
      workerResults: [],
      durationMs,
      completedAt: new Date().toISOString(),
      errors: [msg],
      warnings: [],
    }
  }
}

// ============================================================================
// Node Adapter for Main Workflow Integration
// ============================================================================

/**
 * Creates a batch-process node for use in larger orchestration graphs.
 *
 * @param config - BatchProcess configuration
 * @returns Tool node wrapping batch-process graph
 */
export function createBatchProcessNode(config: Partial<BatchProcessConfig> = {}) {
  return createToolNode(
    'batch_process',
    async (state: GraphState): Promise<Partial<GraphStateWithBatchProcess>> => {
      const stateWithBatch = state as GraphStateWithBatchProcess

      const result = await runBatchProcess({
        batchId: state.storyId || 'unknown',
        storyIds: (stateWithBatch.batchProcessConfig as BatchProcessConfig)?.storyIds ?? [],
        config: stateWithBatch.batchProcessConfig || config,
      })

      return updateState({
        batchProcessResult: result,
        batchProcessComplete: result.success,
      } as Partial<GraphStateWithBatchProcess>)
    },
  )
}
