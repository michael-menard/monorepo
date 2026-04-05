/**
 * Subgraph Invoker Nodes (pipeline-orchestrator)
 *
 * Wrapper functions that map pipeline orchestrator state to/from
 * individual subgraph inputs/outputs. Each invoker:
 *
 * 1. Extracts relevant fields from the orchestrator state
 * 2. Builds LLM adapters from the factory using current modelConfig
 * 3. Creates and invokes the real subgraph
 * 4. Maps the subgraph result back to orchestrator state fields
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { PipelineOrchestratorV2State } from '../../state/pipeline-orchestrator-v2-state.js'
import type { DevImplementV2State } from '../../state/dev-implement-v2-state.js'
import type { ReviewV2State } from '../../state/review-v2-state.js'
import type { QAVerifyV2State } from '../../state/qa-verify-v2-state.js'
import type { DevImplementV2GraphConfig } from '../../graphs/dev-implement-v2.js'
import type { ReviewV2GraphConfig } from '../../graphs/review-v2.js'
import type { QAVerifyV2GraphConfig } from '../../graphs/qa-verify-v2.js'
import { createLlmAdapterFactory } from '../../services/llm-adapter-factory.js'
import type { LlmAdapterFactory } from '../../services/llm-adapter-factory.js'
import { updateRetryContext } from './retry-escalation.js'

// ============================================================================
// Wrapper Config Schema
// ============================================================================

export const SubgraphInvokerConfigSchema = z.object({
  /** LLM adapter factory — injectable for testing */
  adapterFactory: z.any().optional(),
  /** Override dev-implement graph factory — injectable for testing */
  createDevGraph: z.function().optional(),
  /** Override review graph factory — injectable for testing */
  createReviewGraph: z.function().optional(),
  /** Override qa-verify graph factory — injectable for testing */
  createQAGraph: z.function().optional(),
})

export type SubgraphInvokerConfig = {
  adapterFactory?: LlmAdapterFactory
  createDevGraph?: (config: DevImplementV2GraphConfig) => {
    invoke: (input: Partial<DevImplementV2State>) => Promise<DevImplementV2State>
  }
  createReviewGraph?: (config: ReviewV2GraphConfig) => {
    invoke: (input: Partial<ReviewV2State>) => Promise<ReviewV2State>
  }
  createQAGraph?: (config: QAVerifyV2GraphConfig) => {
    invoke: (input: Partial<QAVerifyV2State>) => Promise<QAVerifyV2State>
  }
}

// ============================================================================
// State Mapping Helpers
// ============================================================================

/**
 * Maps dev-implement-v2 subgraph output to orchestrator state.
 */
export function mapDevResultToOrchestratorState(
  subgraphResult: DevImplementV2State,
): Partial<PipelineOrchestratorV2State> {
  const verdict = subgraphResult.executorOutcome?.verdict ?? 'stuck'
  const errors = subgraphResult.errors ?? []

  return {
    devResult: {
      verdict,
      errors,
    },
    pipelinePhase: 'dev_implement',
    errors: errors.length > 0 ? errors : [],
  }
}

/**
 * Maps review-v2 subgraph output to orchestrator state.
 */
export function mapReviewResultToOrchestratorState(
  subgraphResult: ReviewV2State,
): Partial<PipelineOrchestratorV2State> {
  const reviewVerdict = subgraphResult.reviewVerdict
  // Map review verdict to orchestrator verdict (pass/fail/block)
  const verdict: 'pass' | 'fail' | 'block' =
    reviewVerdict === 'pass' ? 'pass' : reviewVerdict === 'fail' ? 'fail' : 'block'

  return {
    reviewResult: {
      verdict,
      findings: subgraphResult.reviewFindings ?? [],
    },
    pipelinePhase: 'review',
    errors: subgraphResult.errors?.length ? subgraphResult.errors : [],
  }
}

/**
 * Maps qa-verify-v2 subgraph output to orchestrator state.
 */
export function mapQAResultToOrchestratorState(
  subgraphResult: QAVerifyV2State,
): Partial<PipelineOrchestratorV2State> {
  const qaVerdict = subgraphResult.qaVerdict
  // Map qa verdict to orchestrator verdict (pass/fail/block)
  // 'conditional_pass' is treated as 'pass' at the orchestrator level
  const verdict: 'pass' | 'fail' | 'block' =
    qaVerdict === 'pass' || qaVerdict === 'conditional_pass'
      ? 'pass'
      : qaVerdict === 'fail'
        ? 'fail'
        : 'block'

  return {
    qaResult: {
      verdict,
      failures: subgraphResult.acVerificationResults?.filter(r => r.verdict === 'fail') ?? [],
    },
    pipelinePhase: 'qa_verify',
    errors: subgraphResult.errors?.length ? subgraphResult.errors : [],
  }
}

// ============================================================================
// Dev Implement Wrapper
// ============================================================================

/**
 * Wraps the dev-implement-v2 subgraph invocation.
 *
 * Builds LLM adapters from the factory, creates the subgraph,
 * invokes it with mapped orchestrator state, and maps the result back.
 */
export function createDevImplementWrapper(config: SubgraphInvokerConfig = {}) {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId, modelConfig, ollamaAvailable } = state

    logger.info('dev_implement_wrapper: invoking dev-implement-v2', {
      storyId: currentStoryId,
    })

    if (!currentStoryId) {
      return {
        devResult: { verdict: 'stuck', errors: ['No currentStoryId set'] },
        pipelinePhase: 'dev_implement',
        errors: ['dev_implement_wrapper: no currentStoryId'],
      }
    }

    try {
      // Build adapters
      const factory = config.adapterFactory ?? createLlmAdapterFactory()
      const adapters = factory.buildDevImplementAdapters(modelConfig, ollamaAvailable)

      // Create and invoke subgraph
      const graphConfig: DevImplementV2GraphConfig = {
        ...adapters,
      }

      let result: DevImplementV2State
      if (config.createDevGraph) {
        const graph = config.createDevGraph(graphConfig)
        result = await graph.invoke({ storyId: currentStoryId })
      } else {
        // Dynamic import to avoid circular dependencies at module load time
        const { createDevImplementV2Graph } = await import('../../graphs/dev-implement-v2.js')
        const graph = createDevImplementV2Graph(graphConfig)
        result = await graph.invoke({ storyId: currentStoryId })
      }

      return mapDevResultToOrchestratorState(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('dev_implement_wrapper: subgraph invocation failed', {
        storyId: currentStoryId,
        error: msg,
      })
      return {
        devResult: { verdict: 'stuck', errors: [msg] },
        pipelinePhase: 'dev_implement',
        errors: [`dev_implement_wrapper: ${msg}`],
      }
    }
  }
}

// ============================================================================
// Review Wrapper
// ============================================================================

/**
 * Wraps the review-v2 subgraph invocation.
 *
 * Builds LLM adapters from the factory, creates the subgraph,
 * invokes it with mapped orchestrator state, and maps the result back.
 */
export function createReviewWrapper(config: SubgraphInvokerConfig = {}) {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId, worktreePath, modelConfig, ollamaAvailable } = state

    logger.info('review_wrapper: invoking review-v2', {
      storyId: currentStoryId,
      worktreePath,
    })

    if (!currentStoryId) {
      return {
        reviewResult: { verdict: 'block', findings: [] },
        pipelinePhase: 'review',
        errors: ['review_wrapper: no currentStoryId'],
      }
    }

    try {
      // Build adapters
      const factory = config.adapterFactory ?? createLlmAdapterFactory()
      const adapters = factory.buildReviewAdapters(modelConfig, ollamaAvailable)

      // Create and invoke subgraph
      const graphConfig: ReviewV2GraphConfig = {
        ...adapters,
      }

      let result: ReviewV2State
      if (config.createReviewGraph) {
        const graph = config.createReviewGraph(graphConfig)
        result = await graph.invoke({
          storyId: currentStoryId,
          worktreePath: worktreePath ?? '',
        })
      } else {
        const { createReviewV2Graph } = await import('../../graphs/review-v2.js')
        const graph = createReviewV2Graph(graphConfig)
        result = await graph.invoke({
          storyId: currentStoryId,
          worktreePath: worktreePath ?? '',
        })
      }

      return mapReviewResultToOrchestratorState(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('review_wrapper: subgraph invocation failed', {
        storyId: currentStoryId,
        error: msg,
      })
      return {
        reviewResult: { verdict: 'block', findings: [] },
        pipelinePhase: 'review',
        errors: [`review_wrapper: ${msg}`],
      }
    }
  }
}

// ============================================================================
// Review Decision Node
// ============================================================================

/**
 * Processes the review result and updates retry context.
 * This is a node (not an edge function) because it needs to
 * update state before the conditional edge routes.
 */
export function createReviewDecisionNode() {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const verdict = state.reviewResult?.verdict ?? 'block'

    logger.info('review_decision: processing', {
      storyId: state.currentStoryId,
      verdict,
    })

    if (verdict === 'fail') {
      return {
        retryContext: updateRetryContext(
          state.retryContext,
          'review',
          state.reviewResult?.findings?.[0]?.toString() ?? 'Review failed',
        ),
        pipelinePhase: 'review_decision',
      }
    }

    return {
      pipelinePhase: 'review_decision',
    }
  }
}

// ============================================================================
// QA Verify Wrapper
// ============================================================================

/**
 * Wraps the qa-verify-v2 subgraph invocation.
 *
 * Builds LLM adapters from the factory, creates the subgraph,
 * invokes it with mapped orchestrator state, and maps the result back.
 */
export function createQAVerifyWrapper(config: SubgraphInvokerConfig = {}) {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId, modelConfig, ollamaAvailable } = state

    logger.info('qa_verify_wrapper: invoking qa-verify-v2', {
      storyId: currentStoryId,
    })

    if (!currentStoryId) {
      return {
        qaResult: { verdict: 'block', failures: [] },
        pipelinePhase: 'qa_verify',
        errors: ['qa_verify_wrapper: no currentStoryId'],
      }
    }

    try {
      // Build adapters
      const factory = config.adapterFactory ?? createLlmAdapterFactory()
      const adapters = factory.buildQAVerifyAdapters(modelConfig, ollamaAvailable)

      // Create and invoke subgraph
      const graphConfig: QAVerifyV2GraphConfig = {
        ...adapters,
      }

      let result: QAVerifyV2State
      if (config.createQAGraph) {
        const graph = config.createQAGraph(graphConfig)
        result = await graph.invoke({ storyId: currentStoryId })
      } else {
        const { createQAVerifyV2Graph } = await import('../../graphs/qa-verify-v2.js')
        const graph = createQAVerifyV2Graph(graphConfig)
        result = await graph.invoke({ storyId: currentStoryId })
      }

      return mapQAResultToOrchestratorState(result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error('qa_verify_wrapper: subgraph invocation failed', {
        storyId: currentStoryId,
        error: msg,
      })
      return {
        qaResult: { verdict: 'block', failures: [] },
        pipelinePhase: 'qa_verify',
        errors: [`qa_verify_wrapper: ${msg}`],
      }
    }
  }
}

// ============================================================================
// QA Decision Node
// ============================================================================

/**
 * Processes the QA result and updates retry context.
 */
export function createQADecisionNode() {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const verdict = state.qaResult?.verdict ?? 'block'

    logger.info('qa_decision: processing', {
      storyId: state.currentStoryId,
      verdict,
    })

    if (verdict === 'fail') {
      return {
        retryContext: updateRetryContext(
          state.retryContext,
          'qa',
          state.qaResult?.failures?.[0]?.toString() ?? 'QA failed',
        ),
        pipelinePhase: 'qa_decision',
      }
    }

    return {
      pipelinePhase: 'qa_decision',
    }
  }
}

// ============================================================================
// Merge + Cleanup Node
// ============================================================================

/**
 * Combines merge_pr and cleanup_worktree into a single node for MVP.
 * In production, these will be separate nodes invoking git operations.
 */
export function createMergeCleanupNode() {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId } = state

    logger.info('merge_cleanup: processing', { storyId: currentStoryId })

    // MVP stub — in production this will invoke merge_pr + cleanup_worktree
    return {
      pipelinePhase: 'merge_cleanup',
    }
  }
}

// ============================================================================
// Post Completion Node
// ============================================================================

/**
 * Handles post-story-completion tasks:
 * - Updates story status to completed
 * - Resolves downstream dependencies
 * - Writes learnings to KB
 * - Adds story to completedStories
 */
export function createPostCompletionNode() {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId } = state

    logger.info('post_completion: processing', { storyId: currentStoryId })

    // MVP: just mark as completed
    return {
      completedStories: currentStoryId ? [currentStoryId] : [],
      pipelinePhase: 'post_completion',
    }
  }
}

// ============================================================================
// Block Story Node
// ============================================================================

/**
 * Handles blocking a story that cannot proceed.
 * Adds it to blockedStories and resets per-story state.
 */
export function createBlockStoryNode() {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId, retryContext } = state

    logger.info('block_story: blocking story', {
      storyId: currentStoryId,
      reason: retryContext?.lastFailureReason,
    })

    return {
      blockedStories: currentStoryId ? [currentStoryId] : [],
      pipelinePhase: 'block_story',
    }
  }
}
