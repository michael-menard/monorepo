/**
 * Plan Refinement V2 Graph tests
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

import { createPlanRefinementV2Graph, afterPostconditionGate } from '../plan-refinement-v2.js'
import type { LlmAdapterFn } from '../../nodes/plan-refinement-v2/refinement-agent.js'
import type { PlanRefinementV2State } from '../../state/plan-refinement-v2-state.js'

// ============================================================================
// Test Fixtures
// ============================================================================

const makeCompleteLlmAdapter = (): LlmAdapterFn =>
  vi.fn().mockResolvedValue({
    content: JSON.stringify({ tool: 'complete', args: { evidence: { stub: 'passed' } } }),
    inputTokens: 10,
    outputTokens: 5,
  })

// Minimal state used to test afterPostconditionGate directly
const makeState = (overrides: Partial<PlanRefinementV2State> = {}): PlanRefinementV2State => ({
  planSlug: 'test-plan',
  rawPlan: null,
  normalizedPlan: null,
  flows: [],
  groundingContext: null,
  postconditionResult: null,
  refinementV2Phase: 'complete',
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
// Graph Compilation Tests
// ============================================================================

describe('createPlanRefinementV2Graph', () => {
  it('compiles without error with no config', () => {
    expect(() => createPlanRefinementV2Graph()).not.toThrow()
  })

  it('compiles with all adapters provided', () => {
    expect(() =>
      createPlanRefinementV2Graph({
        llmAdapter: makeCompleteLlmAdapter(),
        queryKb: vi.fn(),
        searchCodebase: vi.fn(),
        callSpecialist: vi.fn(),
        flagForHuman: vi.fn(),
        kbStoriesAdapter: vi.fn(),
        kbRelatedPlansAdapter: vi.fn(),
        maxRetries: 2,
        maxInternalIterations: 3,
        bakeOffVersion: 'v2-test',
      }),
    ).not.toThrow()
  })

  it('returns a compiled graph with invoke method', () => {
    const graph = createPlanRefinementV2Graph()
    expect(typeof graph.invoke).toBe('function')
  })
})

// ============================================================================
// afterPostconditionGate routing tests
// ============================================================================

describe('afterPostconditionGate', () => {
  it('routes to complete when phase is complete', () => {
    expect(afterPostconditionGate(makeState({ refinementV2Phase: 'complete' }))).toBe('complete')
  })

  it('routes to refinement_agent when phase is refinement_agent', () => {
    expect(afterPostconditionGate(makeState({ refinementV2Phase: 'refinement_agent' }))).toBe(
      'refinement_agent',
    )
  })

  it('routes to __end__ when phase is error', () => {
    expect(afterPostconditionGate(makeState({ refinementV2Phase: 'error' }))).toBe('__end__')
  })
})

// ============================================================================
// Graph Invocation Tests
// ============================================================================

describe('plan-refinement-v2 graph invocation', () => {
  it('completes with default no-op adapters', async () => {
    const graph = createPlanRefinementV2Graph()
    const result = await graph.invoke({
      planSlug: 'my-plan',
      rawPlan: null,
    })
    expect(result.planSlug).toBe('my-plan')
    expect(result.bakeOffVersion).toBe('v2-agentic')
  })

  it('sets bakeOffVersion to v2-agentic by default', async () => {
    const graph = createPlanRefinementV2Graph()
    const result = await graph.invoke({ planSlug: 'test-plan', rawPlan: null })
    expect(result.bakeOffVersion).toBe('v2-agentic')
  })

  it('calls kbStoriesAdapter with the planSlug', async () => {
    const kbStoriesAdapter = vi.fn().mockResolvedValue([])
    const graph = createPlanRefinementV2Graph({ kbStoriesAdapter })
    await graph.invoke({ planSlug: 'my-plan', rawPlan: null })
    expect(kbStoriesAdapter).toHaveBeenCalledWith('my-plan')
  })

  it('sets groundingContext after grounding_scout runs', async () => {
    const graph = createPlanRefinementV2Graph()
    const result = await graph.invoke({ planSlug: 'my-plan', rawPlan: null })
    expect(result.groundingContext).not.toBeNull()
    expect(result.groundingContext?.existingStories).toEqual([])
  })

  it('completes with a working llmAdapter that returns complete', async () => {
    const graph = createPlanRefinementV2Graph({ llmAdapter: makeCompleteLlmAdapter() })
    const result = await graph.invoke({
      planSlug: 'my-plan',
      rawPlan: null,
    })
    expect(result.postconditionResult).not.toBeNull()
  })

  it('accumulates tokenUsage across LLM calls', async () => {
    const graph = createPlanRefinementV2Graph({ llmAdapter: makeCompleteLlmAdapter() })
    const result = await graph.invoke({ planSlug: 'my-plan', rawPlan: null })
    expect(Array.isArray(result.tokenUsage)).toBe(true)
  })

  it('ends gracefully when max retries exhausted', async () => {
    // LLM always returns an invalid response → postconditions always fail
    const badLlmAdapter: LlmAdapterFn = vi.fn().mockResolvedValue({
      content: 'not a tool call',
      inputTokens: 1,
      outputTokens: 1,
    })
    const graph = createPlanRefinementV2Graph({
      llmAdapter: badLlmAdapter,
      maxRetries: 1,
      maxInternalIterations: 1,
    })
    const result = await graph.invoke({ planSlug: 'my-plan', rawPlan: null })
    // Should end in error state (not throw)
    expect(result.refinementV2Phase).toBe('error')
    expect(result.errors.length).toBeGreaterThan(0)
  }, 15000)
})
