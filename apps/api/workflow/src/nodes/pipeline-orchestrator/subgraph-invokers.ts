/**
 * Subgraph Invoker Nodes (pipeline-orchestrator)
 *
 * Wrapper functions that map pipeline orchestrator state to/from
 * individual subgraph inputs/outputs. Each invoker:
 *
 * 1. Extracts relevant fields from the orchestrator state
 * 2. Invokes the subgraph (or a stub for MVP)
 * 3. Maps the subgraph result back to orchestrator state fields
 *
 * For MVP, subgraph invocations are stubs that set result fields
 * to allow the graph to compile and route correctly. Real subgraph
 * invocation will be wired in a subsequent story.
 */

import { logger } from '@repo/logger'
import type { PipelineOrchestratorV2State } from '../../state/pipeline-orchestrator-v2-state.js'
import { updateRetryContext } from './retry-escalation.js'

// ============================================================================
// Dev Implement Wrapper
// ============================================================================

/**
 * Wraps the dev-implement-v2 subgraph invocation.
 *
 * MVP stub: returns a successful dev result so the graph can route.
 */
export function createDevImplementWrapper() {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId } = state

    logger.info('dev_implement_wrapper: invoking dev-implement-v2', {
      storyId: currentStoryId,
    })

    // MVP stub — in production this will invoke createDevImplementV2Graph
    return {
      devResult: {
        verdict: 'complete',
        errors: [],
      },
      pipelinePhase: 'dev_implement',
    }
  }
}

// ============================================================================
// Review Wrapper
// ============================================================================

/**
 * Wraps the review-v2 subgraph invocation.
 *
 * MVP stub: returns a passing review result.
 */
export function createReviewWrapper() {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId, worktreePath } = state

    logger.info('review_wrapper: invoking review-v2', {
      storyId: currentStoryId,
      worktreePath,
    })

    // MVP stub — in production this will invoke createReviewV2Graph
    return {
      reviewResult: {
        verdict: 'pass',
        findings: [],
      },
      pipelinePhase: 'review',
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
 * MVP stub: returns a passing QA result.
 */
export function createQAVerifyWrapper() {
  return async (
    state: PipelineOrchestratorV2State,
  ): Promise<Partial<PipelineOrchestratorV2State>> => {
    const { currentStoryId } = state

    logger.info('qa_verify_wrapper: invoking qa-verify-v2', {
      storyId: currentStoryId,
    })

    // MVP stub — in production this will invoke createQAVerifyV2Graph
    return {
      qaResult: {
        verdict: 'pass',
        failures: [],
      },
      pipelinePhase: 'qa_verify',
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
