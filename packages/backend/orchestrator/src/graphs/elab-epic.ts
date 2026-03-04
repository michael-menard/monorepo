/**
 * Elab Epic Graph
 *
 * Fan-out elaboration for all stories in an epic.
 * Uses LangGraph Send API to dispatch per-story elaboration in parallel,
 * then aggregates results in a fan-in node.
 *
 * WINT-9110: elab-epic.ts using Send API fan-out (follows review.ts pattern)
 *
 * Thread ID convention: `${epicId}:elab-epic:${attempt}`
 */

import { z } from 'zod'
import { Annotation, StateGraph, END, START, Send } from '@langchain/langgraph'
import { createToolNode } from '../runner/node-factory.js'
import type { GraphState } from '../state/index.js'
import { updateState } from '../runner/state-helpers.js'
import { runElabStory, type ElabStoryResult } from './elab-story.js'

// ============================================================================
// Config Schema
// ============================================================================

export const ElabEpicConfigSchema = z.object({
  /** Story repository (optional, injected) */
  storyRepo: z.unknown().optional(),
  /** Workflow repository (optional, injected) */
  workflowRepo: z.unknown().optional(),
  /** Retry middleware (WINT-9107, optional, injected) */
  retryMiddleware: z.unknown().optional(),
  /** LangGraph checkpointer (WINT-9106, optional, injected) */
  checkpointer: z.unknown().optional(),
  /** Telemetry node (WINT-9100, optional, injected) */
  telemetryNode: z.unknown().optional(),
  /** Worktree base directory */
  worktreeBaseDir: z.string().default('/tmp/worktrees'),
  /** Whether to persist to database */
  persistToDb: z.boolean().default(false),
  /** Whether to recalculate readiness after elaboration */
  recalculateReadiness: z.boolean().default(true),
  /** Max concurrent elaboration workers (for documentation; Send API runs in parallel) */
  maxConcurrency: z.number().int().positive().default(10),
})

export type ElabEpicConfig = z.infer<typeof ElabEpicConfigSchema>

// ============================================================================
// Per-Story Worker State (used in Send API fan-out)
// ============================================================================

export const ElabEpicWorkerStateSchema = z.object({
  /** Epic ID (parent) */
  epicId: z.string().min(1),
  /** Story ID for this worker */
  storyId: z.string().min(1),
  /** Current story content for elaboration */
  currentStory: z.unknown(),
  /** Previous story for delta detection */
  previousStory: z.unknown().optional(),
  /** Result from this worker's elaboration */
  workerResult: z.unknown().nullable(),
})

export type ElabEpicWorkerState = z.infer<typeof ElabEpicWorkerStateSchema>

// ============================================================================
// Per-Story Entry Schema (input list)
// ============================================================================

export const StoryEntrySchema = z.object({
  storyId: z.string().min(1),
  currentStory: z.unknown(),
  previousStory: z.unknown().optional(),
})

export type StoryEntry = z.infer<typeof StoryEntrySchema>

// ============================================================================
// Result Schema
// ============================================================================

export const ElabEpicResultSchema = z.object({
  epicId: z.string().min(1),
  success: z.boolean(),
  storiesProcessed: z.number().int().min(0),
  storiesSucceeded: z.number().int().min(0),
  storiesFailed: z.number().int().min(0),
  workerResults: z.array(z.unknown()).default([]),
  epicSummary: z.string().nullable(),
  durationMs: z.number().int().min(0),
  completedAt: z.string().datetime(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
})

export type ElabEpicResult = z.infer<typeof ElabEpicResultSchema>

// ============================================================================
// State Annotation
// ============================================================================

const overwrite = <T>(_: T, b: T): T => b
const append = <T>(current: T[], update: T[]): T[] => [...current, ...update]

export const ElabEpicStateAnnotation = Annotation.Root({
  epicId: Annotation<string>({
    reducer: overwrite,
    default: () => '',
  }),

  config: Annotation<ElabEpicConfig | null>({
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

  /** List of stories to elaborate (input to fan-out dispatcher) */
  storyEntries: Annotation<StoryEntry[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Worker results collected via append reducer (fan-in) */
  workerResults: Annotation<ElabStoryResult[]>({
    reducer: append,
    default: () => [],
  }),

  /** Epic-level summary produced after fan-in */
  epicSummary: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
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

export type ElabEpicState = typeof ElabEpicStateAnnotation.State

// ============================================================================
// Extended GraphState interface
// ============================================================================

export interface GraphStateWithElabEpic extends GraphState {
  elabEpicConfig?: ElabEpicConfig | null
  elabEpicResult?: ElabEpicResult | null
  elabEpicComplete?: boolean
}

// ============================================================================
// Fan-Out Dispatcher (Conditional Edge Function using Send API)
// ============================================================================

/**
 * Dispatcher that fans out to per-story worker nodes using the Send API.
 *
 * This is a CONDITIONAL EDGE function (not a node) — it returns an array of
 * Send objects that LangGraph dispatches to 'elab_story_worker' in parallel.
 *
 * Pattern follows review.ts createDispatcherNode() exactly.
 */
export function createElabEpicDispatcher(_config: Partial<ElabEpicConfig> = {}) {
  return (state: ElabEpicState): Send[] => {
    if (state.storyEntries.length === 0) {
      // No stories to process — return empty (fan_in will handle)
      return [new Send('fan_in', { ...state })]
    }

    return state.storyEntries.map(
      entry =>
        new Send('elab_story_worker', {
          ...state,
          // Per-worker story identity
          _workerStoryId: entry.storyId,
          _workerCurrentStory: entry.currentStory,
          _workerPreviousStory: entry.previousStory ?? null,
        }),
    )
  }
}

// ============================================================================
// Worker Node
// ============================================================================

/**
 * Per-story elaboration worker node.
 * Receives a single story from the Send API and runs elab-story.
 */
export function createElabStoryWorkerNode(config: Partial<ElabEpicConfig> = {}) {
  return async (
    state: ElabEpicState & {
      _workerStoryId?: string
      _workerCurrentStory?: unknown
      _workerPreviousStory?: unknown
    },
  ): Promise<Partial<ElabEpicState>> => {
    const storyId = state._workerStoryId
    const currentStory = state._workerCurrentStory
    const previousStory = state._workerPreviousStory ?? null

    if (!storyId) {
      return {
        errors: ['Worker received no storyId'],
        warnings: [],
      }
    }

    try {
      const result = await runElabStory({
        storyId,
        currentStory,
        previousStory,
        config: {
          persistToDb: config.persistToDb ?? false,
          recalculateReadiness: config.recalculateReadiness ?? true,
          storyRepo: config.storyRepo,
          workflowRepo: config.workflowRepo,
          worktreeBaseDir: config.worktreeBaseDir ?? '/tmp/worktrees',
        },
        attempt: 1,
      })

      return {
        workerResults: [result],
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return {
        errors: [`Worker for ${storyId} failed: ${msg}`],
        workerResults: [
          {
            storyId,
            success: false,
            elaborationResult: null,
            worktreePath: null,
            worktreeSetup: false,
            worktreeTornDown: false,
            durationMs: 0,
            completedAt: new Date().toISOString(),
            errors: [msg],
            warnings: [],
          } satisfies ElabStoryResult,
        ],
      }
    }
  }
}

// ============================================================================
// Fan-In Aggregation Node
// ============================================================================

/**
 * Fan-in node that aggregates per-story worker results into an epic summary.
 */
export function createElabEpicFanInNode() {
  return async (state: ElabEpicState): Promise<Partial<ElabEpicState>> => {
    const results = state.workerResults
    const succeeded = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    const summaryParts: string[] = [
      `Epic ${state.epicId}: processed ${results.length} stories.`,
      `Succeeded: ${succeeded}, Failed: ${failed}.`,
    ]

    if (failed > 0) {
      const failedIds = results.filter(r => !r.success).map(r => r.storyId)
      summaryParts.push(`Failed stories: ${failedIds.join(', ')}.`)
    }

    const epicSummary = summaryParts.join(' ')

    return {
      epicSummary,
      workflowComplete: true,
      workflowSuccess: failed === 0,
    }
  }
}

// ============================================================================
// Conditional Edge Functions (exported for test access — ARCH-002)
// ============================================================================

/**
 * After fan_in: always → complete
 */
export function afterFanIn(_state: ElabEpicState): 'complete' {
  return 'complete'
}

// ============================================================================
// Complete Node
// ============================================================================

export function createElabEpicCompleteNode() {
  return async (_state: ElabEpicState): Promise<Partial<ElabEpicState>> => {
    return {
      workflowComplete: true,
    }
  }
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the elab-epic graph.
 *
 * Graph structure (Send API fan-out):
 * START --[dispatcher]--> elab_story_worker (×N, parallel via Send API)
 *       each worker → fan_in
 *       fan_in → complete → END
 *
 * If no stories: START --[dispatcher]--> fan_in → complete → END
 *
 * @param config - ElabEpic configuration
 * @returns Compiled StateGraph
 */
export function createElabEpicGraph(config: Partial<ElabEpicConfig> = {}) {
  const fullConfig = ElabEpicConfigSchema.parse(config)

  const graph = new StateGraph(ElabEpicStateAnnotation)
    .addNode('elab_story_worker', createElabStoryWorkerNode(fullConfig))
    .addNode('fan_in', createElabEpicFanInNode())
    .addNode('complete', createElabEpicCompleteNode())
    // Dispatcher as conditional edge from START (Send API — follows review.ts pattern)
    .addConditionalEdges(START, createElabEpicDispatcher(fullConfig))
    // Each worker → fan_in (fan-in barrier, append reducer collects results)
    .addEdge('elab_story_worker', 'fan_in')
    .addConditionalEdges('fan_in', afterFanIn, {
      complete: 'complete',
    })
    .addEdge('complete', END)

  const checkpointer = fullConfig.checkpointer as
    | import('@langchain/langgraph').BaseCheckpointSaver
    | undefined

  return graph.compile(checkpointer ? { checkpointer } : undefined)
}

// ============================================================================
// runElabEpic Entry Point
// ============================================================================

/**
 * Convenience function to run epic-level elaboration.
 *
 * Thread ID: `${epicId}:elab-epic:${attempt}`
 *
 * @param params - ElabEpic parameters
 * @returns ElabEpicResult
 */
export async function runElabEpic(params: {
  epicId: string
  storyEntries: StoryEntry[]
  config?: Partial<ElabEpicConfig>
  attempt?: number
}): Promise<ElabEpicResult> {
  const startTime = Date.now()
  const { epicId, storyEntries, config = {}, attempt = 1 } = params

  const threadId = `${epicId}:elab-epic:${attempt}`
  const graph = createElabEpicGraph(config)

  const initialState: Partial<ElabEpicState> = {
    epicId,
    storyEntries,
    threadId,
  }

  try {
    const result = await graph.invoke(initialState, {
      configurable: { thread_id: threadId },
    })

    const durationMs = Date.now() - startTime
    const workerResults = result.workerResults ?? []
    const succeeded = workerResults.filter((r: ElabStoryResult) => r.success).length
    const failed = workerResults.filter((r: ElabStoryResult) => !r.success).length

    return ElabEpicResultSchema.parse({
      epicId: result.epicId,
      success: result.workflowSuccess ?? false,
      storiesProcessed: workerResults.length,
      storiesSucceeded: succeeded,
      storiesFailed: failed,
      workerResults,
      epicSummary: result.epicSummary,
      durationMs,
      completedAt: new Date().toISOString(),
      errors: result.errors ?? [],
      warnings: result.warnings ?? [],
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const msg = error instanceof Error ? error.message : 'Unknown error during elab-epic'

    return {
      epicId,
      success: false,
      storiesProcessed: 0,
      storiesSucceeded: 0,
      storiesFailed: 0,
      workerResults: [],
      epicSummary: null,
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
 * Creates an elab-epic node for use in larger orchestration graphs.
 *
 * @param config - ElabEpic configuration
 * @returns Tool node wrapping elab-epic graph
 */
export function createElabEpicNode(config: Partial<ElabEpicConfig> = {}) {
  return createToolNode(
    'elab_epic',
    async (state: GraphState): Promise<Partial<GraphStateWithElabEpic>> => {
      const stateWithElabEpic = state as GraphStateWithElabEpic

      const result = await runElabEpic({
        epicId: state.epicPrefix || state.storyId || 'unknown',
        storyEntries: [], // Caller must provide via state extension
        config: stateWithElabEpic.elabEpicConfig || config,
      })

      return updateState({
        elabEpicResult: result,
        elabEpicComplete: result.success,
      } as Partial<GraphStateWithElabEpic>)
    },
  )
}
