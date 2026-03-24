import { describe, it, expect } from 'vitest'
import {
  GapFindingSchema,
  SpecialistFindingSchema,
  ReconciledFindingSchema,
  CoverageResultSchema,
  PlanRefinementStateAnnotation,
  type GapFinding,
  type SpecialistFinding,
  type ReconciledFinding,
  type CoverageResult,
} from '../../../state/plan-refinement-state.js'

// ============================================================================
// GapFindingSchema
// ============================================================================

describe('GapFindingSchema', () => {
  const validGapFinding: GapFinding = {
    id: 'gap-001',
    type: 'ux',
    description: 'Missing loading state for async operations',
    severity: 'medium',
    sourceFlowIds: ['flow-1', 'flow-2'],
    relatedAcIds: ['AC-1'],
  }

  it('validates a correct GapFinding', () => {
    const result = GapFindingSchema.safeParse(validGapFinding)
    expect(result.success).toBe(true)
  })

  it('accepts all valid type values', () => {
    const types = ['ux', 'qa', 'security', 'coverage'] as const
    for (const type of types) {
      const result = GapFindingSchema.safeParse({ ...validGapFinding, type })
      expect(result.success).toBe(true)
    }
  })

  it('accepts all valid severity values', () => {
    const severities = ['low', 'medium', 'high', 'critical'] as const
    for (const severity of severities) {
      const result = GapFindingSchema.safeParse({ ...validGapFinding, severity })
      expect(result.success).toBe(true)
    }
  })

  it('defaults sourceFlowIds to empty array when omitted', () => {
    const { sourceFlowIds: _sf, ...withoutSourceFlowIds } = validGapFinding
    const result = GapFindingSchema.safeParse(withoutSourceFlowIds)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sourceFlowIds).toEqual([])
    }
  })

  it('defaults relatedAcIds to empty array when omitted', () => {
    const { relatedAcIds: _ra, ...withoutRelatedAcIds } = validGapFinding
    const result = GapFindingSchema.safeParse(withoutRelatedAcIds)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.relatedAcIds).toEqual([])
    }
  })

  it('rejects empty id', () => {
    const result = GapFindingSchema.safeParse({ ...validGapFinding, id: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid type value', () => {
    const result = GapFindingSchema.safeParse({ ...validGapFinding, type: 'performance' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid severity value', () => {
    const result = GapFindingSchema.safeParse({ ...validGapFinding, severity: 'urgent' })
    expect(result.success).toBe(false)
  })

  it('rejects empty description', () => {
    const result = GapFindingSchema.safeParse({ ...validGapFinding, description: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing required fields', () => {
    const result = GapFindingSchema.safeParse({ id: 'gap-001' })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// SpecialistFindingSchema
// ============================================================================

describe('SpecialistFindingSchema', () => {
  const validSpecialistFinding: SpecialistFinding = {
    id: 'sf-001',
    gapId: 'gap-001',
    specialistType: 'ux',
    analysis: 'The current flow lacks visual feedback during async operations',
    recommendation: 'Add a spinner component to all async action buttons',
    severity: 'medium',
    confidence: 0.85,
  }

  it('validates a correct SpecialistFinding', () => {
    const result = SpecialistFindingSchema.safeParse(validSpecialistFinding)
    expect(result.success).toBe(true)
  })

  it('accepts all valid specialistType values', () => {
    const types = ['ux', 'qa', 'security'] as const
    for (const specialistType of types) {
      const result = SpecialistFindingSchema.safeParse({ ...validSpecialistFinding, specialistType })
      expect(result.success).toBe(true)
    }
  })

  it('accepts confidence at boundary values 0 and 1', () => {
    expect(SpecialistFindingSchema.safeParse({ ...validSpecialistFinding, confidence: 0 }).success).toBe(true)
    expect(SpecialistFindingSchema.safeParse({ ...validSpecialistFinding, confidence: 1 }).success).toBe(true)
  })

  it('rejects confidence below 0', () => {
    const result = SpecialistFindingSchema.safeParse({ ...validSpecialistFinding, confidence: -0.1 })
    expect(result.success).toBe(false)
  })

  it('rejects confidence above 1', () => {
    const result = SpecialistFindingSchema.safeParse({ ...validSpecialistFinding, confidence: 1.1 })
    expect(result.success).toBe(false)
  })

  it('rejects empty id', () => {
    const result = SpecialistFindingSchema.safeParse({ ...validSpecialistFinding, id: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty gapId', () => {
    const result = SpecialistFindingSchema.safeParse({ ...validSpecialistFinding, gapId: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid specialistType', () => {
    const result = SpecialistFindingSchema.safeParse({ ...validSpecialistFinding, specialistType: 'performance' })
    expect(result.success).toBe(false)
  })

  it('rejects empty analysis', () => {
    const result = SpecialistFindingSchema.safeParse({ ...validSpecialistFinding, analysis: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty recommendation', () => {
    const result = SpecialistFindingSchema.safeParse({ ...validSpecialistFinding, recommendation: '' })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// ReconciledFindingSchema
// ============================================================================

describe('ReconciledFindingSchema', () => {
  const validReconciledFinding: ReconciledFinding = {
    id: 'rf-001',
    gapId: 'gap-001',
    type: 'ux',
    description: 'Missing loading state',
    severity: 'medium',
    specialistAnalyses: [],
    recommendation: 'Add spinner to async buttons',
    status: 'open',
  }

  it('validates a correct ReconciledFinding', () => {
    const result = ReconciledFindingSchema.safeParse(validReconciledFinding)
    expect(result.success).toBe(true)
  })

  it('accepts all valid status values', () => {
    const statuses = ['open', 'addressed', 'deferred'] as const
    for (const status of statuses) {
      const result = ReconciledFindingSchema.safeParse({ ...validReconciledFinding, status })
      expect(result.success).toBe(true)
    }
  })

  it('defaults status to open when omitted', () => {
    const { status: _s, ...withoutStatus } = validReconciledFinding
    const result = ReconciledFindingSchema.safeParse(withoutStatus)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.status).toBe('open')
    }
  })

  it('defaults specialistAnalyses to empty array when omitted', () => {
    const { specialistAnalyses: _sa, ...withoutAnalyses } = validReconciledFinding
    const result = ReconciledFindingSchema.safeParse(withoutAnalyses)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.specialistAnalyses).toEqual([])
    }
  })

  it('accepts nested specialist analyses', () => {
    const withAnalyses: ReconciledFinding = {
      ...validReconciledFinding,
      specialistAnalyses: [
        {
          id: 'sf-001',
          gapId: 'gap-001',
          specialistType: 'ux',
          analysis: 'Detailed analysis',
          recommendation: 'Fix it',
          severity: 'medium',
          confidence: 0.9,
        },
      ],
    }
    const result = ReconciledFindingSchema.safeParse(withAnalyses)
    expect(result.success).toBe(true)
  })

  it('rejects invalid status value', () => {
    const result = ReconciledFindingSchema.safeParse({ ...validReconciledFinding, status: 'pending' })
    expect(result.success).toBe(false)
  })

  it('rejects empty id', () => {
    const result = ReconciledFindingSchema.safeParse({ ...validReconciledFinding, id: '' })
    expect(result.success).toBe(false)
  })

  it('rejects empty description', () => {
    const result = ReconciledFindingSchema.safeParse({ ...validReconciledFinding, description: '' })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// CoverageResultSchema
// ============================================================================

describe('CoverageResultSchema', () => {
  const validCoverageResult: CoverageResult = {
    coverageScore: 0.75,
    totalGaps: 4,
    addressedGaps: 3,
    reconciledFindings: [],
    iterationsUsed: 2,
    circuitBreakerTriggered: false,
  }

  it('validates a correct CoverageResult', () => {
    const result = CoverageResultSchema.safeParse(validCoverageResult)
    expect(result.success).toBe(true)
  })

  it('accepts coverageScore at boundary values 0 and 1', () => {
    expect(CoverageResultSchema.safeParse({ ...validCoverageResult, coverageScore: 0 }).success).toBe(true)
    expect(CoverageResultSchema.safeParse({ ...validCoverageResult, coverageScore: 1 }).success).toBe(true)
  })

  it('rejects coverageScore below 0', () => {
    const result = CoverageResultSchema.safeParse({ ...validCoverageResult, coverageScore: -0.1 })
    expect(result.success).toBe(false)
  })

  it('rejects coverageScore above 1', () => {
    const result = CoverageResultSchema.safeParse({ ...validCoverageResult, coverageScore: 1.01 })
    expect(result.success).toBe(false)
  })

  it('rejects negative totalGaps', () => {
    const result = CoverageResultSchema.safeParse({ ...validCoverageResult, totalGaps: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects non-integer totalGaps', () => {
    const result = CoverageResultSchema.safeParse({ ...validCoverageResult, totalGaps: 1.5 })
    expect(result.success).toBe(false)
  })

  it('rejects negative addressedGaps', () => {
    const result = CoverageResultSchema.safeParse({ ...validCoverageResult, addressedGaps: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects negative iterationsUsed', () => {
    const result = CoverageResultSchema.safeParse({ ...validCoverageResult, iterationsUsed: -1 })
    expect(result.success).toBe(false)
  })

  it('accepts circuitBreakerTriggered true', () => {
    const result = CoverageResultSchema.safeParse({ ...validCoverageResult, circuitBreakerTriggered: true })
    expect(result.success).toBe(true)
  })

  it('accepts nested reconciledFindings', () => {
    const withFindings: CoverageResult = {
      ...validCoverageResult,
      reconciledFindings: [
        {
          id: 'rf-001',
          gapId: 'gap-001',
          type: 'security',
          description: 'Auth bypass risk',
          severity: 'critical',
          specialistAnalyses: [],
          recommendation: 'Add auth check',
          status: 'open',
        },
      ],
    }
    const result = CoverageResultSchema.safeParse(withFindings)
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// PlanRefinementStateAnnotation — new fields compile and have correct defaults
// LangGraph stores defaults in initialValueFactory and reducers in operator
// ============================================================================

describe('PlanRefinementStateAnnotation new gap coverage fields', () => {
  const spec = PlanRefinementStateAnnotation.spec

  it('has gapFindings field with default empty array', () => {
    expect(spec.gapFindings).toBeDefined()
    expect(spec.gapFindings.initialValueFactory()).toEqual([])
  })

  it('has specialistFindings field with default empty array', () => {
    expect(spec.specialistFindings).toBeDefined()
    expect(spec.specialistFindings.initialValueFactory()).toEqual([])
  })

  it('has reconciledFindings field with default empty array', () => {
    expect(spec.reconciledFindings).toBeDefined()
    expect(spec.reconciledFindings.initialValueFactory()).toEqual([])
  })

  it('has coverageScore field with default null', () => {
    expect(spec.coverageScore).toBeDefined()
    expect(spec.coverageScore.initialValueFactory()).toBeNull()
  })

  it('has circuitBreakerOpen field with default false', () => {
    expect(spec.circuitBreakerOpen).toBeDefined()
    expect(spec.circuitBreakerOpen.initialValueFactory()).toBe(false)
  })

  it('has previousGapCount field with default 0', () => {
    expect(spec.previousGapCount).toBeDefined()
    expect(spec.previousGapCount.initialValueFactory()).toBe(0)
  })

  it('has consecutiveLlmFailures field with default 0', () => {
    expect(spec.consecutiveLlmFailures).toBeDefined()
    expect(spec.consecutiveLlmFailures.initialValueFactory()).toBe(0)
  })

  it('gapFindings operator appends arrays', () => {
    const existing: GapFinding[] = [
      { id: 'g1', type: 'ux', description: 'gap 1', severity: 'low', sourceFlowIds: [], relatedAcIds: [] },
    ]
    const incoming: GapFinding[] = [
      { id: 'g2', type: 'qa', description: 'gap 2', severity: 'high', sourceFlowIds: [], relatedAcIds: [] },
    ]
    const result = spec.gapFindings.operator(existing, incoming)
    expect(result).toHaveLength(2)
    expect(result[0].id).toBe('g1')
    expect(result[1].id).toBe('g2')
  })

  it('specialistFindings operator appends arrays', () => {
    const existing: SpecialistFinding[] = [
      { id: 'sf1', gapId: 'g1', specialistType: 'ux', analysis: 'a', recommendation: 'r', severity: 'low', confidence: 0.5 },
    ]
    const incoming: SpecialistFinding[] = [
      { id: 'sf2', gapId: 'g1', specialistType: 'qa', analysis: 'b', recommendation: 's', severity: 'medium', confidence: 0.7 },
    ]
    const result = spec.specialistFindings.operator(existing, incoming)
    expect(result).toHaveLength(2)
  })

  it('reconciledFindings operator overwrites', () => {
    const existing: ReconciledFinding[] = [
      { id: 'rf1', gapId: 'g1', type: 'ux', description: 'd', severity: 'low', specialistAnalyses: [], recommendation: 'r', status: 'open' },
    ]
    const incoming: ReconciledFinding[] = [
      { id: 'rf2', gapId: 'g2', type: 'qa', description: 'e', severity: 'high', specialistAnalyses: [], recommendation: 's', status: 'addressed' },
    ]
    const result = spec.reconciledFindings.operator(existing, incoming)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('rf2')
  })

  it('coverageScore operator overwrites', () => {
    const result = spec.coverageScore.operator(null, 0.85)
    expect(result).toBe(0.85)
  })

  it('circuitBreakerOpen operator overwrites', () => {
    const result = spec.circuitBreakerOpen.operator(false, true)
    expect(result).toBe(true)
  })

  it('all existing fields are still present', () => {
    expect(spec.planSlug).toBeDefined()
    expect(spec.rawPlan).toBeDefined()
    expect(spec.normalizedPlan).toBeDefined()
    expect(spec.flows).toBeDefined()
    expect(spec.refinementPhase).toBeDefined()
    expect(spec.iterationCount).toBeDefined()
    expect(spec.maxIterations).toBeDefined()
    expect(spec.warnings).toBeDefined()
    expect(spec.errors).toBeDefined()
  })
})
