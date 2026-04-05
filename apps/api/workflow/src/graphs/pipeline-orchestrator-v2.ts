/**
 * Pipeline Orchestrator V2 Graph
 *
 * Top-level LangGraph that wires all pipeline nodes into a single
 * story-processing loop:
 *
 * Graph structure:
 *   START → preflight_checks → route_input
 *     → [plan path: story_picker] or [story path: story_picker]
 *   story_picker → [story_ready: create_worktree] | [complete: END] | [stalled: END]
 *   create_worktree → dev_implement → commit_push → review → review_decision
 *     → [pass: create_pr] | [retry: dev_implement] | [block: block_story]
 *   create_pr → qa_verify → qa_decision
 *     → [pass: merge_cleanup] | [retry: dev_implement] | [block: block_story]
 *   merge_cleanup → post_completion → story_picker (loop)
 *   block_story → story_picker (loop)
 *
 * For MVP, subgraph invocations (dev, review, QA) are stubs.
 * The graph structure and routing logic is fully wired.
 */

import { z } from 'zod'
import { StateGraph, START, END } from '@langchain/langgraph'
import { logger } from '@repo/logger'
import {
  PipelineOrchestratorV2StateAnnotation,
  type PipelineOrchestratorV2State,
  type InputMode,
} from '../state/pipeline-orchestrator-v2-state.js'
import { createPreflightChecksNode } from '../nodes/pipeline-orchestrator/preflight-checks.js'
import type { PreflightAdapters } from '../nodes/pipeline-orchestrator/preflight-checks.js'
import { createStoryPickerNode } from '../nodes/pipeline-orchestrator/story-picker.js'
import { createWorktreeNode } from '../nodes/pipeline-orchestrator/worktree-manager.js'
import type { ShellExecFn } from '../nodes/pipeline-orchestrator/worktree-manager.js'
import {
  createDevImplementWrapper,
  createReviewWrapper,
  createReviewDecisionNode,
  createQAVerifyWrapper,
  createQADecisionNode,
  createMergeCleanupNode,
  createPostCompletionNode,
  createBlockStoryNode,
} from '../nodes/pipeline-orchestrator/subgraph-invokers.js'
import {
  createCommitPushNode,
  createCreatePrNode,
} from '../nodes/pipeline-orchestrator/git-operations.js'
import { makeRetryDecision } from '../nodes/pipeline-orchestrator/retry-escalation.js'

// ============================================================================
// Config Schema
// ============================================================================

export const PipelineOrchestratorV2GraphConfigSchema = z.object({
  /** Root path of the monorepo for git/worktree operations */
  monorepoRoot: z.string().default('/tmp/monorepo'),
  /** Ollama config for preflight */
  ollamaBaseUrl: z.string().default('http://localhost:11434'),
  requiredModel: z.string().default('qwen2.5-coder:14b'),
  /** Max stories to process (0 = unlimited) */
  maxStories: z.number().int().min(0).default(0),
  /** Git base branch for PRs */
  defaultBaseBranch: z.string().default('main'),
  /** Injectable shell executor for testing */
  shellExec: z.function().optional(),
  /** Injectable preflight adapters */
  preflightAdapters: z.any().optional(),
})

export type PipelineOrchestratorV2GraphConfig = {
  monorepoRoot?: string
  ollamaBaseUrl?: string
  requiredModel?: string
  maxStories?: number
  defaultBaseBranch?: string
  shellExec?: ShellExecFn
  preflightAdapters?: PreflightAdapters
}

// ============================================================================
// Preflight Wrapper Node
// ============================================================================

/**
 * Wraps the preflight checks node to map its output into
 * the orchestrator state shape.
 */
function createPreflightWrapper(config: PipelineOrchestratorV2GraphConfig) {
  const preflightNode = createPreflightChecksNode(
    {
      ollamaBaseUrl: config.ollamaBaseUrl,
      requiredModel: config.requiredModel,
    },
    config.preflightAdapters,
  )

  return async (
    _state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const result = await preflightNode()
    return {
      ollamaAvailable: result.ollamaAvailable,
      pipelinePhase: 'preflight',
    }
  }
}

// ============================================================================
// Route Input Node
// ============================================================================

/**
 * Routing node that determines the path based on inputMode.
 * For plan mode: would invoke plan refinement + story generation first.
 * For MVP: both modes proceed directly to story_picker.
 */
function createRouteInputNode() {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    logger.info('route_input: determining path', {
      inputMode: state.inputMode,
      planSlug: state.planSlug,
      storyCount: state.storyIds.length,
    })

    return {
      pipelinePhase: 'routing',
    }
  }
}

// ============================================================================
// Worktree Wrapper Node
// ============================================================================

/**
 * Wraps the worktree-manager createWorktreeNode to map state properly.
 */
function createWorktreeWrapper(config: PipelineOrchestratorV2GraphConfig) {
  const monorepoRoot = config.monorepoRoot ?? '/tmp/monorepo'
  const worktreeNode = createWorktreeNode({
    monorepoRoot,
    shellExec: config.shellExec,
  })

  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    if (!state.currentStoryId) {
      return {
        pipelinePhase: 'worktree_setup',
        errors: ['create_worktree: no currentStoryId set'],
      }
    }

    try {
      const result = await worktreeNode({ storyId: state.currentStoryId })
      return {
        worktreePath: result.worktreePath,
        branch: result.worktreeResult.branch,
        pipelinePhase: 'worktree_setup',
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('create_worktree: failed', { error: msg })
      return {
        pipelinePhase: 'worktree_setup',
        errors: [`create_worktree: ${msg}`],
      }
    }
  }
}

// ============================================================================
// Conditional Edge Functions
// ============================================================================

/**
 * Routes after route_input based on inputMode.
 * For MVP: both plan and story modes go to story_picker.
 */
export function routeByInputMode(
  state: PipelineOrchestratorV2State,
): 'plan_refinement' | 'story_picker' {
  if (state.inputMode === 'plan') {
    // MVP: skip plan refinement/generation, go straight to picker
    return 'plan_refinement'
  }
  return 'story_picker'
}

/**
 * Routes after story_picker based on the picker signal.
 */
export function routeByPickerSignal(
  state: PipelineOrchestratorV2State,
): 'story_ready' | 'pipeline_complete' | 'pipeline_stalled' {
  const signal = state.storyPickerResult?.signal ?? 'pipeline_stalled'
  return signal
}

/**
 * Routes after review_decision based on review verdict + retry budget.
 */
export function routeByReviewVerdict(
  state: PipelineOrchestratorV2State,
): 'pass' | 'retry' | 'block' {
  const verdict = (state.reviewResult?.verdict ?? 'block') as 'pass' | 'fail' | 'block'
  return makeRetryDecision(verdict, 'review', state.retryContext)
}

/**
 * Routes after qa_decision based on QA verdict + retry budget.
 */
export function routeByQAVerdict(state: PipelineOrchestratorV2State): 'pass' | 'retry' | 'block' {
  const verdict = (state.qaResult?.verdict ?? 'block') as 'pass' | 'fail' | 'block'
  return makeRetryDecision(verdict, 'qa', state.retryContext)
}

// ============================================================================
// Graph Factory
// ============================================================================

/**
 * Creates and compiles the pipeline-orchestrator-v2 top-level graph.
 *
 * Wires all pipeline nodes into a story-processing loop with
 * conditional routing for review/QA pass/retry/block decisions.
 *
 * @param config - Injectable adapters and configuration
 * @returns Compiled StateGraph
 */
export function createPipelineOrchestratorV2Graph(config: PipelineOrchestratorV2GraphConfig = {}) {
  const monorepoRoot = config.monorepoRoot ?? '/tmp/monorepo'
  const gitOpsConfig = {
    monorepoRoot,
    defaultBaseBranch: config.defaultBaseBranch ?? 'main',
    shellExec: config.shellExec,
  }

  const graph = new StateGraph(PipelineOrchestratorV2StateAnnotation)
    // ---- Nodes ----
    .addNode('preflight_checks', createPreflightWrapper(config))
    .addNode('route_input', createRouteInputNode())
    .addNode('story_picker', createStoryPickerNode())
    .addNode('create_worktree', createWorktreeWrapper(config))
    .addNode('dev_implement', createDevImplementWrapper())
    .addNode('commit_push', createCommitPushNode(gitOpsConfig))
    .addNode('review', createReviewWrapper())
    .addNode('review_decision', createReviewDecisionNode())
    .addNode('create_pr', createCreatePrNode(gitOpsConfig))
    .addNode('qa_verify', createQAVerifyWrapper())
    .addNode('qa_decision', createQADecisionNode())
    .addNode('merge_cleanup', createMergeCleanupNode(gitOpsConfig))
    .addNode('post_completion', createPostCompletionNode())
    .addNode('block_story', createBlockStoryNode())

    // ---- Edges ----

    // Entry: START → preflight_checks → route_input
    .addEdge(START, 'preflight_checks')
    .addEdge('preflight_checks', 'route_input')

    // Route by input mode (plan vs story)
    // MVP: both paths go to story_picker
    .addConditionalEdges('route_input', routeByInputMode, {
      plan_refinement: 'story_picker',
      story_picker: 'story_picker',
    })

    // Story picker → create_worktree | END
    .addConditionalEdges('story_picker', routeByPickerSignal, {
      story_ready: 'create_worktree',
      pipeline_complete: END,
      pipeline_stalled: END,
    })

    // Linear path: create_worktree → dev → commit → review → review_decision
    .addEdge('create_worktree', 'dev_implement')
    .addEdge('dev_implement', 'commit_push')
    .addEdge('commit_push', 'review')
    .addEdge('review', 'review_decision')

    // Review decision → create_pr (pass) | dev_implement (retry) | block_story
    .addConditionalEdges('review_decision', routeByReviewVerdict, {
      pass: 'create_pr',
      retry: 'dev_implement',
      block: 'block_story',
    })

    // create_pr → qa_verify → qa_decision
    .addEdge('create_pr', 'qa_verify')
    .addEdge('qa_verify', 'qa_decision')

    // QA decision → merge_cleanup (pass) | dev_implement (retry) | block_story
    .addConditionalEdges('qa_decision', routeByQAVerdict, {
      pass: 'merge_cleanup',
      retry: 'dev_implement',
      block: 'block_story',
    })

    // Post-merge loop back to story_picker
    .addEdge('merge_cleanup', 'post_completion')
    .addEdge('post_completion', 'story_picker')

    // Blocked stories loop back to story_picker
    .addEdge('block_story', 'story_picker')

  return graph.compile()
}

// Re-export edge functions for testing
export {
  routeByInputMode as _routeByInputMode,
  routeByPickerSignal as _routeByPickerSignal,
  routeByReviewVerdict as _routeByReviewVerdict,
  routeByQAVerdict as _routeByQAVerdict,
}

// Re-export state type for consumers
export type { PipelineOrchestratorV2State }
