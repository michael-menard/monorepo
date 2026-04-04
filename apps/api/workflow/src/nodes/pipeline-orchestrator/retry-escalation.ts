/**
 * Retry/Escalation Loop (pipeline-orchestrator) — DETERMINISTIC
 *
 * Retry decision logic and model escalation for when subgraph gates
 * (code review, QA) fail. Pure functions with no LLM calls.
 *
 * Escalation policy:
 *   - 2 failures at default model → escalate to stronger model
 *   - 1 failure at escalated model → mark blocked
 *   - Circuit breaker: 3 consecutive failures in window → blocked immediately
 */

import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// Zod Schemas
// ============================================================================

export const ReviewFindingSchema = z.object({
  severity: z.string(),
  description: z.string(),
  file: z.string().optional(),
  line: z.number().optional(),
})

export type ReviewFinding = z.infer<typeof ReviewFindingSchema>

export const QAFailureSchema = z.object({
  acId: z.string(),
  expected: z.string(),
  actual: z.string(),
  passed: z.boolean(),
})

export type QAFailure = z.infer<typeof QAFailureSchema>

export const RetryContextSchema = z.object({
  retryAttempt: z.number().default(0),
  maxRetries: z.number().default(3),
  previousReviewFindings: z.array(ReviewFindingSchema).optional(),
  previousQAFailures: z.array(QAFailureSchema).optional(),
  previousDiagnosis: z.string().optional(),
  escalatedModel: z.string().optional(),
  consecutiveFailures: z.number().default(0),
  circuitBreakerOpen: z.boolean().default(false),
})

export type RetryContext = z.infer<typeof RetryContextSchema>

export const EscalationConfigSchema = z.object({
  defaultModels: z.object({
    dev: z.string().default('ollama:qwen2.5-coder:14b'),
    review: z.string().default('minimax/abab6'),
    qa: z.string().default('minimax/abab6'),
  }),
  escalatedModels: z.object({
    dev: z.string().default('claude-code/opus'),
    review: z.string().default('claude-code/sonnet'),
    qa: z.string().default('claude-code/sonnet'),
  }),
  maxRetriesBeforeEscalation: z.number().default(2),
  maxRetriesAfterEscalation: z.number().default(1),
  circuitBreakerThreshold: z.number().default(3),
})

export type EscalationConfig = z.infer<typeof EscalationConfigSchema>

export const RetryActionSchema = z.enum(['retry', 'escalate_and_retry', 'block'])

export type RetryAction = z.infer<typeof RetryActionSchema>

export const RetryDecisionSchema = z.object({
  action: RetryActionSchema,
  reason: z.string(),
  nextModel: z.string().optional(),
  retryContext: RetryContextSchema,
})

export type RetryDecision = z.infer<typeof RetryDecisionSchema>

export const VerdictSchema = z.enum(['pass', 'fail'])

export type Verdict = z.infer<typeof VerdictSchema>

export const FailureTypeSchema = z.enum(['review', 'qa'])

export type FailureType = z.infer<typeof FailureTypeSchema>

// ============================================================================
// Default Config
// ============================================================================

export const DEFAULT_ESCALATION_CONFIG: EscalationConfig = EscalationConfigSchema.parse({
  defaultModels: {},
  escalatedModels: {},
})

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * Makes a retry decision based on verdict and current retry context.
 *
 * Returns null if the verdict is 'pass' (no retry needed).
 * Otherwise returns a RetryDecision with action, reason, and updated context.
 */
export function makeRetryDecision(
  verdict: Verdict,
  retryContext: RetryContext,
  escalationConfig: EscalationConfig = DEFAULT_ESCALATION_CONFIG,
  failureType: FailureType = 'review',
): RetryDecision | null {
  if (verdict === 'pass') {
    return null
  }

  const { maxRetriesBeforeEscalation, maxRetriesAfterEscalation, circuitBreakerThreshold } =
    escalationConfig

  // Circuit breaker check
  if (retryContext.circuitBreakerOpen) {
    logger.info('makeRetryDecision: circuit breaker is open', {
      consecutiveFailures: retryContext.consecutiveFailures,
    })
    return {
      action: 'block',
      reason: 'Circuit breaker open — too many consecutive failures',
      retryContext,
    }
  }

  // Check if consecutive failures have hit the circuit breaker threshold
  const updatedConsecutive = retryContext.consecutiveFailures + 1
  if (updatedConsecutive >= circuitBreakerThreshold) {
    logger.info('makeRetryDecision: circuit breaker triggered', {
      consecutiveFailures: updatedConsecutive,
      threshold: circuitBreakerThreshold,
    })
    return {
      action: 'block',
      reason: `Circuit breaker triggered — ${updatedConsecutive} consecutive failures (threshold: ${circuitBreakerThreshold})`,
      retryContext: {
        ...retryContext,
        consecutiveFailures: updatedConsecutive,
        circuitBreakerOpen: true,
      },
    }
  }

  const totalMaxRetries = maxRetriesBeforeEscalation + maxRetriesAfterEscalation

  // Already exhausted all retries
  if (retryContext.retryAttempt >= totalMaxRetries) {
    logger.info('makeRetryDecision: max retries exhausted', {
      retryAttempt: retryContext.retryAttempt,
      totalMaxRetries,
    })
    return {
      action: 'block',
      reason: `Max retries exhausted (${retryContext.retryAttempt}/${totalMaxRetries})`,
      retryContext: {
        ...retryContext,
        consecutiveFailures: updatedConsecutive,
      },
    }
  }

  // Still within default model retries
  if (retryContext.retryAttempt < maxRetriesBeforeEscalation) {
    logger.info('makeRetryDecision: retry at default model tier', {
      retryAttempt: retryContext.retryAttempt,
      maxRetriesBeforeEscalation,
    })
    return {
      action: 'retry',
      reason: `Retry attempt ${retryContext.retryAttempt + 1}/${maxRetriesBeforeEscalation} at default model`,
      retryContext: {
        ...retryContext,
        retryAttempt: retryContext.retryAttempt + 1,
        consecutiveFailures: updatedConsecutive,
      },
    }
  }

  // Exactly at escalation boundary
  if (retryContext.retryAttempt === maxRetriesBeforeEscalation) {
    const escalatedModel = escalationConfig.escalatedModels[failureType]
    logger.info('makeRetryDecision: escalating to stronger model', {
      retryAttempt: retryContext.retryAttempt,
      escalatedModel,
      failureType,
    })
    return {
      action: 'escalate_and_retry',
      reason: `Escalating to ${escalatedModel} after ${maxRetriesBeforeEscalation} failures at default model`,
      nextModel: escalatedModel,
      retryContext: {
        ...retryContext,
        retryAttempt: retryContext.retryAttempt + 1,
        escalatedModel,
        consecutiveFailures: updatedConsecutive,
      },
    }
  }

  // Past escalation, still within post-escalation retries
  if (retryContext.retryAttempt < totalMaxRetries) {
    const escalatedModel =
      retryContext.escalatedModel ?? escalationConfig.escalatedModels[failureType]
    logger.info('makeRetryDecision: retry at escalated model tier', {
      retryAttempt: retryContext.retryAttempt,
      escalatedModel,
    })
    return {
      action: 'retry',
      reason: `Retry attempt ${retryContext.retryAttempt - maxRetriesBeforeEscalation + 1}/${maxRetriesAfterEscalation} at escalated model`,
      retryContext: {
        ...retryContext,
        retryAttempt: retryContext.retryAttempt + 1,
        consecutiveFailures: updatedConsecutive,
      },
    }
  }

  // Fallback — should not reach here
  return {
    action: 'block',
    reason: 'Unexpected state — blocking as safety fallback',
    retryContext: {
      ...retryContext,
      consecutiveFailures: updatedConsecutive,
    },
  }
}

/**
 * Updates retry context with failure details from review or QA.
 * Checks circuit breaker threshold and opens it if exceeded.
 */
export function updateRetryContext(
  context: RetryContext,
  verdict: Verdict,
  config: EscalationConfig = DEFAULT_ESCALATION_CONFIG,
  findings?: {
    reviewFindings?: ReviewFinding[]
    qaFailures?: QAFailure[]
    diagnosis?: string
  },
): RetryContext {
  if (verdict === 'pass') {
    // Reset consecutive failures on success, keep attempt count
    return {
      ...context,
      consecutiveFailures: 0,
      circuitBreakerOpen: false,
    }
  }

  const updatedConsecutive = context.consecutiveFailures + 1
  const circuitBreakerOpen = updatedConsecutive >= config.circuitBreakerThreshold

  return {
    ...context,
    consecutiveFailures: updatedConsecutive,
    circuitBreakerOpen,
    previousReviewFindings: findings?.reviewFindings ?? context.previousReviewFindings,
    previousQAFailures: findings?.qaFailures ?? context.previousQAFailures,
    previousDiagnosis: findings?.diagnosis ?? context.previousDiagnosis,
  }
}

/**
 * Creates an initial RetryContext with defaults.
 */
export function createRetryContext(overrides: Partial<RetryContext> = {}): RetryContext {
  return RetryContextSchema.parse(overrides)
}

// ============================================================================
// LangGraph Conditional Edge Factory
// ============================================================================

/**
 * The minimal orchestrator state shape that the retry decision edge reads.
 */
export const RetryEdgeStateSchema = z.object({
  storyId: z.string(),
  verdict: VerdictSchema,
  failureType: FailureTypeSchema.optional(),
  retryContext: RetryContextSchema,
  reviewFindings: z.array(ReviewFindingSchema).optional(),
  qaFailures: z.array(QAFailureSchema).optional(),
})

export type RetryEdgeState = z.infer<typeof RetryEdgeStateSchema>

/**
 * Possible next nodes in the pipeline graph after retry decision.
 */
export const RETRY_EDGE_ROUTES = {
  DEV_IMPLEMENT: 'dev_implement',
  BLOCK_STORY: 'block_story',
  CREATE_PR: 'create_pr',
} as const

export type RetryEdgeRoute = (typeof RETRY_EDGE_ROUTES)[keyof typeof RETRY_EDGE_ROUTES]

/**
 * Creates a conditional edge function for LangGraph that reads orchestrator
 * state and returns the next node name.
 *
 * Usage in LangGraph graph definition:
 *   .addConditionalEdges('review_gate', createRetryDecisionEdge(config))
 */
export function createRetryDecisionEdge(config: Partial<EscalationConfig> = {}) {
  const resolvedConfig = EscalationConfigSchema.parse({
    defaultModels: config.defaultModels ?? {},
    escalatedModels: config.escalatedModels ?? {},
    maxRetriesBeforeEscalation: config.maxRetriesBeforeEscalation,
    maxRetriesAfterEscalation: config.maxRetriesAfterEscalation,
    circuitBreakerThreshold: config.circuitBreakerThreshold,
  })

  return (state: RetryEdgeState): RetryEdgeRoute => {
    const { storyId, verdict, failureType, retryContext } = state

    logger.info('retryDecisionEdge: evaluating', {
      storyId,
      verdict,
      failureType,
      retryAttempt: retryContext.retryAttempt,
      consecutiveFailures: retryContext.consecutiveFailures,
    })

    // Pass → proceed to PR creation
    if (verdict === 'pass') {
      logger.info('retryDecisionEdge: verdict passed, routing to create_pr', { storyId })
      return RETRY_EDGE_ROUTES.CREATE_PR
    }

    const decision = makeRetryDecision(
      verdict,
      retryContext,
      resolvedConfig,
      failureType ?? 'review',
    )

    if (!decision) {
      // Should not happen since verdict !== 'pass' at this point, but handle gracefully
      logger.warn('retryDecisionEdge: no decision returned, routing to block', { storyId })
      return RETRY_EDGE_ROUTES.BLOCK_STORY
    }

    logger.info('retryDecisionEdge: decision made', {
      storyId,
      action: decision.action,
      reason: decision.reason,
      nextModel: decision.nextModel,
    })

    if (decision.action === 'block') {
      return RETRY_EDGE_ROUTES.BLOCK_STORY
    }

    // Both 'retry' and 'escalate_and_retry' route back to dev_implement
    return RETRY_EDGE_ROUTES.DEV_IMPLEMENT
  }
}
