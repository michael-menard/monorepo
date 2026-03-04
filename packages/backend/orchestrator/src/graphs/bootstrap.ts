/**
 * Bootstrap Graph
 *
 * Composes a complete story bootstrap flow — from reality intake through
 * synthesis. This is the primary entry graph for the autonomous pipeline,
 * orchestrating the full story creation workflow.
 *
 * WINT-9110: Bootstrap Graph wrapping story-creation.ts
 *
 * Thread ID convention: `${storyId}:bootstrap:${attempt}`
 */

import { z } from 'zod'
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import { createToolNode } from '../runner/node-factory.js'
import type { GraphState } from '../state/index.js'
import { updateState } from '../runner/state-helpers.js'
import {
  createStoryCreationGraph,
  StoryCreationResultSchema,
  type StoryCreationResult,
} from './story-creation.js'

// ============================================================================
// Config Schema
// ============================================================================

/**
 * Configuration for the bootstrap graph.
 * Injectable deps follow z.unknown().optional() pattern for WINT-9060/9070/9080/9100.
 */
export const BootstrapConfigSchema = z.object({
  /** Story repository for DB persistence (optional, injected) */
  storyRepo: z.unknown().optional(),
  /** Workflow repository for DB persistence (optional, injected) */
  workflowRepo: z.unknown().optional(),
  /** KB dependencies for learning persistence (optional, injected) */
  kbDeps: z.unknown().optional(),
  /** Retry middleware (WINT-9107, optional, injected) */
  retryMiddleware: z.unknown().optional(),
  /** LangGraph checkpointer (WINT-9106, optional, injected) */
  checkpointer: z.unknown().optional(),
  /** Telemetry node (WINT-9100, optional, injected) */
  telemetryNode: z.unknown().optional(),
  /** Auto-approval threshold (0-100) */
  autoApprovalThreshold: z.number().int().min(0).max(100).default(95),
  /** Whether to require HiTL approval */
  requireHiTL: z.boolean().default(true),
  /** Maximum attack iterations */
  maxAttackIterations: z.number().int().positive().default(3),
  /** Whether to persist to database */
  persistToDb: z.boolean().default(false),
})

export type BootstrapConfig = z.infer<typeof BootstrapConfigSchema>

// ============================================================================
// Result Schema
// ============================================================================

export const BootstrapResultSchema = z.object({
  storyId: z.string().min(1),
  success: z.boolean(),
  storyCreationResult: z.unknown().nullable(),
  durationMs: z.number().int().min(0),
  completedAt: z.string().datetime(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
})

export type BootstrapResult = z.infer<typeof BootstrapResultSchema>

// ============================================================================
// State Annotation
// ============================================================================

const overwrite = <T>(_: T, b: T): T => b

export const BootstrapStateAnnotation = Annotation.Root({
  storyId: Annotation<string>({
    reducer: overwrite,
    default: () => '',
  }),

  config: Annotation<BootstrapConfig | null>({
    reducer: overwrite,
    default: () => null,
  }),

  startedAt: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Thread ID for this graph run */
  threadId: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Story request input */
  storyRequest: Annotation<{
    title: string
    domain: string
    description: string
    tags: string[]
  } | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Result from story-creation subgraph */
  storyCreationResult: Annotation<StoryCreationResult | null>({
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
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  warnings: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
})

export type BootstrapState = typeof BootstrapStateAnnotation.State

// ============================================================================
// Extended GraphState interface
// ============================================================================

export interface GraphStateWithBootstrap extends GraphState {
  bootstrapConfig?: BootstrapConfig | null
  bootstrapResult?: BootstrapResult | null
  bootstrapComplete?: boolean
}

// ============================================================================
// Node Implementations
// ============================================================================

/**
 * Initialize node: validates input and sets up config.
 */
export function createBootstrapInitializeNode(config: Partial<BootstrapConfig> = {}) {
  return async (state: BootstrapState): Promise<Partial<BootstrapState>> => {
    const fullConfig = BootstrapConfigSchema.parse(config)
    const now = new Date().toISOString()

    if (!state.storyId) {
      return {
        errors: ['No story ID provided for bootstrap'],
        workflowComplete: true,
        workflowSuccess: false,
      }
    }

    return {
      config: fullConfig,
      startedAt: now,
      errors: [],
      warnings: [],
    }
  }
}

/**
 * Run story-creation subgraph node.
 * Invokes the full story-creation workflow and captures results.
 */
export function createRunStoryCreationNode(config: Partial<BootstrapConfig> = {}) {
  return async (state: BootstrapState): Promise<Partial<BootstrapState>> => {
    if (!state.storyRequest) {
      return {
        storyCreationResult: null,
        warnings: ['No story request provided — skipping story creation'],
      }
    }

    try {
      const storyCreationGraph = createStoryCreationGraph({
        autoApprovalThreshold: config.autoApprovalThreshold ?? 95,
        requireHiTL: config.requireHiTL ?? true,
        maxAttackIterations: config.maxAttackIterations ?? 3,
        persistToDb: config.persistToDb ?? false,
        storyRepo: config.storyRepo,
        workflowRepo: config.workflowRepo,
        kbDeps: config.kbDeps,
      })

      const initialState = {
        storyId: state.storyId,
        epicPrefix: state.storyId.toLowerCase().split('-')[0],
        storyRequest: state.storyRequest,
      }

      const result = await storyCreationGraph.invoke(initialState)

      const storyCreationResult = StoryCreationResultSchema.parse({
        storyId: result.storyId,
        phase: result.currentPhase,
        success: result.workflowSuccess ?? false,
        synthesizedStory: result.synthesizedStory,
        readinessScore: result.readinessResult?.score ?? null,
        hitlRequired: result.hitlRequired ?? false,
        hitlDecision: result.hitlDecision,
        commitmentGateResult: result.commitmentGateResult,
        warnings: result.warnings ?? [],
        errors: result.errors ?? [],
        durationMs: 0,
        completedAt: new Date().toISOString(),
      })

      return {
        storyCreationResult,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return {
        storyCreationResult: null,
        errors: [`Story creation failed: ${msg}`],
      }
    }
  }
}

/**
 * Complete node: marks workflow as done.
 */
export function createBootstrapCompleteNode() {
  return async (state: BootstrapState): Promise<Partial<BootstrapState>> => {
    const success = state.storyCreationResult?.success ?? false
    return {
      workflowComplete: true,
      workflowSuccess: success,
    }
  }
}

// ============================================================================
// Conditional Edge Functions (exported for test access — ARCH-002)
// ============================================================================

/**
 * After initialize: error (workflowComplete set) → complete, else → run_story_creation
 */
export function afterBootstrapInitialize(state: BootstrapState): 'run_story_creation' | 'complete' {
  if (state.workflowComplete) {
    return 'complete'
  }
  return 'run_story_creation'
}

/**
 * After run_story_creation: always → complete
 */
export function afterRunStoryCreation(_state: BootstrapState): 'complete' {
  return 'complete'
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the bootstrap graph.
 *
 * Graph structure:
 * START → initialize → run_story_creation → complete → END
 *
 * On error in initialize: START → initialize → complete → END
 *
 * @param config - Bootstrap configuration
 * @returns Compiled StateGraph
 */
export function createBootstrapGraph(config: Partial<BootstrapConfig> = {}) {
  const fullConfig = BootstrapConfigSchema.parse(config)

  const graph = new StateGraph(BootstrapStateAnnotation)
    .addNode('initialize', createBootstrapInitializeNode(fullConfig))
    .addNode('run_story_creation', createRunStoryCreationNode(fullConfig))
    .addNode('complete', createBootstrapCompleteNode())
    .addEdge(START, 'initialize')
    .addConditionalEdges('initialize', afterBootstrapInitialize, {
      run_story_creation: 'run_story_creation',
      complete: 'complete',
    })
    .addEdge('run_story_creation', 'complete')
    .addEdge('complete', END)

  const checkpointer = fullConfig.checkpointer as
    | import('@langchain/langgraph').BaseCheckpointSaver
    | undefined

  return graph.compile(checkpointer ? { checkpointer } : undefined)
}

// ============================================================================
// runBootstrap Entry Point
// ============================================================================

/**
 * Convenience function to run the bootstrap graph.
 *
 * Thread ID: `${storyId}:bootstrap:${attempt}`
 *
 * @param params - Bootstrap parameters
 * @returns BootstrapResult
 */
export async function runBootstrap(params: {
  storyId: string
  storyRequest: {
    title: string
    domain: string
    description: string
    tags: string[]
  }
  config?: Partial<BootstrapConfig>
  attempt?: number
}): Promise<BootstrapResult> {
  const startTime = Date.now()
  const { storyId, storyRequest, config = {}, attempt = 1 } = params

  const threadId = `${storyId}:bootstrap:${attempt}`
  const graph = createBootstrapGraph(config)

  const initialState: Partial<BootstrapState> = {
    storyId,
    storyRequest,
    threadId,
  }

  try {
    const result = await graph.invoke(initialState, {
      configurable: { thread_id: threadId },
    })

    const durationMs = Date.now() - startTime

    return BootstrapResultSchema.parse({
      storyId: result.storyId,
      success: result.workflowSuccess ?? false,
      storyCreationResult: result.storyCreationResult,
      durationMs,
      completedAt: new Date().toISOString(),
      errors: result.errors ?? [],
      warnings: result.warnings ?? [],
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const msg = error instanceof Error ? error.message : 'Unknown error during bootstrap'

    return {
      storyId,
      success: false,
      storyCreationResult: null,
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
 * Creates a bootstrap node for use in larger orchestration graphs.
 *
 * @param config - Bootstrap configuration
 * @returns Tool node wrapping bootstrap graph
 */
export function createBootstrapNode(config: Partial<BootstrapConfig> = {}) {
  return createToolNode(
    'bootstrap',
    async (state: GraphState): Promise<Partial<GraphStateWithBootstrap>> => {
      const stateWithBootstrap = state as GraphStateWithBootstrap

      const storyRequest = {
        title: `Story ${state.storyId || 'New'}`,
        domain: state.epicPrefix || 'unknown',
        description: '',
        tags: [],
      }

      const result = await runBootstrap({
        storyId: state.storyId || 'unknown',
        storyRequest,
        config: stateWithBootstrap.bootstrapConfig || config,
      })

      return updateState({
        bootstrapResult: result,
        bootstrapComplete: result.success,
      } as Partial<GraphStateWithBootstrap>)
    },
  )
}
