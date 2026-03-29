/**
 * postcondition_gate Node (review-v2) — DETERMINISTIC
 *
 * Assigns final verdict and routes:
 *   pass → complete
 *   fail+retries → review_agent with feedback
 *   exhausted → complete (with fail verdict)
 *
 * Note: even at max retries, we complete (not error) — review always produces a verdict.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { ReviewFinding, ReviewV2State } from '../../state/review-v2-state.js'

// ============================================================================
// Config Schema
// ============================================================================

export const PostconditionGateConfigSchema = z.object({})

export type PostconditionGateConfig = Record<string, never>

// ============================================================================
// Exported Pure Functions
// ============================================================================

/**
 * Assigns verdict based on finding severities.
 * fail if any critical findings, pass otherwise.
 */
export function assignVerdict(findings: ReviewFinding[]): 'pass' | 'fail' {
  const hasCritical = findings.some(f => f.severity === 'critical')
  return hasCritical ? 'fail' : 'pass'
}

/**
 * Conditional edge function for after review postcondition gate.
 */
export function afterReviewGate(state: ReviewV2State): 'review_agent' | 'complete' | '__end__' {
  const { reviewV2Phase } = state
  if (reviewV2Phase === 'complete') return 'complete'
  if (reviewV2Phase === 'review_agent') return 'review_agent'
  return '__end__'
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the review postcondition_gate LangGraph node.
 */
export function createReviewPostconditionGateNode(
  _config: PostconditionGateConfig = {} as PostconditionGateConfig,
) {
  return async (state: ReviewV2State): Promise<Partial<ReviewV2State>> => {
    const { storyId, reviewFindings, postconditionResult, retryCount, maxRetries } = state

    logger.info(`postcondition_gate (review-v2): evaluating for story ${storyId}`, {
      findingsCount: reviewFindings.length,
      passed: postconditionResult?.passed ?? false,
      retryCount,
      maxRetries,
    })

    const verdict = assignVerdict(reviewFindings)

    // If postconditions passed (or no postcondition failures): assign verdict and complete
    if (!postconditionResult || postconditionResult.passed) {
      logger.info(`postcondition_gate (review-v2): complete with verdict=${verdict}`)
      return {
        reviewVerdict: verdict,
        reviewV2Phase: 'complete',
      }
    }

    // Postconditions failed — retry or complete with verdict
    if (retryCount < maxRetries) {
      logger.warn(`postcondition_gate (review-v2): postconditions failed → retrying`, {
        retryCount: retryCount + 1,
        failures: postconditionResult.failures.map(f => f.check),
      })
      return {
        reviewVerdict: verdict,
        retryCount: retryCount + 1,
        reviewV2Phase: 'review_agent',
      }
    }

    // Max retries exhausted — complete with whatever verdict we have
    logger.warn(
      `postcondition_gate (review-v2): max retries (${maxRetries}) exhausted → complete with verdict=${verdict}`,
    )
    return {
      reviewVerdict: verdict,
      reviewV2Phase: 'complete',
    }
  }
}
