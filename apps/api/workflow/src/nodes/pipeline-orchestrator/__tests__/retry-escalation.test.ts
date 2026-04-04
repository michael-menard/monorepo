/**
 * Retry/Escalation Loop tests (pipeline-orchestrator)
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  makeRetryDecision,
  updateRetryContext,
  createRetryContext,
  createRetryDecisionEdge,
  DEFAULT_ESCALATION_CONFIG,
  RETRY_EDGE_ROUTES,
  type RetryContext,
  type EscalationConfig,
  type ReviewFinding,
  type QAFailure,
  type RetryEdgeState,
} from '../retry-escalation.js'

// ============================================================================
// Helpers
// ============================================================================

function baseContext(overrides: Partial<RetryContext> = {}): RetryContext {
  return createRetryContext(overrides)
}

// ============================================================================
// createRetryContext tests
// ============================================================================

describe('createRetryContext', () => {
  it('creates context with defaults', () => {
    const ctx = createRetryContext()
    expect(ctx.retryAttempt).toBe(0)
    expect(ctx.maxRetries).toBe(3)
    expect(ctx.consecutiveFailures).toBe(0)
    expect(ctx.circuitBreakerOpen).toBe(false)
    expect(ctx.escalatedModel).toBeUndefined()
  })

  it('accepts overrides', () => {
    const ctx = createRetryContext({ retryAttempt: 2, escalatedModel: 'claude-code/opus' })
    expect(ctx.retryAttempt).toBe(2)
    expect(ctx.escalatedModel).toBe('claude-code/opus')
  })
})

// ============================================================================
// makeRetryDecision — pass verdict
// ============================================================================

describe('makeRetryDecision — pass verdict', () => {
  it('returns null when verdict is pass', () => {
    const result = makeRetryDecision('pass', baseContext(), DEFAULT_ESCALATION_CONFIG)
    expect(result).toBeNull()
  })
})

// ============================================================================
// makeRetryDecision — first retry (default model tier)
// ============================================================================

describe('makeRetryDecision — first retry at default model', () => {
  it('returns retry action on first failure', () => {
    const ctx = baseContext({ retryAttempt: 0 })
    const result = makeRetryDecision('fail', ctx, DEFAULT_ESCALATION_CONFIG, 'review')

    expect(result).not.toBeNull()
    expect(result!.action).toBe('retry')
    expect(result!.retryContext.retryAttempt).toBe(1)
    expect(result!.retryContext.consecutiveFailures).toBe(1)
  })

  it('returns retry action on second failure at default model', () => {
    const ctx = baseContext({ retryAttempt: 1, consecutiveFailures: 1 })
    const result = makeRetryDecision('fail', ctx, DEFAULT_ESCALATION_CONFIG, 'review')

    expect(result).not.toBeNull()
    expect(result!.action).toBe('retry')
    expect(result!.retryContext.retryAttempt).toBe(2)
    expect(result!.retryContext.consecutiveFailures).toBe(2)
  })
})

// ============================================================================
// makeRetryDecision — escalation boundary
// ============================================================================

describe('makeRetryDecision — escalation to stronger model', () => {
  // Use high circuit breaker threshold so it doesn't interfere with escalation tests
  const highCBConfig: EscalationConfig = {
    ...DEFAULT_ESCALATION_CONFIG,
    circuitBreakerThreshold: 10,
  }

  it('returns escalate_and_retry at escalation boundary for review', () => {
    const ctx = baseContext({ retryAttempt: 2, consecutiveFailures: 2 })
    const result = makeRetryDecision('fail', ctx, highCBConfig, 'review')

    expect(result).not.toBeNull()
    expect(result!.action).toBe('escalate_and_retry')
    expect(result!.nextModel).toBe('claude-code/sonnet')
    expect(result!.retryContext.retryAttempt).toBe(3)
    expect(result!.retryContext.escalatedModel).toBe('claude-code/sonnet')
  })

  it('returns escalate_and_retry at escalation boundary for qa', () => {
    const ctx = baseContext({ retryAttempt: 2, consecutiveFailures: 2 })
    const result = makeRetryDecision('fail', ctx, highCBConfig, 'qa')

    expect(result).not.toBeNull()
    expect(result!.action).toBe('escalate_and_retry')
    expect(result!.nextModel).toBe('claude-code/sonnet')
  })

  it('escalates review failures to sonnet', () => {
    const ctx = baseContext({ retryAttempt: 2, consecutiveFailures: 2 })
    const result = makeRetryDecision('fail', ctx, highCBConfig, 'review')

    expect(result!.nextModel).toBe('claude-code/sonnet')
  })
})

// ============================================================================
// makeRetryDecision — max retries exhausted → block
// ============================================================================

describe('makeRetryDecision — max retries exhausted', () => {
  it('returns block when all retries used', () => {
    // maxRetriesBeforeEscalation(2) + maxRetriesAfterEscalation(1) = 3
    // Use high CB threshold so we hit max-retries logic, not circuit breaker
    const highCBConfig: EscalationConfig = {
      ...DEFAULT_ESCALATION_CONFIG,
      circuitBreakerThreshold: 10,
    }
    const ctx = baseContext({ retryAttempt: 3, consecutiveFailures: 2 })
    const result = makeRetryDecision('fail', ctx, highCBConfig, 'review')

    expect(result).not.toBeNull()
    expect(result!.action).toBe('block')
    expect(result!.reason).toContain('Max retries exhausted')
  })
})

// ============================================================================
// makeRetryDecision — circuit breaker
// ============================================================================

describe('makeRetryDecision — circuit breaker', () => {
  it('blocks immediately when circuit breaker is already open', () => {
    const ctx = baseContext({
      retryAttempt: 1,
      consecutiveFailures: 3,
      circuitBreakerOpen: true,
    })
    const result = makeRetryDecision('fail', ctx, DEFAULT_ESCALATION_CONFIG)

    expect(result).not.toBeNull()
    expect(result!.action).toBe('block')
    expect(result!.reason).toContain('Circuit breaker open')
  })

  it('triggers circuit breaker when consecutive failures reach threshold', () => {
    const ctx = baseContext({
      retryAttempt: 0,
      consecutiveFailures: 2, // +1 = 3 = threshold
    })
    const result = makeRetryDecision('fail', ctx, DEFAULT_ESCALATION_CONFIG)

    expect(result).not.toBeNull()
    expect(result!.action).toBe('block')
    expect(result!.reason).toContain('Circuit breaker triggered')
    expect(result!.retryContext.circuitBreakerOpen).toBe(true)
  })

  it('does not trigger circuit breaker below threshold', () => {
    const ctx = baseContext({
      retryAttempt: 0,
      consecutiveFailures: 1, // +1 = 2 < 3 threshold
    })
    const result = makeRetryDecision('fail', ctx, DEFAULT_ESCALATION_CONFIG)

    expect(result).not.toBeNull()
    expect(result!.action).toBe('retry')
  })

  it('respects custom circuit breaker threshold', () => {
    const customConfig: EscalationConfig = {
      ...DEFAULT_ESCALATION_CONFIG,
      circuitBreakerThreshold: 5,
    }
    const ctx = baseContext({
      retryAttempt: 0,
      consecutiveFailures: 4, // +1 = 5 = custom threshold
    })
    const result = makeRetryDecision('fail', ctx, customConfig)

    expect(result).not.toBeNull()
    expect(result!.action).toBe('block')
    expect(result!.reason).toContain('Circuit breaker triggered')
  })
})

// ============================================================================
// updateRetryContext
// ============================================================================

describe('updateRetryContext', () => {
  it('resets consecutive failures on pass', () => {
    const ctx = baseContext({ consecutiveFailures: 2 })
    const updated = updateRetryContext(ctx, 'pass')

    expect(updated.consecutiveFailures).toBe(0)
    expect(updated.circuitBreakerOpen).toBe(false)
  })

  it('increments consecutive failures on fail', () => {
    const ctx = baseContext({ consecutiveFailures: 1 })
    const updated = updateRetryContext(ctx, 'fail')

    expect(updated.consecutiveFailures).toBe(2)
  })

  it('opens circuit breaker at threshold', () => {
    const ctx = baseContext({ consecutiveFailures: 2 })
    const updated = updateRetryContext(ctx, 'fail')

    expect(updated.consecutiveFailures).toBe(3)
    expect(updated.circuitBreakerOpen).toBe(true)
  })

  it('injects review findings', () => {
    const findings: ReviewFinding[] = [
      { severity: 'error', description: 'Missing null check', file: 'foo.ts', line: 42 },
    ]
    const ctx = baseContext()
    const updated = updateRetryContext(ctx, 'fail', DEFAULT_ESCALATION_CONFIG, {
      reviewFindings: findings,
    })

    expect(updated.previousReviewFindings).toEqual(findings)
  })

  it('injects QA failures', () => {
    const qaFailures: QAFailure[] = [
      { acId: 'AC-1', expected: 'true', actual: 'false', passed: false },
    ]
    const ctx = baseContext()
    const updated = updateRetryContext(ctx, 'fail', DEFAULT_ESCALATION_CONFIG, {
      qaFailures,
    })

    expect(updated.previousQAFailures).toEqual(qaFailures)
  })

  it('injects diagnosis string', () => {
    const ctx = baseContext()
    const updated = updateRetryContext(ctx, 'fail', DEFAULT_ESCALATION_CONFIG, {
      diagnosis: 'Race condition in user service',
    })

    expect(updated.previousDiagnosis).toBe('Race condition in user service')
  })

  it('preserves existing findings when no new ones provided', () => {
    const existingFindings: ReviewFinding[] = [
      { severity: 'warn', description: 'Unused import' },
    ]
    const ctx = baseContext({ previousReviewFindings: existingFindings })
    const updated = updateRetryContext(ctx, 'fail')

    expect(updated.previousReviewFindings).toEqual(existingFindings)
  })
})

// ============================================================================
// createRetryDecisionEdge — LangGraph conditional edge
// ============================================================================

describe('createRetryDecisionEdge', () => {
  it('routes to create_pr on pass verdict', () => {
    const edge = createRetryDecisionEdge()
    const state: RetryEdgeState = {
      storyId: 'ORCH-3030',
      verdict: 'pass',
      retryContext: baseContext(),
    }

    expect(edge(state)).toBe(RETRY_EDGE_ROUTES.CREATE_PR)
  })

  it('routes to dev_implement on retry', () => {
    const edge = createRetryDecisionEdge()
    const state: RetryEdgeState = {
      storyId: 'ORCH-3030',
      verdict: 'fail',
      failureType: 'review',
      retryContext: baseContext({ retryAttempt: 0 }),
    }

    expect(edge(state)).toBe(RETRY_EDGE_ROUTES.DEV_IMPLEMENT)
  })

  it('routes to dev_implement on escalate_and_retry', () => {
    const edge = createRetryDecisionEdge({ circuitBreakerThreshold: 10 })
    const state: RetryEdgeState = {
      storyId: 'ORCH-3030',
      verdict: 'fail',
      failureType: 'review',
      retryContext: baseContext({ retryAttempt: 2, consecutiveFailures: 2 }),
    }

    expect(edge(state)).toBe(RETRY_EDGE_ROUTES.DEV_IMPLEMENT)
  })

  it('routes to block_story when max retries exhausted', () => {
    const edge = createRetryDecisionEdge()
    const state: RetryEdgeState = {
      storyId: 'ORCH-3030',
      verdict: 'fail',
      failureType: 'review',
      retryContext: baseContext({ retryAttempt: 3, consecutiveFailures: 2 }),
    }

    expect(edge(state)).toBe(RETRY_EDGE_ROUTES.BLOCK_STORY)
  })

  it('routes to block_story when circuit breaker open', () => {
    const edge = createRetryDecisionEdge()
    const state: RetryEdgeState = {
      storyId: 'ORCH-3030',
      verdict: 'fail',
      failureType: 'qa',
      retryContext: baseContext({
        retryAttempt: 1,
        consecutiveFailures: 3,
        circuitBreakerOpen: true,
      }),
    }

    expect(edge(state)).toBe(RETRY_EDGE_ROUTES.BLOCK_STORY)
  })

  it('defaults failureType to review when not provided', () => {
    const edge = createRetryDecisionEdge()
    const state: RetryEdgeState = {
      storyId: 'ORCH-3030',
      verdict: 'fail',
      retryContext: baseContext({ retryAttempt: 0 }),
    }

    // Should not throw, and should route to dev_implement
    expect(edge(state)).toBe(RETRY_EDGE_ROUTES.DEV_IMPLEMENT)
  })

  it('accepts custom escalation config', () => {
    const edge = createRetryDecisionEdge({
      maxRetriesBeforeEscalation: 1,
      maxRetriesAfterEscalation: 1,
      circuitBreakerThreshold: 10,
    })
    const state: RetryEdgeState = {
      storyId: 'ORCH-3030',
      verdict: 'fail',
      failureType: 'review',
      retryContext: baseContext({ retryAttempt: 1, consecutiveFailures: 0 }),
    }

    // At escalation boundary — should escalate and route to dev_implement
    expect(edge(state)).toBe(RETRY_EDGE_ROUTES.DEV_IMPLEMENT)
  })
})

// ============================================================================
// Full escalation lifecycle
// ============================================================================

describe('full escalation lifecycle', () => {
  it('walks through: retry → retry → escalate → block', () => {
    const config = DEFAULT_ESCALATION_CONFIG
    let ctx = baseContext()

    // Failure 1: retry at default model
    const d1 = makeRetryDecision('fail', ctx, config, 'review')
    expect(d1!.action).toBe('retry')
    ctx = d1!.retryContext

    // Failure 2: retry at default model
    const d2 = makeRetryDecision('fail', ctx, config, 'review')
    expect(d2!.action).toBe('retry')
    ctx = d2!.retryContext

    // Failure 3: escalate to stronger model — but circuit breaker triggers first
    // consecutiveFailures is now 2, +1 = 3 = threshold
    const d3 = makeRetryDecision('fail', ctx, config, 'review')
    expect(d3!.action).toBe('block')
    expect(d3!.reason).toContain('Circuit breaker triggered')
  })

  it('reaches escalation when circuit breaker threshold is higher', () => {
    const config: EscalationConfig = {
      ...DEFAULT_ESCALATION_CONFIG,
      circuitBreakerThreshold: 10, // High enough to not interfere
    }
    let ctx = baseContext()

    // Failure 1: retry
    const d1 = makeRetryDecision('fail', ctx, config, 'review')
    expect(d1!.action).toBe('retry')
    ctx = d1!.retryContext

    // Failure 2: retry
    const d2 = makeRetryDecision('fail', ctx, config, 'review')
    expect(d2!.action).toBe('retry')
    ctx = d2!.retryContext

    // Failure 3: escalate
    const d3 = makeRetryDecision('fail', ctx, config, 'review')
    expect(d3!.action).toBe('escalate_and_retry')
    expect(d3!.nextModel).toBe('claude-code/sonnet')
    ctx = d3!.retryContext

    // Failure 4: block (1 post-escalation retry used)
    const d4 = makeRetryDecision('fail', ctx, config, 'review')
    expect(d4!.action).toBe('block')
    expect(d4!.reason).toContain('Max retries exhausted')
  })

  it('resets on success between failures', () => {
    let ctx = baseContext({ consecutiveFailures: 2 })

    // Pass resets consecutive failures
    ctx = updateRetryContext(ctx, 'pass')
    expect(ctx.consecutiveFailures).toBe(0)

    // Next failure starts fresh consecutive count
    const decision = makeRetryDecision('fail', ctx, DEFAULT_ESCALATION_CONFIG, 'review')
    expect(decision!.action).toBe('retry')
    expect(decision!.retryContext.consecutiveFailures).toBe(1)
  })
})

// ============================================================================
// QA failure path
// ============================================================================

describe('QA failure path', () => {
  it('injects QA failures into retry context via updateRetryContext', () => {
    const qaFailures: QAFailure[] = [
      { acId: 'AC-1', expected: 'renders table', actual: 'empty div', passed: false },
      { acId: 'AC-2', expected: '200 status', actual: '500 status', passed: false },
    ]

    const ctx = baseContext()
    const updated = updateRetryContext(ctx, 'fail', DEFAULT_ESCALATION_CONFIG, {
      qaFailures,
      diagnosis: 'Database connection pool exhausted',
    })

    expect(updated.previousQAFailures).toEqual(qaFailures)
    expect(updated.previousDiagnosis).toBe('Database connection pool exhausted')
    expect(updated.consecutiveFailures).toBe(1)
  })

  it('escalates QA failures to sonnet', () => {
    const config: EscalationConfig = {
      ...DEFAULT_ESCALATION_CONFIG,
      circuitBreakerThreshold: 10,
    }
    const ctx = baseContext({ retryAttempt: 2, consecutiveFailures: 2 })
    const decision = makeRetryDecision('fail', ctx, config, 'qa')

    expect(decision!.action).toBe('escalate_and_retry')
    expect(decision!.nextModel).toBe('claude-code/sonnet')
  })
})
