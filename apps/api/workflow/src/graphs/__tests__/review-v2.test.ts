/**
 * Review V2 Graph tests
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

import { createReviewV2Graph, afterReviewGate } from '../review-v2.js'
import type { ReviewV2State } from '../../state/review-v2-state.js'

// ============================================================================
// Test Fixtures
// ============================================================================

const makeNoOpLlmAdapter = () =>
  vi.fn().mockResolvedValue({
    content: JSON.stringify({ selectedDimensions: ['correctness'], findings: [], note: 'clean' }),
    inputTokens: 5,
    outputTokens: 3,
  })

const makeState = (overrides: Partial<ReviewV2State> = {}): ReviewV2State => ({
  storyId: 'WINT-1234',
  worktreePath: '/tmp/wt',
  diffAnalysis: null,
  selectedReviewDimensions: [],
  reviewFindings: [],
  reviewVerdict: null,
  postconditionResult: null,
  reviewV2Phase: 'complete',
  retryCount: 0,
  maxRetries: 2,
  tokenUsage: [],
  bakeOffVersion: 'v2-agentic',
  warnings: [],
  errors: [],
  ...overrides,
})

// ============================================================================
// Graph Compilation Tests
// ============================================================================

describe('createReviewV2Graph', () => {
  it('compiles without error with no config', () => {
    expect(() => createReviewV2Graph()).not.toThrow()
  })

  it('compiles with all adapters provided', () => {
    expect(() =>
      createReviewV2Graph({
        diffReader: vi.fn(),
        riskLlmAdapter: makeNoOpLlmAdapter(),
        reviewLlmAdapter: makeNoOpLlmAdapter(),
        readFile: vi.fn(),
        searchCodebase: vi.fn(),
        queryKb: vi.fn(),
        maxRetries: 1,
        bakeOffVersion: 'v2-test',
      }),
    ).not.toThrow()
  })

  it('returns a compiled graph with invoke method', () => {
    const graph = createReviewV2Graph()
    expect(typeof graph.invoke).toBe('function')
  })
})

// ============================================================================
// afterReviewGate routing tests
// ============================================================================

describe('afterReviewGate', () => {
  it('routes to complete when phase is complete', () => {
    expect(afterReviewGate(makeState({ reviewV2Phase: 'complete' }))).toBe('complete')
  })

  it('routes to review_agent when phase is review_agent', () => {
    expect(afterReviewGate(makeState({ reviewV2Phase: 'review_agent' }))).toBe('review_agent')
  })

  it('routes to __end__ when phase is error', () => {
    expect(afterReviewGate(makeState({ reviewV2Phase: 'error' }))).toBe('__end__')
  })
})

// ============================================================================
// Graph Invocation Tests
// ============================================================================

describe('review-v2 graph invocation', () => {
  it('completes with default no-op adapters', async () => {
    const graph = createReviewV2Graph()
    const result = await graph.invoke({ storyId: 'WINT-1234', worktreePath: '/tmp/wt' })
    expect(result.storyId).toBe('WINT-1234')
    expect(result.bakeOffVersion).toBe('v2-agentic')
  })

  it('sets bakeOffVersion to v2-agentic by default', async () => {
    const graph = createReviewV2Graph()
    const result = await graph.invoke({ storyId: 'WINT-1234', worktreePath: '' })
    expect(result.bakeOffVersion).toBe('v2-agentic')
  })

  it('calls diffReader with worktreePath', async () => {
    const diffReader = vi.fn().mockResolvedValue([])
    const graph = createReviewV2Graph({ diffReader })
    await graph.invoke({ storyId: 'WINT-1234', worktreePath: '/tmp/wt/test' })
    expect(diffReader).toHaveBeenCalledWith('/tmp/wt/test')
  })

  it('produces diffAnalysis after diff_analyzer runs', async () => {
    const graph = createReviewV2Graph()
    const result = await graph.invoke({ storyId: 'WINT-1234', worktreePath: '' })
    expect(result.diffAnalysis).not.toBeNull()
  })

  it('produces selectedReviewDimensions after risk_assessor runs', async () => {
    const graph = createReviewV2Graph()
    const result = await graph.invoke({ storyId: 'WINT-1234', worktreePath: '' })
    expect(Array.isArray(result.selectedReviewDimensions)).toBe(true)
    expect(result.selectedReviewDimensions).toContain('correctness')
  })

  it('sets reviewVerdict', async () => {
    const graph = createReviewV2Graph()
    const result = await graph.invoke({ storyId: 'WINT-1234', worktreePath: '' })
    expect(result.reviewVerdict).toBe('pass')
  })

  it('accumulates tokenUsage', async () => {
    const riskLlmAdapter = makeNoOpLlmAdapter()
    const reviewLlmAdapter = makeNoOpLlmAdapter()
    const graph = createReviewV2Graph({ riskLlmAdapter, reviewLlmAdapter })
    const result = await graph.invoke({ storyId: 'WINT-1234', worktreePath: '' })
    expect(Array.isArray(result.tokenUsage)).toBe(true)
  })

  it('ends gracefully with bad LLM adapter', async () => {
    const badAdapter = vi.fn().mockRejectedValue(new Error('LLM crash'))
    const graph = createReviewV2Graph({ riskLlmAdapter: badAdapter, reviewLlmAdapter: badAdapter })
    await expect(graph.invoke({ storyId: 'WINT-1234', worktreePath: '' })).resolves.not.toThrow()
  }, 15000)
})
