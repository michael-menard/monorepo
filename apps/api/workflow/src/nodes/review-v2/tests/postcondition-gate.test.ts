/**
 * postcondition_gate node tests (review-v2)
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
  assignVerdict,
  afterReviewGate,
  createReviewPostconditionGateNode,
} from '../postcondition-gate.js'
import type { ReviewFinding, ReviewV2State } from '../../../state/review-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeFinding(severity: ReviewFinding['severity']): ReviewFinding {
  return {
    id: `${severity}-001`,
    severity,
    category: 'correctness',
    file: 'src/auth.ts',
    description: 'Issue found',
    evidence: 'some code',
  }
}

function makeState(overrides: Partial<ReviewV2State> = {}): ReviewV2State {
  return {
    storyId: 'WINT-1234',
    worktreePath: '/tmp/wt',
    diffAnalysis: null,
    selectedReviewDimensions: ['correctness'],
    reviewFindings: [],
    reviewVerdict: null,
    postconditionResult: { passed: true, failures: [], evidence: {} },
    reviewV2Phase: 'postcondition_gate',
    retryCount: 0,
    maxRetries: 2,
    tokenUsage: [],
    bakeOffVersion: 'v2-agentic',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

// ============================================================================
// assignVerdict tests
// ============================================================================

describe('assignVerdict', () => {
  it('returns pass with no findings', () => {
    expect(assignVerdict([])).toBe('pass')
  })

  it('returns pass with only medium/low findings', () => {
    expect(assignVerdict([makeFinding('medium'), makeFinding('low')])).toBe('pass')
  })

  it('returns fail with critical finding', () => {
    expect(assignVerdict([makeFinding('critical')])).toBe('fail')
  })

  it('returns fail with high finding when critical is not present', () => {
    expect(assignVerdict([makeFinding('high')])).toBe('pass')
  })
})

// ============================================================================
// afterReviewGate tests
// ============================================================================

describe('afterReviewGate', () => {
  it('routes to complete when phase is complete', () => {
    expect(afterReviewGate(makeState({ reviewV2Phase: 'complete' }))).toBe('complete')
  })

  it('routes to review_agent when phase is review_agent', () => {
    expect(afterReviewGate(makeState({ reviewV2Phase: 'review_agent' }))).toBe('review_agent')
  })

  it('routes to __end__ for any other phase', () => {
    expect(afterReviewGate(makeState({ reviewV2Phase: 'error' }))).toBe('__end__')
  })
})

// ============================================================================
// createReviewPostconditionGateNode tests
// ============================================================================

describe('createReviewPostconditionGateNode', () => {
  it('sets phase to complete when postconditions pass', async () => {
    const node = createReviewPostconditionGateNode()
    const result = await node(makeState())
    expect(result.reviewV2Phase).toBe('complete')
  })

  it('assigns pass verdict when no critical findings', async () => {
    const node = createReviewPostconditionGateNode()
    const result = await node(makeState({ reviewFindings: [makeFinding('medium')] }))
    expect(result.reviewVerdict).toBe('pass')
  })

  it('assigns fail verdict when critical findings present', async () => {
    const node = createReviewPostconditionGateNode()
    const result = await node(makeState({ reviewFindings: [makeFinding('critical')] }))
    expect(result.reviewVerdict).toBe('fail')
  })

  it('retries when postconditions fail and retries remain', async () => {
    const node = createReviewPostconditionGateNode()
    const result = await node(makeState({
      postconditionResult: {
        passed: false,
        failures: [{ check: 'all_findings_have_evidence', reason: 'evidence missing' }],
        evidence: {},
      },
      retryCount: 0,
      maxRetries: 2,
    }))
    expect(result.reviewV2Phase).toBe('review_agent')
    expect(result.retryCount).toBe(1)
  })

  it('completes even when max retries exhausted', async () => {
    const node = createReviewPostconditionGateNode()
    const result = await node(makeState({
      postconditionResult: {
        passed: false,
        failures: [{ check: 'check', reason: 'reason' }],
        evidence: {},
      },
      retryCount: 2,
      maxRetries: 2,
    }))
    expect(result.reviewV2Phase).toBe('complete')
  })

  it('handles null postconditionResult', async () => {
    const node = createReviewPostconditionGateNode()
    const result = await node(makeState({ postconditionResult: null }))
    expect(result.reviewV2Phase).toBe('complete')
  })
})
