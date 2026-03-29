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
  shouldRetry,
  afterPostconditionGate,
  createPostconditionGateNode,
} from '../postcondition-gate.js'
import type { PostconditionResult, PlanRefinementV2State } from '../../../state/plan-refinement-v2-state.js'

// ============================================================================
// Test Fixtures
// ============================================================================

const makePassingResult = (): PostconditionResult => ({
  passed: true,
  failures: [],
  evidence: { checked: 'all good' },
})

const makeFailingResult = (checks: string[] = ['evidence_non_empty']): PostconditionResult => ({
  passed: false,
  failures: checks.map(check => ({ check, reason: `${check} failed` })),
  evidence: {},
})

const makeBaseState = (overrides: Partial<PlanRefinementV2State> = {}): PlanRefinementV2State => ({
  planSlug: 'test-plan',
  rawPlan: null,
  normalizedPlan: null,
  flows: [],
  groundingContext: null,
  postconditionResult: makePassingResult(),
  refinementV2Phase: 'postcondition_gate',
  retryCount: 0,
  maxRetries: 3,
  internalIterations: 0,
  tokenUsage: [],
  bakeOffVersion: 'v2-agentic',
  warnings: [],
  errors: [],
  ...overrides,
})

// ============================================================================
// shouldRetry tests
// ============================================================================

describe('shouldRetry', () => {
  it('returns complete when postconditions passed', () => {
    expect(shouldRetry(makePassingResult(), 0, 3)).toBe('complete')
  })

  it('returns retry when failed and retryCount < maxRetries', () => {
    expect(shouldRetry(makeFailingResult(), 0, 3)).toBe('retry')
  })

  it('returns retry when failed and retryCount = maxRetries - 1', () => {
    expect(shouldRetry(makeFailingResult(), 2, 3)).toBe('retry')
  })

  it('returns error when failed and retryCount >= maxRetries', () => {
    expect(shouldRetry(makeFailingResult(), 3, 3)).toBe('error')
  })

  it('returns error when failed and retryCount exceeds maxRetries', () => {
    expect(shouldRetry(makeFailingResult(), 5, 3)).toBe('error')
  })

  it('returns retry when postconditionResult is null and retryCount < maxRetries', () => {
    expect(shouldRetry(null, 0, 3)).toBe('retry')
  })

  it('returns error when postconditionResult is null and retryCount >= maxRetries', () => {
    expect(shouldRetry(null, 3, 3)).toBe('error')
  })

  it('returns complete even when retryCount > 0 if passed', () => {
    expect(shouldRetry(makePassingResult(), 2, 3)).toBe('complete')
  })
})

// ============================================================================
// afterPostconditionGate tests
// ============================================================================

describe('afterPostconditionGate', () => {
  it('returns complete when refinementV2Phase is complete', () => {
    const state = makeBaseState({ refinementV2Phase: 'complete' })
    expect(afterPostconditionGate(state)).toBe('complete')
  })

  it('returns refinement_agent when refinementV2Phase is refinement_agent', () => {
    const state = makeBaseState({ refinementV2Phase: 'refinement_agent' })
    expect(afterPostconditionGate(state)).toBe('refinement_agent')
  })

  it('returns __end__ when refinementV2Phase is error', () => {
    const state = makeBaseState({ refinementV2Phase: 'error' })
    expect(afterPostconditionGate(state)).toBe('__end__')
  })

  it('returns __end__ for any other phase', () => {
    const state = makeBaseState({ refinementV2Phase: 'grounding_scout' })
    expect(afterPostconditionGate(state)).toBe('__end__')
  })
})

// ============================================================================
// createPostconditionGateNode tests
// ============================================================================

describe('createPostconditionGateNode', () => {
  it('sets refinementV2Phase to complete when postconditions pass', async () => {
    const node = createPostconditionGateNode()
    const result = await node(makeBaseState({ postconditionResult: makePassingResult() }))
    expect(result.refinementV2Phase).toBe('complete')
  })

  it('sets refinementV2Phase to refinement_agent when postconditions fail and retries remain', async () => {
    const node = createPostconditionGateNode()
    const result = await node(
      makeBaseState({
        postconditionResult: makeFailingResult(),
        retryCount: 0,
        maxRetries: 3,
      }),
    )
    expect(result.refinementV2Phase).toBe('refinement_agent')
  })

  it('increments retryCount when retrying', async () => {
    const node = createPostconditionGateNode()
    const result = await node(
      makeBaseState({
        postconditionResult: makeFailingResult(),
        retryCount: 1,
        maxRetries: 3,
      }),
    )
    expect(result.retryCount).toBe(2)
  })

  it('sets refinementV2Phase to error when max retries exhausted', async () => {
    const node = createPostconditionGateNode()
    const result = await node(
      makeBaseState({
        postconditionResult: makeFailingResult(),
        retryCount: 3,
        maxRetries: 3,
      }),
    )
    expect(result.refinementV2Phase).toBe('error')
  })

  it('adds error message when max retries exhausted', async () => {
    const node = createPostconditionGateNode()
    const result = await node(
      makeBaseState({
        postconditionResult: makeFailingResult(['evidence_non_empty']),
        retryCount: 3,
        maxRetries: 3,
      }),
    )
    expect(Array.isArray(result.errors)).toBe(true)
    expect((result.errors as string[]).length).toBeGreaterThan(0)
    expect((result.errors as string[])[0]).toContain('max retries exhausted')
  })

  it('handles null postconditionResult — treats as failure', async () => {
    const node = createPostconditionGateNode()
    const result = await node(makeBaseState({ postconditionResult: null, retryCount: 0 }))
    expect(result.refinementV2Phase).toBe('refinement_agent')
  })

  it('does not increment retryCount when postconditions pass', async () => {
    const node = createPostconditionGateNode()
    const state = makeBaseState({ postconditionResult: makePassingResult(), retryCount: 1 })
    const result = await node(state)
    expect(result.retryCount).toBeUndefined()
  })
})
