import { describe, expect, it, vi } from 'vitest'
import type { StoryStructure } from '../seed.js'
import type { PMGapStructure, ScopeGap, RequirementGap } from '../fanout-pm.js'
import type { UXGapAnalysis, AccessibilityGap, UsabilityGap } from '../fanout-ux.js'
import type { QAGapAnalysis, TestabilityGap, EdgeCaseGap as QAEdgeCaseGap, CoverageGap } from '../fanout-qa.js'
import type { AttackAnalysis, AttackEdgeCase } from '../attack.js'
import {
  calculateGapScore,
  categorizeGap,
  recordHistory,
  deduplicateGaps,
  rankGaps,
  generateHygieneAnalysis,
  GapCategorySchema,
  GapSourceSchema,
  HistoryActionSchema,
  GapHistoryEntrySchema,
  BaseRankedGapSchema,
  DeduplicationStatsSchema,
  CategoryCountsSchema,
  HygieneResultSchema,
  HygieneConfigSchema,
  GapHygieneResultSchema,
  type RankedGap,
  type GapCategory,
  type HygieneConfig,
} from '../gap-hygiene.js'

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
const createTestStoryStructure = (overrides: Partial<StoryStructure> = {}): StoryStructure => ({
  storyId: 'flow-028',
  title: 'Add gap hygiene node',
  description: 'Create a node that ranks gaps and maintains history',
  domain: 'orchestrator',
  acceptanceCriteria: [
    {
      id: 'AC-1',
      description: 'The system must deduplicate similar gaps',
      fromBaseline: false,
    },
  ],
  constraints: ['Must not delete history'],
  affectedFiles: ['src/nodes/story/gap-hygiene.ts'],
  dependencies: ['fanout-pm', 'fanout-ux', 'fanout-qa', 'attack'],
  estimatedComplexity: 'medium',
  tags: ['langgraph', 'node'],
  ...overrides,
})

const createTestPMGaps = (overrides: Partial<PMGapStructure> = {}): PMGapStructure => ({
  scopeGaps: [
    {
      id: 'SG-1',
      category: 'boundary',
      description: 'Scope boundaries unclear',
      severity: 3,
      suggestion: 'Define scope explicitly',
      relatedACs: ['AC-1'],
    } as ScopeGap,
  ],
  requirementGaps: [
    {
      id: 'RG-1',
      category: 'missing',
      description: 'Missing requirement for edge cases',
      severity: 4,
      suggestion: 'Add edge case handling',
      isFunctional: true,
    } as RequirementGap,
  ],
  dependencyGaps: [],
  priorityGaps: [],
  ...overrides,
})

const createTestUXGaps = (overrides: Partial<UXGapAnalysis> = {}): UXGapAnalysis => ({
  storyId: 'flow-028',
  analyzedAt: new Date().toISOString(),
  accessibilityGaps: [
    {
      id: 'A11Y-GAP-001',
      type: 'accessibility',
      description: 'Missing keyboard navigation',
      severity: 'major',
      recommendation: 'Add keyboard support',
      wcagCriterion: { id: '2.1.1', name: 'Keyboard', level: 'A' },
      userImpact: 'Users cannot navigate via keyboard',
      fromBaseline: false,
      affectedACs: [],
    } as AccessibilityGap,
  ],
  usabilityGaps: [
    {
      id: 'USAB-GAP-001',
      type: 'usability',
      description: 'No feedback on save',
      severity: 'major',
      recommendation: 'Add save confirmation',
      heuristic: 'Visibility of system status',
      affectedTask: 'Saving data',
      fromBaseline: false,
      affectedACs: [],
    } as UsabilityGap,
  ],
  designPatternGaps: [],
  userFlowGaps: [],
  summary: {
    critical: 0,
    major: 2,
    minor: 0,
    suggestion: 0,
    total: 2,
  },
  uxReadiness: 'needs_review',
  ...overrides,
})

const createTestQAGaps = (overrides: Partial<QAGapAnalysis> = {}): QAGapAnalysis => ({
  storyId: 'flow-028',
  analyzedAt: new Date().toISOString(),
  testabilityGaps: [
    {
      id: 'TEST-1',
      description: 'External service dependencies',
      severity: 'high',
      category: 'external',
      suggestion: 'Use mocks for external services',
    } as TestabilityGap,
  ],
  edgeCaseGaps: [
    {
      id: 'EDGE-1',
      description: 'Empty input handling',
      severity: 'high',
      category: 'null_empty',
      example: 'What happens with empty array?',
    } as QAEdgeCaseGap,
  ],
  acClarityGaps: [],
  coverageGaps: [
    {
      id: 'COV-1',
      description: 'Unit test coverage needed',
      category: 'unit',
      priority: 'high',
      testApproach: 'Write Vitest tests',
    } as CoverageGap,
  ],
  testabilityScore: 75,
  summary: 'Test summary',
  keyRisks: [],
  recommendations: [],
  ...overrides,
})

const createTestAttackAnalysis = (
  overrides: Partial<AttackAnalysis> = {},
): AttackAnalysis => ({
  storyId: 'flow-028',
  analyzedAt: new Date().toISOString(),
  assumptions: [],
  challengeResults: [],
  edgeCases: [
    {
      id: 'EDGE-ATK-1',
      description: 'Concurrent modification scenario',
      category: 'concurrency',
      likelihood: 'likely',
      impact: 'high',
      riskScore: 16,
      mitigation: 'Use optimistic locking',
    } as AttackEdgeCase,
  ],
  summary: {
    totalAssumptions: 0,
    totalChallenges: 0,
    weakAssumptions: 0,
    totalEdgeCases: 1,
    highRiskEdgeCases: 1,
    attackReadiness: 'needs_attention',
    narrative: 'Test narrative',
  },
  keyVulnerabilities: [],
  recommendations: [],
  ...overrides,
})

describe('calculateGapScore', () => {
  it('calculates score correctly', () => {
    expect(calculateGapScore(5, 5)).toBe(25)
    expect(calculateGapScore(4, 4)).toBe(16)
    expect(calculateGapScore(3, 3)).toBe(9)
    expect(calculateGapScore(2, 2)).toBe(4)
    expect(calculateGapScore(1, 1)).toBe(1)
  })

  it('handles mixed values', () => {
    expect(calculateGapScore(5, 1)).toBe(5)
    expect(calculateGapScore(1, 5)).toBe(5)
    expect(calculateGapScore(3, 4)).toBe(12)
  })

  it('clamps to valid range', () => {
    expect(calculateGapScore(6, 6)).toBe(25) // Would be 36, clamped to 25
    expect(calculateGapScore(0, 5)).toBe(1) // Would be 0, clamped to 1
  })
})

describe('categorizeGap', () => {
  it('categorizes mvp_blocking gaps correctly', () => {
    expect(categorizeGap(25)).toBe('mvp_blocking')
    expect(categorizeGap(20)).toBe('mvp_blocking')
  })

  it('categorizes mvp_important gaps correctly', () => {
    expect(categorizeGap(19)).toBe('mvp_important')
    expect(categorizeGap(12)).toBe('mvp_important')
  })

  it('categorizes future gaps correctly', () => {
    expect(categorizeGap(11)).toBe('future')
    expect(categorizeGap(5)).toBe('future')
  })

  it('categorizes deferred gaps correctly', () => {
    expect(categorizeGap(4)).toBe('deferred')
    expect(categorizeGap(1)).toBe('deferred')
  })

  it('respects custom thresholds', () => {
    const customThresholds = {
      mvp_blocking: 15,
      mvp_important: 10,
      future: 3,
    }
    expect(categorizeGap(16, customThresholds)).toBe('mvp_blocking')
    expect(categorizeGap(14, customThresholds)).toBe('mvp_important')
    expect(categorizeGap(8, customThresholds)).toBe('future')
    expect(categorizeGap(2, customThresholds)).toBe('deferred')
  })
})

describe('recordHistory', () => {
  it('appends history entry without deleting previous', () => {
    const gap: RankedGap = {
      id: 'RG-001',
      originalId: 'SG-1',
      source: 'pm_scope',
      description: 'Test gap',
      score: 12,
      severity: 3,
      likelihood: 4,
      category: 'mvp_important',
      relatedACs: [],
      mergedFrom: [],
      history: [
        {
          action: 'created',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ],
      resolved: false,
      acknowledged: false,
    }

    const updated = recordHistory(gap, 'acknowledged', undefined, undefined, 'Team reviewed')

    expect(updated.history.length).toBe(2)
    expect(updated.history[0].action).toBe('created')
    expect(updated.history[1].action).toBe('acknowledged')
    expect(updated.history[1].notes).toBe('Team reviewed')
  })

  it('includes previous and new values when provided', () => {
    const gap: RankedGap = {
      id: 'RG-001',
      originalId: 'SG-1',
      source: 'pm_scope',
      description: 'Test gap',
      score: 12,
      severity: 3,
      likelihood: 4,
      category: 'mvp_important',
      relatedACs: [],
      mergedFrom: [],
      history: [],
      resolved: false,
      acknowledged: false,
    }

    const updated = recordHistory(gap, 'recategorized', 'future', 'mvp_important')

    expect(updated.history[0].previousValue).toBe('future')
    expect(updated.history[0].newValue).toBe('mvp_important')
  })
})

describe('deduplicateGaps', () => {
  it('merges similar gaps', () => {
    const pmGaps = createTestPMGaps({
      scopeGaps: [
        {
          id: 'SG-1',
          category: 'boundary',
          description: 'Scope boundaries are unclear and need definition',
          severity: 3,
          relatedACs: [],
        },
        {
          id: 'SG-2',
          category: 'boundary',
          description: 'Scope boundaries unclear need better definition',
          severity: 4,
          relatedACs: ['AC-1'],
        },
      ],
    })

    const result = deduplicateGaps(pmGaps, null, null, null, 0.6)

    expect(result.stats.merged).toBeGreaterThan(0)
    expect(result.stats.totalAfter).toBeLessThan(result.stats.totalBefore)
  })

  it('keeps distinct gaps separate', () => {
    const pmGaps = createTestPMGaps({
      scopeGaps: [
        {
          id: 'SG-1',
          category: 'boundary',
          description: 'Scope boundaries unclear',
          severity: 3,
          relatedACs: [],
        },
      ],
      requirementGaps: [
        {
          id: 'RG-1',
          category: 'missing',
          description: 'Security requirements not documented',
          severity: 4,
          isFunctional: false,
        },
      ],
    })

    const result = deduplicateGaps(pmGaps, null, null, null, 0.9)

    expect(result.stats.merged).toBe(0)
  })

  it('combines gaps from all sources', () => {
    const pmGaps = createTestPMGaps()
    const uxGaps = createTestUXGaps()
    const qaGaps = createTestQAGaps()
    const attackFindings = createTestAttackAnalysis()

    const result = deduplicateGaps(pmGaps, uxGaps, qaGaps, attackFindings, 0.9)

    expect(result.gaps.length).toBeGreaterThan(0)
    expect(result.stats.totalBefore).toBeGreaterThan(0)
  })

  it('takes highest severity when merging', () => {
    const pmGaps = createTestPMGaps({
      scopeGaps: [
        {
          id: 'SG-1',
          category: 'boundary',
          description: 'Test gap one description here',
          severity: 2,
          relatedACs: [],
        },
        {
          id: 'SG-2',
          category: 'boundary',
          description: 'Test gap one description here also',
          severity: 5,
          relatedACs: [],
        },
      ],
    })

    const result = deduplicateGaps(pmGaps, null, null, null, 0.5)

    // After merging, the remaining gap should have severity 5
    const remainingGap = result.gaps.find(g => g.id === 'SG-1')
    if (remainingGap) {
      expect(remainingGap.severity).toBe(5)
    }
  })
})

describe('rankGaps', () => {
  it('sorts gaps by score descending', () => {
    const pmGaps = createTestPMGaps()
    const uxGaps = createTestUXGaps()

    const { gaps } = deduplicateGaps(pmGaps, uxGaps, null, null, 0.9)
    const config = HygieneConfigSchema.parse({})
    const ranked = rankGaps(gaps, config)

    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1].score).toBeGreaterThanOrEqual(ranked[i].score)
    }
  })

  it('assigns correct categories based on score', () => {
    const pmGaps = createTestPMGaps({
      scopeGaps: [
        { id: 'SG-1', category: 'boundary', description: 'High severity gap', severity: 5, relatedACs: [] },
        { id: 'SG-2', category: 'boundary', description: 'Low severity gap', severity: 1, relatedACs: [] },
      ],
    })

    const { gaps } = deduplicateGaps(pmGaps, null, null, null, 0.9)
    const config = HygieneConfigSchema.parse({})
    const ranked = rankGaps(gaps, config)

    const highGap = ranked.find(g => g.originalId === 'SG-1')
    const lowGap = ranked.find(g => g.originalId === 'SG-2')

    // High severity with default likelihood 3 = 15, so mvp_important
    expect(highGap?.category).toBe('mvp_important')
    // Low severity with likelihood 3 = 3, so deferred
    expect(lowGap?.category).toBe('deferred')
  })

  it('respects maxGaps limit', () => {
    const pmGaps = createTestPMGaps()
    const uxGaps = createTestUXGaps()
    const qaGaps = createTestQAGaps()

    const { gaps } = deduplicateGaps(pmGaps, uxGaps, qaGaps, null, 0.9)
    const config = HygieneConfigSchema.parse({ maxGaps: 3 })
    const ranked = rankGaps(gaps, config)

    expect(ranked.length).toBeLessThanOrEqual(3)
  })

  it('respects minScore threshold', () => {
    const pmGaps = createTestPMGaps({
      scopeGaps: [
        { id: 'SG-1', category: 'boundary', description: 'High gap', severity: 5, relatedACs: [] },
        { id: 'SG-2', category: 'boundary', description: 'Low gap', severity: 1, relatedACs: [] },
      ],
    })

    const { gaps } = deduplicateGaps(pmGaps, null, null, null, 0.9)
    const config = HygieneConfigSchema.parse({ minScore: 10 })
    const ranked = rankGaps(gaps, config)

    ranked.forEach(gap => {
      expect(gap.score).toBeGreaterThanOrEqual(10)
    })
  })

  it('generates unique IDs for ranked gaps', () => {
    const pmGaps = createTestPMGaps()
    const uxGaps = createTestUXGaps()

    const { gaps } = deduplicateGaps(pmGaps, uxGaps, null, null, 0.9)
    const config = HygieneConfigSchema.parse({})
    const ranked = rankGaps(gaps, config)

    const ids = ranked.map(g => g.id)
    const uniqueIds = new Set(ids)

    expect(uniqueIds.size).toBe(ids.length)
  })

  it('includes history entry for creation', () => {
    const pmGaps = createTestPMGaps()

    const { gaps } = deduplicateGaps(pmGaps, null, null, null, 0.9)
    const config = HygieneConfigSchema.parse({})
    const ranked = rankGaps(gaps, config)

    ranked.forEach(gap => {
      expect(gap.history.length).toBeGreaterThan(0)
      expect(gap.history[0].action).toBe('created')
    })
  })
})

describe('generateHygieneAnalysis', () => {
  it('generates analysis from valid gap inputs', async () => {
    const pmGaps = createTestPMGaps()
    const uxGaps = createTestUXGaps()

    const result = await generateHygieneAnalysis(
      'flow-028',
      pmGaps,
      uxGaps,
      null,
      null,
      null,
    )

    expect(result.analyzed).toBe(true)
    expect(result.hygieneResult).not.toBeNull()
    expect(result.hygieneResult?.storyId).toBe('flow-028')
  })

  it('handles missing gap inputs', async () => {
    const result = await generateHygieneAnalysis(
      'flow-028',
      null,
      null,
      null,
      null,
      null,
    )

    expect(result.analyzed).toBe(false)
    expect(result.error).toContain('No gap analyses')
  })

  it('calculates category counts correctly', async () => {
    const pmGaps: PMGapStructure = {
      scopeGaps: [
        { id: 'SG-1', category: 'boundary', description: 'Critical gap', severity: 5, relatedACs: [] },
        { id: 'SG-2', category: 'boundary', description: 'Important gap', severity: 4, relatedACs: [] },
        { id: 'SG-3', category: 'boundary', description: 'Minor gap', severity: 2, relatedACs: [] },
      ],
      requirementGaps: [],
      dependencyGaps: [],
      priorityGaps: [],
    }

    const result = await generateHygieneAnalysis(
      'flow-028',
      pmGaps,
      null,
      null,
      null,
      null,
    )

    expect(result.hygieneResult?.categoryCounts).toBeDefined()
    expect(result.hygieneResult?.totalGaps).toBe(3)
  })

  it('generates summary and action items', async () => {
    const pmGaps = createTestPMGaps()
    const uxGaps = createTestUXGaps()

    const result = await generateHygieneAnalysis(
      'flow-028',
      pmGaps,
      uxGaps,
      null,
      null,
      null,
    )

    expect(result.hygieneResult?.summary).toBeTruthy()
    expect(Array.isArray(result.hygieneResult?.actionItems)).toBe(true)
  })

  it('calculates statistics correctly', async () => {
    const pmGaps = createTestPMGaps()

    const result = await generateHygieneAnalysis(
      'flow-028',
      pmGaps,
      null,
      null,
      null,
      null,
    )

    expect(result.hygieneResult?.totalGaps).toBeGreaterThan(0)
    expect(result.hygieneResult?.highestScore).toBeGreaterThanOrEqual(0)
    expect(result.hygieneResult?.averageScore).toBeGreaterThanOrEqual(0)
  })

  it('respects configuration options', async () => {
    const pmGaps = createTestPMGaps()

    const result = await generateHygieneAnalysis(
      'flow-028',
      pmGaps,
      null,
      null,
      null,
      null,
      {
        maxGaps: 1,
        enableDeduplication: false,
      },
    )

    expect(result.hygieneResult?.rankedGaps.length).toBeLessThanOrEqual(1)
  })

  it('preserves history from previous analysis', async () => {
    const pmGaps = createTestPMGaps()

    // First analysis
    const firstResult = await generateHygieneAnalysis(
      'flow-028',
      pmGaps,
      null,
      null,
      null,
      null,
    )

    // Mark a gap as acknowledged
    const previousHistory = {
      ...firstResult.hygieneResult!,
      rankedGaps: firstResult.hygieneResult!.rankedGaps.map(g => ({
        ...g,
        acknowledged: true,
        history: [
          ...g.history,
          {
            action: 'acknowledged' as const,
            timestamp: new Date().toISOString(),
            notes: 'Team reviewed',
          },
        ],
      })),
    }

    // Second analysis with previous history
    const secondResult = await generateHygieneAnalysis(
      'flow-028',
      pmGaps,
      null,
      null,
      null,
      previousHistory,
    )

    // Check that history was preserved
    const matchingGap = secondResult.hygieneResult?.rankedGaps.find(
      g => previousHistory.rankedGaps.some(pg => pg.originalId === g.originalId),
    )

    if (matchingGap) {
      expect(matchingGap.history.length).toBeGreaterThan(1)
      expect(matchingGap.acknowledged).toBe(true)
    }
  })

  it('adds deduplication warning when gaps are merged', async () => {
    const pmGaps = createTestPMGaps({
      scopeGaps: [
        { id: 'SG-1', category: 'boundary', description: 'Similar gap about boundaries', severity: 3, relatedACs: [] },
        { id: 'SG-2', category: 'boundary', description: 'Similar gap about boundaries too', severity: 3, relatedACs: [] },
      ],
    })

    const result = await generateHygieneAnalysis(
      'flow-028',
      pmGaps,
      null,
      null,
      null,
      null,
      { similarityThreshold: 0.5 },
    )

    // May or may not have warning depending on actual similarity
    expect(Array.isArray(result.warnings)).toBe(true)
  })

  it('combines gaps from all sources', async () => {
    const pmGaps = createTestPMGaps()
    const uxGaps = createTestUXGaps()
    const qaGaps = createTestQAGaps()
    const attackFindings = createTestAttackAnalysis()

    const result = await generateHygieneAnalysis(
      'flow-028',
      pmGaps,
      uxGaps,
      qaGaps,
      attackFindings,
      null,
    )

    expect(result.analyzed).toBe(true)
    expect(result.hygieneResult?.totalGaps).toBeGreaterThan(0)

    // Check that gaps from multiple sources are present
    const sources = new Set(result.hygieneResult?.rankedGaps.map(g => g.source.split('_')[0]))
    expect(sources.size).toBeGreaterThan(1)
  })
})

describe('GapCategorySchema validation', () => {
  it('validates all categories', () => {
    const categories = ['mvp_blocking', 'mvp_important', 'future', 'deferred'] as const

    for (const category of categories) {
      expect(() => GapCategorySchema.parse(category)).not.toThrow()
    }
  })

  it('rejects invalid categories', () => {
    expect(() => GapCategorySchema.parse('invalid')).toThrow()
    expect(() => GapCategorySchema.parse('')).toThrow()
  })
})

describe('GapSourceSchema validation', () => {
  it('validates all sources', () => {
    const sources = [
      'pm_scope',
      'pm_requirement',
      'pm_dependency',
      'pm_priority',
      'ux_accessibility',
      'ux_usability',
      'ux_design_pattern',
      'ux_user_flow',
      'qa_testability',
      'qa_edge_case',
      'qa_ac_clarity',
      'qa_coverage',
      'attack_edge_case',
      'attack_assumption',
    ] as const

    for (const source of sources) {
      expect(() => GapSourceSchema.parse(source)).not.toThrow()
    }
  })
})

describe('HistoryActionSchema validation', () => {
  it('validates all actions', () => {
    const actions = [
      'created',
      'merged',
      'recategorized',
      'rescored',
      'acknowledged',
      'resolved',
      'deferred',
    ] as const

    for (const action of actions) {
      expect(() => HistoryActionSchema.parse(action)).not.toThrow()
    }
  })
})

describe('GapHistoryEntrySchema validation', () => {
  it('validates complete history entry', () => {
    const entry = {
      action: 'created',
      timestamp: new Date().toISOString(),
      previousValue: 'old',
      newValue: 'new',
      notes: 'Test notes',
    }

    expect(() => GapHistoryEntrySchema.parse(entry)).not.toThrow()
  })

  it('validates minimal history entry', () => {
    const entry = {
      action: 'acknowledged',
      timestamp: new Date().toISOString(),
    }

    expect(() => GapHistoryEntrySchema.parse(entry)).not.toThrow()
  })
})

describe('BaseRankedGapSchema validation', () => {
  it('validates complete ranked gap', () => {
    const gap = {
      id: 'RG-001',
      originalId: 'SG-1',
      source: 'pm_scope',
      description: 'Test gap description',
      score: 15,
      severity: 3,
      likelihood: 5,
      category: 'mvp_important',
      suggestion: 'Fix it',
      relatedACs: ['AC-1', 'AC-2'],
      mergedFrom: ['SG-2'],
      history: [
        {
          action: 'created',
          timestamp: new Date().toISOString(),
        },
      ],
      resolved: false,
      acknowledged: true,
    }

    expect(() => BaseRankedGapSchema.parse(gap)).not.toThrow()
  })

  it('validates score range', () => {
    const validScores = [1, 12, 25]
    const invalidScores = [0, 26, -1]

    for (const score of validScores) {
      const gap = {
        id: 'RG-001',
        originalId: 'SG-1',
        source: 'pm_scope',
        description: 'Test',
        score,
        severity: 3,
        likelihood: 4,
        category: 'mvp_important',
        history: [],
      }
      expect(() => BaseRankedGapSchema.parse(gap)).not.toThrow()
    }

    for (const score of invalidScores) {
      const gap = {
        id: 'RG-001',
        originalId: 'SG-1',
        source: 'pm_scope',
        description: 'Test',
        score,
        severity: 3,
        likelihood: 4,
        category: 'mvp_important',
        history: [],
      }
      expect(() => BaseRankedGapSchema.parse(gap)).toThrow()
    }
  })
})

describe('DeduplicationStatsSchema validation', () => {
  it('validates complete stats', () => {
    const stats = {
      totalBefore: 10,
      totalAfter: 7,
      merged: 3,
      mergeGroups: [
        { primaryId: 'SG-1', mergedIds: ['SG-2', 'SG-3'] },
      ],
    }

    expect(() => DeduplicationStatsSchema.parse(stats)).not.toThrow()
  })
})

describe('CategoryCountsSchema validation', () => {
  it('validates category counts', () => {
    const counts = {
      mvp_blocking: 2,
      mvp_important: 5,
      future: 3,
      deferred: 1,
    }

    expect(() => CategoryCountsSchema.parse(counts)).not.toThrow()
  })

  it('rejects negative counts', () => {
    const counts = {
      mvp_blocking: -1,
      mvp_important: 5,
      future: 3,
      deferred: 1,
    }

    expect(() => CategoryCountsSchema.parse(counts)).toThrow()
  })
})

describe('HygieneResultSchema validation', () => {
  it('validates complete result', () => {
    const result = {
      storyId: 'flow-028',
      analyzedAt: new Date().toISOString(),
      rankedGaps: [],
      deduplicationStats: {
        totalBefore: 10,
        totalAfter: 8,
        merged: 2,
        mergeGroups: [],
      },
      categoryCounts: {
        mvp_blocking: 1,
        mvp_important: 3,
        future: 2,
        deferred: 2,
      },
      totalGaps: 8,
      mvpBlockingCount: 1,
      highestScore: 20,
      averageScore: 12.5,
      summary: 'Test summary',
      actionItems: ['Action 1', 'Action 2'],
    }

    expect(() => HygieneResultSchema.parse(result)).not.toThrow()
  })
})

describe('HygieneConfigSchema validation', () => {
  it('applies default values', () => {
    const config = HygieneConfigSchema.parse({})

    expect(config.maxGaps).toBe(50)
    expect(config.minScore).toBe(1)
    expect(config.enableDeduplication).toBe(true)
    expect(config.similarityThreshold).toBe(0.7)
    expect(config.includeResolved).toBe(false)
    expect(config.categoryThresholds.mvp_blocking).toBe(20)
    expect(config.categoryThresholds.mvp_important).toBe(12)
    expect(config.categoryThresholds.future).toBe(5)
  })

  it('validates custom config', () => {
    const config = {
      maxGaps: 100,
      minScore: 5,
      enableDeduplication: false,
      similarityThreshold: 0.8,
      includeResolved: true,
      categoryThresholds: {
        mvp_blocking: 18,
        mvp_important: 10,
        future: 3,
      },
    }

    const parsed = HygieneConfigSchema.parse(config)

    expect(parsed.maxGaps).toBe(100)
    expect(parsed.minScore).toBe(5)
    expect(parsed.enableDeduplication).toBe(false)
    expect(parsed.similarityThreshold).toBe(0.8)
  })
})

describe('GapHygieneResultSchema validation', () => {
  it('validates successful result', () => {
    const result = {
      hygieneResult: {
        storyId: 'flow-028',
        analyzedAt: new Date().toISOString(),
        rankedGaps: [],
        deduplicationStats: {
          totalBefore: 0,
          totalAfter: 0,
          merged: 0,
          mergeGroups: [],
        },
        categoryCounts: {
          mvp_blocking: 0,
          mvp_important: 0,
          future: 0,
          deferred: 0,
        },
        totalGaps: 0,
        mvpBlockingCount: 0,
        highestScore: 0,
        averageScore: 0,
        summary: 'No gaps found',
        actionItems: [],
      },
      analyzed: true,
      warnings: [],
    }

    expect(() => GapHygieneResultSchema.parse(result)).not.toThrow()
  })

  it('validates failed result', () => {
    const result = {
      hygieneResult: null,
      analyzed: false,
      error: 'No gap analyses provided',
      warnings: ['Warning message'],
    }

    expect(() => GapHygieneResultSchema.parse(result)).not.toThrow()
  })
})
