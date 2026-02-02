import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { SynthesizedStory, FinalAcceptanceCriterion } from '../../nodes/story/synthesize.js'
import type { ReadinessResult } from '../../nodes/story/readiness-score.js'
import {
  createElaborationGraph,
  runElaboration,
  createInitializeNode,
  createLoadPreviousVersionNode,
  createDeltaDetectNode,
  createDeltaReviewNode,
  createEscapeHatchEvalNode,
  createTargetedReviewNode,
  createAggregateNode,
  createUpdateReadinessNode,
  createCompleteNode,
  ElaborationConfigSchema,
  ElaborationPhaseSchema,
  AggregatedFindingsSchema,
  ElaborationResultSchema,
  type ElaborationState,
  type ElaborationConfig,
} from '../elaboration.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Test fixtures
const createTestAC = (id: string, description: string): FinalAcceptanceCriterion => ({
  id,
  description,
  fromBaseline: false,
  enhancedFromGaps: false,
  relatedGapIds: [],
  priority: 2,
})

const createTestStory = (overrides: Partial<SynthesizedStory> = {}): SynthesizedStory => ({
  storyId: 'flow-043',
  title: 'Test Story',
  description: 'Test story description',
  domain: 'orchestrator',
  synthesizedAt: new Date().toISOString(),
  acceptanceCriteria: [
    createTestAC('AC-1', 'First acceptance criterion'),
    createTestAC('AC-2', 'Second acceptance criterion'),
  ],
  nonGoals: [],
  testHints: [],
  knownUnknowns: [],
  constraints: [],
  affectedFiles: [],
  dependencies: [],
  isReady: true,
  readinessScore: 85,
  commitmentBaseline: null,
  ...overrides,
})

const createModifiedStory = (original: SynthesizedStory): SynthesizedStory => ({
  ...original,
  acceptanceCriteria: [
    ...original.acceptanceCriteria,
    createTestAC('AC-3', 'New acceptance criterion'),
  ],
})

const createTestState = (overrides: Partial<ElaborationState> = {}): ElaborationState => ({
  storyId: 'flow-043',
  epicPrefix: 'flow',
  config: null,
  currentPhase: 'load_previous',
  startedAt: null,
  currentStory: null,
  previousStory: null,
  previousStoryLoaded: false,
  previousIteration: 0,
  currentIteration: 1,
  attackAnalysis: null,
  previousReadinessResult: null,
  deltaDetectionResult: null,
  deltaDetected: false,
  deltaReviewResult: null,
  deltaReviewed: false,
  escapeHatchResult: null,
  escapeHatchEvaluated: false,
  escapeHatchTriggered: false,
  targetedReviewComplete: false,
  targetedReviewFindings: [],
  aggregatedFindings: null,
  updatedReadinessResult: null,
  readinessUpdated: false,
  workflowComplete: false,
  workflowSuccess: false,
  warnings: [],
  errors: [],
  ...overrides,
})

describe('ElaborationPhaseSchema', () => {
  it('validates load_previous phase', () => {
    expect(ElaborationPhaseSchema.parse('load_previous')).toBe('load_previous')
  })

  it('validates delta_detect phase', () => {
    expect(ElaborationPhaseSchema.parse('delta_detect')).toBe('delta_detect')
  })

  it('validates delta_review phase', () => {
    expect(ElaborationPhaseSchema.parse('delta_review')).toBe('delta_review')
  })

  it('validates escape_hatch phase', () => {
    expect(ElaborationPhaseSchema.parse('escape_hatch')).toBe('escape_hatch')
  })

  it('validates targeted_review phase', () => {
    expect(ElaborationPhaseSchema.parse('targeted_review')).toBe('targeted_review')
  })

  it('validates aggregate phase', () => {
    expect(ElaborationPhaseSchema.parse('aggregate')).toBe('aggregate')
  })

  it('validates update_readiness phase', () => {
    expect(ElaborationPhaseSchema.parse('update_readiness')).toBe('update_readiness')
  })

  it('validates complete phase', () => {
    expect(ElaborationPhaseSchema.parse('complete')).toBe('complete')
  })

  it('validates error phase', () => {
    expect(ElaborationPhaseSchema.parse('error')).toBe('error')
  })

  it('rejects invalid phases', () => {
    expect(() => ElaborationPhaseSchema.parse('invalid')).toThrow()
  })
})

describe('ElaborationConfigSchema', () => {
  it('applies default values', () => {
    const config = ElaborationConfigSchema.parse({})

    expect(config.nodeTimeoutMs).toBe(30000)
    expect(config.recalculateReadiness).toBe(true)
    expect(config.deltaDetectionConfig.minSignificance).toBe(1)
    expect(config.deltaDetectionConfig.substantialChangeThreshold).toBe(3)
    expect(config.deltaReviewConfig.reviewAdded).toBe(true)
    expect(config.escapeHatchConfig.triggerThreshold).toBe(0.7)
  })

  it('validates custom config', () => {
    const config = {
      nodeTimeoutMs: 60000,
      recalculateReadiness: false,
      deltaDetectionConfig: {
        minSignificance: 3,
        substantialChangeThreshold: 5,
      },
      deltaReviewConfig: {
        reviewAdded: false,
        maxFindingsPerSection: 5,
      },
      escapeHatchConfig: {
        triggerThreshold: 0.5,
        minTriggers: 2,
      },
    }

    const parsed = ElaborationConfigSchema.parse(config)

    expect(parsed.nodeTimeoutMs).toBe(60000)
    expect(parsed.recalculateReadiness).toBe(false)
    expect(parsed.deltaDetectionConfig.minSignificance).toBe(3)
    expect(parsed.deltaReviewConfig.reviewAdded).toBe(false)
    expect(parsed.escapeHatchConfig.triggerThreshold).toBe(0.5)
  })

  it('rejects negative timeout', () => {
    expect(() => ElaborationConfigSchema.parse({ nodeTimeoutMs: -1 })).toThrow()
  })

  it('rejects trigger threshold out of range', () => {
    expect(() =>
      ElaborationConfigSchema.parse({
        escapeHatchConfig: { triggerThreshold: 1.5 },
      }),
    ).toThrow()
  })
})

describe('AggregatedFindingsSchema', () => {
  it('validates complete aggregated findings', () => {
    const findings = {
      storyId: 'flow-043',
      aggregatedAt: new Date().toISOString(),
      totalFindings: 5,
      criticalCount: 1,
      majorCount: 2,
      minorCount: 1,
      infoCount: 1,
      escapeHatchTriggered: false,
      sectionsNeedingAttention: ['acceptanceCriteria'],
      recommendedStakeholders: ['pm', 'qa'],
      passed: false,
      summary: 'Elaboration analysis summary',
    }

    expect(() => AggregatedFindingsSchema.parse(findings)).not.toThrow()
  })

  it('validates empty findings', () => {
    const findings = {
      storyId: 'flow-043',
      aggregatedAt: new Date().toISOString(),
      totalFindings: 0,
      criticalCount: 0,
      majorCount: 0,
      minorCount: 0,
      infoCount: 0,
      escapeHatchTriggered: false,
      sectionsNeedingAttention: [],
      recommendedStakeholders: [],
      passed: true,
      summary: 'No findings',
    }

    expect(() => AggregatedFindingsSchema.parse(findings)).not.toThrow()
  })
})

describe('ElaborationResultSchema', () => {
  it('validates successful result', () => {
    const result = {
      storyId: 'flow-043',
      phase: 'complete',
      success: true,
      deltaDetectionResult: null,
      deltaReviewResult: null,
      escapeHatchResult: null,
      aggregatedFindings: {
        storyId: 'flow-043',
        aggregatedAt: new Date().toISOString(),
        totalFindings: 0,
        criticalCount: 0,
        majorCount: 0,
        minorCount: 0,
        infoCount: 0,
        escapeHatchTriggered: false,
        sectionsNeedingAttention: [],
        recommendedStakeholders: [],
        passed: true,
        summary: 'Success',
      },
      updatedReadinessResult: null,
      previousReadinessScore: 80,
      newReadinessScore: 85,
      warnings: [],
      errors: [],
      durationMs: 1000,
      completedAt: new Date().toISOString(),
    }

    expect(() => ElaborationResultSchema.parse(result)).not.toThrow()
  })

  it('validates failed result', () => {
    const result = {
      storyId: 'flow-043',
      phase: 'error',
      success: false,
      deltaDetectionResult: null,
      deltaReviewResult: null,
      escapeHatchResult: null,
      aggregatedFindings: null,
      updatedReadinessResult: null,
      previousReadinessScore: null,
      newReadinessScore: null,
      warnings: [],
      errors: ['Something went wrong'],
      durationMs: 500,
      completedAt: new Date().toISOString(),
    }

    expect(() => ElaborationResultSchema.parse(result)).not.toThrow()
  })
})

describe('createInitializeNode', () => {
  it('returns error when no story ID provided', async () => {
    const node = createInitializeNode()
    const state = createTestState({ storyId: '' })

    const result = await node(state)

    expect(result.currentPhase).toBe('error')
    expect(result.errors).toContain('No story ID provided for elaboration')
  })

  it('returns error when no current story provided', async () => {
    const node = createInitializeNode()
    const state = createTestState({ storyId: 'flow-043', currentStory: null })

    const result = await node(state)

    expect(result.currentPhase).toBe('error')
    expect(result.errors).toContain('No current story provided for elaboration')
  })

  it('initializes successfully with valid state', async () => {
    const node = createInitializeNode()
    const state = createTestState({
      storyId: 'flow-043',
      currentStory: createTestStory(),
    })

    const result = await node(state)

    expect(result.currentPhase).toBe('load_previous')
    expect(result.config).toBeDefined()
    expect(result.startedAt).toBeDefined()
    expect(result.errors).toEqual([])
  })

  it('applies custom configuration', async () => {
    const config: Partial<ElaborationConfig> = {
      nodeTimeoutMs: 60000,
      recalculateReadiness: false,
    }
    const node = createInitializeNode(config)
    const state = createTestState({
      storyId: 'flow-043',
      currentStory: createTestStory(),
    })

    const result = await node(state)

    expect(result.config?.nodeTimeoutMs).toBe(60000)
    expect(result.config?.recalculateReadiness).toBe(false)
  })
})

describe('createLoadPreviousVersionNode', () => {
  it('handles missing previous story', async () => {
    const node = createLoadPreviousVersionNode()
    const state = createTestState({ previousStory: null })

    const result = await node(state)

    expect(result.previousStoryLoaded).toBe(true)
    expect(result.previousIteration).toBe(0)
    expect(result.currentPhase).toBe('delta_detect')
    expect(result.warnings).toContain('No previous story version provided - initial elaboration')
  })

  it('loads previous story when available', async () => {
    const node = createLoadPreviousVersionNode()
    const state = createTestState({
      previousStory: createTestStory(),
    })

    const result = await node(state)

    expect(result.previousStoryLoaded).toBe(true)
    expect(result.currentPhase).toBe('delta_detect')
  })
})

describe('createDeltaDetectNode', () => {
  it('returns error when no current story', async () => {
    const node = createDeltaDetectNode()
    const state = createTestState({ currentStory: null })

    const result = await node(state)

    expect(result.deltaDetected).toBe(false)
    expect(result.currentPhase).toBe('error')
    expect(result.errors).toContain('No current story available for delta detection')
  })

  it('detects no changes when no previous story', async () => {
    const node = createDeltaDetectNode()
    const currentStory = createTestStory()
    const state = createTestState({
      currentStory,
      previousStory: null,
      config: ElaborationConfigSchema.parse({}),
    })

    const result = await node(state)

    // When there's no previous story, all items are "added" which counts as changes
    expect(result.deltaDetectionResult).toBeDefined()
    expect(result.currentPhase).toBeDefined()
  })

  it('detects changes between story versions', async () => {
    const node = createDeltaDetectNode()
    const previousStory = createTestStory()
    const currentStory = createModifiedStory(previousStory)
    const state = createTestState({
      currentStory,
      previousStory,
      config: ElaborationConfigSchema.parse({}),
    })

    const result = await node(state)

    expect(result.deltaDetectionResult).toBeDefined()
    expect(result.deltaDetected).toBe(true)
    expect(result.currentPhase).toBe('delta_review')
  })
})

describe('createDeltaReviewNode', () => {
  it('returns error when no delta detection result', async () => {
    const node = createDeltaReviewNode()
    const state = createTestState({
      deltaDetectionResult: null,
      currentStory: createTestStory(),
    })

    const result = await node(state)

    expect(result.deltaReviewed).toBe(false)
    expect(result.currentPhase).toBe('error')
    expect(result.errors).toContain('No delta detection result available for review')
  })

  it('returns error when no current story', async () => {
    const node = createDeltaReviewNode()
    const state = createTestState({
      deltaDetectionResult: {
        storyId: 'flow-043',
        detectedAt: new Date().toISOString(),
        previousIteration: 0,
        currentIteration: 1,
        changes: [],
        stats: {
          totalChanges: 0,
          addedCount: 0,
          modifiedCount: 0,
          removedCount: 0,
          unchangedCount: 0,
          changesBySection: {},
          averageSignificance: 0,
          hasSubstantialChanges: false,
        },
        summary: 'No changes',
        detected: true,
      },
      currentStory: null,
    })

    const result = await node(state)

    expect(result.deltaReviewed).toBe(false)
    expect(result.currentPhase).toBe('error')
    expect(result.errors).toContain('No current story available for delta review')
  })
})

describe('createEscapeHatchEvalNode', () => {
  it('returns error when no current story', async () => {
    const node = createEscapeHatchEvalNode()
    const state = createTestState({ currentStory: null })

    const result = await node(state)

    expect(result.escapeHatchEvaluated).toBe(false)
    expect(result.currentPhase).toBe('error')
    expect(result.errors).toContain('No current story available for escape hatch evaluation')
  })

  it('evaluates escape hatch with story', async () => {
    const node = createEscapeHatchEvalNode()
    const state = createTestState({
      currentStory: createTestStory(),
      deltaReviewResult: null, // Will be handled gracefully
      config: ElaborationConfigSchema.parse({}),
    })

    const result = await node(state)

    expect(result.escapeHatchResult).toBeDefined()
    expect(result.escapeHatchEvaluated).toBe(true)
  })
})

describe('createTargetedReviewNode', () => {
  it('handles missing review scope', async () => {
    const node = createTargetedReviewNode()
    const state = createTestState({
      escapeHatchResult: {
        storyId: 'flow-043',
        evaluatedAt: new Date().toISOString(),
        triggered: true,
        triggersActivated: [],
        evaluations: [],
        reviewScope: null,
        stakeholdersToInvolve: [],
        confidence: 0,
        summary: 'No scope',
        evaluated: true,
      },
    })

    const result = await node(state)

    expect(result.targetedReviewComplete).toBe(true)
    expect(result.targetedReviewFindings).toEqual([])
    expect(result.warnings).toContain('No review scope determined for targeted review')
    expect(result.currentPhase).toBe('aggregate')
  })

  it('generates findings from review scope', async () => {
    const node = createTargetedReviewNode()
    const state = createTestState({
      escapeHatchResult: {
        storyId: 'flow-043',
        evaluatedAt: new Date().toISOString(),
        triggered: true,
        triggersActivated: ['attack_impact'],
        evaluations: [],
        reviewScope: {
          sections: ['acceptanceCriteria', 'testHints'],
          items: [],
          fullReview: false,
          priority: 1,
          reason: 'Attack impact detected',
        },
        stakeholdersToInvolve: ['attacker', 'qa'],
        confidence: 0.8,
        summary: 'Review needed',
        evaluated: true,
      },
    })

    const result = await node(state)

    expect(result.targetedReviewComplete).toBe(true)
    expect(result.targetedReviewFindings?.length).toBeGreaterThan(0)
    expect(result.targetedReviewFindings).toContain(
      'Targeted review needed for sections: acceptanceCriteria, testHints',
    )
    expect(result.targetedReviewFindings).toContain('Stakeholders to involve: attacker, qa')
    expect(result.currentPhase).toBe('aggregate')
  })
})

describe('createAggregateNode', () => {
  it('creates aggregated findings with no delta review', async () => {
    const node = createAggregateNode()
    const state = createTestState({
      storyId: 'flow-043',
      deltaReviewResult: null,
      escapeHatchTriggered: false,
      config: ElaborationConfigSchema.parse({ recalculateReadiness: true }),
    })

    const result = await node(state)

    expect(result.aggregatedFindings).toBeDefined()
    expect(result.aggregatedFindings?.storyId).toBe('flow-043')
    expect(result.aggregatedFindings?.totalFindings).toBe(0)
    expect(result.aggregatedFindings?.passed).toBe(true)
    expect(result.currentPhase).toBe('update_readiness')
  })

  it('aggregates findings from delta review', async () => {
    const node = createAggregateNode()
    const state = createTestState({
      storyId: 'flow-043',
      deltaReviewResult: {
        storyId: 'flow-043',
        reviewedAt: new Date().toISOString(),
        findings: [
          {
            id: 'RF-1',
            section: 'acceptanceCriteria',
            itemId: 'AC-1',
            severity: 'major',
            category: 'clarity',
            issue: 'Test issue',
            recommendation: 'Test recommendation',
            deltaRelated: true,
          },
        ],
        sectionsReviewed: ['acceptanceCriteria'],
        sectionsSkipped: [],
        sectionSummaries: [
          {
            section: 'acceptanceCriteria',
            itemsReviewed: 1,
            findingsCount: 1,
            passed: false,
          },
        ],
        passed: false,
        findingsBySeverity: {
          critical: 0,
          major: 1,
          minor: 0,
          info: 0,
        },
        summary: 'Test summary',
        reviewed: true,
      },
      escapeHatchTriggered: false,
      config: ElaborationConfigSchema.parse({ recalculateReadiness: false }),
    })

    const result = await node(state)

    expect(result.aggregatedFindings).toBeDefined()
    expect(result.aggregatedFindings?.totalFindings).toBe(1)
    expect(result.aggregatedFindings?.majorCount).toBe(1)
    // passed is false because deltaReviewResult.passed is false
    expect(result.aggregatedFindings?.passed).toBe(false)
    expect(result.aggregatedFindings?.sectionsNeedingAttention).toContain('acceptanceCriteria')
    expect(result.currentPhase).toBe('complete')
  })

  it('marks as failed when critical findings exist', async () => {
    const node = createAggregateNode()
    const state = createTestState({
      storyId: 'flow-043',
      deltaReviewResult: {
        storyId: 'flow-043',
        reviewedAt: new Date().toISOString(),
        findings: [
          {
            id: 'RF-1',
            section: 'acceptanceCriteria',
            itemId: 'AC-1',
            severity: 'critical',
            category: 'completeness',
            issue: 'Critical issue',
            recommendation: 'Fix immediately',
            deltaRelated: true,
          },
        ],
        sectionsReviewed: ['acceptanceCriteria'],
        sectionsSkipped: [],
        sectionSummaries: [],
        passed: false,
        findingsBySeverity: {
          critical: 1,
          major: 0,
          minor: 0,
          info: 0,
        },
        summary: 'Critical issues found',
        reviewed: true,
      },
      escapeHatchTriggered: false,
      config: ElaborationConfigSchema.parse({ recalculateReadiness: false }),
    })

    const result = await node(state)

    expect(result.aggregatedFindings?.passed).toBe(false)
    expect(result.aggregatedFindings?.criticalCount).toBe(1)
  })

  it('marks as failed when escape hatch triggered', async () => {
    const node = createAggregateNode()
    const state = createTestState({
      storyId: 'flow-043',
      deltaReviewResult: {
        storyId: 'flow-043',
        reviewedAt: new Date().toISOString(),
        findings: [],
        sectionsReviewed: [],
        sectionsSkipped: [],
        sectionSummaries: [],
        passed: true,
        findingsBySeverity: {
          critical: 0,
          major: 0,
          minor: 0,
          info: 0,
        },
        summary: 'All good',
        reviewed: true,
      },
      escapeHatchTriggered: true,
      config: ElaborationConfigSchema.parse({ recalculateReadiness: false }),
    })

    const result = await node(state)

    expect(result.aggregatedFindings?.passed).toBe(false)
    expect(result.aggregatedFindings?.escapeHatchTriggered).toBe(true)
  })
})

describe('createCompleteNode', () => {
  it('marks workflow as complete and successful when findings passed', async () => {
    const node = createCompleteNode()
    const state = createTestState({
      aggregatedFindings: {
        storyId: 'flow-043',
        aggregatedAt: new Date().toISOString(),
        totalFindings: 0,
        criticalCount: 0,
        majorCount: 0,
        minorCount: 0,
        infoCount: 0,
        escapeHatchTriggered: false,
        sectionsNeedingAttention: [],
        recommendedStakeholders: [],
        passed: true,
        summary: 'Success',
      },
    })

    const result = await node(state)

    expect(result.workflowComplete).toBe(true)
    expect(result.workflowSuccess).toBe(true)
  })

  it('marks workflow as complete but not successful when findings failed', async () => {
    const node = createCompleteNode()
    const state = createTestState({
      aggregatedFindings: {
        storyId: 'flow-043',
        aggregatedAt: new Date().toISOString(),
        totalFindings: 1,
        criticalCount: 1,
        majorCount: 0,
        minorCount: 0,
        infoCount: 0,
        escapeHatchTriggered: false,
        sectionsNeedingAttention: [],
        recommendedStakeholders: [],
        passed: false,
        summary: 'Failed',
      },
    })

    const result = await node(state)

    expect(result.workflowComplete).toBe(true)
    expect(result.workflowSuccess).toBe(false)
  })
})

describe('createElaborationGraph', () => {
  it('creates a compiled graph', () => {
    const graph = createElaborationGraph()
    expect(graph).toBeDefined()
    expect(typeof graph.invoke).toBe('function')
  })

  it('creates a graph with custom config', () => {
    const config: Partial<ElaborationConfig> = {
      nodeTimeoutMs: 60000,
      recalculateReadiness: false,
    }
    const graph = createElaborationGraph(config)
    expect(graph).toBeDefined()
  })
})

describe('runElaboration', () => {
  it('returns result with story ID', async () => {
    const story = createTestStory()
    const result = await runElaboration(story)

    expect(result.storyId).toBe('flow-043')
    expect(result.completedAt).toBeDefined()
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('extracts epic prefix from story ID', async () => {
    const story = createTestStory({ storyId: 'test-123' })
    const result = await runElaboration(story)

    expect(result.storyId).toBe('test-123')
  })

  it('handles initial elaboration without previous story', async () => {
    const story = createTestStory()
    const result = await runElaboration(story, null)

    expect(result.storyId).toBe('flow-043')
    expect(result.warnings).toContain('No previous story version provided - initial elaboration')
  })

  it('detects changes when previous story provided', async () => {
    const previousStory = createTestStory()
    const currentStory = createModifiedStory(previousStory)

    const result = await runElaboration(currentStory, previousStory)

    expect(result.storyId).toBe('flow-043')
    expect(result.deltaDetectionResult).toBeDefined()
  })

  it('applies custom configuration', async () => {
    const story = createTestStory()
    const config: Partial<ElaborationConfig> = {
      recalculateReadiness: false,
    }

    const result = await runElaboration(story, null, config)

    expect(result.storyId).toBe('flow-043')
    // Readiness should not be recalculated - result is null (or undefined if not set)
    expect(result.updatedReadinessResult ?? null).toBeNull()
  })
})
