/**
 * Implementation Graph
 *
 * LangGraph implementation graph skeleton for autonomous story execution.
 * Orchestrates: load-story → create-worktree → change-loop → evidence-production
 *
 * Thread ID convention: {storyId}:implementation:{attemptNumber}
 * Consistent with APIP-0020 pattern.
 *
 * APIP-1031: Graph skeleton, state annotation, CommitRecord schema, entry point.
 * APIP-1032: Wire change-loop node; add IModelDispatch injection; afterChangeLoop edges.
 */

import { z } from 'zod'
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import { logger } from '@repo/logger'
import { createToolNode } from '../runner/node-factory.js'
import type { GraphState } from '../state/index.js'
import type { IModelDispatch } from '../pipeline/i-model-dispatch.js'
import type { ChangeLoopStatus } from '../nodes/change-loop.js'
import type { ChangeSpec } from './change-spec-schema.js'

// ============================================================================
// Zod Schemas (Zod-first — zero TypeScript interfaces)
// ============================================================================

/**
 * LoadError schema — typed error for missing story or ChangeSpec plan.
 * Produced by the load-story node; transitions to abort edge.
 */
export const LoadErrorSchema = z.object({
  /** Error code identifying the failure category */
  code: z.enum(['STORY_NOT_FOUND', 'CHANGE_SPEC_NOT_FOUND', 'STORY_PARSE_ERROR', 'UNKNOWN']),
  /** Human-readable error message */
  message: z.string().min(1),
  /** The file path that was missing or unparseable */
  path: z.string().optional(),
})

export type LoadError = z.infer<typeof LoadErrorSchema>

/**
 * CommitRecord schema — records a completed git commit from the change loop.
 *
 * Exported for APIP-1032 which imports CommitRecordSchema to type-check
 * the evidence written by the evidence-production node.
 */
export const CommitRecordSchema = z.object({
  /** The change spec ID that produced this commit */
  changeSpecId: z.string().min(1),
  /** Git commit SHA */
  commitSha: z.string().min(1),
  /** Commit message */
  commitMessage: z.string().min(1),
  /** Files touched in this commit */
  touchedFiles: z.array(z.string()).default([]),
  /** ISO timestamp of the commit */
  committedAt: z.string().datetime(),
  /** Duration of this change in ms */
  durationMs: z.number().int().min(0),
})

export type CommitRecord = z.infer<typeof CommitRecordSchema>

// ============================================================================
// State Annotation
// ============================================================================

/** Simple overwrite reducer for most fields */
const overwrite = <T>(_: T, b: T): T => b

/**
 * LangGraph state annotation for the implementation graph.
 * All fields use Zod-inferred types; no TypeScript interfaces.
 */
export const ImplementationGraphStateAnnotation = Annotation.Root({
  // ---- Base identifiers ----
  storyId: Annotation<string>(),
  attemptNumber: Annotation<number>({
    reducer: overwrite,
    default: () => 1,
  }),
  featureDir: Annotation<string>({
    reducer: overwrite,
    default: () => '',
  }),

  // ---- Timing ----
  startedAt: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // ---- load-story node outputs ----
  storyContent: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),
  changeSpecs: Annotation<ChangeSpec[]>({
    reducer: overwrite,
    default: () => [],
  }),
  loadError: Annotation<LoadError | null>({
    reducer: overwrite,
    default: () => null,
  }),
  storyLoaded: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // ---- create-worktree node outputs ----
  worktreePath: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),
  worktreeCreated: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // ---- change loop state ----
  currentChangeIndex: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),
  completedChanges: Annotation<CommitRecord[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  changeLoopComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),
  /** Routing signal from the change-loop node: pass | retry | abort | complete */
  changeLoopStatus: Annotation<ChangeLoopStatus | null>({
    reducer: overwrite,
    default: () => null,
  }),
  /** Number of change-loop retry attempts for the current ChangeSpec */
  changeLoopRetryCount: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),

  // ---- evidence-production node outputs ----
  evidencePath: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),
  evidenceWritten: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // ---- Workflow status ----
  workflowComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),
  workflowSuccess: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),
  aborted: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),
  abortReason: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // ---- Accumulated warnings and errors (append reducer) ----
  warnings: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  errors: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
})

/** TypeScript type for implementation graph state */
export type ImplementationGraphState = typeof ImplementationGraphStateAnnotation.State

// ============================================================================
// Placeholder Node Stubs (ST-2 through ST-4 implement these)
// ============================================================================

/**
 * load-story node — implemented in nodes/load-story.ts (ST-2).
 * Stub routes to abort on error or continues to create-worktree.
 */
async function loadStoryNode(
  state: ImplementationGraphState,
): Promise<Partial<ImplementationGraphState>> {
  const { loadStoryNode: impl } = await import('../nodes/load-story.js')
  return impl(state)
}

/**
 * create-worktree node — implemented in nodes/create-worktree.ts (ST-3).
 */
async function createWorktreeNode(
  state: ImplementationGraphState,
): Promise<Partial<ImplementationGraphState>> {
  const { createWorktreeNode: impl } = await import('../nodes/create-worktree.js')
  return impl(state)
}

/**
 * evidence-production node — implemented in nodes/evidence-production.ts (ST-4).
 */
async function evidenceProductionNode(
  state: ImplementationGraphState,
): Promise<Partial<ImplementationGraphState>> {
  const { evidenceProductionNode: impl } = await import('../nodes/evidence-production.js')
  return impl(state)
}

/**
 * abort node — handles LoadError transitions and terminal failure paths.
 */
async function abortNode(
  state: ImplementationGraphState,
): Promise<Partial<ImplementationGraphState>> {
  const reason = state.loadError?.message ?? state.abortReason ?? 'Unknown abort reason'
  logger.warn('implementation_aborted', {
    storyId: state.storyId,
    stage: 'implementation',
    durationMs: state.startedAt ? Date.now() - new Date(state.startedAt).getTime() : 0,
    reason,
    loadErrorCode: state.loadError?.code,
  })
  return {
    aborted: true,
    workflowComplete: true,
    workflowSuccess: false,
    abortReason: reason,
  }
}

/**
 * complete node — final lifecycle logging.
 */
async function completeNode(
  state: ImplementationGraphState,
): Promise<Partial<ImplementationGraphState>> {
  const durationMs = state.startedAt ? Date.now() - new Date(state.startedAt).getTime() : 0
  const success = state.evidenceWritten && !state.aborted

  logger.info('graph_completed', {
    storyId: state.storyId,
    stage: 'implementation',
    durationMs,
    attemptNumber: state.attemptNumber,
    success,
    completedChanges: state.completedChanges.length,
    evidenceWritten: state.evidenceWritten,
  })

  return {
    workflowComplete: true,
    workflowSuccess: success,
  }
}

// ============================================================================
// Conditional Edge Functions
// ============================================================================

/**
 * Determines the next node after load-story.
 * Routes to abort if load failed, otherwise proceeds to create-worktree.
 */
function afterLoadStory(state: ImplementationGraphState): 'create_worktree' | 'abort' {
  if (state.loadError || !state.storyLoaded) {
    return 'abort'
  }
  return 'create_worktree'
}

/**
 * Determines the next node after create-worktree.
 * Routes to abort if worktree failed, otherwise proceeds to change_loop.
 */
function afterCreateWorktree(state: ImplementationGraphState): 'change_loop' | 'abort' {
  if (!state.worktreeCreated) {
    return 'abort'
  }
  return 'change_loop'
}

/**
 * Determines the next node after the change-loop node.
 *
 * Routing logic:
 * - 'complete' or pass with all specs done → evidence_production
 * - 'pass' with more specs remaining → change_loop (continue iterating)
 * - 'retry' → change_loop (retry current spec)
 * - 'abort' → abort
 * - null/unknown → abort (defensive)
 */
function afterChangeLoop(
  state: ImplementationGraphState,
): 'change_loop' | 'evidence_production' | 'abort' {
  const status = state.changeLoopStatus

  if (status === 'abort') {
    return 'abort'
  }

  if (status === 'complete' || state.changeLoopComplete) {
    return 'evidence_production'
  }

  if (status === 'pass' || status === 'retry') {
    // More specs to process or retry current spec
    return 'change_loop'
  }

  // Defensive: unknown status → abort
  return 'abort'
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Configuration for the implementation graph.
 */
export const ImplementationGraphConfigSchema = z.object({
  /** Feature directory root (e.g. plans/future/platform/autonomous-pipeline) */
  featureDir: z.string().min(1),
  /** The story ID to implement */
  storyId: z.string().min(1),
  /** Attempt number (1-based, increments on retry) */
  attemptNumber: z.number().int().positive().default(1),
  /** Injectable model dispatch for the change-loop node */
  modelDispatch: z.custom<IModelDispatch>().optional(),
})

export type ImplementationGraphConfig = z.infer<typeof ImplementationGraphConfigSchema>

/**
 * Creates a compiled implementation graph.
 *
 * Graph structure:
 * START → load_story → [abort | create_worktree] → [abort | change_loop]
 *       → [abort | evidence_production | change_loop (loop)] → complete → END
 *
 * @param config - Configuration for the implementation run
 * @returns Compiled StateGraph for implementation
 */
export function createImplementationGraph(config: Partial<ImplementationGraphConfig> = {}) {
  const modelDispatch = config.modelDispatch

  // Build the change-loop node with injected model dispatch
  const changeLoopNodeFn = async (
    state: ImplementationGraphState,
  ): Promise<Partial<ImplementationGraphState>> => {
    const { createChangeLoopNode } = await import('../nodes/change-loop.js')
    const node = createChangeLoopNode({ modelDispatch })
    return node(state)
  }

  const graph = new StateGraph(ImplementationGraphStateAnnotation)
    .addNode('load_story', loadStoryNode)
    .addNode('create_worktree', createWorktreeNode)
    .addNode('change_loop', changeLoopNodeFn)
    .addNode('evidence_production', evidenceProductionNode)
    .addNode('abort', abortNode)
    .addNode('complete', completeNode)

    .addEdge(START, 'load_story')
    .addConditionalEdges('load_story', afterLoadStory, {
      create_worktree: 'create_worktree',
      abort: 'abort',
    })
    .addConditionalEdges('create_worktree', afterCreateWorktree, {
      change_loop: 'change_loop',
      abort: 'abort',
    })
    .addConditionalEdges('change_loop', afterChangeLoop, {
      change_loop: 'change_loop',
      evidence_production: 'evidence_production',
      abort: 'abort',
    })
    .addEdge('evidence_production', 'complete')
    .addEdge('abort', 'complete')
    .addEdge('complete', END)

  return graph.compile()
}

// ============================================================================
// Entry Point
// ============================================================================

/**
 * Extended GraphState for implementation graph integration with main workflow.
 */
export const ImplementationResultSchema = z.object({
  storyId: z.string().min(1),
  attemptNumber: z.number().int().positive(),
  success: z.boolean(),
  aborted: z.boolean(),
  abortReason: z.string().nullable(),
  completedChanges: z.array(CommitRecordSchema),
  evidencePath: z.string().nullable(),
  warnings: z.array(z.string()),
  errors: z.array(z.string()),
  durationMs: z.number().int().min(0),
  completedAt: z.string().datetime(),
})

export type ImplementationResult = z.infer<typeof ImplementationResultSchema>

/**
 * Main entry point for running the implementation graph.
 *
 * @param config - Implementation configuration
 * @returns Implementation result
 */
export async function runImplementation(
  config: ImplementationGraphConfig,
): Promise<ImplementationResult> {
  const startTime = Date.now()
  const fullConfig = ImplementationGraphConfigSchema.parse(config)

  logger.info('graph_started', {
    storyId: fullConfig.storyId,
    stage: 'implementation',
    durationMs: 0,
    attemptNumber: fullConfig.attemptNumber,
    featureDir: fullConfig.featureDir,
  })

  const graph = createImplementationGraph(fullConfig)

  const initialState: Partial<ImplementationGraphState> = {
    storyId: fullConfig.storyId,
    attemptNumber: fullConfig.attemptNumber,
    featureDir: fullConfig.featureDir,
    startedAt: new Date().toISOString(),
  }

  try {
    const result = await graph.invoke(initialState)
    const durationMs = Date.now() - startTime

    return ImplementationResultSchema.parse({
      storyId: result.storyId,
      attemptNumber: result.attemptNumber,
      success: result.workflowSuccess ?? false,
      aborted: result.aborted ?? false,
      abortReason: result.abortReason ?? null,
      completedChanges: result.completedChanges ?? [],
      evidencePath: result.evidencePath ?? null,
      warnings: result.warnings ?? [],
      errors: result.errors ?? [],
      durationMs,
      completedAt: new Date().toISOString(),
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error during implementation'

    logger.error('graph_failed', {
      storyId: fullConfig.storyId,
      stage: 'implementation',
      durationMs,
      error: errorMessage,
    })

    return {
      storyId: fullConfig.storyId,
      attemptNumber: fullConfig.attemptNumber,
      success: false,
      aborted: false,
      abortReason: null,
      completedChanges: [],
      evidencePath: null,
      warnings: [],
      errors: [errorMessage],
      durationMs,
      completedAt: new Date().toISOString(),
    }
  }
}

// ============================================================================
// Node Adapter for Main Workflow Integration (createToolNode — GAP-3)
// ============================================================================

/**
 * Extended GraphState for implementation workflow integration.
 */
export interface GraphStateWithImplementation extends GraphState {
  implementationConfig?: ImplementationGraphConfig | null
  implementationResult?: ImplementationResult | null
  implementationComplete?: boolean
}

/**
 * createToolNode adapter — ONLY for runImplementation() workflow integration.
 * Internal graph nodes are plain async functions (NOT wrapped in createToolNode).
 * See GAP-3 in PLAN.yaml notes.
 */
export const implementationNode = createToolNode(
  'implementation',
  async (state: GraphState): Promise<Partial<GraphStateWithImplementation>> => {
    const stateWithImpl = state as GraphStateWithImplementation
    const implConfig = stateWithImpl.implementationConfig

    if (!implConfig) {
      return {
        implementationResult: null,
        implementationComplete: false,
      }
    }

    const result = await runImplementation(implConfig)

    return {
      implementationResult: result,
      implementationComplete: result.success,
    }
  },
)
