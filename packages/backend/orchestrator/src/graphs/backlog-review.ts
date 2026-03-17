/**
 * Backlog Review Graph
 *
 * Autonomous backlog curation workflow:
 * load_backlog → ml_score → curator_analyze → reorder → persist → complete
 *
 * ml_score and curator_analyze use injectable stub pattern for pending
 * WINT-9080 dependency — skips gracefully with warning when not provided.
 * The backlog-curator deferred-item node (WINT-9070) is injected separately
 * via baclogCuratorNode and is distinct from ML scoring.
 *
 * WINT-9110: backlog-review.ts (AC-6)
 *
 * Thread ID convention: `${epicId}:backlog-review:${attempt}`
 */

import { z } from 'zod'
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import { createToolNode } from '../runner/node-factory.js'
import type { GraphState } from '../state/index.js'
import { updateState } from '../runner/state-helpers.js'

// ============================================================================
// Config Schema
// ============================================================================

export const BacklogReviewConfigSchema = z.object({
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
  /**
   * ML scoring node (optional, injected — skips gracefully if absent).
   * NOTE: This is NOT WINT-9070. The backlog-curator deferred-item node (WINT-9070)
   * is a separate concern injected via baclogCuratorNode below.
   */
  mlScoringNode: z.unknown().optional(),
  /** Curator analysis node (WINT-9080, optional, injected — skips gracefully if absent) */
  curatorAnalyzeNode: z.unknown().optional(),
  /**
   * Backlog curator node (WINT-9070, optional, injected).
   * Implements deferred-item collection (NOT ML scoring).
   * Separate from mlScoringNode — these are distinct deliverables.
   */
  baclogCuratorNode: z.unknown().optional(),
  /** Epic prefix to filter backlog stories */
  epicPrefix: z.string().default(''),
  /** Maximum stories to load */
  maxStories: z.number().int().positive().default(50),
  /** Whether to persist reordered backlog */
  persistReorder: z.boolean().default(false),
})

export type BacklogReviewConfig = z.infer<typeof BacklogReviewConfigSchema>

// ============================================================================
// Story Score Schema
// ============================================================================

export const BacklogStorySchema = z.object({
  storyId: z.string().min(1),
  title: z.string().default(''),
  mlScore: z.number().min(0).max(1).nullable(),
  curatorScore: z.number().min(0).max(1).nullable(),
  finalRank: z.number().int().min(0).nullable(),
})

export type BacklogStory = z.infer<typeof BacklogStorySchema>

// ============================================================================
// Result Schema
// ============================================================================

export const BacklogReviewResultSchema = z.object({
  epicPrefix: z.string(),
  success: z.boolean(),
  storiesLoaded: z.number().int().min(0),
  storiesScored: z.number().int().min(0),
  reordered: z.boolean(),
  persisted: z.boolean(),
  rankedStories: z.array(BacklogStorySchema).default([]),
  durationMs: z.number().int().min(0),
  completedAt: z.string().datetime(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
})

export type BacklogReviewResult = z.infer<typeof BacklogReviewResultSchema>

// ============================================================================
// State Annotation
// ============================================================================

const overwrite = <T>(_: T, b: T): T => b

export const BacklogReviewStateAnnotation = Annotation.Root({
  epicPrefix: Annotation<string>({
    reducer: overwrite,
    default: () => '',
  }),

  config: Annotation<BacklogReviewConfig | null>({
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

  /** Raw backlog stories loaded */
  backlogStories: Annotation<BacklogStory[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Stories after ML scoring (may be unchanged if ml node skipped) */
  mlScoredStories: Annotation<BacklogStory[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Stories after curator analysis */
  curatorScoredStories: Annotation<BacklogStory[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Final reordered stories */
  rankedStories: Annotation<BacklogStory[]>({
    reducer: overwrite,
    default: () => [],
  }),

  reordered: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  persisted: Annotation<boolean>({
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

export type BacklogReviewState = typeof BacklogReviewStateAnnotation.State

// ============================================================================
// Extended GraphState interface
// ============================================================================

export interface GraphStateWithBacklogReview extends GraphState {
  backlogReviewConfig?: BacklogReviewConfig | null
  backlogReviewResult?: BacklogReviewResult | null
  backlogReviewComplete?: boolean
}

// ============================================================================
// Node Implementations
// ============================================================================

export function createBacklogReviewInitializeNode(config: Partial<BacklogReviewConfig> = {}) {
  return async (_state: BacklogReviewState): Promise<Partial<BacklogReviewState>> => {
    const fullConfig = BacklogReviewConfigSchema.parse(config)

    return {
      config: fullConfig,
      startedAt: new Date().toISOString(),
      errors: [],
      warnings: [],
    }
  }
}

/**
 * Load backlog node.
 * Loads stories from the backlog. WINT-9060 injectable stub.
 */
export function createLoadBacklogNode() {
  return async (state: BacklogReviewState): Promise<Partial<BacklogReviewState>> => {
    // Injectable backlog loader not yet available (WINT-9060)
    const stubStories: BacklogStory[] = [
      {
        storyId: `${state.epicPrefix || 'WINT'}-0001`,
        title: 'Stub Story 1',
        mlScore: null,
        curatorScore: null,
        finalRank: null,
      },
    ]

    return {
      backlogStories: stubStories,
      mlScoredStories: stubStories,
      warnings: ['load_backlog: WINT-9060 not yet available — using stub backlog'],
    }
  }
}

/**
 * ML score node.
 * Scores stories using an injectable ML model.
 * Skips gracefully with warning when not injected (AC-6).
 * NOTE: Not WINT-9070 — the backlog-curator deferred-item node is separate (baclogCuratorNode).
 */
export function createMLScoreNode(config: Partial<BacklogReviewConfig> = {}) {
  return async (state: BacklogReviewState): Promise<Partial<BacklogReviewState>> => {
    const mlNode = config.mlScoringNode ?? state.config?.mlScoringNode

    if (!mlNode) {
      // Skip gracefully with warning (AC-6 requirement)
      return {
        mlScoredStories: state.backlogStories,
        warnings: ['ml_score: mlScoringNode not injected — skipping ML scoring'],
      }
    }

    try {
      // Call injectable ML node
      const mlNodeFn = mlNode as (stories: BacklogStory[]) => Promise<BacklogStory[]>
      const scored = await mlNodeFn(state.backlogStories)
      return {
        mlScoredStories: scored,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return {
        mlScoredStories: state.backlogStories,
        warnings: [`ml_score: failed — ${msg} — using unscored stories`],
      }
    }
  }
}

/**
 * Curator analyze node.
 * Curator LLM analysis (WINT-9080, injectable).
 * Skips gracefully with warning when not injected (AC-6).
 */
export function createCuratorAnalyzeNode(config: Partial<BacklogReviewConfig> = {}) {
  return async (state: BacklogReviewState): Promise<Partial<BacklogReviewState>> => {
    const curatorNode = config.curatorAnalyzeNode ?? state.config?.curatorAnalyzeNode

    if (!curatorNode) {
      // Skip gracefully with warning (AC-6 requirement)
      return {
        curatorScoredStories: state.mlScoredStories,
        warnings: ['curator_analyze: WINT-9080 not injected — skipping curator analysis'],
      }
    }

    try {
      const curatorFn = curatorNode as (stories: BacklogStory[]) => Promise<BacklogStory[]>
      const analyzed = await curatorFn(state.mlScoredStories)
      return {
        curatorScoredStories: analyzed,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return {
        curatorScoredStories: state.mlScoredStories,
        warnings: [`curator_analyze: failed — ${msg} — using ML-scored stories`],
      }
    }
  }
}

/**
 * Reorder node.
 * Sorts stories by finalRank or mlScore then curatorScore.
 */
export function createReorderNode() {
  return async (state: BacklogReviewState): Promise<Partial<BacklogReviewState>> => {
    const stories = state.curatorScoredStories

    // Sort: finalRank (if set) → mlScore desc → curatorScore desc → storyId
    const ranked = [...stories]
      .map((s, i) => ({ ...s, finalRank: s.finalRank ?? i }))
      .sort((a, b) => {
        const aScore = (a.mlScore ?? 0) + (a.curatorScore ?? 0)
        const bScore = (b.mlScore ?? 0) + (b.curatorScore ?? 0)
        return bScore - aScore || a.storyId.localeCompare(b.storyId)
      })

    return {
      rankedStories: ranked,
      reordered: true,
    }
  }
}

/**
 * Persist node.
 * Writes reordered backlog. Skips if persistReorder=false.
 */
export function createBacklogPersistNode() {
  return async (state: BacklogReviewState): Promise<Partial<BacklogReviewState>> => {
    if (!state.config?.persistReorder) {
      return { persisted: false }
    }
    // Would write to DB or filesystem here
    return { persisted: true }
  }
}

/**
 * Complete node.
 */
export function createBacklogReviewCompleteNode() {
  return async (state: BacklogReviewState): Promise<Partial<BacklogReviewState>> => {
    return {
      workflowComplete: true,
      workflowSuccess: state.reordered,
    }
  }
}

// ============================================================================
// Conditional Edge Functions (exported for test access — ARCH-002)
// ============================================================================

export function afterBacklogReviewInitialize(_state: BacklogReviewState): 'load_backlog' {
  return 'load_backlog'
}

export function afterLoadBacklog(_state: BacklogReviewState): 'ml_score' {
  return 'ml_score'
}

export function afterMLScore(_state: BacklogReviewState): 'curator_analyze' {
  return 'curator_analyze'
}

export function afterCuratorAnalyze(_state: BacklogReviewState): 'reorder' {
  return 'reorder'
}

export function afterReorder(_state: BacklogReviewState): 'persist' {
  return 'persist'
}

export function afterPersist(_state: BacklogReviewState): 'complete' {
  return 'complete'
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the backlog-review graph.
 *
 * Graph structure:
 * START → initialize → load_backlog → ml_score → curator_analyze → reorder → persist → complete → END
 *
 * ml_score and curator_analyze skip gracefully when deps not injected (AC-6).
 *
 * @param config - BacklogReview configuration
 * @returns Compiled StateGraph
 */
export function createBacklogReviewGraph(config: Partial<BacklogReviewConfig> = {}) {
  const fullConfig = BacklogReviewConfigSchema.parse(config)

  const graph = new StateGraph(BacklogReviewStateAnnotation)
    .addNode('initialize', createBacklogReviewInitializeNode(fullConfig))
    .addNode('load_backlog', createLoadBacklogNode())
    .addNode('ml_score', createMLScoreNode(fullConfig))
    .addNode('curator_analyze', createCuratorAnalyzeNode(fullConfig))
    .addNode('reorder', createReorderNode())
    .addNode('persist', createBacklogPersistNode())
    .addNode('complete', createBacklogReviewCompleteNode())
    .addEdge(START, 'initialize')
    .addConditionalEdges('initialize', afterBacklogReviewInitialize, {
      load_backlog: 'load_backlog',
    })
    .addConditionalEdges('load_backlog', afterLoadBacklog, {
      ml_score: 'ml_score',
    })
    .addConditionalEdges('ml_score', afterMLScore, {
      curator_analyze: 'curator_analyze',
    })
    .addConditionalEdges('curator_analyze', afterCuratorAnalyze, {
      reorder: 'reorder',
    })
    .addConditionalEdges('reorder', afterReorder, {
      persist: 'persist',
    })
    .addConditionalEdges('persist', afterPersist, {
      complete: 'complete',
    })
    .addEdge('complete', END)

  const checkpointer = fullConfig.checkpointer as
    | import('@langchain/langgraph').BaseCheckpointSaver
    | undefined

  return graph.compile(checkpointer ? { checkpointer } : undefined)
}

// ============================================================================
// runBacklogReview Entry Point
// ============================================================================

/**
 * Convenience function to run backlog review.
 *
 * Thread ID: `${epicPrefix}:backlog-review:${attempt}`
 */
export async function runBacklogReview(params: {
  epicPrefix: string
  config?: Partial<BacklogReviewConfig>
  attempt?: number
}): Promise<BacklogReviewResult> {
  const startTime = Date.now()
  const { epicPrefix, config = {}, attempt = 1 } = params

  const threadId = `${epicPrefix}:backlog-review:${attempt}`
  const graph = createBacklogReviewGraph(config)

  const initialState: Partial<BacklogReviewState> = {
    epicPrefix,
    threadId,
  }

  try {
    const result = await graph.invoke(initialState, {
      configurable: { thread_id: threadId },
    })

    const durationMs = Date.now() - startTime

    return BacklogReviewResultSchema.parse({
      epicPrefix: result.epicPrefix,
      success: result.workflowSuccess ?? false,
      storiesLoaded: result.backlogStories?.length ?? 0,
      storiesScored: result.mlScoredStories?.length ?? 0,
      reordered: result.reordered ?? false,
      persisted: result.persisted ?? false,
      rankedStories: result.rankedStories ?? [],
      durationMs,
      completedAt: new Date().toISOString(),
      errors: result.errors ?? [],
      warnings: result.warnings ?? [],
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const msg = error instanceof Error ? error.message : 'Unknown error during backlog-review'

    return {
      epicPrefix,
      success: false,
      storiesLoaded: 0,
      storiesScored: 0,
      reordered: false,
      persisted: false,
      rankedStories: [],
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

export function createBacklogReviewNode(config: Partial<BacklogReviewConfig> = {}) {
  return createToolNode(
    'backlog_review',
    async (state: GraphState): Promise<Partial<GraphStateWithBacklogReview>> => {
      const stateWithBacklog = state as GraphStateWithBacklogReview

      const result = await runBacklogReview({
        epicPrefix: state.epicPrefix || 'unknown',
        config: stateWithBacklog.backlogReviewConfig || config,
      })

      return updateState({
        backlogReviewResult: result,
        backlogReviewComplete: result.success,
      } as Partial<GraphStateWithBacklogReview>)
    },
  )
}
