/**
 * test_executor node tests (qa-verify-v2)
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

import { createTestExecutorNode } from '../test-executor.js'
import type { QAVerifyV2State } from '../../../state/qa-verify-v2-state.js'
import type { TestRunResult } from '../../../state/dev-implement-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeState(overrides: Partial<QAVerifyV2State> = {}): QAVerifyV2State {
  return {
    storyId: 'WINT-1234',
    parsedACs: [],
    testStrategy: {
      unitTestFilter: 'src/auth',
      e2eTestPattern: 'auth/login.spec.ts',
      manualCheckItems: [],
      skipReasons: [],
    },
    unitTestResult: null,
    e2eTestResult: null,
    acVerificationResults: [],
    qaVerdict: null,
    postconditionResult: null,
    qaVerifyV2Phase: 'test_executor',
    retryCount: 0,
    maxRetries: 1,
    tokenUsage: [],
    bakeOffVersion: 'v2-agentic',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

function makePassingResult(): TestRunResult {
  return { passed: true, passedCount: 3, failedCount: 0, failures: [], rawOutput: 'All pass' }
}

function makeFailingResult(): TestRunResult {
  return {
    passed: false,
    passedCount: 1,
    failedCount: 2,
    failures: [{ testName: 'test1', error: 'Expected true' }],
    rawOutput: '1 passed, 2 failed',
  }
}

// ============================================================================
// createTestExecutorNode tests
// ============================================================================

describe('createTestExecutorNode', () => {
  it('uses no-op runners by default (both return passed: true)', async () => {
    const node = createTestExecutorNode()
    const result = await node(makeState())
    expect(result.unitTestResult?.passed).toBe(true)
    expect(result.e2eTestResult?.passed).toBe(true)
  })

  it('calls unit runner with unitTestFilter', async () => {
    const unitTestRunner = vi.fn().mockResolvedValue(makePassingResult())
    const node = createTestExecutorNode({ unitTestRunner })
    await node(makeState())
    expect(unitTestRunner).toHaveBeenCalledWith('src/auth')
  })

  it('calls e2e runner with e2eTestPattern', async () => {
    const e2eTestRunner = vi.fn().mockResolvedValue(makePassingResult())
    const node = createTestExecutorNode({ e2eTestRunner })
    await node(makeState())
    expect(e2eTestRunner).toHaveBeenCalledWith('auth/login.spec.ts')
  })

  it('skips unit tests when filter is empty', async () => {
    const unitTestRunner = vi.fn().mockResolvedValue(makePassingResult())
    const node = createTestExecutorNode({ unitTestRunner })
    const result = await node(makeState({
      testStrategy: { unitTestFilter: '', e2eTestPattern: '', manualCheckItems: [], skipReasons: [] },
    }))
    expect(unitTestRunner).not.toHaveBeenCalled()
    expect(result.unitTestResult).toBeNull()
  })

  it('skips e2e tests when pattern is empty', async () => {
    const e2eTestRunner = vi.fn().mockResolvedValue(makePassingResult())
    const node = createTestExecutorNode({ e2eTestRunner })
    const result = await node(makeState({
      testStrategy: { unitTestFilter: 'src/', e2eTestPattern: '', manualCheckItems: [], skipReasons: [] },
    }))
    expect(e2eTestRunner).not.toHaveBeenCalled()
    expect(result.e2eTestResult).toBeNull()
  })

  it('degrades gracefully when unit runner throws', async () => {
    const unitTestRunner = vi.fn().mockRejectedValue(new Error('runner crash'))
    const node = createTestExecutorNode({ unitTestRunner })
    const result = await node(makeState())
    expect(result.unitTestResult?.passed).toBe(true)
    expect(result.unitTestResult?.rawOutput).toContain('runner crash')
  })

  it('sets phase to result_interpreter', async () => {
    const node = createTestExecutorNode()
    const result = await node(makeState())
    expect(result.qaVerifyV2Phase).toBe('result_interpreter')
  })

  it('stores failing test results', async () => {
    const unitTestRunner = vi.fn().mockResolvedValue(makeFailingResult())
    const node = createTestExecutorNode({ unitTestRunner })
    const result = await node(makeState())
    expect(result.unitTestResult?.passed).toBe(false)
    expect(result.unitTestResult?.failedCount).toBe(2)
  })
})
