/**
 * postcondition_gate node tests (dev-implement-v2)
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
  checkDevImplementPostconditions,
  afterDevImplementGate,
  createDevImplementPostconditionGateNode,
} from '../postcondition-gate.js'
import type { ExecutorOutcome, DevImplementV2State } from '../../../state/dev-implement-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeCompleteOutcome(overrides: Partial<ExecutorOutcome> = {}): ExecutorOutcome {
  return {
    verdict: 'complete',
    filesCreated: ['src/auth.ts'],
    filesModified: [],
    testsRan: true,
    testsPassed: true,
    testOutput: '2 tests pass',
    diagnosis: '',
    acVerification: [
      { acIndex: 0, acText: 'User can log in', verified: true, evidence: 'test line 12' },
    ],
    ...overrides,
  }
}

function makeState(overrides: Partial<DevImplementV2State> = {}): DevImplementV2State {
  return {
    storyId: 'WINT-1234',
    storyGroundingContext: null,
    implementationPlan: null,
    executorOutcome: makeCompleteOutcome(),
    postconditionResult: null,
    devImplementV2Phase: 'postcondition_gate',
    tokenUsage: [],
    bakeOffVersion: 'v2-agentic',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

// ============================================================================
// checkDevImplementPostconditions tests
// ============================================================================

describe('checkDevImplementPostconditions', () => {
  it('passes when outcome complete + tests ran/passed', () => {
    const result = checkDevImplementPostconditions(makeCompleteOutcome())
    expect(result.passed).toBe(true)
    expect(result.failures).toHaveLength(0)
  })

  it('fails when outcome is null', () => {
    const result = checkDevImplementPostconditions(null)
    expect(result.passed).toBe(false)
    expect(result.failures[0].check).toBe('outcome_exists')
  })

  it('fails with diagnosis when verdict is stuck', () => {
    const outcome: ExecutorOutcome = {
      verdict: 'stuck',
      filesCreated: [],
      filesModified: [],
      testsRan: false,
      testsPassed: false,
      testOutput: '',
      diagnosis: 'bcrypt not installed',
      acVerification: [],
    }
    const result = checkDevImplementPostconditions(outcome)
    expect(result.passed).toBe(false)
    expect(result.failures[0].check).toBe('executor_completed')
    expect(result.failures[0].reason).toContain('bcrypt not installed')
  })

  it('fails when tests did not run', () => {
    const result = checkDevImplementPostconditions(makeCompleteOutcome({ testsRan: false }))
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'tests_ran')).toBe(true)
  })

  it('fails when tests did not pass', () => {
    const result = checkDevImplementPostconditions(
      makeCompleteOutcome({ testsRan: true, testsPassed: false, testOutput: '1 failed' }),
    )
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'tests_passed')).toBe(true)
  })

  it('fails when no ACs verified (with ACs present)', () => {
    const result = checkDevImplementPostconditions(
      makeCompleteOutcome({
        acVerification: [
          { acIndex: 0, acText: 'log in', verified: false, evidence: '' },
        ],
      }),
    )
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'ac_verified')).toBe(true)
  })

  it('passes when no ACs present (empty acVerification)', () => {
    const result = checkDevImplementPostconditions(
      makeCompleteOutcome({ acVerification: [] }),
    )
    expect(result.passed).toBe(true)
  })

  it('includes evidence in result', () => {
    const result = checkDevImplementPostconditions(makeCompleteOutcome())
    expect(result.evidence).toBeDefined()
    expect(result.evidence['filesCreated']).toContain('src/auth.ts')
  })
})

// ============================================================================
// afterDevImplementGate tests
// ============================================================================

describe('afterDevImplementGate', () => {
  it('routes to complete when phase is complete', () => {
    expect(afterDevImplementGate(makeState({ devImplementV2Phase: 'complete' }))).toBe('complete')
  })

  it('routes to __end__ for any other phase', () => {
    expect(afterDevImplementGate(makeState({ devImplementV2Phase: 'error' }))).toBe('__end__')
    expect(afterDevImplementGate(makeState({ devImplementV2Phase: 'postcondition_gate' }))).toBe(
      '__end__',
    )
  })
})

// ============================================================================
// createDevImplementPostconditionGateNode tests
// ============================================================================

describe('createDevImplementPostconditionGateNode', () => {
  it('sets phase to complete when postconditions pass', async () => {
    const node = createDevImplementPostconditionGateNode()
    const result = await node(makeState())
    expect(result.devImplementV2Phase).toBe('complete')
  })

  it('sets phase to error when postconditions fail', async () => {
    const node = createDevImplementPostconditionGateNode()
    const result = await node(makeState({ executorOutcome: null }))
    expect(result.devImplementV2Phase).toBe('error')
  })

  it('adds failure summary to errors[] on failure', async () => {
    const node = createDevImplementPostconditionGateNode()
    const result = await node(makeState({ executorOutcome: null }))
    expect(result.errors?.[0]).toContain('outcome_exists')
  })

  it('attaches diagnosis from stuck outcome', async () => {
    const node = createDevImplementPostconditionGateNode()
    const result = await node(
      makeState({
        executorOutcome: {
          verdict: 'stuck',
          filesCreated: [],
          filesModified: [],
          testsRan: false,
          testsPassed: false,
          testOutput: '',
          diagnosis: 'Cannot find module',
          acVerification: [],
        },
      }),
    )
    expect(result.errors?.[0]).toContain('Cannot find module')
  })

  it('sets postconditionResult', async () => {
    const node = createDevImplementPostconditionGateNode()
    const result = await node(makeState())
    expect(result.postconditionResult).toBeDefined()
    expect(result.postconditionResult?.passed).toBe(true)
  })
})
