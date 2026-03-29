/**
 * Dev Implement V2 Graph tests
 *
 * Graph no longer has test_runner or self_correction nodes.
 * Executor owns testing — exits via complete or stuck.
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

import { createDevImplementV2Graph, afterDevImplementGate } from '../dev-implement-v2.js'
import type { DevImplementV2State } from '../../state/dev-implement-v2-state.js'

// ============================================================================
// Test Fixtures
// ============================================================================

const makeCompleteAdapter = () =>
  vi.fn().mockResolvedValue({
    content: JSON.stringify({
      tool: 'complete',
      args: {
        filesCreated: ['src/auth.ts', 'src/auth.test.ts'],
        filesModified: [],
        testsRan: true,
        testsPassed: true,
        testOutput: 'All tests pass',
        acVerification: [],
      },
    }),
    inputTokens: 10,
    outputTokens: 5,
  })

const makeStuckAdapter = () =>
  vi.fn().mockResolvedValue({
    content: JSON.stringify({
      tool: 'stuck',
      args: {
        diagnosis: 'Cannot resolve import: bcrypt',
        filesCreated: [],
        filesModified: [],
      },
    }),
    inputTokens: 8,
    outputTokens: 4,
  })

const makeState = (overrides: Partial<DevImplementV2State> = {}): DevImplementV2State => ({
  storyId: 'WINT-1234',
  storyGroundingContext: null,
  implementationPlan: null,
  executorOutcome: null,
  postconditionResult: null,
  devImplementV2Phase: 'story_scout',
  tokenUsage: [],
  bakeOffVersion: 'v2-agentic',
  warnings: [],
  errors: [],
  ...overrides,
})

// ============================================================================
// Graph Compilation Tests
// ============================================================================

describe('createDevImplementV2Graph', () => {
  it('compiles without error with no config', () => {
    expect(() => createDevImplementV2Graph()).not.toThrow()
  })

  it('compiles with all adapters provided', () => {
    expect(() =>
      createDevImplementV2Graph({
        kbStoryAdapter: vi.fn(),
        codebaseSearch: vi.fn(),
        plannerLlmAdapter: makeCompleteAdapter(),
        queryKb: vi.fn(),
        searchCodebase: vi.fn(),
        readFile: vi.fn(),
        executorLlmAdapter: makeCompleteAdapter(),
        writeFile: vi.fn(),
        runTests: vi.fn(),
        maxInternalIterations: 3,
        maxPlannerIterations: 2,
        bakeOffVersion: 'v2-test',
      }),
    ).not.toThrow()
  })

  it('returns a compiled graph with invoke method', () => {
    const graph = createDevImplementV2Graph()
    expect(typeof graph.invoke).toBe('function')
  })
})

// ============================================================================
// afterDevImplementGate routing tests
// ============================================================================

describe('afterDevImplementGate', () => {
  it('routes to complete when phase is complete', () => {
    expect(afterDevImplementGate(makeState({ devImplementV2Phase: 'complete' }))).toBe('complete')
  })

  it('routes to __end__ for error phase', () => {
    expect(afterDevImplementGate(makeState({ devImplementV2Phase: 'error' }))).toBe('__end__')
  })

  it('routes to __end__ for any non-complete phase', () => {
    expect(afterDevImplementGate(makeState({ devImplementV2Phase: 'implementation_executor' }))).toBe(
      '__end__',
    )
  })
})

// ============================================================================
// Graph Invocation Tests
// ============================================================================

describe('dev-implement-v2 graph invocation', () => {
  it('completes with default no-op adapters', async () => {
    const graph = createDevImplementV2Graph()
    const result = await graph.invoke({ storyId: 'WINT-1234' })
    expect(result.storyId).toBe('WINT-1234')
    expect(result.bakeOffVersion).toBe('v2-agentic')
  })

  it('sets bakeOffVersion to v2-agentic by default', async () => {
    const graph = createDevImplementV2Graph()
    const result = await graph.invoke({ storyId: 'WINT-9999' })
    expect(result.bakeOffVersion).toBe('v2-agentic')
  })

  it('calls kbStoryAdapter with the storyId', async () => {
    const kbStoryAdapter = vi.fn().mockResolvedValue({
      title: 'Test Story',
      acceptanceCriteria: [],
      subtasks: [],
    })
    const graph = createDevImplementV2Graph({ kbStoryAdapter })
    await graph.invoke({ storyId: 'WINT-1234' })
    expect(kbStoryAdapter).toHaveBeenCalledWith('WINT-1234')
  })

  it('runs story_scout and produces storyGroundingContext', async () => {
    const graph = createDevImplementV2Graph()
    const result = await graph.invoke({ storyId: 'WINT-1234' })
    expect(result.storyGroundingContext).not.toBeNull()
  })

  it('runs implementation_planner and produces implementationPlan', async () => {
    const graph = createDevImplementV2Graph()
    const result = await graph.invoke({ storyId: 'WINT-1234' })
    expect(result.implementationPlan).not.toBeNull()
  })

  it('produces executorOutcome from implementation_executor', async () => {
    const graph = createDevImplementV2Graph()
    const result = await graph.invoke({ storyId: 'WINT-1234' })
    expect(result.executorOutcome).not.toBeNull()
    expect(result.executorOutcome?.verdict).toBe('complete')
  })

  it('accumulates tokenUsage across LLM calls', async () => {
    const llmAdapter = makeCompleteAdapter()
    const graph = createDevImplementV2Graph({
      plannerLlmAdapter: llmAdapter,
      executorLlmAdapter: llmAdapter,
    })
    const result = await graph.invoke({ storyId: 'WINT-1234' })
    expect(Array.isArray(result.tokenUsage)).toBe(true)
  })

  it('ends gracefully (does not throw) when executor calls stuck', async () => {
    const graph = createDevImplementV2Graph({
      executorLlmAdapter: makeStuckAdapter(),
    })
    await expect(graph.invoke({ storyId: 'WINT-1234' })).resolves.not.toThrow()
  })

  it('does NOT retry after executor stuck — ends immediately', async () => {
    const stuckAdapter = makeStuckAdapter()
    const graph = createDevImplementV2Graph({ executorLlmAdapter: stuckAdapter })
    await graph.invoke({ storyId: 'WINT-1234' })
    // Stuck adapter should only be called once (no retry)
    expect(stuckAdapter).toHaveBeenCalledTimes(1)
  })

  it('ends gracefully with bad LLM adapter (throws)', async () => {
    const badAdapter = vi.fn().mockRejectedValue(new Error('LLM crash'))
    const graph = createDevImplementV2Graph({
      plannerLlmAdapter: badAdapter,
      executorLlmAdapter: badAdapter,
    })
    await expect(graph.invoke({ storyId: 'WINT-1234' })).resolves.not.toThrow()
  }, 15000)

  it('calls runTests adapter when invoked with it', async () => {
    const runTests = vi.fn().mockResolvedValue({ passed: true, output: 'OK', failures: [] })
    let executorCallCount = 0
    const executorLlmAdapter = vi.fn().mockImplementation(async () => {
      executorCallCount++
      if (executorCallCount === 1) {
        return {
          content: JSON.stringify({ tool: 'run_tests', args: { filter: 'src/' } }),
          inputTokens: 5,
          outputTokens: 3,
        }
      }
      return {
        content: JSON.stringify({
          tool: 'complete',
          args: {
            filesCreated: ['src/auth.ts'],
            filesModified: [],
            testsRan: true,
            testsPassed: true,
            testOutput: 'OK',
            acVerification: [],
          },
        }),
        inputTokens: 5,
        outputTokens: 3,
      }
    })
    const graph = createDevImplementV2Graph({ executorLlmAdapter, runTests })
    await graph.invoke({ storyId: 'WINT-1234' })
    expect(runTests).toHaveBeenCalledWith('src/')
  })
})
