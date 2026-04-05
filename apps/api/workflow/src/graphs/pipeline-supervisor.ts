/**
 * Pipeline Supervisor — Agent Loop Orchestrator
 *
 * Replaces the static DAG pipeline-orchestrator-v2 with a supervisor
 * agent loop that dynamically routes stories based on their KB state.
 *
 * The supervisor is a plain async function (not a LangGraph graph) that
 * calls subgraph wrapper functions directly. The subgraphs themselves
 * (dev-implement-v2, review-v2, qa-verify-v2, plan-refinement-v2,
 * story-generation-v2) remain static DAGs.
 *
 * Key improvements over the static DAG:
 * - Routes stories based on actual KB state (not hardcoded edges)
 * - Updates KB after every state change
 * - Emits events via the event emitter at every transition
 * - Handles post-completion (transition to completed, resolve deps)
 * - Handles blocking (update KB to blocked)
 *
 * All LangGraph-dependent modules are loaded lazily to keep this module
 * lightweight for testing and fast startup.
 *
 * ORCH-9020
 */

import { z } from 'zod'
import { logger } from '@repo/logger'

// Lightweight imports — pure logic modules with no LangGraph dependency
import type { StoryPickerResult } from '../nodes/pipeline-orchestrator/story-picker.js'
import { pickNextStory } from '../nodes/pipeline-orchestrator/story-picker.js'
import type { StoryListAdapterFn } from '../nodes/pipeline-orchestrator/story-picker.js'
import { determineResumePhase } from '../nodes/pipeline-orchestrator/phase-router.js'
import type { GetStoryStateFn } from '../nodes/pipeline-orchestrator/phase-router.js'
import {
  makeRetryDecision,
  updateRetryContext,
} from '../nodes/pipeline-orchestrator/retry-escalation.js'
import { createPreflightChecksNode } from '../nodes/pipeline-orchestrator/preflight-checks.js'
import type { PreflightAdapters } from '../nodes/pipeline-orchestrator/preflight-checks.js'
import {
  createWorktreeNode,
  createCleanupWorktreeNode,
} from '../nodes/pipeline-orchestrator/worktree-manager.js'
import type { ShellExecFn } from '../nodes/pipeline-orchestrator/worktree-manager.js'
import {
  createCommitPushNode,
  createCreatePrNode,
  createMergePrNode,
} from '../nodes/pipeline-orchestrator/git-operations.js'
import type { GitOpsConfig } from '../nodes/pipeline-orchestrator/git-operations.js'

// ============================================================================
// Zod Schemas & Types
// ============================================================================

export const SupervisorConfigSchema = z.object({
  inputMode: z.enum(['plan', 'story']),
  planSlug: z.string().nullable().default(null),
  storyIds: z.array(z.string()).default([]),
  monorepoRoot: z.string().default('/tmp/monorepo'),
  defaultBaseBranch: z.string().default('main'),
  ollamaBaseUrl: z.string().default('http://localhost:11434'),
  requiredModel: z.string().default('qwen2.5-coder:14b'),
  maxStories: z.number().int().min(0).default(0),
  dryRun: z.boolean().default(false),
  modelConfig: z
    .object({
      planRefinement: z.string().default('claude-code/opus'),
      storyGeneration: z.string().default('claude-code/sonnet'),
      devExecutor: z.string().default('ollama:minimax-m2.7:cloud'),
      devPlanner: z.string().default('ollama:minimax-m2.7:cloud'),
      reviewAgent: z.string().default('ollama:minimax-m2.7:cloud'),
      qaVerifier: z.string().default('ollama:minimax-m2.7:cloud'),
      primaryModel: z.string().default('sonnet'),
      escalationModel: z.string().default('opus'),
      ollamaModel: z.string().default('qwen2.5-coder:14b'),
    })
    .default({}),
})

export type SupervisorConfig = z.infer<typeof SupervisorConfigSchema>

export const SupervisorResultSchema = z.object({
  completed: z.array(z.string()),
  blocked: z.array(z.string()),
  errors: z.array(z.string()),
  storiesProcessed: z.number().int().min(0),
  durationMs: z.number().int().min(0),
  finalPhase: z.enum(['pipeline_complete', 'pipeline_stalled', 'error']),
})

export type SupervisorResult = z.infer<typeof SupervisorResultSchema>

export const StoryPhaseSchema = z.enum([
  'dev_implement',
  'review',
  'qa_verify',
  'complete',
  'blocked',
])

export type StoryPhase = z.infer<typeof StoryPhaseSchema>

// ============================================================================
// Injectable Adapter Types (defined inline — no LangGraph dependency)
// ============================================================================

export type KbAdapter = {
  updateStoryStatus: (storyId: string, status: string) => Promise<void>
  writeArtifact: (storyId: string, type: string, content: object) => Promise<void>
  listStories: (filter: { blockedBy?: string }) => Promise<
    {
      id: string
      blockedBy: string | null | undefined
      status?: string
    }[]
  >
}

export type SubgraphConfig = Record<string, unknown>

export type NotiAdapterLike = { emit: (event: unknown) => Promise<void> }

export type EventEmitterAdapters = {
  notiAdapter?: NotiAdapterLike
}

export type RetryContext = {
  reviewAttempts: number
  qaAttempts: number
  maxReviewRetries: number
  maxQaRetries: number
  lastFailureReason: string
}

/**
 * Emitter — a lightweight event emitter facade.
 * Created at runtime via lazy-loaded createEventEmitter.
 */
type Emitter = {
  pipelineStarted: (state: Record<string, unknown>) => Promise<void>
  storyStarted: (state: Record<string, unknown>) => Promise<void>
  storyPhaseComplete: (
    storyId: string,
    phase: string,
    verdict?: string,
    durationMs?: number,
  ) => Promise<void>
  storyCompleted: (storyId: string, totalPhases: number, totalDurationMs?: number) => Promise<void>
  storyBlocked: (storyId: string, phase: string, reason: string) => Promise<void>
  storyRetry: (
    storyId: string,
    phase: string,
    attempt: number,
    maxAttempts: number,
    reason: string,
  ) => Promise<void>
  pipelineComplete: (state: Record<string, unknown>) => Promise<void>
  pipelineStalled: (state: Record<string, unknown>, reason: string) => Promise<void>
}

export type SupervisorAdapters = {
  /** Fetch stories for a plan from KB */
  storyListAdapter: StoryListAdapterFn
  /** Get a story's current state from KB */
  getStoryState: GetStoryStateFn
  /** KB adapter for status updates, artifacts, and dependency queries */
  kbAdapter: KbAdapter
  /** Shell executor for git/worktree operations */
  shellExec?: ShellExecFn
  /** Preflight adapters (Ollama health check) */
  preflightAdapters?: PreflightAdapters
  /** Event emitter adapters (NOTI) */
  eventEmitterAdapters?: EventEmitterAdapters
  /** Subgraph invoker config (LLM adapters, graph overrides for testing) */
  subgraphConfig?: SubgraphConfig
}

// ============================================================================
// Lazy Loaders — prevent LangGraph from loading at import time
// ============================================================================

async function loadSubgraphInvokers() {
  const mod = await import('../nodes/pipeline-orchestrator/subgraph-invokers.js')
  return {
    createPlanRefinementWrapper: mod.createPlanRefinementWrapper,
    createStoryGenerationWrapper: mod.createStoryGenerationWrapper,
    createDevImplementWrapper: mod.createDevImplementWrapper,
    createReviewWrapper: mod.createReviewWrapper,
    createQAVerifyWrapper: mod.createQAVerifyWrapper,
    transitionToCompleted: mod.transitionToCompleted,
    resolveDownstreamDependencies: mod.resolveDownstreamDependencies,
  }
}

async function loadEventEmitter(adapters?: EventEmitterAdapters): Promise<Emitter> {
  const mod = await import('../nodes/pipeline-orchestrator/event-emitter.js')
  return mod.createEventEmitter(adapters) as unknown as Emitter
}

// ============================================================================
// Orchestrator State Builder
// ============================================================================

/**
 * Builds a state object compatible with PipelineOrchestratorV2State
 * for passing to subgraph wrappers and the event emitter.
 * Uses Record<string, unknown> to avoid importing the LangGraph state type.
 */
function buildOrchestratorState(
  config: SupervisorConfig,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    inputMode: config.inputMode,
    planSlug: config.planSlug,
    refinedPlan: null,
    planFlows: [],
    planPostconditionResult: null,
    currentStoryId: null,
    worktreePath: null,
    branch: null,
    pipelinePhase: 'preflight',
    storyPickerResult: null,
    devResult: null,
    reviewResult: null,
    qaResult: null,
    retryContext: null,
    modelConfig: config.modelConfig,
    completedStories: [],
    blockedStories: [],
    errors: [],
    ollamaAvailable: false,
    storyIds: config.storyIds,
    resumePhase: null,
    ...overrides,
  }
}

// ============================================================================
// Supervisor Implementation
// ============================================================================

/**
 * Runs the pipeline supervisor loop.
 *
 * This is the main entry point that replaces the static DAG orchestrator.
 * It handles plan processing, story picking, and the dev/review/QA loop
 * with dynamic routing based on KB state.
 */
export async function runPipelineSupervisor(
  config: SupervisorConfig,
  adapters: SupervisorAdapters,
): Promise<SupervisorResult> {
  const startTime = Date.now()
  const completed: string[] = []
  const blocked: string[] = []
  const errors: string[] = []
  let storiesProcessed = 0

  // Lazy-load heavy modules
  const subgraphs = await loadSubgraphInvokers()
  const emitter = await loadEventEmitter(adapters.eventEmitterAdapters)

  // ---- Step 0: Self-check — verify all adapters and imports resolve ----
  const selfCheckErrors: string[] = []

  if (!adapters.storyListAdapter) selfCheckErrors.push('storyListAdapter is not configured')
  if (!adapters.getStoryState) selfCheckErrors.push('getStoryState is not configured')
  if (!adapters.kbAdapter) selfCheckErrors.push('kbAdapter is not configured')
  if (!adapters.kbAdapter?.updateStoryStatus)
    selfCheckErrors.push('kbAdapter.updateStoryStatus is not configured')
  if (!adapters.kbAdapter?.writeArtifact)
    selfCheckErrors.push('kbAdapter.writeArtifact is not configured')
  if (!adapters.kbAdapter?.listStories)
    selfCheckErrors.push('kbAdapter.listStories is not configured')
  if (!subgraphs.createDevImplementWrapper)
    selfCheckErrors.push('subgraph invoker: createDevImplementWrapper failed to load')
  if (!subgraphs.createReviewWrapper)
    selfCheckErrors.push('subgraph invoker: createReviewWrapper failed to load')
  if (!subgraphs.createQAVerifyWrapper)
    selfCheckErrors.push('subgraph invoker: createQAVerifyWrapper failed to load')
  if (!subgraphs.transitionToCompleted)
    selfCheckErrors.push('subgraph invoker: transitionToCompleted failed to load')

  if (selfCheckErrors.length > 0) {
    logger.error('supervisor: self-check failed — adapters or modules missing', {
      errors: selfCheckErrors,
    })
    return {
      finalPhase: 'error',
      completed: [],
      blocked: [],
      errors: selfCheckErrors,
      storiesProcessed: 0,
      durationMs: Date.now() - startTime,
    }
  }

  logger.info('supervisor: self-check passed — all adapters and modules loaded')
  logger.info('supervisor: modelConfig', { modelConfig: config.modelConfig })

  // ---- Dry-run mode: exit after self-check ----
  if (config.dryRun) {
    logger.info('supervisor: dry-run mode — self-check passed, exiting')
    return {
      finalPhase: 'pipeline_complete',
      completed: [],
      blocked: [],
      errors: [],
      storiesProcessed: 0,
      durationMs: Date.now() - startTime,
    }
  }

  try {
    // ---- Step 1: Preflight ----
    logger.info('supervisor: running preflight checks')
    const preflightNode = createPreflightChecksNode(
      { ollamaBaseUrl: config.ollamaBaseUrl, requiredModel: config.requiredModel },
      adapters.preflightAdapters,
    )
    const preflightResult = await preflightNode()
    const ollamaAvailable = preflightResult.ollamaAvailable
    logger.info('supervisor: preflight complete', { ollamaAvailable })

    // ---- Step 2: Plan handling (if plan mode) ----
    if (config.inputMode === 'plan' && config.planSlug) {
      const planStories = await adapters.storyListAdapter(config.planSlug)

      if (planStories.length === 0) {
        logger.info('supervisor: plan has no stories, running refinement + generation', {
          planSlug: config.planSlug,
        })

        const orchState = buildOrchestratorState(config, {
          ollamaAvailable,
          planSlug: config.planSlug,
        })

        // Run plan refinement
        const refinementWrapper = subgraphs.createPlanRefinementWrapper(adapters.subgraphConfig)
        const refinementResult = await refinementWrapper(orchState)

        if (refinementResult.errors && refinementResult.errors.length > 0) {
          errors.push(...refinementResult.errors)
        }

        // Run story generation
        const generationWrapper = subgraphs.createStoryGenerationWrapper(adapters.subgraphConfig)
        Object.assign(orchState, {
          refinedPlan: refinementResult.refinedPlan ?? null,
          planFlows: refinementResult.planFlows ?? [],
        })
        const generationResult = await generationWrapper(orchState)

        if (generationResult.errors && generationResult.errors.length > 0) {
          errors.push(...generationResult.errors)
        }
      }
    }

    // ---- Step 3: Emit pipeline started ----
    await emitter.pipelineStarted(
      buildOrchestratorState(config, {
        ollamaAvailable,
        completedStories: completed,
        blockedStories: blocked,
      }),
    )

    // ---- Step 4: Story processing loop ----
    let storiesPicked = 0
    let pipelineStalled = false
    const maxStories = config.maxStories > 0 ? config.maxStories : Infinity

    while (storiesPicked < maxStories) {
      const pickerResult = await pickNextEligibleStory(config, adapters)

      if (pickerResult.signal === 'pipeline_complete') {
        logger.info('supervisor: pipeline complete', { reason: pickerResult.reason })
        break
      }

      if (pickerResult.signal === 'pipeline_stalled') {
        pipelineStalled = true
        logger.warn('supervisor: pipeline stalled', { reason: pickerResult.reason })
        await emitter.pipelineStalled(
          buildOrchestratorState(config, {
            completedStories: completed,
            blockedStories: blocked,
          }),
          pickerResult.reason,
        )
        break
      }

      const storyId = pickerResult.storyId!
      storiesPicked++
      storiesProcessed++

      logger.info('supervisor: processing story', {
        storyId,
        storiesPicked,
        completed: completed.length,
        blocked: blocked.length,
      })

      await emitter.storyStarted(
        buildOrchestratorState(config, {
          currentStoryId: storyId,
          storyIds: [storyId],
        }),
      )

      const result = await processStory(
        storyId,
        config,
        adapters,
        subgraphs,
        emitter,
        ollamaAvailable,
        completed,
      )

      if (result.outcome === 'completed') {
        completed.push(storyId)
        logger.info('supervisor: story completed', { storyId })
      } else if (result.outcome === 'blocked') {
        blocked.push(storyId)
        logger.warn('supervisor: story blocked', { storyId, reason: result.reason })
      }

      if (result.errors.length > 0) {
        errors.push(...result.errors)
      }
    }

    // ---- Step 5: Emit pipeline complete ----
    await emitter.pipelineComplete(
      buildOrchestratorState(config, {
        completedStories: completed,
        blockedStories: blocked,
      }),
    )

    const finalPhase = pipelineStalled
      ? 'pipeline_stalled'
      : blocked.length > 0 && completed.length === 0
        ? 'pipeline_stalled'
        : 'pipeline_complete'

    return {
      completed,
      blocked,
      errors,
      storiesProcessed,
      durationMs: Date.now() - startTime,
      finalPhase,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('supervisor: fatal error', { error: msg })
    errors.push(`supervisor: ${msg}`)

    return {
      completed,
      blocked,
      errors,
      storiesProcessed,
      durationMs: Date.now() - startTime,
      finalPhase: 'error',
    }
  }
}

// ============================================================================
// Story Picker
// ============================================================================

async function pickNextEligibleStory(
  config: SupervisorConfig,
  adapters: SupervisorAdapters,
): Promise<StoryPickerResult> {
  if (!config.planSlug) {
    return {
      signal: 'pipeline_complete',
      storyId: null,
      reason: 'No planSlug provided',
      eligibleCount: 0,
      completedCount: 0,
      blockedCount: 0,
    }
  }

  const stories = await adapters.storyListAdapter(config.planSlug)
  return pickNextStory(stories)
}

// ============================================================================
// Story Processor
// ============================================================================

type StoryProcessResult = {
  outcome: 'completed' | 'blocked' | 'skipped'
  reason: string
  errors: string[]
}

type SubgraphFns = Awaited<ReturnType<typeof loadSubgraphInvokers>>

async function processStory(
  storyId: string,
  config: SupervisorConfig,
  adapters: SupervisorAdapters,
  subgraphs: SubgraphFns,
  emitter: Emitter,
  ollamaAvailable: boolean,
  completedStories: string[],
): Promise<StoryProcessResult> {
  const storyErrors: string[] = []
  const storyStartTime = Date.now()

  // Determine starting phase from KB state
  const kbState = await adapters.getStoryState(storyId)
  const routing = determineResumePhase(storyId, kbState)

  if (routing.resumePhase === null) {
    if (routing.completedStories.length > 0) {
      return { outcome: 'completed', reason: 'Already completed', errors: [] }
    }
    return { outcome: 'blocked', reason: 'Already blocked', errors: [] }
  }

  let phase: StoryPhase = routing.resumePhase
  let worktreePath: string | null = null
  let branch: string | null = null
  let retryContext: RetryContext = {
    reviewAttempts: 0,
    qaAttempts: 0,
    maxReviewRetries: 2,
    maxQaRetries: 2,
    lastFailureReason: '',
  }
  let phaseCount = 0

  const makeState = () =>
    buildOrchestratorState(config, {
      currentStoryId: storyId,
      worktreePath,
      branch,
      pipelinePhase: 'dev_implement',
      retryContext,
      completedStories,
      ollamaAvailable,
      storyIds: [storyId],
      resumePhase: phase === 'complete' || phase === 'blocked' ? null : phase,
    })

  // Create worktree
  try {
    const worktreeNode = createWorktreeNode({
      monorepoRoot: config.monorepoRoot,
      shellExec: adapters.shellExec,
    })
    const wtResult = await worktreeNode({ storyId })
    worktreePath = wtResult.worktreePath
    branch = wtResult.worktreeResult.branch
    logger.info('supervisor: worktree ready', { storyId, worktreePath, branch })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('supervisor: worktree creation failed', { storyId, error: msg })
    storyErrors.push(`worktree: ${msg}`)
    return { outcome: 'blocked', reason: `Worktree creation failed: ${msg}`, errors: storyErrors }
  }

  const gitOpsConfig: GitOpsConfig = {
    monorepoRoot: config.monorepoRoot,
    defaultBaseBranch: config.defaultBaseBranch,
    shellExec: adapters.shellExec,
  }

  // ---- Phase loop ----
  while (phase !== 'complete' && phase !== 'blocked') {
    phaseCount++

    switch (phase) {
      case 'dev_implement': {
        try {
          await adapters.kbAdapter.updateStoryStatus(storyId, 'in_progress')
        } catch (_err) {
          // Non-fatal — log only
        }

        const devWrapper = subgraphs.createDevImplementWrapper(adapters.subgraphConfig)
        const devStateUpdate = await devWrapper(makeState())
        const devVerdict = devStateUpdate.devResult?.verdict ?? 'stuck'
        await emitter.storyPhaseComplete(storyId, 'dev_implement', devVerdict)

        if (devStateUpdate.errors?.length) storyErrors.push(...devStateUpdate.errors)

        if (devVerdict === 'complete') {
          const commitPushNode = createCommitPushNode(gitOpsConfig)
          const commitResult = await commitPushNode(makeState())
          if (commitResult.errors?.length) storyErrors.push(...commitResult.errors)
          await emitter.storyPhaseComplete(storyId, 'commit_push', 'complete')
          phase = 'review'
        } else {
          retryContext = updateRetryContext(retryContext, 'review', 'Dev implementation stuck')
          phase = 'blocked'
        }
        break
      }

      case 'review': {
        try {
          await adapters.kbAdapter.updateStoryStatus(storyId, 'needs_code_review')
        } catch (_err) {
          // Non-fatal
        }

        const reviewWrapper = subgraphs.createReviewWrapper(adapters.subgraphConfig)
        const reviewStateUpdate = await reviewWrapper(makeState())
        const reviewVerdict = reviewStateUpdate.reviewResult?.verdict ?? 'block'
        await emitter.storyPhaseComplete(storyId, 'review', reviewVerdict)

        if (reviewStateUpdate.errors?.length) storyErrors.push(...reviewStateUpdate.errors)

        const reviewDecision = makeRetryDecision(
          reviewVerdict as 'pass' | 'fail' | 'block',
          'review',
          retryContext,
        )

        if (reviewDecision === 'pass') {
          const createPrNode = createCreatePrNode(gitOpsConfig)
          const prResult = await createPrNode(makeState())
          if (prResult.errors?.length) storyErrors.push(...prResult.errors)
          await emitter.storyPhaseComplete(storyId, 'create_pr', 'complete')
          phase = 'qa_verify'
        } else if (reviewDecision === 'retry') {
          retryContext = updateRetryContext(
            retryContext,
            'review',
            reviewStateUpdate.reviewResult?.findings?.[0]?.toString() ?? 'Review failed',
          )
          await emitter.storyRetry(
            storyId,
            'review',
            retryContext.reviewAttempts,
            retryContext.maxReviewRetries,
            retryContext.lastFailureReason,
          )
          phase = 'dev_implement'
        } else {
          retryContext = updateRetryContext(
            retryContext,
            'review',
            reviewStateUpdate.reviewResult?.findings?.[0]?.toString() ?? 'Review blocked',
          )
          phase = 'blocked'
        }
        break
      }

      case 'qa_verify': {
        try {
          await adapters.kbAdapter.updateStoryStatus(storyId, 'ready_for_qa')
        } catch (_err) {
          // Non-fatal
        }

        const qaWrapper = subgraphs.createQAVerifyWrapper(adapters.subgraphConfig)
        const qaStateUpdate = await qaWrapper(makeState())
        const qaVerdict = qaStateUpdate.qaResult?.verdict ?? 'block'
        await emitter.storyPhaseComplete(storyId, 'qa_verify', qaVerdict)

        if (qaStateUpdate.errors?.length) storyErrors.push(...qaStateUpdate.errors)

        const qaDecision = makeRetryDecision(
          qaVerdict as 'pass' | 'fail' | 'block',
          'qa',
          retryContext,
        )

        if (qaDecision === 'pass') {
          // Merge PR
          const mergePrNode = createMergePrNode(gitOpsConfig)
          const mergeResult = await mergePrNode(makeState())
          if (mergeResult.errors?.length) storyErrors.push(...mergeResult.errors)

          // Cleanup worktree
          const cleanupNode = createCleanupWorktreeNode({
            monorepoRoot: config.monorepoRoot,
            shellExec: adapters.shellExec,
          })
          await cleanupNode({ storyId })
          await emitter.storyPhaseComplete(storyId, 'merge_cleanup', 'complete')

          // Post-completion: transition to completed in KB
          try {
            await subgraphs.transitionToCompleted(storyId, adapters.kbAdapter)
            logger.info('supervisor: story transitioned to completed in KB', { storyId })
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err)
            logger.error('supervisor: failed to transition story to completed', {
              storyId,
              error: msg,
            })
            storyErrors.push(`post_completion: ${msg}`)
          }

          // Resolve downstream dependencies
          try {
            const unblockedIds = await subgraphs.resolveDownstreamDependencies(
              storyId,
              completedStories,
              adapters.kbAdapter,
            )
            if (unblockedIds.length > 0) {
              logger.info('supervisor: unblocked downstream stories', { storyId, unblockedIds })
            }
          } catch (_err) {
            // Non-fatal
          }

          const storyDurationMs = Date.now() - storyStartTime
          await emitter.storyCompleted(storyId, phaseCount, storyDurationMs)
          phase = 'complete'
        } else if (qaDecision === 'retry') {
          retryContext = updateRetryContext(
            retryContext,
            'qa',
            qaStateUpdate.qaResult?.failures?.[0]?.toString() ?? 'QA failed',
          )
          await emitter.storyRetry(
            storyId,
            'qa_verify',
            retryContext.qaAttempts,
            retryContext.maxQaRetries,
            retryContext.lastFailureReason,
          )
          phase = 'dev_implement'
        } else {
          retryContext = updateRetryContext(
            retryContext,
            'qa',
            qaStateUpdate.qaResult?.failures?.[0]?.toString() ?? 'QA blocked',
          )
          phase = 'blocked'
        }
        break
      }
    }
  }

  // Handle blocked outcome
  if (phase === 'blocked') {
    try {
      await adapters.kbAdapter.updateStoryStatus(storyId, 'blocked')
    } catch (_err) {
      // Non-fatal
    }

    await emitter.storyBlocked(storyId, 'block_story', retryContext.lastFailureReason)

    return {
      outcome: 'blocked',
      reason: retryContext.lastFailureReason,
      errors: storyErrors,
    }
  }

  return {
    outcome: 'completed',
    reason: 'Story completed successfully',
    errors: storyErrors,
  }
}
