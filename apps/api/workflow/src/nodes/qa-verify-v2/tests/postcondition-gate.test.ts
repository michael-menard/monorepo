/**
 * postcondition_gate node tests (qa-verify-v2)
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
  checkQaPostconditions,
  afterQaGate,
  createQaPostconditionGateNode,
} from '../postcondition-gate.js'
import type {
  ACVerificationResult,
  ParsedAC,
  QAVerifyV2State,
} from '../../../state/qa-verify-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeParsedAC(index: number): ParsedAC {
  return {
    index,
    original: `AC ${index}`,
    testableAssertion: `When X then Y`,
    testType: 'unit',
    testHints: [],
  }
}

function makeResult(acIndex: number, verdict: ACVerificationResult['verdict'] = 'pass'): ACVerificationResult {
  return {
    acIndex,
    acText: `AC ${acIndex}`,
    verdict,
    evidence: verdict === 'pass' ? 'test passed' : '',
  }
}

function makeState(overrides: Partial<QAVerifyV2State> = {}): QAVerifyV2State {
  return {
    storyId: 'WINT-1234',
    parsedACs: [makeParsedAC(0), makeParsedAC(1)],
    testStrategy: null,
    unitTestResult: null,
    e2eTestResult: null,
    acVerificationResults: [makeResult(0), makeResult(1)],
    qaVerdict: 'pass',
    postconditionResult: null,
    qaVerifyV2Phase: 'postcondition_gate',
    retryCount: 0,
    maxRetries: 1,
    tokenUsage: [],
    bakeOffVersion: 'v2-agentic',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

// ============================================================================
// checkQaPostconditions tests
// ============================================================================

describe('checkQaPostconditions', () => {
  it('passes when all ACs have verdicts and qaVerdict is set', () => {
    const results = [makeResult(0), makeResult(1)]
    const parsedACs = [makeParsedAC(0), makeParsedAC(1)]
    const result = checkQaPostconditions(results, parsedACs, 'pass')
    expect(result.passed).toBe(true)
  })

  it('fails when qaVerdict is null', () => {
    const result = checkQaPostconditions([makeResult(0)], [makeParsedAC(0)], null)
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'verdict_set')).toBe(true)
  })

  it('fails when an AC is missing a verdict', () => {
    const result = checkQaPostconditions([makeResult(0)], [makeParsedAC(0), makeParsedAC(1)], 'pass')
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'all_acs_have_verdict')).toBe(true)
  })

  it('fails when pass verdict has empty evidence', () => {
    const results = [{ ...makeResult(0), evidence: '' }]
    const result = checkQaPostconditions(results, [makeParsedAC(0)], 'pass')
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'evidence_non_empty')).toBe(true)
  })

  it('passes when all ACs are manual (no evidence required)', () => {
    const results = [{ ...makeResult(0, 'manual'), evidence: '' }]
    const result = checkQaPostconditions(results, [makeParsedAC(0)], 'conditional_pass')
    expect(result.passed).toBe(true)
  })
})

// ============================================================================
// afterQaGate tests
// ============================================================================

describe('afterQaGate', () => {
  it('routes to complete when phase is complete', () => {
    expect(afterQaGate(makeState({ qaVerifyV2Phase: 'complete' }))).toBe('complete')
  })

  it('routes to result_interpreter when phase is result_interpreter', () => {
    expect(afterQaGate(makeState({ qaVerifyV2Phase: 'result_interpreter' }))).toBe('result_interpreter')
  })

  it('routes to __end__ for other phases', () => {
    expect(afterQaGate(makeState({ qaVerifyV2Phase: 'error' }))).toBe('__end__')
  })
})

// ============================================================================
// createQaPostconditionGateNode tests
// ============================================================================

describe('createQaPostconditionGateNode', () => {
  it('sets phase to complete when postconditions pass', async () => {
    const node = createQaPostconditionGateNode()
    const result = await node(makeState())
    expect(result.qaVerifyV2Phase).toBe('complete')
  })

  it('retries when postconditions fail and retries remain', async () => {
    const node = createQaPostconditionGateNode()
    const result = await node(makeState({
      qaVerdict: null, // will cause verdict_set failure
      retryCount: 0,
      maxRetries: 1,
    }))
    expect(result.qaVerifyV2Phase).toBe('result_interpreter')
    expect(result.retryCount).toBe(1)
  })

  it('completes when max retries exhausted', async () => {
    const node = createQaPostconditionGateNode()
    const result = await node(makeState({
      qaVerdict: null,
      retryCount: 1,
      maxRetries: 1,
    }))
    expect(result.qaVerifyV2Phase).toBe('complete')
  })
})
