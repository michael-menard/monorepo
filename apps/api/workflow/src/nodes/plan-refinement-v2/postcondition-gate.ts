/**
 * postcondition_gate Node (v2 agentic pipeline)
 *
 * Deterministic edge-condition node. Evaluates the PostconditionResult from
 * the refinement_agent and decides whether to:
 *   - Complete (pass → END)
 *   - Retry   (fail + retryCount < maxRetries → back to refinement_agent)
 *   - Error   (fail + retryCount >= maxRetries → END with error phase)
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  PostconditionResult,
  PlanRefinementV2State,
} from '../../state/plan-refinement-v2-state.js'

// ============================================================================
// Config Schema
// ============================================================================

export const PostconditionGateConfigSchema = z.object({})

export type PostconditionGateConfig = Record<string, never>

// ============================================================================
// Exported Pure Functions (for unit testability)
// ============================================================================

/**
 * Decides the retry/complete/error outcome purely from inputs.
 *
 * @param postconditionResult - Result from the refinement_agent
 * @param retryCount - Current outer retry count (0-based)
 * @param maxRetries - Maximum allowed retries
 * @returns 'retry' | 'complete' | 'error'
 */
export function shouldRetry(
  postconditionResult: PostconditionResult | null,
  retryCount: number,
  maxRetries: number,
): 'retry' | 'complete' | 'error' {
  // No result at all — treat as failure
  if (!postconditionResult) {
    if (retryCount < maxRetries) return 'retry'
    return 'error'
  }

  if (postconditionResult.passed) return 'complete'

  if (retryCount < maxRetries) return 'retry'

  return 'error'
}

/**
 * Conditional edge function used by the graph to route after postcondition_gate.
 * Exported for graph wiring and testing.
 *
 * @param state - Current plan refinement v2 state
 * @returns Route target: 'refinement_agent' | 'complete' | '__end__'
 */
export function afterPostconditionGate(
  state: PlanRefinementV2State,
): 'refinement_agent' | 'complete' | '__end__' {
  const { refinementV2Phase } = state
  if (refinementV2Phase === 'complete') return 'complete'
  if (refinementV2Phase === 'refinement_agent') return 'refinement_agent'
  return '__end__'
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the postcondition_gate LangGraph node.
 *
 * Logic:
 * - If postconditionResult.passed AND retryCount < maxRetries → phase: 'complete'
 * - If NOT passed AND retryCount < maxRetries → phase: 'refinement_agent', retryCount++
 * - If NOT passed AND retryCount >= maxRetries → phase: 'error'
 *
 * @param _config - Config (reserved for future use, currently empty)
 * @returns LangGraph-compatible async node function
 */
export function createPostconditionGateNode(
  _config: PostconditionGateConfig = {} as PostconditionGateConfig,
) {
  return async (state: PlanRefinementV2State): Promise<Partial<PlanRefinementV2State>> => {
    const { postconditionResult, retryCount, maxRetries, planSlug } = state

    logger.info(`postcondition_gate: evaluating for plan ${planSlug}`, {
      passed: postconditionResult?.passed ?? false,
      failureCount: postconditionResult?.failures?.length ?? 0,
      retryCount,
      maxRetries,
    })

    const decision = shouldRetry(postconditionResult, retryCount, maxRetries)

    if (decision === 'complete') {
      logger.info('postcondition_gate: postconditions passed → complete')
      return {
        refinementV2Phase: 'complete',
      }
    }

    if (decision === 'retry') {
      const newRetryCount = retryCount + 1
      logger.info(
        `postcondition_gate: postconditions failed → retrying (attempt ${newRetryCount}/${maxRetries})`,
        {
          failures: postconditionResult?.failures?.map(f => f.check) ?? [],
        },
      )
      return {
        refinementV2Phase: 'refinement_agent',
        retryCount: newRetryCount,
      }
    }

    // error: exhausted retries
    const failureSummary =
      postconditionResult?.failures?.map(f => `[${f.check}] ${f.reason}`).join('; ') ??
      'postconditionResult was null'

    logger.warn(`postcondition_gate: max retries (${maxRetries}) exhausted → error`, {
      failureSummary,
    })

    return {
      refinementV2Phase: 'error',
      errors: [
        `postcondition_gate: max retries exhausted after ${retryCount} attempt(s). Failures: ${failureSummary}`,
      ],
    }
  }
}
