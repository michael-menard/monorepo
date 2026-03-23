import { describe, it, expect, vi } from 'vitest'

// Mock @repo/logger before any imports that use it
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  checkCircuitBreaker,
  analyzeGaps,
  createCoverageAgentNode,
  type CoverageAdapterFn,
} from '../coverage-agent.js'
import type {
  GapFinding,
  NormalizedPlan,
  Flow,
  PlanRefinementState,
} from '../../../state/plan-refinement-state.js'

// ============================================================================
// Test Fixtures
// ============================================================================

const makeGap = (id: string): GapFinding => ({
  id,
  type: 'coverage',
  description: `Gap ${id} description`,
  severity: 'medium',
  sourceFlowIds: [],
  relatedAcIds: [],
})

const makeNormalizedPlan = (): NormalizedPlan => ({
  planSlug: 'test-plan',
  title: 'Test Plan',
  summary: 'A test plan',
  problemStatement: 'Problem here',
  proposedSolution: 'Solution here',
  goals: [],
  nonGoals: [],
  flows: [],
  openQuestions: [],
  warnings: [],
  constraints: [],
  dependencies: [],
  status: 'draft',
  priority: 'medium',
  tags: [],
})

const makeFlow = (id: string): Flow => ({
  id,
  name: `Flow ${id}`,
  actor: 'user',
  trigger: 'user action',
  steps: [],
  successOutcome: 'success',
  source: 'inferred',
  confidence: 0.9,
  status: 'unconfirmed',
})

const makeState = (
  overrides: Partial<PlanRefinementState> = {},
): PlanRefinementState => ({
  planSlug: 'test-plan',
  rawPlan: null,
  normalizedPlan: makeNormalizedPlan(),
  flows: [],
  refinementPhase: 'gap_coverage',
  iterationCount: 0,
  maxIterations: 3,
  warnings: [],
  errors: [],
  gapFindings: [],
  specialistFindings: [],
  reconciledFindings: [],
  coverageScore: null,
  circuitBreakerOpen: false,
  previousGapCount: 0,
  consecutiveLlmFailures: 0,
  ...overrides,
})

// ============================================================================
// checkCircuitBreaker tests
// ============================================================================

describe('checkCircuitBreaker', () => {
  it('returns shouldSkip=true when circuitBreakerOpen is true', () => {
    const state = makeState({ circuitBreakerOpen: true })
    const result = checkCircuitBreaker(state)
    expect(result.shouldSkip).toBe(true)
    expect(result.reason).toContain('circuitBreakerOpen')
  })

  it('returns shouldSkip=true when iterationCount >= maxIterations', () => {
    const state = makeState({ iterationCount: 3, maxIterations: 3 })
    const result = checkCircuitBreaker(state)
    expect(result.shouldSkip).toBe(true)
    expect(result.reason).toContain('iterationCount')
  })

  it('returns shouldSkip=true when iterationCount exceeds maxIterations', () => {
    const state = makeState({ iterationCount: 5, maxIterations: 3 })
    const result = checkCircuitBreaker(state)
    expect(result.shouldSkip).toBe(true)
  })

  it('returns shouldSkip=false when neither condition is met', () => {
    const state = makeState({ iterationCount: 1, maxIterations: 3, circuitBreakerOpen: false })
    const result = checkCircuitBreaker(state)
    expect(result.shouldSkip).toBe(false)
    expect(result.reason).toBeUndefined()
  })

  it('returns shouldSkip=false at iterationCount=0, maxIterations=3', () => {
    const state = makeState({ iterationCount: 0, maxIterations: 3 })
    const result = checkCircuitBreaker(state)
    expect(result.shouldSkip).toBe(false)
  })
})

// ============================================================================
// analyzeGaps tests
// ============================================================================

describe('analyzeGaps', () => {
  it('returns empty array when adapter is undefined', async () => {
    const plan = makeNormalizedPlan()
    const flows: Flow[] = []
    const existing: GapFinding[] = []
    const result = await analyzeGaps(plan, flows, existing, undefined)
    expect(result).toEqual([])
  })

  it('calls adapter with correct arguments and returns its gaps', async () => {
    const plan = makeNormalizedPlan()
    const flows = [makeFlow('f1')]
    const existing = [makeGap('g0')]
    const newGap = makeGap('g1')
    const adapter: CoverageAdapterFn = vi.fn().mockResolvedValue([newGap])

    const result = await analyzeGaps(plan, flows, existing, adapter)

    expect(adapter).toHaveBeenCalledWith(plan, flows, existing)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(newGap)
  })

  it('propagates adapter errors (caller handles them)', async () => {
    const plan = makeNormalizedPlan()
    const adapter: CoverageAdapterFn = vi.fn().mockRejectedValue(new Error('adapter boom'))

    await expect(analyzeGaps(plan, [], [], adapter)).rejects.toThrow('adapter boom')
  })
})

// ============================================================================
// createCoverageAgentNode tests
// ============================================================================

describe('createCoverageAgentNode', () => {
  it('skips adapter when circuitBreakerOpen=true and returns empty gapFindings', async () => {
    const adapter: CoverageAdapterFn = vi.fn().mockResolvedValue([makeGap('g1')])
    const node = createCoverageAgentNode({ coverageAdapter: adapter })
    const state = makeState({ circuitBreakerOpen: true })

    const result = await node(state)

    expect(adapter).not.toHaveBeenCalled()
    expect(result.gapFindings).toEqual([])
  })

  it('skips adapter when iterationCount >= maxIterations and returns empty gapFindings', async () => {
    const adapter: CoverageAdapterFn = vi.fn().mockResolvedValue([makeGap('g1')])
    const node = createCoverageAgentNode({ coverageAdapter: adapter })
    const state = makeState({ iterationCount: 3, maxIterations: 3 })

    const result = await node(state)

    expect(adapter).not.toHaveBeenCalled()
    expect(result.gapFindings).toEqual([])
  })

  it('increments iterationCount even when circuit breaker skips', async () => {
    const node = createCoverageAgentNode({})
    const state = makeState({ circuitBreakerOpen: true, iterationCount: 1 })

    const result = await node(state)

    expect(result.iterationCount).toBe(2)
  })

  it('calls adapter, returns gaps, increments iterationCount on success', async () => {
    const newGap = makeGap('g1')
    const adapter: CoverageAdapterFn = vi.fn().mockResolvedValue([newGap])
    const node = createCoverageAgentNode({ coverageAdapter: adapter })
    const state = makeState({ iterationCount: 0 })

    const result = await node(state)

    expect(adapter).toHaveBeenCalled()
    expect(result.gapFindings).toEqual([newGap])
    expect(result.iterationCount).toBe(1)
  })

  it('returns empty gapFindings and no error when no adapter configured', async () => {
    const node = createCoverageAgentNode({})
    const state = makeState()

    const result = await node(state)

    expect(result.gapFindings).toEqual([])
    expect(result.refinementPhase).toBe('gap_coverage')
  })

  it('increments consecutiveLlmFailures when adapter throws', async () => {
    const adapter: CoverageAdapterFn = vi.fn().mockRejectedValue(new Error('LLM timeout'))
    const node = createCoverageAgentNode({ coverageAdapter: adapter })
    const state = makeState({ consecutiveLlmFailures: 0 })

    const result = await node(state)

    expect(result.consecutiveLlmFailures).toBe(1)
    expect(result.circuitBreakerOpen).toBe(false)
  })

  it('sets circuitBreakerOpen=true when adapter fails twice (consecutive >= 2)', async () => {
    const adapter: CoverageAdapterFn = vi.fn().mockRejectedValue(new Error('LLM error'))
    const node = createCoverageAgentNode({ coverageAdapter: adapter })
    const state = makeState({ consecutiveLlmFailures: 1 })

    const result = await node(state)

    expect(result.consecutiveLlmFailures).toBe(2)
    expect(result.circuitBreakerOpen).toBe(true)
  })

  it('resets consecutiveLlmFailures to 0 after adapter success', async () => {
    const adapter: CoverageAdapterFn = vi.fn().mockResolvedValue([makeGap('g1')])
    const node = createCoverageAgentNode({ coverageAdapter: adapter })
    const state = makeState({ consecutiveLlmFailures: 1 })

    const result = await node(state)

    expect(result.consecutiveLlmFailures).toBe(0)
  })

  it('updates previousGapCount from current gapFindings length', async () => {
    const existingGaps = [makeGap('g1'), makeGap('g2')]
    const adapter: CoverageAdapterFn = vi.fn().mockResolvedValue([makeGap('g3')])
    const node = createCoverageAgentNode({ coverageAdapter: adapter })
    const state = makeState({ gapFindings: existingGaps })

    const result = await node(state)

    expect(result.previousGapCount).toBe(2)
  })

  it('returns empty gaps and no error when normalizedPlan is null', async () => {
    const adapter: CoverageAdapterFn = vi.fn().mockResolvedValue([makeGap('g1')])
    const node = createCoverageAgentNode({ coverageAdapter: adapter })
    const state = makeState({ normalizedPlan: null })

    const result = await node(state)

    expect(adapter).not.toHaveBeenCalled()
    expect(result.gapFindings).toEqual([])
    expect(result.refinementPhase).toBe('gap_coverage')
  })

  it('passes flows from state to adapter', async () => {
    const flows = [makeFlow('f1'), makeFlow('f2')]
    const adapter: CoverageAdapterFn = vi.fn().mockResolvedValue([])
    const node = createCoverageAgentNode({ coverageAdapter: adapter })
    const state = makeState({ flows })

    await node(state)

    expect(adapter).toHaveBeenCalledWith(
      expect.any(Object),
      flows,
      expect.any(Array),
    )
  })

  it('passes existingGaps from state to adapter', async () => {
    const existingGaps = [makeGap('g1')]
    const adapter: CoverageAdapterFn = vi.fn().mockResolvedValue([])
    const node = createCoverageAgentNode({ coverageAdapter: adapter })
    const state = makeState({ gapFindings: existingGaps })

    await node(state)

    expect(adapter).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Array),
      existingGaps,
    )
  })

  it('keeps refinementPhase as gap_coverage on normal execution', async () => {
    const adapter: CoverageAdapterFn = vi.fn().mockResolvedValue([])
    const node = createCoverageAgentNode({ coverageAdapter: adapter })
    const state = makeState()

    const result = await node(state)

    expect(result.refinementPhase).toBe('gap_coverage')
  })
})
