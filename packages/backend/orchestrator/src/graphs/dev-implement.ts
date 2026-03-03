/**
 * Dev Implement Graph
 *
 * Orchestrates the development implementation workflow:
 * initialize → load_plan → execute → review_subgraph → collect_evidence → save_to_db → complete
 *
 * WINT-9110: dev-implement.ts (AC-4)
 *
 * Thread ID convention: `${storyId}:dev-implement:${attempt}`
 */

import { z } from 'zod'
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import { createToolNode } from '../runner/node-factory.js'
import type { GraphState } from '../state/index.js'
import { updateState } from '../runner/state-helpers.js'
import { type ReviewGraphResult } from './review.js'

// ============================================================================
// Config Schema
// ============================================================================

export const DevImplementConfigSchema = z.object({
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
  /** Feature directory for artifact output */
  featureDir: z.string().default('plans/future/platform'),
  /** Worktree path for review subgraph */
  worktreePath: z.string().default('/tmp/worktrees'),
  /** Whether to persist to database */
  persistToDb: z.boolean().default(false),
  /** Whether to run the review subgraph after execute */
  runReview: z.boolean().default(true),
})

export type DevImplementConfig = z.infer<typeof DevImplementConfigSchema>

// ============================================================================
// Result Schema
// ============================================================================

export const DevImplementResultSchema = z.object({
  storyId: z.string().min(1),
  success: z.boolean(),
  planLoaded: z.boolean(),
  executeComplete: z.boolean(),
  reviewResult: z.unknown().nullable(),
  evidenceCollected: z.boolean(),
  durationMs: z.number().int().min(0),
  completedAt: z.string().datetime(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
})

export type DevImplementResult = z.infer<typeof DevImplementResultSchema>

// ============================================================================
// State Annotation
// ============================================================================

const overwrite = <T>(_: T, b: T): T => b

export const DevImplementStateAnnotation = Annotation.Root({
  storyId: Annotation<string>({
    reducer: overwrite,
    default: () => '',
  }),

  config: Annotation<DevImplementConfig | null>({
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

  planLoaded: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  planContent: Annotation<unknown>({
    reducer: overwrite,
    default: () => null,
  }),

  executeComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  reviewResult: Annotation<ReviewGraphResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  evidenceCollected: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  dbSaveSuccess: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
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
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  warnings: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
})

export type DevImplementState = typeof DevImplementStateAnnotation.State

// ============================================================================
// Extended GraphState interface
// ============================================================================

export interface GraphStateWithDevImplement extends GraphState {
  devImplementConfig?: DevImplementConfig | null
  devImplementResult?: DevImplementResult | null
  devImplementComplete?: boolean
}

// ============================================================================
// Node Implementations
// ============================================================================

export function createDevImplementInitializeNode(config: Partial<DevImplementConfig> = {}) {
  return async (state: DevImplementState): Promise<Partial<DevImplementState>> => {
    const fullConfig = DevImplementConfigSchema.parse(config)

    if (!state.storyId) {
      return {
        errors: ['No story ID provided for dev-implement'],
        workflowComplete: true,
        workflowSuccess: false,
      }
    }

    return {
      config: fullConfig,
      startedAt: new Date().toISOString(),
      errors: [],
      warnings: [],
    }
  }
}

/**
 * Load plan node.
 * Loads the PLAN.yaml for the story. WINT-9060 injectable stub — skips gracefully.
 */
export function createLoadPlanNode() {
  return async (_state: DevImplementState): Promise<Partial<DevImplementState>> => {
    // Injectable plan loader not yet available (WINT-9060)
    return {
      planLoaded: true,
      planContent: null,
      warnings: ['load_plan: WINT-9060 not yet available — using stub plan'],
    }
  }
}

/**
 * Execute node.
 * Runs the implementation. WINT-9070 injectable stub — skips gracefully.
 */
export function createExecuteNode() {
  return async (_state: DevImplementState): Promise<Partial<DevImplementState>> => {
    // Injectable executor not yet available (WINT-9070)
    return {
      executeComplete: true,
      warnings: ['execute: WINT-9070 not yet available — using stub execute'],
    }
  }
}

/**
 * Review subgraph node.
 * Invokes the review graph as a subgraph.
 */
export function createReviewSubgraphNode(config: Partial<DevImplementConfig> = {}) {
  return async (state: DevImplementState): Promise<Partial<DevImplementState>> => {
    if (!config.runReview) {
      return {
        reviewResult: null,
        warnings: ['review_subgraph: skipped (runReview=false)'],
      }
    }

    try {
      const { runReview } = await import('./review.js')
      const reviewResult = await runReview({
        storyId: state.storyId,
        worktreePath: state.config?.worktreePath ?? '/tmp/worktrees',
        featureDir: state.config?.featureDir ?? 'plans/future/platform',
        iteration: 1,
      })

      return {
        reviewResult,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return {
        reviewResult: null,
        warnings: [`review_subgraph failed: ${msg}`],
      }
    }
  }
}

/**
 * Collect evidence node.
 * Produces the EVIDENCE.yaml. WINT-9080 injectable stub — skips gracefully.
 */
export function createCollectEvidenceNode() {
  return async (_state: DevImplementState): Promise<Partial<DevImplementState>> => {
    // Injectable evidence collector not yet available (WINT-9080)
    return {
      evidenceCollected: true,
      warnings: ['collect_evidence: WINT-9080 not yet available — using stub'],
    }
  }
}

/**
 * Save to DB node.
 */
export function createDevImplementSaveToDbNode() {
  return async (state: DevImplementState): Promise<Partial<DevImplementState>> => {
    if (!state.config?.persistToDb) {
      return { dbSaveSuccess: false }
    }
    // Would call storyRepo/workflowRepo here
    return { dbSaveSuccess: true }
  }
}

/**
 * Complete node.
 */
export function createDevImplementCompleteNode() {
  return async (state: DevImplementState): Promise<Partial<DevImplementState>> => {
    const success = state.executeComplete && state.evidenceCollected
    return {
      workflowComplete: true,
      workflowSuccess: success,
    }
  }
}

// ============================================================================
// Conditional Edge Functions (exported for test access — ARCH-002)
// ============================================================================

export function afterDevImplementInitialize(state: DevImplementState): 'load_plan' | 'complete' {
  if (state.workflowComplete) return 'complete'
  return 'load_plan'
}

export function afterLoadPlan(_state: DevImplementState): 'execute' {
  return 'execute'
}

export function afterExecute(state: DevImplementState): 'review_subgraph' | 'collect_evidence' {
  if (state.config?.runReview !== false) return 'review_subgraph'
  return 'collect_evidence'
}

export function afterReviewSubgraph(_state: DevImplementState): 'collect_evidence' {
  return 'collect_evidence'
}

export function afterCollectEvidence(_state: DevImplementState): 'save_to_db' {
  return 'save_to_db'
}

export function afterSaveToDb(_state: DevImplementState): 'complete' {
  return 'complete'
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the dev-implement graph.
 *
 * Graph structure:
 * START → initialize → load_plan → execute → review_subgraph → collect_evidence → save_to_db → complete → END
 *
 * @param config - DevImplement configuration
 * @returns Compiled StateGraph
 */
export function createDevImplementGraph(config: Partial<DevImplementConfig> = {}) {
  const fullConfig = DevImplementConfigSchema.parse(config)

  const graph = new StateGraph(DevImplementStateAnnotation)
    .addNode('initialize', createDevImplementInitializeNode(fullConfig))
    .addNode('load_plan', createLoadPlanNode())
    .addNode('execute', createExecuteNode())
    .addNode('review_subgraph', createReviewSubgraphNode(fullConfig))
    .addNode('collect_evidence', createCollectEvidenceNode())
    .addNode('save_to_db', createDevImplementSaveToDbNode())
    .addNode('complete', createDevImplementCompleteNode())
    .addEdge(START, 'initialize')
    .addConditionalEdges('initialize', afterDevImplementInitialize, {
      load_plan: 'load_plan',
      complete: 'complete',
    })
    .addConditionalEdges('load_plan', afterLoadPlan, {
      execute: 'execute',
    })
    .addConditionalEdges('execute', afterExecute, {
      review_subgraph: 'review_subgraph',
      collect_evidence: 'collect_evidence',
    })
    .addConditionalEdges('review_subgraph', afterReviewSubgraph, {
      collect_evidence: 'collect_evidence',
    })
    .addConditionalEdges('collect_evidence', afterCollectEvidence, {
      save_to_db: 'save_to_db',
    })
    .addConditionalEdges('save_to_db', afterSaveToDb, {
      complete: 'complete',
    })
    .addEdge('complete', END)

  const checkpointer = fullConfig.checkpointer as
    | import('@langchain/langgraph').BaseCheckpointSaver
    | undefined

  return graph.compile(checkpointer ? { checkpointer } : undefined)
}

// ============================================================================
// runDevImplement Entry Point
// ============================================================================

/**
 * Convenience function to run the dev-implement graph.
 *
 * Thread ID: `${storyId}:dev-implement:${attempt}`
 */
export async function runDevImplement(params: {
  storyId: string
  config?: Partial<DevImplementConfig>
  attempt?: number
}): Promise<DevImplementResult> {
  const startTime = Date.now()
  const { storyId, config = {}, attempt = 1 } = params

  const threadId = `${storyId}:dev-implement:${attempt}`
  const graph = createDevImplementGraph(config)

  const initialState: Partial<DevImplementState> = {
    storyId,
    threadId,
  }

  try {
    const result = await graph.invoke(initialState, {
      configurable: { thread_id: threadId },
    })

    const durationMs = Date.now() - startTime

    return DevImplementResultSchema.parse({
      storyId: result.storyId,
      success: result.workflowSuccess ?? false,
      planLoaded: result.planLoaded ?? false,
      executeComplete: result.executeComplete ?? false,
      reviewResult: result.reviewResult,
      evidenceCollected: result.evidenceCollected ?? false,
      durationMs,
      completedAt: new Date().toISOString(),
      errors: result.errors ?? [],
      warnings: result.warnings ?? [],
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const msg = error instanceof Error ? error.message : 'Unknown error during dev-implement'

    return {
      storyId,
      success: false,
      planLoaded: false,
      executeComplete: false,
      reviewResult: null,
      evidenceCollected: false,
      durationMs,
      completedAt: new Date().toISOString(),
      errors: [msg],
      warnings: [],
    }
  }
}

// ============================================================================
// Node Adapter
// ============================================================================

export function createDevImplementNode(config: Partial<DevImplementConfig> = {}) {
  return createToolNode(
    'dev_implement',
    async (state: GraphState): Promise<Partial<GraphStateWithDevImplement>> => {
      const stateWithDev = state as GraphStateWithDevImplement

      const result = await runDevImplement({
        storyId: state.storyId || 'unknown',
        config: stateWithDev.devImplementConfig || config,
      })

      return updateState({
        devImplementResult: result,
        devImplementComplete: result.success,
      } as Partial<GraphStateWithDevImplement>)
    },
  )
}
