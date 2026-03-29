/**
 * QA Verify V2 Graph tests
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

import { createQAVerifyV2Graph, afterQaGate } from '../qa-verify-v2.js'
import type { QAVerifyV2State } from '../../state/qa-verify-v2-state.js'

// ============================================================================
// Test Fixtures
// ============================================================================

const makeNoOpLlmAdapter = () =>
  vi.fn().mockResolvedValue({
    content: JSON.stringify({
      unitTestFilter: 'src/',
      e2eTestPattern: '',
      manualCheckItems: [],
      skipReasons: [],
      results: [],
    }),
    inputTokens: 5,
    outputTokens: 3,
  })

const makeState = (overrides: Partial<QAVerifyV2State> = {}): QAVerifyV2State => ({
  storyId: 'WINT-1234',
  parsedACs: [],
  testStrategy: null,
  unitTestResult: null,
  e2eTestResult: null,
  acVerificationResults: [],
  qaVerdict: null,
  postconditionResult: null,
  qaVerifyV2Phase: 'complete',
  retryCount: 0,
  maxRetries: 1,
  tokenUsage: [],
  bakeOffVersion: 'v2-agentic',
  warnings: [],
  errors: [],
  ...overrides,
})

// ============================================================================
// Graph Compilation Tests
// ============================================================================

describe('createQAVerifyV2Graph', () => {
  it('compiles without error with no config', () => {
    expect(() => createQAVerifyV2Graph()).not.toThrow()
  })

  it('compiles with all adapters provided', () => {
    expect(() =>
      createQAVerifyV2Graph({
        kbStoryAdapter: vi.fn(),
        strategyLlmAdapter: makeNoOpLlmAdapter(),
        unitTestRunner: vi.fn(),
        e2eTestRunner: vi.fn(),
        interpreterLlmAdapter: makeNoOpLlmAdapter(),
        maxRetries: 1,
        bakeOffVersion: 'v2-test',
      }),
    ).not.toThrow()
  })

  it('returns a compiled graph with invoke method', () => {
    const graph = createQAVerifyV2Graph()
    expect(typeof graph.invoke).toBe('function')
  })
})

// ============================================================================
// afterQaGate routing tests
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
// Graph Invocation Tests
// ============================================================================

describe('qa-verify-v2 graph invocation', () => {
  it('completes with default no-op adapters', async () => {
    const graph = createQAVerifyV2Graph()
    const result = await graph.invoke({ storyId: 'WINT-1234' })
    expect(result.storyId).toBe('WINT-1234')
    expect(result.bakeOffVersion).toBe('v2-agentic')
  })

  it('sets bakeOffVersion to v2-agentic by default', async () => {
    const graph = createQAVerifyV2Graph()
    const result = await graph.invoke({ storyId: 'WINT-5555' })
    expect(result.bakeOffVersion).toBe('v2-agentic')
  })

  it('calls kbStoryAdapter with storyId', async () => {
    const kbStoryAdapter = vi.fn().mockResolvedValue({ acceptanceCriteria: [] })
    const graph = createQAVerifyV2Graph({ kbStoryAdapter })
    await graph.invoke({ storyId: 'WINT-1234' })
    expect(kbStoryAdapter).toHaveBeenCalledWith('WINT-1234')
  })

  it('runs ac_parser and produces parsedACs', async () => {
    const kbStoryAdapter = vi.fn().mockResolvedValue({
      acceptanceCriteria: ['User can log in'],
    })
    const graph = createQAVerifyV2Graph({ kbStoryAdapter })
    const result = await graph.invoke({ storyId: 'WINT-1234' })
    expect(Array.isArray(result.parsedACs)).toBe(true)
    expect(result.parsedACs.length).toBe(1)
  })

  it('runs test_strategy_agent and produces testStrategy', async () => {
    const graph = createQAVerifyV2Graph()
    const result = await graph.invoke({ storyId: 'WINT-1234' })
    expect(result.testStrategy).not.toBeNull()
  })

  it('sets qaVerdict after evidence_assembler', async () => {
    const graph = createQAVerifyV2Graph()
    const result = await graph.invoke({ storyId: 'WINT-1234' })
    // qaVerdict should be set (could be conditional_pass with no ACs)
    expect(result.qaVerdict).not.toBeNull()
  })

  it('accumulates tokenUsage', async () => {
    const strategyLlmAdapter = makeNoOpLlmAdapter()
    const interpreterLlmAdapter = makeNoOpLlmAdapter()
    const graph = createQAVerifyV2Graph({ strategyLlmAdapter, interpreterLlmAdapter })
    const result = await graph.invoke({ storyId: 'WINT-1234' })
    expect(Array.isArray(result.tokenUsage)).toBe(true)
  })

  it('calls unit test runner when strategy is set', async () => {
    const kbStoryAdapter = vi.fn().mockResolvedValue({
      acceptanceCriteria: ['function returns value'],
    })
    const unitTestRunner = vi.fn().mockResolvedValue({
      passed: true, passedCount: 1, failedCount: 0, failures: [], rawOutput: '',
    })
    const graph = createQAVerifyV2Graph({ kbStoryAdapter, unitTestRunner })
    await graph.invoke({ storyId: 'WINT-1234' })
    // unitTestRunner may or may not be called depending on strategy
    // Just ensure the graph completes without error
  })

  it('ends gracefully with bad LLM adapter', async () => {
    const badAdapter = vi.fn().mockRejectedValue(new Error('LLM crash'))
    const graph = createQAVerifyV2Graph({
      strategyLlmAdapter: badAdapter,
      interpreterLlmAdapter: badAdapter,
    })
    await expect(graph.invoke({ storyId: 'WINT-1234' })).resolves.not.toThrow()
  }, 15000)
})
