import { describe, it, expect, vi } from 'vitest'
import {
  defaultReconcile,
  computeCoverageScore,
  deduplicateFindings,
  createReconciliationNode,
  type ReconciliationAdapterFn,
  type FindingsWriterFn,
} from '../reconciliation.js'
import type {
  GapFinding,
  SpecialistFinding,
  ReconciledFinding,
  CoverageResult,
} from '../../../state/plan-refinement-state.js'

// ============================================================================
// Test Fixtures
// ============================================================================

const makeGap = (id: string, type: GapFinding['type'] = 'ux'): GapFinding => ({
  id,
  type,
  description: `Gap ${id} description`,
  severity: 'medium',
  sourceFlowIds: [],
  relatedAcIds: [],
})

const makeSpecialistFinding = (
  id: string,
  gapId: string,
  specialistType: SpecialistFinding['specialistType'] = 'ux',
): SpecialistFinding => ({
  id,
  gapId,
  specialistType,
  analysis: `Analysis for ${id}`,
  recommendation: `Recommendation for ${id}`,
  severity: 'medium',
  confidence: 0.8,
})

const makeReconciledFinding = (
  id: string,
  gapId: string,
  status: ReconciledFinding['status'] = 'open',
): ReconciledFinding => ({
  id,
  gapId,
  type: 'ux',
  description: `Reconciled ${gapId}`,
  severity: 'medium',
  specialistAnalyses: [],
  recommendation: `Fix ${gapId}`,
  status,
})

const makeState = (
  overrides: Partial<{
    gapFindings: GapFinding[]
    specialistFindings: SpecialistFinding[]
    reconciledFindings: ReconciledFinding[]
    iterationCount: number
    maxIterations: number
    circuitBreakerOpen: boolean
    previousGapCount: number
    coverageScore: number | null
  }> = {},
) => ({
  planSlug: 'test-plan',
  rawPlan: null,
  normalizedPlan: null,
  flows: [],
  refinementPhase: 'gap_coverage' as const,
  iterationCount: overrides.iterationCount ?? 1,
  maxIterations: overrides.maxIterations ?? 3,
  warnings: [],
  errors: [],
  gapFindings: overrides.gapFindings ?? [],
  specialistFindings: overrides.specialistFindings ?? [],
  reconciledFindings: overrides.reconciledFindings ?? [],
  coverageScore: overrides.coverageScore ?? null,
  circuitBreakerOpen: overrides.circuitBreakerOpen ?? false,
  previousGapCount: overrides.previousGapCount ?? 0,
  consecutiveLlmFailures: 0,
})

// ============================================================================
// defaultReconcile tests
// ============================================================================

describe('defaultReconcile', () => {
  it('creates a ReconciledFinding for each gap', () => {
    const gaps = [makeGap('g1'), makeGap('g2')]
    const result = defaultReconcile(gaps, [], [])
    expect(result).toHaveLength(2)
    expect(result[0].gapId).toBe('g1')
    expect(result[1].gapId).toBe('g2')
  })

  it('matches specialist findings to gaps by gapId', () => {
    const gaps = [makeGap('g1'), makeGap('g2')]
    const sf1 = makeSpecialistFinding('sf-1', 'g1')
    const sf2 = makeSpecialistFinding('sf-2', 'g1')
    const sf3 = makeSpecialistFinding('sf-3', 'g2')

    const result = defaultReconcile(gaps, [sf1, sf2, sf3], [])

    const r1 = result.find(r => r.gapId === 'g1')
    const r2 = result.find(r => r.gapId === 'g2')

    expect(r1?.specialistAnalyses).toHaveLength(2)
    expect(r2?.specialistAnalyses).toHaveLength(1)
  })

  it('sets status=open for new gaps with no previous', () => {
    const gaps = [makeGap('g1')]
    const result = defaultReconcile(gaps, [], [])
    expect(result[0].status).toBe('open')
  })

  it('carries forward previous status when gap was previously reconciled', () => {
    const gaps = [makeGap('g1')]
    const previous = [makeReconciledFinding('rf-old', 'g1', 'addressed')]
    const result = defaultReconcile(gaps, [], previous)
    expect(result[0].status).toBe('addressed')
  })

  it('uses specialist recommendations for recommendation text', () => {
    const gaps = [makeGap('g1')]
    const sf = makeSpecialistFinding('sf-1', 'g1')
    const result = defaultReconcile(gaps, [sf], [])
    expect(result[0].recommendation).toContain('Recommendation for sf-1')
  })

  it('falls back to gap description when no specialist findings', () => {
    const gaps = [makeGap('g1')]
    const result = defaultReconcile(gaps, [], [])
    expect(result[0].recommendation).toContain('Gap g1 description')
  })

  it('returns empty array when gaps is empty', () => {
    const result = defaultReconcile([], [makeSpecialistFinding('sf-1', 'g1')], [])
    expect(result).toEqual([])
  })
})

// ============================================================================
// computeCoverageScore tests
// ============================================================================

describe('computeCoverageScore', () => {
  it('returns 1.0 when gaps array is empty', () => {
    const score = computeCoverageScore([], [])
    expect(score).toBe(1.0)
  })

  it('computes score as addressedGaps / totalGaps', () => {
    const gaps = [makeGap('g1'), makeGap('g2'), makeGap('g3')]
    const sf = makeSpecialistFinding('sf-1', 'g1')
    const sf2 = makeSpecialistFinding('sf-2', 'g2')

    // g1 and g2 have specialist analyses, g3 does not
    const reconciledFindings: ReconciledFinding[] = [
      { ...makeReconciledFinding('rf-1', 'g1'), specialistAnalyses: [sf] },
      { ...makeReconciledFinding('rf-2', 'g2'), specialistAnalyses: [sf2] },
      { ...makeReconciledFinding('rf-3', 'g3'), specialistAnalyses: [] },
    ]

    const score = computeCoverageScore(gaps, reconciledFindings)
    expect(score).toBeCloseTo(0.667, 2)
  })

  it('returns 0 when no gaps have specialist analyses', () => {
    const gaps = [makeGap('g1'), makeGap('g2')]
    const reconciledFindings: ReconciledFinding[] = [
      makeReconciledFinding('rf-1', 'g1'),
      makeReconciledFinding('rf-2', 'g2'),
    ]
    const score = computeCoverageScore(gaps, reconciledFindings)
    expect(score).toBe(0)
  })

  it('returns 1.0 when all gaps have specialist analyses', () => {
    const gaps = [makeGap('g1'), makeGap('g2')]
    const sf1 = makeSpecialistFinding('sf-1', 'g1')
    const sf2 = makeSpecialistFinding('sf-2', 'g2')
    const reconciledFindings: ReconciledFinding[] = [
      { ...makeReconciledFinding('rf-1', 'g1'), specialistAnalyses: [sf1] },
      { ...makeReconciledFinding('rf-2', 'g2'), specialistAnalyses: [sf2] },
    ]
    const score = computeCoverageScore(gaps, reconciledFindings)
    expect(score).toBe(1.0)
  })
})

// ============================================================================
// deduplicateFindings tests
// ============================================================================

describe('deduplicateFindings', () => {
  it('returns current findings when previous is empty', () => {
    const current = [makeReconciledFinding('rf-1', 'g1')]
    const result = deduplicateFindings(current, [])
    expect(result).toEqual(current)
  })

  it('current takes precedence over previous for same gapId', () => {
    const previous = [makeReconciledFinding('rf-old', 'g1', 'open')]
    const current = [makeReconciledFinding('rf-new', 'g1', 'addressed')]
    const result = deduplicateFindings(current, previous)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('rf-new')
    expect(result[0].status).toBe('addressed')
  })

  it('merges findings from different gapIds', () => {
    const previous = [makeReconciledFinding('rf-1', 'g1')]
    const current = [makeReconciledFinding('rf-2', 'g2')]
    const result = deduplicateFindings(current, previous)
    expect(result).toHaveLength(2)
    const gapIds = result.map(r => r.gapId)
    expect(gapIds).toContain('g1')
    expect(gapIds).toContain('g2')
  })

  it('keeps previous findings not overwritten by current', () => {
    const previous = [
      makeReconciledFinding('rf-1', 'g1', 'addressed'),
      makeReconciledFinding('rf-2', 'g2', 'deferred'),
    ]
    const current = [makeReconciledFinding('rf-3', 'g1', 'open')]
    const result = deduplicateFindings(current, previous)
    expect(result).toHaveLength(2)
    const g1 = result.find(r => r.gapId === 'g1')
    const g2 = result.find(r => r.gapId === 'g2')
    expect(g1?.id).toBe('rf-3') // current wins
    expect(g2?.id).toBe('rf-2') // previous retained
  })
})

// ============================================================================
// createReconciliationNode tests
// ============================================================================

describe('createReconciliationNode', () => {
  it('no gaps, no findings → coverageScore=1.0, phase=complete', async () => {
    const node = createReconciliationNode()
    const state = makeState({ gapFindings: [], specialistFindings: [] })
    const result = await node(state)

    expect(result.coverageScore).toBe(1.0)
    expect(result.reconciledFindings).toEqual([])
    expect(result.refinementPhase).toBe('complete')
  })

  it('default reconcile: gaps matched with specialist findings', async () => {
    const gaps = [makeGap('g1'), makeGap('g2')]
    const sf = makeSpecialistFinding('sf-1', 'g1')
    const node = createReconciliationNode()
    const state = makeState({ gapFindings: gaps, specialistFindings: [sf] })
    const result = await node(state)

    expect(result.reconciledFindings).toHaveLength(2)
    const r1 = result.reconciledFindings!.find(r => r.gapId === 'g1')
    expect(r1?.specialistAnalyses).toHaveLength(1)
    expect(r1?.specialistAnalyses[0].id).toBe('sf-1')
  })

  it('coverageScore computation: 2 addressed / 3 total ≈ 0.667', async () => {
    const gaps = [makeGap('g1'), makeGap('g2'), makeGap('g3')]
    const sf1 = makeSpecialistFinding('sf-1', 'g1')
    const sf2 = makeSpecialistFinding('sf-2', 'g2')
    const node = createReconciliationNode()
    const state = makeState({ gapFindings: gaps, specialistFindings: [sf1, sf2] })
    const result = await node(state)

    expect(result.coverageScore).toBeCloseTo(0.667, 2)
  })

  it('deduplication across iterations: current overwrites previous for same gapId', async () => {
    const gaps = [makeGap('g1')]
    const sf = makeSpecialistFinding('sf-2', 'g1')
    const previousReconciled = [makeReconciledFinding('rf-old', 'g1', 'open')]
    const node = createReconciliationNode()
    const state = makeState({
      gapFindings: gaps,
      specialistFindings: [sf],
      reconciledFindings: previousReconciled,
    })
    const result = await node(state)

    // Should have 1 finding (deduplicated by gapId)
    expect(result.reconciledFindings).toHaveLength(1)
    // New finding should have the specialist analysis
    expect(result.reconciledFindings![0].specialistAnalyses).toHaveLength(1)
  })

  it('adapter injection: custom reconciliation is called and result is used', async () => {
    const gaps = [makeGap('g1')]
    const sf = makeSpecialistFinding('sf-1', 'g1')
    const customFinding = makeReconciledFinding('custom-rf', 'g1', 'addressed')

    const adapter: ReconciliationAdapterFn = vi.fn().mockResolvedValue([customFinding])
    const node = createReconciliationNode({ reconciliationAdapter: adapter })
    const state = makeState({ gapFindings: gaps, specialistFindings: [sf] })
    const result = await node(state)

    expect(adapter).toHaveBeenCalledWith(gaps, [sf], [])
    expect(result.reconciledFindings).toHaveLength(1)
    expect(result.reconciledFindings![0].id).toBe('custom-rf')
  })

  it('adapter failure: falls back to default reconciliation', async () => {
    const gaps = [makeGap('g1')]
    const sf = makeSpecialistFinding('sf-1', 'g1')
    const adapter: ReconciliationAdapterFn = vi
      .fn()
      .mockRejectedValue(new Error('LLM unavailable'))
    const node = createReconciliationNode({ reconciliationAdapter: adapter })
    const state = makeState({ gapFindings: gaps, specialistFindings: [sf] })
    const result = await node(state)

    // Should fall back to defaultReconcile, which produces one finding for g1
    expect(result.reconciledFindings).toHaveLength(1)
    expect(result.reconciledFindings![0].gapId).toBe('g1')
    // Default recommendation includes specialist's recommendation
    expect(result.reconciledFindings![0].recommendation).toContain('Recommendation for sf-1')
  })

  it('writer adapter: called with CoverageResult', async () => {
    const gaps = [makeGap('g1')]
    const sf = makeSpecialistFinding('sf-1', 'g1')
    const writer: FindingsWriterFn = vi.fn().mockResolvedValue(undefined)
    const node = createReconciliationNode({ findingsWriter: writer })
    const state = makeState({ gapFindings: gaps, specialistFindings: [sf] })
    await node(state)

    expect(writer).toHaveBeenCalledOnce()
    const [planSlug, coverageResult] = (writer as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      CoverageResult,
    ]
    expect(planSlug).toBe('test-plan')
    expect(coverageResult.totalGaps).toBe(1)
    expect(coverageResult.reconciledFindings).toHaveLength(1)
  })

  it('writer failure: logged, does not throw, node continues', async () => {
    const gaps = [makeGap('g1')]
    const writer: FindingsWriterFn = vi.fn().mockRejectedValue(new Error('DB write failed'))
    const node = createReconciliationNode({ findingsWriter: writer })
    const state = makeState({ gapFindings: gaps, specialistFindings: [] })

    // Should not throw
    const result = await node(state)

    expect(writer).toHaveBeenCalledOnce()
    expect(result.reconciledFindings).toBeDefined()
    expect(result.refinementPhase).toBe('gap_coverage')
  })

  it('no specialist findings: all gaps have status=open, coverageScore=0', async () => {
    const gaps = [makeGap('g1'), makeGap('g2')]
    const node = createReconciliationNode()
    const state = makeState({ gapFindings: gaps, specialistFindings: [] })
    const result = await node(state)

    expect(result.coverageScore).toBe(0)
    expect(result.reconciledFindings).toHaveLength(2)
    result.reconciledFindings!.forEach(rf => {
      expect(rf.status).toBe('open')
      expect(rf.specialistAnalyses).toHaveLength(0)
    })
  })

  it('sets refinementPhase=gap_coverage when gaps exist (loop continues)', async () => {
    const gaps = [makeGap('g1')]
    const node = createReconciliationNode()
    const state = makeState({ gapFindings: gaps, specialistFindings: [] })
    const result = await node(state)

    expect(result.refinementPhase).toBe('gap_coverage')
  })

  it('does NOT set previousGapCount — that field is managed by coverage_agent', async () => {
    // previousGapCount is intentionally not set by reconciliation.
    // It is set by coverage_agent before calling the adapter, so the afterGapCoverage
    // convergence check can compare pre-call vs post-call gap counts.
    // Reconciliation overwriting it would cause false convergence detection.
    const gaps = [makeGap('g1'), makeGap('g2'), makeGap('g3')]
    const node = createReconciliationNode()
    const state = makeState({ gapFindings: gaps, specialistFindings: [] })
    const result = await node(state)

    expect(result.previousGapCount).toBeUndefined()
  })

  it('no-gaps complete path also calls writer', async () => {
    const writer: FindingsWriterFn = vi.fn().mockResolvedValue(undefined)
    const node = createReconciliationNode({ findingsWriter: writer })
    const state = makeState({ gapFindings: [], specialistFindings: [] })
    await node(state)

    expect(writer).toHaveBeenCalledOnce()
    const [_planSlug, coverageResult] = (writer as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      CoverageResult,
    ]
    expect(coverageResult.coverageScore).toBe(1.0)
    expect(coverageResult.totalGaps).toBe(0)
  })
})
