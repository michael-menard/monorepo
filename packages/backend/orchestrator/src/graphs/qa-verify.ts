/**
 * QA Verify Graph
 *
 * Thin wrapper around qa.ts for story QA verification.
 * Bridges config.modelClient → createQAGraph(config, { modelClient: config.modelClient })
 * as required by ARCH-003.
 *
 * WINT-9110: qa-verify.ts (AC-5)
 *
 * Thread ID convention: `${storyId}:qa-verify:${attempt}`
 */

import { z } from 'zod'
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import { logger } from '@repo/logger'
import { createToolNode } from '../runner/node-factory.js'
import type { GraphState } from '../state/index.js'
import { updateState } from '../runner/state-helpers.js'
import { StoryTransitionService, ArtifactGateError } from '../db/story-transition-service.js'
import type { StoryRepository } from '../db/story-repository.js'
import type { WorkflowRepository } from '../db/workflow-repository.js'
import {
  createQAGraph,
  QAGraphConfigSchema,
  QAGraphResultSchema,
  type QAGraphConfig,
  type QAGraphResult,
  type ModelClient,
} from './qa.js'

// ============================================================================
// Config Schema
// ============================================================================

/**
 * QA Verify config extends QAGraphConfig with injectable deps.
 * Key bridge (ARCH-003): modelClient in this config is passed to createQAGraph deps.
 */
export const QAVerifyConfigSchema = z.object({
  /** Story ID under QA (required) */
  storyId: z.string().regex(/^[A-Z]{2,10}-\d{3,5}$/, 'Invalid story ID format'),
  /** Absolute path to the worktree directory (required) */
  worktreeDir: z.string().min(1),
  /** Model client for LLM calls — bridged to createQAGraph deps (ARCH-003) */
  modelClient: z.unknown().optional(),
  /** Retry middleware (WINT-9107, optional, injected) */
  retryMiddleware: z.unknown().optional(),
  /** LangGraph checkpointer (WINT-9106, optional, injected) */
  checkpointer: z.unknown().optional(),
  /** Telemetry node (WINT-9100, optional, injected) */
  telemetryNode: z.unknown().optional(),
  /** Whether to run E2E tests */
  enableE2e: z.boolean().default(true),
  /** pnpm filter for unit tests */
  testFilter: z
    .string()
    .regex(/^[@\w\-/*]*$/)
    .default('@repo/orchestrator'),
  /** Playwright config file */
  playwrightConfig: z
    .string()
    .regex(/^[\w-./*]*\.ts$/)
    .default('playwright.legacy.config.ts'),
  /** Playwright project */
  playwrightProject: z
    .string()
    .regex(/^[\w-]*$/)
    .default('chromium-live'),
  /** Feature directory for artifact output */
  featureDir: z.string().default('plans/future/platform'),
  /** Story repository for state transitions (optional, injected) */
  storyRepo: z.unknown().optional(),
  /** Workflow repository for artifact persistence (optional, injected) */
  workflowRepo: z.unknown().optional(),
})

export type QAVerifyConfig = z.infer<typeof QAVerifyConfigSchema>

// ============================================================================
// Result Schema
// ============================================================================

export const QAVerifyResultSchema = z.object({
  storyId: z.string().min(1),
  success: z.boolean(),
  verdict: z.enum(['PASS', 'FAIL', 'BLOCKED']),
  qaArtifact: z.unknown().nullable(),
  preconditionsPassed: z.boolean(),
  durationMs: z.number().int().min(0),
  completedAt: z.string().datetime(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
})

export type QAVerifyResult = z.infer<typeof QAVerifyResultSchema>

// ============================================================================
// State Annotation
// ============================================================================

const overwrite = <T>(_: T, b: T): T => b

export const QAVerifyStateAnnotation = Annotation.Root({
  storyId: Annotation<string>({
    reducer: overwrite,
    default: () => '',
  }),

  config: Annotation<QAVerifyConfig | null>({
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

  /** Evidence artifact input */
  evidence: Annotation<unknown>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Review artifact input */
  review: Annotation<unknown>({
    reducer: overwrite,
    default: () => null,
  }),

  preconditionsPassed: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  qaResult: Annotation<QAGraphResult | null>({
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

  /** Current iteration count for escalation logic (F009) */
  iterationCount: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),

  /** Maximum iterations before escalating (1 = escalate to Opus, 2 = abort to blocked) (F009) */
  maxIterations: Annotation<number>({
    reducer: overwrite,
    default: () => 2,
  }),

  /** Current model tier — escalates from sonnet to opus at threshold 1 (F009) */
  modelTier: Annotation<'sonnet' | 'opus'>({
    reducer: overwrite,
    default: () => 'sonnet',
  }),
})

export type QAVerifyState = typeof QAVerifyStateAnnotation.State

/**
 * F009: Determine escalation path based on iteration count.
 * Returns 'proceed', 'escalate_to_opus', or 'abort_to_blocked'.
 */
export function shouldEscalate(state: {
  iterationCount: number
  maxIterations: number
}): 'proceed' | 'escalate_to_opus' | 'abort_to_blocked' {
  if (state.iterationCount >= state.maxIterations) return 'abort_to_blocked'
  if (state.iterationCount >= 1) return 'escalate_to_opus'
  return 'proceed'
}

// ============================================================================
// Extended GraphState interface
// ============================================================================

export interface GraphStateWithQAVerify extends GraphState {
  qaVerifyConfig?: QAVerifyConfig | null
  qaVerifyResult?: QAVerifyResult | null
  qaVerifyComplete?: boolean
}

// ============================================================================
// Node Implementations
// ============================================================================

export function createQAVerifyInitializeNode(config: Partial<QAVerifyConfig> = {}) {
  return async (state: QAVerifyState): Promise<Partial<QAVerifyState>> => {
    if (!state.storyId) {
      return {
        errors: ['No story ID provided for qa-verify'],
        workflowComplete: true,
        workflowSuccess: false,
      }
    }

    try {
      const fullConfig = QAVerifyConfigSchema.parse({
        storyId: state.storyId,
        worktreeDir: config.worktreeDir ?? '/tmp/worktrees',
        ...config,
      })

      const update: Partial<QAVerifyState> = {
        config: fullConfig,
        startedAt: new Date().toISOString(),
        errors: [],
        warnings: [],
      }

      // Claim story: ready_for_qa → in_qa (no artifact gate needed)
      const storyRepo = fullConfig.storyRepo as StoryRepository | undefined
      const workflowRepo = fullConfig.workflowRepo as WorkflowRepository | undefined

      if (storyRepo) {
        try {
          const svc = new StoryTransitionService(storyRepo, workflowRepo)
          await svc.claim(state.storyId, 'in_qa', 'langgraph', 'QA verification started')
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error)
          logger.error('Failed to claim story in qa-verify initialize', {
            storyId: state.storyId,
            error: msg,
          })
          return {
            ...update,
            errors: [`Failed to claim story: ${msg}`],
            workflowComplete: true,
            workflowSuccess: false,
          }
        }
      } else {
        update.warnings = ['storyRepo not injected — skipping state claim']
      }

      return update
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return {
        errors: [`Config validation failed: ${msg}`],
        workflowComplete: true,
        workflowSuccess: false,
      }
    }
  }
}

/**
 * Preconditions check node.
 * Verifies evidence (proof) and code review artifacts exist in DB.
 */
export function createQAVerifyPreconditionsNode(config: Partial<QAVerifyConfig> = {}) {
  return async (state: QAVerifyState): Promise<Partial<QAVerifyState>> => {
    const workflowRepo = (state.config?.workflowRepo ?? config.workflowRepo) as
      | WorkflowRepository
      | undefined

    if (!workflowRepo) {
      // Graceful degradation — no repo means we can't check, so pass with warning
      return {
        preconditionsPassed: true,
        warnings: ['preconditions: workflowRepo not injected — skipping artifact checks'],
      }
    }

    const errors: string[] = []

    try {
      const proof = await workflowRepo.getLatestProof(state.storyId)
      if (!proof) {
        errors.push('Missing required proof artifact')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      errors.push(`Failed to check proof artifact: ${msg}`)
    }

    try {
      const review = await workflowRepo.getLatestVerification(state.storyId, 'review')
      if (!review) {
        errors.push('Missing required review artifact')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      errors.push(`Failed to check review artifact: ${msg}`)
    }

    if (errors.length > 0) {
      return {
        preconditionsPassed: false,
        errors,
      }
    }

    return {
      preconditionsPassed: true,
    }
  }
}

/**
 * QA subgraph node.
 *
 * ARCH-003 bridge: config.modelClient → createQAGraph(qaConfig, { modelClient: config.modelClient })
 */
export function createQASubgraphNode(config: Partial<QAVerifyConfig> = {}) {
  return async (state: QAVerifyState): Promise<Partial<QAVerifyState>> => {
    if (!state.preconditionsPassed) {
      return {
        qaResult: null,
        errors: ['QA subgraph skipped: preconditions not met'],
      }
    }

    try {
      const storyId = state.storyId
      const worktreeDir = state.config?.worktreeDir ?? config.worktreeDir ?? '/tmp/worktrees'

      const qaConfig: QAGraphConfig = QAGraphConfigSchema.parse({
        storyId,
        worktreeDir,
        enableE2e: config.enableE2e ?? true,
        testFilter: config.testFilter ?? '@repo/orchestrator',
        playwrightConfig: config.playwrightConfig ?? 'playwright.legacy.config.ts',
        playwrightProject: config.playwrightProject ?? 'chromium-live',
      })

      // ARCH-003: Bridge modelClient from our config into createQAGraph deps
      const modelClient = (state.config?.modelClient ?? config.modelClient) as ModelClient

      const qaGraph = createQAGraph(qaConfig, { modelClient })

      const initialState = {
        storyId,
        evidence: state.evidence as any,
        review: state.review as any,
        config: qaConfig,
      }

      const result = await qaGraph.invoke(initialState)

      const qaResult = QAGraphResultSchema.parse({
        storyId,
        verdict: result.qaVerdict ?? result.gateDecision?.verdict ?? 'BLOCKED',
        qaArtifact: result.qaArtifact ?? null,
        durationMs: 0,
        completedAt: new Date().toISOString(),
        errors: result.errors ?? [],
        warnings: result.warnings ?? [],
      })

      return {
        qaResult,
        workflowSuccess: qaResult.verdict === 'PASS',
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      return {
        qaResult: null,
        errors: [`QA subgraph failed: ${msg}`],
      }
    }
  }
}

/**
 * State transition node.
 * Persists QA artifact to DB and advances story state based on verdict.
 */
export function createQAStateTransitionNode(config: Partial<QAVerifyConfig> = {}) {
  return async (state: QAVerifyState): Promise<Partial<QAVerifyState>> => {
    const storyRepo = (state.config?.storyRepo ?? config.storyRepo) as StoryRepository | undefined
    const workflowRepo = (state.config?.workflowRepo ?? config.workflowRepo) as
      | WorkflowRepository
      | undefined

    const update: Partial<QAVerifyState> = {}

    // Persist QA artifact to DB
    if (workflowRepo && state.qaResult?.qaArtifact) {
      try {
        const verdict = state.qaResult.verdict
        const dbVerdict = verdict === 'PASS' ? 'PASS' : 'FAIL'
        await workflowRepo.saveVerification(
          state.storyId,
          'qa_verify',
          state.qaResult.qaArtifact,
          dbVerdict,
          0,
          'langgraph',
        )
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        logger.error('Failed to save QA verification to DB', { storyId: state.storyId, error: msg })
        update.warnings = [`Failed to save QA artifact to DB: ${msg}`]
      }
    }

    // Advance story state based on verdict
    if (!storyRepo) {
      return {
        ...update,
        warnings: [
          ...(update.warnings ?? []),
          'storyRepo not injected — skipping state transition',
        ],
      }
    }

    try {
      const svc = new StoryTransitionService(storyRepo, workflowRepo)
      const verdict = state.qaResult?.verdict
      const nextState = verdict === 'PASS' ? 'completed' : 'failed_qa'
      await svc.advance(
        state.storyId,
        nextState,
        'langgraph',
        `QA verdict: ${verdict ?? 'BLOCKED'}`,
      )
    } catch (error) {
      if (error instanceof ArtifactGateError) {
        return {
          ...update,
          errors: [error.message],
        }
      }
      const msg = error instanceof Error ? error.message : String(error)
      logger.error('Failed to advance story state after QA', { storyId: state.storyId, error: msg })
      return {
        ...update,
        errors: [`Failed to advance state after QA: ${msg}`],
      }
    }

    return update
  }
}

/**
 * Complete node.
 */
export function createQAVerifyCompleteNode() {
  return async (state: QAVerifyState): Promise<Partial<QAVerifyState>> => {
    const success = state.qaResult?.verdict === 'PASS'
    return {
      workflowComplete: true,
      workflowSuccess: success,
    }
  }
}

// ============================================================================
// Conditional Edge Functions (exported for test access — ARCH-002)
// ============================================================================

export function afterQAVerifyInitialize(state: QAVerifyState): 'preconditions' | 'complete' {
  if (state.workflowComplete) return 'complete'
  return 'preconditions'
}

export function afterQAVerifyPreconditions(state: QAVerifyState): 'qa_subgraph' | 'complete' {
  if (!state.preconditionsPassed) return 'complete'
  return 'qa_subgraph'
}

export function afterQASubgraph(_state: QAVerifyState): 'state_transition' {
  return 'state_transition'
}

export function afterStateTransition(_state: QAVerifyState): 'complete' {
  return 'complete'
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the qa-verify graph.
 *
 * Graph structure:
 * START → initialize → preconditions → qa_subgraph → state_transition → complete → END
 *
 * @param config - QAVerify configuration
 * @returns Compiled StateGraph
 */
export function createQAVerifyGraph(config: Partial<QAVerifyConfig> = {}) {
  const graph = new StateGraph(QAVerifyStateAnnotation)
    .addNode('initialize', createQAVerifyInitializeNode(config))
    .addNode('preconditions', createQAVerifyPreconditionsNode(config))
    .addNode('qa_subgraph', createQASubgraphNode(config))
    .addNode('state_transition', createQAStateTransitionNode(config))
    .addNode('complete', createQAVerifyCompleteNode())
    .addEdge(START, 'initialize')
    .addConditionalEdges('initialize', afterQAVerifyInitialize, {
      preconditions: 'preconditions',
      complete: 'complete',
    })
    .addConditionalEdges('preconditions', afterQAVerifyPreconditions, {
      qa_subgraph: 'qa_subgraph',
      complete: 'complete',
    })
    .addConditionalEdges('qa_subgraph', afterQASubgraph, {
      state_transition: 'state_transition',
    })
    .addConditionalEdges('state_transition', afterStateTransition, {
      complete: 'complete',
    })
    .addEdge('complete', END)

  const checkpointer = config.checkpointer as
    | import('@langchain/langgraph').BaseCheckpointSaver
    | undefined

  return graph.compile(checkpointer ? { checkpointer } : undefined)
}

// ============================================================================
// runQAVerify Entry Point
// ============================================================================

/**
 * Convenience function to run QA verification.
 *
 * Thread ID: `${storyId}:qa-verify:${attempt}`
 */
export async function runQAVerify(params: {
  storyId: string
  evidence?: unknown
  review?: unknown
  config?: Partial<QAVerifyConfig>
  attempt?: number
  /** Story repository for state transitions */
  storyRepo?: StoryRepository
  /** Workflow repository for artifact persistence */
  workflowRepo?: WorkflowRepository
}): Promise<QAVerifyResult> {
  const startTime = Date.now()
  const { storyId, evidence = null, review = null, attempt = 1 } = params
  const config: Partial<QAVerifyConfig> = {
    ...params.config,
    ...(params.storyRepo && { storyRepo: params.storyRepo }),
    ...(params.workflowRepo && { workflowRepo: params.workflowRepo }),
  }

  const threadId = `${storyId}:qa-verify:${attempt}`
  const graph = createQAVerifyGraph(config)

  const initialState: Partial<QAVerifyState> = {
    storyId,
    evidence,
    review,
    threadId,
  }

  try {
    const result = await graph.invoke(initialState, {
      configurable: { thread_id: threadId },
    })

    const durationMs = Date.now() - startTime

    return QAVerifyResultSchema.parse({
      storyId: result.storyId,
      success: result.workflowSuccess ?? false,
      verdict: result.qaResult?.verdict ?? 'BLOCKED',
      qaArtifact: result.qaResult?.qaArtifact ?? null,
      preconditionsPassed: result.preconditionsPassed ?? false,
      durationMs,
      completedAt: new Date().toISOString(),
      errors: result.errors ?? [],
      warnings: result.warnings ?? [],
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const msg = error instanceof Error ? error.message : 'Unknown error during qa-verify'

    return {
      storyId,
      success: false,
      verdict: 'BLOCKED',
      qaArtifact: null,
      preconditionsPassed: false,
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

export function createQAVerifyNode(config: Partial<QAVerifyConfig> = {}) {
  return createToolNode(
    'qa_verify',
    async (state: GraphState): Promise<Partial<GraphStateWithQAVerify>> => {
      const stateWithQA = state as GraphStateWithQAVerify

      const result = await runQAVerify({
        storyId: state.storyId || 'unknown',
        config: stateWithQA.qaVerifyConfig || config,
      })

      return updateState({
        qaVerifyResult: result,
        qaVerifyComplete: result.success,
      } as Partial<GraphStateWithQAVerify>)
    },
  )
}
