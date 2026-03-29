/**
 * test_strategy_agent node tests (qa-verify-v2)
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
  buildStrategyPrompt,
  createTestStrategyAgentNode,
} from '../test-strategy-agent.js'
import type { ParsedAC, QAVerifyV2State } from '../../../state/qa-verify-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeParsedAC(index: number, testType: ParsedAC['testType'] = 'unit'): ParsedAC {
  return {
    index,
    original: `AC ${index}`,
    testableAssertion: `When X then Y`,
    testType,
    testHints: ['createUser', 'validateInput'],
  }
}

function makeState(overrides: Partial<QAVerifyV2State> = {}): QAVerifyV2State {
  return {
    storyId: 'WINT-1234',
    parsedACs: [makeParsedAC(0, 'unit'), makeParsedAC(1, 'e2e')],
    testStrategy: null,
    unitTestResult: null,
    e2eTestResult: null,
    acVerificationResults: [],
    qaVerdict: null,
    postconditionResult: null,
    qaVerifyV2Phase: 'test_strategy_agent',
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
// buildStrategyPrompt tests
// ============================================================================

describe('buildStrategyPrompt', () => {
  it('includes story ID', () => {
    const prompt = buildStrategyPrompt([makeParsedAC(0)], 'WINT-1234')
    expect(prompt).toContain('WINT-1234')
  })

  it('includes AC types', () => {
    const prompt = buildStrategyPrompt([makeParsedAC(0, 'unit'), makeParsedAC(1, 'e2e')], 'WINT-1234')
    expect(prompt).toContain('unit')
    expect(prompt).toContain('e2e')
  })

  it('includes test hints', () => {
    const prompt = buildStrategyPrompt([makeParsedAC(0)], 'WINT-1234')
    expect(prompt).toContain('createUser')
  })
})

// ============================================================================
// createTestStrategyAgentNode tests
// ============================================================================

describe('createTestStrategyAgentNode', () => {
  it('produces testStrategy with no-op adapter', async () => {
    const node = createTestStrategyAgentNode()
    const result = await node(makeState())
    expect(result.testStrategy).not.toBeNull()
  })

  it('ensures unitTestFilter is set for unit ACs', async () => {
    const node = createTestStrategyAgentNode()
    const result = await node(makeState({ parsedACs: [makeParsedAC(0, 'unit')] }))
    expect((result.testStrategy as { unitTestFilter: string })?.unitTestFilter).toBeTruthy()
  })

  it('calls llmAdapter', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      content: JSON.stringify({
        unitTestFilter: 'src/auth',
        e2eTestPattern: '',
        manualCheckItems: [],
        skipReasons: [],
      }),
      inputTokens: 10,
      outputTokens: 5,
    })
    const node = createTestStrategyAgentNode({ llmAdapter })
    await node(makeState())
    expect(llmAdapter).toHaveBeenCalled()
  })

  it('tracks token usage', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      content: JSON.stringify({ unitTestFilter: 'src/', e2eTestPattern: '', manualCheckItems: [], skipReasons: [] }),
      inputTokens: 40,
      outputTokens: 20,
    })
    const node = createTestStrategyAgentNode({ llmAdapter })
    const result = await node(makeState())
    expect(Array.isArray(result.tokenUsage)).toBe(true)
  })

  it('sets phase to test_executor', async () => {
    const node = createTestStrategyAgentNode()
    const result = await node(makeState())
    expect(result.qaVerifyV2Phase).toBe('test_executor')
  })

  it('degrades gracefully when LLM throws', async () => {
    const llmAdapter = vi.fn().mockRejectedValue(new Error('LLM offline'))
    const node = createTestStrategyAgentNode({ llmAdapter })
    const result = await node(makeState())
    expect(result.testStrategy).not.toBeNull()
    expect(result.qaVerifyV2Phase).toBe('test_executor')
  })
})
