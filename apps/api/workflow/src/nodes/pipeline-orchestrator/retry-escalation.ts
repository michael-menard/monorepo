/**
 * Retry & Escalation Logic (pipeline-orchestrator) — DETERMINISTIC
 *
 * Determines whether a failed review or QA should be retried,
 * blocked, or escalated. Pure functions with no side effects.
 *
 * Retry budget: configurable per-stage, defaults to 2 retries each.
 * Escalation: Sonnet -> Opus -> blocked (future — MVP just blocks).
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { RetryContext } from '../../state/pipeline-orchestrator-v2-state.js'

// ============================================================================
// Retry Decision Schema
// ============================================================================

export const RetryDecisionSchema = z.enum(['pass', 'retry', 'block'])

export type RetryDecision = z.infer<typeof RetryDecisionSchema>

// ============================================================================
// Pure Logic
// ============================================================================

/**
 * Makes a retry decision based on current retry context and the verdict.
 *
 * - If verdict is pass, returns 'pass'
 * - If within retry budget, returns 'retry'
 * - If budget exhausted, returns 'block'
 */
export function makeRetryDecision(
  verdict: 'pass' | 'fail' | 'block',
  stage: 'review' | 'qa',
  retryContext: RetryContext | null,
): RetryDecision {
  if (verdict === 'pass') return 'pass'
  if (verdict === 'block') return 'block'

  // verdict === 'fail' — check retry budget
  if (!retryContext) return 'block'

  if (stage === 'review') {
    if (retryContext.reviewAttempts < retryContext.maxReviewRetries) {
      return 'retry'
    }
    return 'block'
  }

  // stage === 'qa'
  if (retryContext.qaAttempts < retryContext.maxQaRetries) {
    return 'retry'
  }
  return 'block'
}

/**
 * Returns an updated RetryContext with the attempt counter incremented
 * for the given stage.
 */
export function updateRetryContext(
  retryContext: RetryContext | null,
  stage: 'review' | 'qa',
  failureReason: string,
): RetryContext {
  const base: RetryContext = retryContext ?? {
    reviewAttempts: 0,
    qaAttempts: 0,
    maxReviewRetries: 2,
    maxQaRetries: 2,
    lastFailureReason: '',
  }

  if (stage === 'review') {
    return {
      ...base,
      reviewAttempts: base.reviewAttempts + 1,
      lastFailureReason: failureReason,
    }
  }

  return {
    ...base,
    qaAttempts: base.qaAttempts + 1,
    lastFailureReason: failureReason,
  }
}

/**
 * Creates a conditional edge function for review decisions.
 * Returns a string suitable for LangGraph addConditionalEdges routing.
 */
export function createReviewDecisionEdge() {
  return (state: {
    reviewResult: { verdict: string } | null
    retryContext: RetryContext | null
  }): RetryDecision => {
    const verdict = (state.reviewResult?.verdict ?? 'block') as 'pass' | 'fail' | 'block'
    const decision = makeRetryDecision(verdict, 'review', state.retryContext)

    logger.info('review_decision: routing', {
      verdict,
      decision,
      reviewAttempts: state.retryContext?.reviewAttempts ?? 0,
    })

    return decision
  }
}

/**
 * Creates a conditional edge function for QA decisions.
 * Returns a string suitable for LangGraph addConditionalEdges routing.
 */
export function createQADecisionEdge() {
  return (state: {
    qaResult: { verdict: string } | null
    retryContext: RetryContext | null
  }): RetryDecision => {
    const verdict = (state.qaResult?.verdict ?? 'block') as 'pass' | 'fail' | 'block'
    const decision = makeRetryDecision(verdict, 'qa', state.retryContext)

    logger.info('qa_decision: routing', {
      verdict,
      decision,
      qaAttempts: state.retryContext?.qaAttempts ?? 0,
    })

    return decision
  }
}
