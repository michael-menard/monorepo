/**
 * result_interpreter node tests (qa-verify-v2)
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
  buildInterpreterPrompt,
  createResultInterpreterNode,
} from '../result-interpreter.js'
import type { ParsedAC, QAVerifyV2State } from '../../../state/qa-verify-v2-state.js'
import type { TestRunResult } from '../../../state/dev-implement-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeParsedAC(index: number, testType: ParsedAC['testType'] = 'unit'): ParsedAC {
  return {
    index,
    original: `AC ${index}`,
    testableAssertion: `When X then Y (${index})`,
    testType,
    testHints: [],
  }
}

function makePassingTest(): TestRunResult {
  return { passed: true, passedCount: 3, failedCount: 0, failures: [], rawOutput: '3 tests pass' }
}

function makeFailingTest(): TestRunResult {
  return {
    passed: false,
    passedCount: 1,
    failedCount: 1,
    failures: [{ testName: 'should auth', error: 'Expected true' }],
    rawOutput: '1 passed, 1 failed',
  }
}

function makeState(overrides: Partial<QAVerifyV2State> = {}): QAVerifyV2State {
  return {
    storyId: 'WINT-1234',
    parsedACs: [makeParsedAC(0), makeParsedAC(1)],
    testStrategy: {
      unitTestFilter: 'src/auth',
      e2eTestPattern: '',
      manualCheckItems: [],
      skipReasons: [],
    },
    unitTestResult: makePassingTest(),
    e2eTestResult: null,
    acVerificationResults: [],
    qaVerdict: null,
    postconditionResult: null,
    qaVerifyV2Phase: 'result_interpreter',
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
// buildInterpreterPrompt tests
// ============================================================================

describe('buildInterpreterPrompt', () => {
  it('includes AC list', () => {
    const prompt = buildInterpreterPrompt([makeParsedAC(0)], makePassingTest(), null)
    expect(prompt).toContain('When X then Y (0)')
  })

  it('includes unit test results', () => {
    const prompt = buildInterpreterPrompt([], makePassingTest(), null)
    expect(prompt).toContain('3 passed')
  })

  it('shows not run when unit test is null', () => {
    const prompt = buildInterpreterPrompt([], null, null)
    expect(prompt).toContain('not run')
  })

  it('includes failures', () => {
    const prompt = buildInterpreterPrompt([], makeFailingTest(), null)
    expect(prompt).toContain('should auth')
  })
})

// ============================================================================
// createResultInterpreterNode tests
// ============================================================================

describe('createResultInterpreterNode', () => {
  it('produces acVerificationResults with no-op adapter', async () => {
    const node = createResultInterpreterNode()
    const result = await node(makeState())
    expect(Array.isArray(result.acVerificationResults)).toBe(true)
  })

  it('fills in skip/manual for uncovered ACs', async () => {
    // no-op adapter returns empty results, node fills in skips
    const node = createResultInterpreterNode()
    const result = await node(makeState())
    const results = result.acVerificationResults as Array<{ acIndex: number; verdict: string }>
    expect(results.length).toBe(2) // both ACs covered
  })

  it('calls llmAdapter', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      content: JSON.stringify({
        results: [
          { acIndex: 0, acText: 'AC 0', verdict: 'pass', evidence: 'test passed' },
          { acIndex: 1, acText: 'AC 1', verdict: 'pass', evidence: 'test passed' },
        ],
      }),
      inputTokens: 20,
      outputTokens: 10,
    })
    const node = createResultInterpreterNode({ llmAdapter })
    await node(makeState())
    expect(llmAdapter).toHaveBeenCalled()
  })

  it('tracks token usage', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      content: JSON.stringify({ results: [] }),
      inputTokens: 40,
      outputTokens: 20,
    })
    const node = createResultInterpreterNode({ llmAdapter })
    const result = await node(makeState())
    expect(Array.isArray(result.tokenUsage)).toBe(true)
  })

  it('sets phase to evidence_assembler', async () => {
    const node = createResultInterpreterNode()
    const result = await node(makeState())
    expect(result.qaVerifyV2Phase).toBe('evidence_assembler')
  })

  it('degrades gracefully when LLM throws', async () => {
    const llmAdapter = vi.fn().mockRejectedValue(new Error('LLM crash'))
    const node = createResultInterpreterNode({ llmAdapter })
    const result = await node(makeState())
    // Should still produce results (all skips)
    expect(Array.isArray(result.acVerificationResults)).toBe(true)
  })
})
