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
  runSpecialist,
  createGapSpecialistsNode,
  type SpecialistAdapterFn,
} from '../gap-specialists.js'
import type { GapFinding, NormalizedPlan, SpecialistFinding } from '../../../state/plan-refinement-state.js'

// ============================================================================
// Test Fixtures
// ============================================================================

const makeGap = (id: string): GapFinding => ({
  id,
  type: 'ux',
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

const makeSpecialistFinding = (
  id: string,
  gapId: string,
  specialistType: 'ux' | 'qa' | 'security',
): SpecialistFinding => ({
  id,
  gapId,
  specialistType,
  analysis: `Analysis for ${id}`,
  recommendation: `Recommendation for ${id}`,
  severity: 'medium',
  confidence: 0.8,
})

const makeStateWithGaps = (
  gapFindings: GapFinding[],
  normalizedPlan: NormalizedPlan | null = makeNormalizedPlan(),
) => ({
  planSlug: 'test-plan',
  rawPlan: null,
  normalizedPlan,
  flows: [],
  refinementPhase: 'gap_coverage' as const,
  iterationCount: 0,
  maxIterations: 3,
  warnings: [],
  errors: [],
  gapFindings,
  specialistFindings: [],
  reconciledFindings: [],
  coverageScore: null,
  circuitBreakerOpen: false,
  previousGapCount: 0,
  consecutiveLlmFailures: 0,
})

// ============================================================================
// runSpecialist tests
// ============================================================================

describe('runSpecialist', () => {
  it('returns empty array when adapter is undefined', async () => {
    const gaps = [makeGap('g1')]
    const plan = makeNormalizedPlan()
    const result = await runSpecialist('ux', undefined, gaps, plan)
    expect(result).toEqual([])
  })

  it('calls adapter with gaps and plan, returns its findings', async () => {
    const gaps = [makeGap('g1'), makeGap('g2')]
    const plan = makeNormalizedPlan()
    const finding = makeSpecialistFinding('sf-1', 'g1', 'ux')
    const adapter: SpecialistAdapterFn = vi.fn().mockResolvedValue([finding])

    const result = await runSpecialist('ux', adapter, gaps, plan)

    expect(adapter).toHaveBeenCalledWith(gaps, plan)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual(finding)
  })

  it('catches adapter errors and returns empty array', async () => {
    const gaps = [makeGap('g1')]
    const plan = makeNormalizedPlan()
    const adapter: SpecialistAdapterFn = vi.fn().mockRejectedValue(new Error('adapter exploded'))

    const result = await runSpecialist('qa', adapter, gaps, plan)

    expect(result).toEqual([])
  })
})

// ============================================================================
// createGapSpecialistsNode tests
// ============================================================================

describe('createGapSpecialistsNode', () => {
  it('returns empty specialistFindings when state has no gap findings', async () => {
    const node = createGapSpecialistsNode({})
    const state = makeStateWithGaps([])
    const result = await node(state)
    expect(result.specialistFindings).toEqual([])
  })

  it('returns empty specialistFindings when normalizedPlan is null', async () => {
    const uxAdapter: SpecialistAdapterFn = vi.fn().mockResolvedValue([
      makeSpecialistFinding('sf-1', 'g1', 'ux'),
    ])
    const node = createGapSpecialistsNode({ uxSpecialist: uxAdapter })
    const state = makeStateWithGaps([makeGap('g1')], null)
    const result = await node(state)
    expect(result.specialistFindings).toEqual([])
    expect(uxAdapter).not.toHaveBeenCalled()
  })

  it('calls all 3 adapters when all are provided', async () => {
    const gaps = [makeGap('g1')]
    const plan = makeNormalizedPlan()

    const uxFinding = makeSpecialistFinding('sf-ux', 'g1', 'ux')
    const qaFinding = makeSpecialistFinding('sf-qa', 'g1', 'qa')
    const secFinding = makeSpecialistFinding('sf-sec', 'g1', 'security')

    const uxAdapter: SpecialistAdapterFn = vi.fn().mockResolvedValue([uxFinding])
    const qaAdapter: SpecialistAdapterFn = vi.fn().mockResolvedValue([qaFinding])
    const secAdapter: SpecialistAdapterFn = vi.fn().mockResolvedValue([secFinding])

    const node = createGapSpecialistsNode({
      uxSpecialist: uxAdapter,
      qaSpecialist: qaAdapter,
      securitySpecialist: secAdapter,
    })
    const stateWithPlan = { ...makeStateWithGaps(gaps), normalizedPlan: plan }
    const result = await node(stateWithPlan)

    expect(uxAdapter).toHaveBeenCalledWith(gaps, plan)
    expect(qaAdapter).toHaveBeenCalledWith(gaps, plan)
    expect(secAdapter).toHaveBeenCalledWith(gaps, plan)
    expect(result.specialistFindings).toHaveLength(3)
  })

  it('skips missing specialist but runs the other two', async () => {
    const gaps = [makeGap('g1')]

    const uxFinding = makeSpecialistFinding('sf-ux', 'g1', 'ux')
    const secFinding = makeSpecialistFinding('sf-sec', 'g1', 'security')

    const uxAdapter: SpecialistAdapterFn = vi.fn().mockResolvedValue([uxFinding])
    const secAdapter: SpecialistAdapterFn = vi.fn().mockResolvedValue([secFinding])

    const node = createGapSpecialistsNode({
      uxSpecialist: uxAdapter,
      // qaSpecialist: missing
      securitySpecialist: secAdapter,
    })
    const state = makeStateWithGaps(gaps)
    const result = await node(state)

    expect(uxAdapter).toHaveBeenCalled()
    expect(secAdapter).toHaveBeenCalled()
    expect(result.specialistFindings).toHaveLength(2)
  })

  it('catches a throwing adapter and runs the remaining specialists', async () => {
    const gaps = [makeGap('g1')]

    const qaFinding = makeSpecialistFinding('sf-qa', 'g1', 'qa')
    const secFinding = makeSpecialistFinding('sf-sec', 'g1', 'security')

    const uxAdapter: SpecialistAdapterFn = vi.fn().mockRejectedValue(new Error('ux exploded'))
    const qaAdapter: SpecialistAdapterFn = vi.fn().mockResolvedValue([qaFinding])
    const secAdapter: SpecialistAdapterFn = vi.fn().mockResolvedValue([secFinding])

    const node = createGapSpecialistsNode({
      uxSpecialist: uxAdapter,
      qaSpecialist: qaAdapter,
      securitySpecialist: secAdapter,
    })
    const state = makeStateWithGaps(gaps)
    const result = await node(state)

    expect(result.specialistFindings).toHaveLength(2)
    const ids = result.specialistFindings!.map(f => f.id)
    expect(ids).toContain('sf-qa')
    expect(ids).toContain('sf-sec')
  })

  it('returns empty array when all adapters are missing — no error thrown', async () => {
    const node = createGapSpecialistsNode({})
    const state = makeStateWithGaps([makeGap('g1')])
    const result = await node(state)
    expect(result.specialistFindings).toEqual([])
  })

  it('all returned findings have the correct specialistType tag from adapter', async () => {
    const gaps = [makeGap('g1')]

    const uxFinding = makeSpecialistFinding('sf-ux', 'g1', 'ux')
    const qaFinding = makeSpecialistFinding('sf-qa', 'g1', 'qa')

    const uxAdapter: SpecialistAdapterFn = vi.fn().mockResolvedValue([uxFinding])
    const qaAdapter: SpecialistAdapterFn = vi.fn().mockResolvedValue([qaFinding])

    const node = createGapSpecialistsNode({
      uxSpecialist: uxAdapter,
      qaSpecialist: qaAdapter,
    })
    const state = makeStateWithGaps(gaps)
    const result = await node(state)

    const uxResult = result.specialistFindings!.find(f => f.id === 'sf-ux')
    const qaResult = result.specialistFindings!.find(f => f.id === 'sf-qa')

    expect(uxResult?.specialistType).toBe('ux')
    expect(qaResult?.specialistType).toBe('qa')
  })
})
