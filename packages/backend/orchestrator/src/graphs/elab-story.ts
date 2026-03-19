/**
 * Elab Story Graph
 *
 * Thin wrapper around elaboration.ts for a single story elaboration.
 * Adds worktree lifecycle management: setup → elaboration → teardown.
 * Teardown always runs even when elaboration fails (AC-3).
 *
 * WINT-9110: elab-story.ts wrapping elaboration.ts as subgraph
 * PIPE-3020: Wire real git worktree lifecycle
 *
 * Thread ID convention: `${storyId}:elab-story:${attempt}`
 */

import * as path from 'path'
import { spawn } from 'child_process'
import { z } from 'zod'
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import { logger } from '@repo/logger'
import { worktreeRegister, worktreeGetByStory, worktreeMarkComplete } from '@repo/mcp-tools'
import { createToolNode } from '../runner/node-factory.js'
import type { GraphState } from '../state/index.js'
import { updateState } from '../runner/state-helpers.js'
import {
  createElaborationGraph,
  ElaborationResultSchema,
  type ElaborationResult,
} from './elaboration.js'

// ============================================================================
// GitRunner type (matches create-worktree.ts / cleanup-worktree.ts pattern)
// ============================================================================

export type GitRunner = (
  args: string[],
  opts: { cwd: string; env?: Record<string, string> },
) => Promise<{ exitCode: number; stdout: string; stderr: string }>

// ============================================================================
// Default git runner (spawn-based for testability)
// ============================================================================

export function defaultGitRunner(
  args: string[],
  opts: { cwd: string; env?: Record<string, string> },
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const env = opts.env ?? (process.env as Record<string, string>)
    const proc = spawn('git', args, { cwd: opts.cwd, env })
    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })
    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })
    proc.on('close', code => {
      resolve({ exitCode: code ?? 1, stdout, stderr })
    })
    proc.on('error', reject)
  })
}

// ============================================================================
// Config Schema
// ============================================================================

export const ElabStoryConfigSchema = z.object({
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
})

export type ElabStoryConfig = z.infer<typeof ElabStoryConfigSchema>

// ============================================================================
// Result Schema
// ============================================================================

export const ElabStoryResultSchema = z.object({
  storyId: z.string().min(1),
  success: z.boolean(),
  elaborationResult: z.unknown().nullable(),
  worktreePath: z.string().nullable(),
  worktreeSetup: z.boolean(),
  worktreeTornDown: z.boolean(),
  durationMs: z.number().int().min(0),
  completedAt: z.string().datetime(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
})

export type ElabStoryResult = z.infer<typeof ElabStoryResultSchema>

// ============================================================================
// State Annotation
// ============================================================================

const overwrite = <T>(_: T, b: T): T => b

export const ElabStoryStateAnnotation = Annotation.Root({
  storyId: Annotation<string>({
    reducer: overwrite,
    default: () => '',
  }),

  config: Annotation<ElabStoryConfig | null>({
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

  /**
   * Current story for elaboration.
   * Stored as unknown to allow flexible injection — cast to SynthesizedStory at usage.
   */
  currentStory: Annotation<unknown>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Previous story for delta detection (optional) */
  previousStory: Annotation<unknown>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Worktree path created during setup */
  worktreePath: Annotation<string | null>({
    reducer: overwrite,
    default: () => null,
  }),

  worktreeSetup: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  worktreeTornDown: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  elaborationResult: Annotation<ElaborationResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  elaborationFailed: Annotation<boolean>({
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

export type ElabStoryState = typeof ElabStoryStateAnnotation.State

// ============================================================================
// Extended GraphState interface
// ============================================================================

export interface GraphStateWithElabStory extends GraphState {
  elabStoryConfig?: ElabStoryConfig | null
  elabStoryResult?: ElabStoryResult | null
  elabStoryComplete?: boolean
}

// ============================================================================
// Node Implementations
// ============================================================================

/**
 * Initialize node: validates input and parses config.
 */
export function createElabStoryInitializeNode(config: Partial<ElabStoryConfig> = {}) {
  return async (state: ElabStoryState): Promise<Partial<ElabStoryState>> => {
    const fullConfig = ElabStoryConfigSchema.parse(config)

    if (!state.storyId) {
      return {
        errors: ['No story ID provided for elab-story'],
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
 * Worktree setup node.
 * Creates a real git worktree at {worktreeBaseDir}/{storyId} using branch elab/{storyId}.
 * Registers the worktree in the KB database (non-blocking on failure).
 *
 * Factory signature accepts injectable gitRunner and repoRoot for testability.
 */
export function createWorktreeSetupNode(opts: { gitRunner?: GitRunner; repoRoot?: string } = {}) {
  const gitRunner = opts.gitRunner ?? defaultGitRunner
  const repoRoot = opts.repoRoot ?? process.cwd()

  return async (state: ElabStoryState): Promise<Partial<ElabStoryState>> => {
    const startTime = Date.now()
    const { storyId } = state
    const baseDir = state.config?.worktreeBaseDir ?? '/tmp/worktrees'
    const worktreePath = path.join(baseDir, storyId)
    const branchName = `elab/${storyId}`

    // ---- Step 1: git worktree add -b elab/{storyId} {worktreePath} ----
    let gitResult: { exitCode: number; stdout: string; stderr: string }
    try {
      gitResult = await gitRunner(['worktree', 'add', '-b', branchName, worktreePath], {
        cwd: repoRoot,
        env: process.env as Record<string, string>,
      })
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      logger.warn('elab_worktree_setup_failed', {
        storyId,
        stage: 'elab',
        durationMs: Date.now() - startTime,
        error: errMsg,
      })
      return {
        worktreePath: null,
        worktreeSetup: false,
        errors: [`git worktree add threw: ${errMsg}`],
      }
    }

    if (gitResult.exitCode !== 0) {
      const errMsg = gitResult.stderr || gitResult.stdout || 'git worktree add failed'
      logger.warn('elab_worktree_setup_failed', {
        storyId,
        stage: 'elab',
        durationMs: Date.now() - startTime,
        error: errMsg,
      })
      return {
        worktreePath: null,
        worktreeSetup: false,
        errors: [`git worktree add failed: ${errMsg}`],
      }
    }

    const durationMs = Date.now() - startTime

    logger.info('elab_worktree_created', {
      storyId,
      stage: 'elab',
      durationMs,
      worktreePath,
      branchName,
    })

    // ---- Step 2: Register worktree in KB database (non-blocking on failure) ----
    try {
      const registered = await worktreeRegister({ storyId, worktreePath, branchName })
      if (!registered) {
        logger.warn('elab_worktree_register_skipped', {
          storyId,
          stage: 'elab',
          durationMs: Date.now() - startTime,
          reason: 'worktreeRegister returned null (story may not exist in KB)',
        })
      }
    } catch (regError) {
      logger.warn('elab_worktree_register_failed', {
        storyId,
        stage: 'elab',
        durationMs: Date.now() - startTime,
        error: regError instanceof Error ? regError.message : String(regError),
      })
    }

    return {
      worktreePath,
      worktreeSetup: true,
    }
  }
}

/**
 * Elaboration subgraph node.
 * Invokes the elaboration graph as a subgraph.
 */
export function createElaborationSubgraphNode(config: Partial<ElabStoryConfig> = {}) {
  return async (state: ElabStoryState): Promise<Partial<ElabStoryState>> => {
    if (!state.currentStory) {
      return {
        elaborationResult: null,
        elaborationFailed: true,
        errors: ['No current story provided for elaboration subgraph'],
      }
    }

    try {
      const elaborationGraph = createElaborationGraph({
        persistToDb: config.persistToDb ?? false,
        recalculateReadiness: config.recalculateReadiness ?? true,
        storyRepo: config.storyRepo,
        workflowRepo: config.workflowRepo,
      })

      // Cast to any at the invoke boundary — elaboration graph expects SynthesizedStory
      // but we store as unknown to allow flexible injection
      const initialState = {
        storyId: state.storyId,
        currentStory: state.currentStory as any,
        previousStory: (state.previousStory as any) ?? null,
      }

      const result = await elaborationGraph.invoke(initialState)

      const elaborationResult = ElaborationResultSchema.parse({
        storyId: result.storyId,
        phase: result.currentPhase,
        success: result.workflowSuccess ?? false,
        deltaDetectionResult: result.deltaDetectionResult,
        deltaReviewResult: result.deltaReviewResult,
        escapeHatchResult: result.escapeHatchResult,
        aggregatedFindings: result.aggregatedFindings,
        updatedReadinessResult: result.updatedReadinessResult,
        previousReadinessScore: null,
        newReadinessScore: result.updatedReadinessResult?.score ?? null,
        warnings: result.warnings ?? [],
        errors: result.errors ?? [],
        durationMs: 0,
        completedAt: new Date().toISOString(),
        changeOutline: result.changeOutline ?? null,
        totalEstimatedAtomicChanges: null,
        splitRequired: result.splitRequired ?? false,
        splitReason: result.splitReason ?? null,
      })

      return {
        elaborationResult,
        elaborationFailed: !elaborationResult.success,
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return {
        elaborationResult: null,
        elaborationFailed: true,
        errors: [`Elaboration subgraph failed: ${msg}`],
      }
    }
  }
}

/**
 * Worktree teardown node.
 * ALWAYS runs — even when elaboration fails (AC-3).
 *
 * Steps:
 * 1. Look up active worktree in KB via worktreeGetByStory
 * 2. git worktree remove --force {worktreePath}
 * 3. Mark worktree as abandoned in KB via worktreeMarkComplete
 *
 * All errors emit logger.warn() only — NEVER changes workflowSuccess.
 */
export function createWorktreeTeardownNode(
  opts: { gitRunner?: GitRunner; repoRoot?: string } = {},
) {
  const gitRunner = opts.gitRunner ?? defaultGitRunner
  const repoRoot = opts.repoRoot ?? process.cwd()

  return async (state: ElabStoryState): Promise<Partial<ElabStoryState>> => {
    const startTime = Date.now()
    const { storyId, worktreePath, worktreeSetup } = state
    const warnings: string[] = []

    if (!worktreeSetup || !worktreePath) {
      return {
        worktreeTornDown: true,
        warnings: ['Worktree teardown: no worktree was set up — skipping'],
      }
    }

    // ---- Step 1: Look up worktree in KB (to get the UUID for mark-complete) ----
    let worktreeId: string | null = null
    try {
      const record = await worktreeGetByStory({ storyId })
      if (record) {
        worktreeId = record.id
      } else {
        logger.warn('elab_worktree_teardown_no_kb_record', {
          storyId,
          stage: 'elab',
          durationMs: Date.now() - startTime,
          worktreePath,
        })
      }
    } catch (lookupError) {
      logger.warn('elab_worktree_teardown_lookup_failed', {
        storyId,
        stage: 'elab',
        durationMs: Date.now() - startTime,
        error: lookupError instanceof Error ? lookupError.message : String(lookupError),
      })
    }

    // ---- Step 2: git worktree remove --force {worktreePath} ----
    try {
      const removeResult = await gitRunner(['worktree', 'remove', '--force', worktreePath], {
        cwd: repoRoot,
        env: process.env as Record<string, string>,
      })

      if (removeResult.exitCode !== 0) {
        const warning = `git worktree remove failed: ${removeResult.stderr || removeResult.stdout}`
        logger.warn('elab_worktree_remove_failed', {
          storyId,
          stage: 'elab',
          durationMs: Date.now() - startTime,
          worktreePath,
          warning,
        })
        warnings.push(warning)
      } else {
        logger.info('elab_worktree_removed', {
          storyId,
          stage: 'elab',
          durationMs: Date.now() - startTime,
          worktreePath,
        })
      }
    } catch (removeError) {
      const warning = `git worktree remove threw: ${removeError instanceof Error ? removeError.message : String(removeError)}`
      logger.warn('elab_worktree_remove_threw', {
        storyId,
        stage: 'elab',
        durationMs: Date.now() - startTime,
        worktreePath,
        warning,
      })
      warnings.push(warning)
    }

    // ---- Step 3: Mark worktree as abandoned in KB ----
    if (worktreeId) {
      try {
        await worktreeMarkComplete({ worktreeId, status: 'abandoned' })
      } catch (markError) {
        const warning = `worktreeMarkComplete threw: ${markError instanceof Error ? markError.message : String(markError)}`
        logger.warn('elab_worktree_mark_complete_failed', {
          storyId,
          stage: 'elab',
          durationMs: Date.now() - startTime,
          worktreeId,
          warning,
        })
        warnings.push(warning)
      }
    }

    return {
      worktreeTornDown: true,
      warnings,
    }
  }
}

/**
 * Complete node: marks workflow as done.
 */
export function createElabStoryCompleteNode() {
  return async (state: ElabStoryState): Promise<Partial<ElabStoryState>> => {
    const success = state.elaborationResult?.success ?? false
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
 * After initialize: error (workflowComplete set) → worktree_teardown, else → worktree_setup
 */
export function afterElabStoryInitialize(
  state: ElabStoryState,
): 'worktree_setup' | 'worktree_teardown' {
  // If init failed and set workflowComplete, skip worktree setup but still teardown
  if (state.workflowComplete) {
    return 'worktree_teardown'
  }
  return 'worktree_setup'
}

/**
 * After elaboration_subgraph: always → worktree_teardown (AC-3 requirement)
 * Teardown must always run, even on failure.
 */
export function afterElaborationSubgraph(_state: ElabStoryState): 'worktree_teardown' {
  return 'worktree_teardown'
}

/**
 * After worktree_teardown: always → complete
 */
export function afterWorktreeTeardown(_state: ElabStoryState): 'complete' {
  return 'complete'
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the elab-story graph.
 *
 * Graph structure:
 * START → initialize → worktree_setup → elaboration_subgraph → worktree_teardown → complete → END
 *
 * On error in initialize: START → initialize → worktree_teardown → complete → END
 * (teardown always runs — AC-3)
 *
 * @param config - ElabStory configuration
 * @returns Compiled StateGraph
 */
export function createElabStoryGraph(config: Partial<ElabStoryConfig> = {}) {
  const fullConfig = ElabStoryConfigSchema.parse(config)

  const graph = new StateGraph(ElabStoryStateAnnotation)
    .addNode('initialize', createElabStoryInitializeNode(fullConfig))
    .addNode('worktree_setup', createWorktreeSetupNode())
    .addNode('elaboration_subgraph', createElaborationSubgraphNode(fullConfig))
    .addNode('worktree_teardown', createWorktreeTeardownNode())
    .addNode('complete', createElabStoryCompleteNode())
    .addEdge(START, 'initialize')
    .addConditionalEdges('initialize', afterElabStoryInitialize, {
      worktree_setup: 'worktree_setup',
      worktree_teardown: 'worktree_teardown',
    })
    .addEdge('worktree_setup', 'elaboration_subgraph')
    // Teardown always runs after elaboration (AC-3)
    .addConditionalEdges('elaboration_subgraph', afterElaborationSubgraph, {
      worktree_teardown: 'worktree_teardown',
    })
    .addConditionalEdges('worktree_teardown', afterWorktreeTeardown, {
      complete: 'complete',
    })
    .addEdge('complete', END)

  const checkpointer = fullConfig.checkpointer as
    | import('@langchain/langgraph').BaseCheckpointSaver
    | undefined

  return graph.compile(checkpointer ? { checkpointer } : undefined)
}

// ============================================================================
// runElabStory Entry Point
// ============================================================================

/**
 * Convenience function to run single-story elaboration.
 *
 * Thread ID: `${storyId}:elab-story:${attempt}`
 *
 * @param params - Elaboration parameters
 * @returns ElabStoryResult
 */
export async function runElabStory(params: {
  storyId: string
  currentStory: unknown
  previousStory?: unknown
  config?: Partial<ElabStoryConfig>
  attempt?: number
}): Promise<ElabStoryResult> {
  const startTime = Date.now()
  const { storyId, currentStory, previousStory = null, config = {}, attempt = 1 } = params

  const threadId = `${storyId}:elab-story:${attempt}`
  const graph = createElabStoryGraph(config)

  const initialState: Partial<ElabStoryState> = {
    storyId,
    currentStory,
    previousStory,
    threadId,
  }

  try {
    const result = await graph.invoke(initialState, {
      configurable: { thread_id: threadId },
    })

    const durationMs = Date.now() - startTime

    return ElabStoryResultSchema.parse({
      storyId: result.storyId,
      success: result.workflowSuccess ?? false,
      elaborationResult: result.elaborationResult,
      worktreePath: result.worktreePath,
      worktreeSetup: result.worktreeSetup ?? false,
      worktreeTornDown: result.worktreeTornDown ?? false,
      durationMs,
      completedAt: new Date().toISOString(),
      errors: result.errors ?? [],
      warnings: result.warnings ?? [],
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const msg = error instanceof Error ? error.message : 'Unknown error during elab-story'

    return {
      storyId,
      success: false,
      elaborationResult: null,
      worktreePath: null,
      worktreeSetup: false,
      worktreeTornDown: false,
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
 * Creates an elab-story node for use in larger orchestration graphs.
 *
 * @param config - ElabStory configuration
 * @returns Tool node wrapping elab-story graph
 */
export function createElabStoryNode(config: Partial<ElabStoryConfig> = {}) {
  return createToolNode(
    'elab_story',
    async (state: GraphState): Promise<Partial<GraphStateWithElabStory>> => {
      const stateWithElabStory = state as GraphStateWithElabStory

      const result = await runElabStory({
        storyId: state.storyId || 'unknown',
        currentStory: null, // Caller must provide via state extension
        config: stateWithElabStory.elabStoryConfig || config,
      })

      return updateState({
        elabStoryResult: result,
        elabStoryComplete: result.success,
      } as Partial<GraphStateWithElabStory>)
    },
  )
}
