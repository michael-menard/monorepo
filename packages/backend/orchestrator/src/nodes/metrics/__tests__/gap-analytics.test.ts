import { describe, expect, it, vi } from 'vitest'
import type { HygieneResult, RankedGap, GapCategory } from '../../story/gap-hygiene.js'
import {
  calculateGapYield,
  calculateAcceptanceRates,
  calculateEvidenceRates,
  calculateResolutionTimes,
  generateGapAnalytics,
  GapYieldMetricsSchema,
  AcceptanceRatesBySourceSchema,
  EvidenceMetricsSchema,
  ResolutionMetricsSchema,
  GapAnalyticsResultSchema,
  GapAnalyticsConfigSchema,
} from '../gap-analytics.js'

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
const createTestGap = (
  overrides: Partial<RankedGap> & { id: string; originalId: string },
): RankedGap => ({
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
  ...overrides,
})

const createTestHygieneResult = (
  overrides: Partial<HygieneResult> = {},
): HygieneResult => ({
  storyId: 'flow-041',
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
  summary: 'Test summary',
  actionItems: [],
  ...overrides,
})

describe('calculateGapYield', () => {
  it('calculates yield correctly for accepted gaps', () => {
    const gaps: RankedGap[] = [
      createTestGap({ id: 'RG-001', originalId: 'SG-1', acknowledged: true }),
      createTestGap({ id: 'RG-002', originalId: 'SG-2', resolved: true }),
      createTestGap({ id: 'RG-003', originalId: 'SG-3' }),
    ]

    const result = calculateGapYield(gaps)

    expect(result.suggested).toBe(3)
    expect(result.accepted).toBe(2)
    expect(result.yieldRatio).toBeCloseTo(2 / 3)
  })

  it('counts rejected gaps (deferred without acknowledgment)', () => {
    const gaps: RankedGap[] = [
      createTestGap({
        id: 'RG-001',
        originalId: 'SG-1',
        history: [
          { action: 'created', timestamp: '2024-01-01T00:00:00.000Z' },
          { action: 'deferred', timestamp: '2024-01-02T00:00:00.000Z' },
        ],
      }),
    ]

    const result = calculateGapYield(gaps)

    expect(result.rejected).toBe(1)
  })

  it('handles empty gaps array', () => {
    const result = calculateGapYield([])

    expect(result.suggested).toBe(0)
    expect(result.accepted).toBe(0)
    expect(result.rejected).toBe(0)
    expect(result.yieldRatio).toBe(0)
  })

  it('validates schema output', () => {
    const gaps: RankedGap[] = [
      createTestGap({ id: 'RG-001', originalId: 'SG-1', acknowledged: true }),
    ]

    const result = calculateGapYield(gaps)

    expect(() => GapYieldMetricsSchema.parse(result)).not.toThrow()
  })
})

describe('calculateAcceptanceRates', () => {
  it('calculates rates by source correctly', () => {
    const gaps: RankedGap[] = [
      createTestGap({ id: 'RG-001', originalId: 'PM-1', source: 'pm_scope', acknowledged: true }),
      createTestGap({ id: 'RG-002', originalId: 'PM-2', source: 'pm_requirement' }),
      createTestGap({ id: 'RG-003', originalId: 'UX-1', source: 'ux_accessibility', resolved: true }),
      createTestGap({ id: 'RG-004', originalId: 'QA-1', source: 'qa_edge_case', acknowledged: true }),
      createTestGap({ id: 'RG-005', originalId: 'ATK-1', source: 'attack_edge_case' }),
    ]

    const result = calculateAcceptanceRates(gaps)

    expect(result.pm).toBe(0.5) // 1 of 2 accepted
    expect(result.ux).toBe(1) // 1 of 1 accepted
    expect(result.qa).toBe(1) // 1 of 1 accepted
    expect(result.attack).toBe(0) // 0 of 1 accepted
    expect(result.counts.pm).toBe(2)
    expect(result.counts.ux).toBe(1)
    expect(result.counts.qa).toBe(1)
    expect(result.counts.attack).toBe(1)
  })

  it('handles empty gaps array', () => {
    const result = calculateAcceptanceRates([])

    expect(result.pm).toBe(0)
    expect(result.ux).toBe(0)
    expect(result.qa).toBe(0)
    expect(result.attack).toBe(0)
  })

  it('validates schema output', () => {
    const gaps: RankedGap[] = [
      createTestGap({ id: 'RG-001', originalId: 'PM-1', source: 'pm_scope' }),
    ]

    const result = calculateAcceptanceRates(gaps)

    expect(() => AcceptanceRatesBySourceSchema.parse(result)).not.toThrow()
  })
})

describe('calculateEvidenceRates', () => {
  it('calculates evidence rate correctly', () => {
    const gaps: RankedGap[] = [
      createTestGap({
        id: 'RG-001',
        originalId: 'SG-1',
        relatedACs: ['AC-1'],
        category: 'mvp_blocking',
      }),
      createTestGap({
        id: 'RG-002',
        originalId: 'SG-2',
        suggestion: 'This is a longer suggestion with detail',
        category: 'mvp_important',
      }),
      createTestGap({
        id: 'RG-003',
        originalId: 'SG-3',
        category: 'future',
      }),
    ]

    const result = calculateEvidenceRates(gaps)

    expect(result.evidenceBackedCount).toBe(2)
    expect(result.total).toBe(3)
    expect(result.rate).toBeCloseTo(2 / 3)
    expect(result.byCategory.mvp_blocking).toBe(1)
    expect(result.byCategory.future).toBe(0)
  })

  it('counts merged gaps as evidence-backed', () => {
    const gaps: RankedGap[] = [
      createTestGap({
        id: 'RG-001',
        originalId: 'SG-1',
        mergedFrom: ['SG-2', 'SG-3'],
      }),
    ]

    const result = calculateEvidenceRates(gaps)

    expect(result.evidenceBackedCount).toBe(1)
  })

  it('handles empty gaps array', () => {
    const result = calculateEvidenceRates([])

    expect(result.total).toBe(0)
    expect(result.rate).toBe(0)
  })

  it('validates schema output', () => {
    const gaps: RankedGap[] = [
      createTestGap({ id: 'RG-001', originalId: 'SG-1' }),
    ]

    const result = calculateEvidenceRates(gaps)

    expect(() => EvidenceMetricsSchema.parse(result)).not.toThrow()
  })
})

describe('calculateResolutionTimes', () => {
  it('calculates resolution times correctly', () => {
    const gaps: RankedGap[] = [
      createTestGap({
        id: 'RG-001',
        originalId: 'SG-1',
        category: 'mvp_blocking',
        resolved: true,
        history: [
          { action: 'created', timestamp: '2024-01-01T00:00:00.000Z' },
          { action: 'resolved', timestamp: '2024-01-03T00:00:00.000Z' },
        ],
      }),
      createTestGap({
        id: 'RG-002',
        originalId: 'SG-2',
        category: 'mvp_blocking',
        resolved: true,
        history: [
          { action: 'created', timestamp: '2024-01-01T00:00:00.000Z' },
          { action: 'resolved', timestamp: '2024-01-05T00:00:00.000Z' },
        ],
      }),
    ]

    const result = calculateResolutionTimes(gaps)

    // 2 days (172800000ms) and 4 days (345600000ms) average = 3 days
    expect(result.averageTimeByCategory.mvp_blocking).toBe(3 * 24 * 60 * 60 * 1000)
    expect(result.resolvedCount).toBe(2)
    expect(result.resolutionRate).toBe(1)
  })

  it('returns null for categories with no resolved gaps', () => {
    const gaps: RankedGap[] = [
      createTestGap({ id: 'RG-001', originalId: 'SG-1', category: 'future' }),
    ]

    const result = calculateResolutionTimes(gaps)

    expect(result.averageTimeByCategory.mvp_blocking).toBeNull()
    expect(result.averageTimeByCategory.future).toBeNull()
    expect(result.resolvedCount).toBe(0)
  })

  it('handles gaps without proper history', () => {
    const gaps: RankedGap[] = [
      createTestGap({
        id: 'RG-001',
        originalId: 'SG-1',
        resolved: true,
        history: [], // Empty history
      }),
    ]

    const result = calculateResolutionTimes(gaps)

    expect(result.overallAverageMs).toBeNull()
  })

  it('validates schema output', () => {
    const gaps: RankedGap[] = [
      createTestGap({ id: 'RG-001', originalId: 'SG-1' }),
    ]

    const result = calculateResolutionTimes(gaps)

    expect(() => ResolutionMetricsSchema.parse(result)).not.toThrow()
  })
})

describe('generateGapAnalytics', () => {
  it('generates complete analytics from hygiene result', async () => {
    const hygieneResult = createTestHygieneResult({
      rankedGaps: [
        createTestGap({ id: 'RG-001', originalId: 'PM-1', source: 'pm_scope', acknowledged: true }),
        createTestGap({ id: 'RG-002', originalId: 'UX-1', source: 'ux_accessibility' }),
        createTestGap({ id: 'RG-003', originalId: 'QA-1', source: 'qa_edge_case', resolved: true }),
        createTestGap({ id: 'RG-004', originalId: 'ATK-1', source: 'attack_edge_case' }),
        createTestGap({ id: 'RG-005', originalId: 'PM-2', source: 'pm_requirement' }),
      ],
    })

    const result = await generateGapAnalytics('flow-041', hygieneResult)

    expect(result.success).toBe(true)
    expect(result.storyId).toBe('flow-041')
    expect(result.totalGapsAnalyzed).toBe(5)
    expect(result.yieldMetrics.suggested).toBe(5)
    expect(result.yieldMetrics.accepted).toBe(2)
    expect(() => GapAnalyticsResultSchema.parse(result)).not.toThrow()
  })

  it('handles null hygiene result', async () => {
    const result = await generateGapAnalytics('flow-041', null)

    expect(result.success).toBe(false)
    expect(result.error).toContain('No hygiene result')
    expect(result.totalGapsAnalyzed).toBe(0)
  })

  it('handles empty gaps list', async () => {
    const hygieneResult = createTestHygieneResult({ rankedGaps: [] })

    const result = await generateGapAnalytics('flow-041', hygieneResult, { minGapsForAnalysis: 5 })

    expect(result.success).toBe(true)
    expect(result.insights).toContainEqual(expect.stringContaining('Insufficient gaps'))
  })

  it('respects minGapsForAnalysis config', async () => {
    const hygieneResult = createTestHygieneResult({
      rankedGaps: [
        createTestGap({ id: 'RG-001', originalId: 'SG-1' }),
        createTestGap({ id: 'RG-002', originalId: 'SG-2' }),
      ],
    })

    const result = await generateGapAnalytics('flow-041', hygieneResult, { minGapsForAnalysis: 5 })

    expect(result.insights).toContainEqual(expect.stringContaining('Insufficient gaps'))
  })

  it('generates insights for low yield ratio', async () => {
    const hygieneResult = createTestHygieneResult({
      rankedGaps: [
        createTestGap({ id: 'RG-001', originalId: 'SG-1' }),
        createTestGap({ id: 'RG-002', originalId: 'SG-2' }),
        createTestGap({ id: 'RG-003', originalId: 'SG-3' }),
        createTestGap({ id: 'RG-004', originalId: 'SG-4' }),
        createTestGap({ id: 'RG-005', originalId: 'SG-5' }),
        createTestGap({ id: 'RG-006', originalId: 'SG-6', acknowledged: true }),
      ],
    })

    const result = await generateGapAnalytics('flow-041', hygieneResult)

    expect(result.insights).toContainEqual(expect.stringContaining('Low gap yield ratio'))
  })

  it('generates insights for high yield ratio', async () => {
    const hygieneResult = createTestHygieneResult({
      rankedGaps: [
        createTestGap({ id: 'RG-001', originalId: 'SG-1', acknowledged: true }),
        createTestGap({ id: 'RG-002', originalId: 'SG-2', resolved: true }),
        createTestGap({ id: 'RG-003', originalId: 'SG-3', acknowledged: true }),
        createTestGap({ id: 'RG-004', originalId: 'SG-4', resolved: true }),
        createTestGap({ id: 'RG-005', originalId: 'SG-5', acknowledged: true }),
      ],
    })

    const result = await generateGapAnalytics('flow-041', hygieneResult)

    expect(result.insights).toContainEqual(expect.stringContaining('High gap yield ratio'))
  })
})

describe('GapYieldMetricsSchema validation', () => {
  it('validates correct metrics', () => {
    const metrics = {
      suggested: 10,
      accepted: 7,
      rejected: 2,
      yieldRatio: 0.7,
      calculatedAt: new Date().toISOString(),
    }

    expect(() => GapYieldMetricsSchema.parse(metrics)).not.toThrow()
  })

  it('rejects negative values', () => {
    const metrics = {
      suggested: -1,
      accepted: 0,
      rejected: 0,
      yieldRatio: 0,
      calculatedAt: new Date().toISOString(),
    }

    expect(() => GapYieldMetricsSchema.parse(metrics)).toThrow()
  })

  it('rejects yield ratio outside 0-1 range', () => {
    const metrics = {
      suggested: 10,
      accepted: 10,
      rejected: 0,
      yieldRatio: 1.5,
      calculatedAt: new Date().toISOString(),
    }

    expect(() => GapYieldMetricsSchema.parse(metrics)).toThrow()
  })
})

describe('AcceptanceRatesBySourceSchema validation', () => {
  it('validates correct rates', () => {
    const rates = {
      pm: 0.8,
      ux: 0.6,
      qa: 0.9,
      attack: 0.4,
      counts: { pm: 10, ux: 5, qa: 10, attack: 5 },
    }

    expect(() => AcceptanceRatesBySourceSchema.parse(rates)).not.toThrow()
  })

  it('rejects rates outside 0-1 range', () => {
    const rates = {
      pm: 1.5,
      ux: 0.6,
      qa: 0.9,
      attack: 0.4,
      counts: { pm: 10, ux: 5, qa: 10, attack: 5 },
    }

    expect(() => AcceptanceRatesBySourceSchema.parse(rates)).toThrow()
  })
})

describe('EvidenceMetricsSchema validation', () => {
  it('validates correct metrics', () => {
    const metrics = {
      evidenceBackedCount: 8,
      total: 10,
      rate: 0.8,
      byCategory: {
        mvp_blocking: 1.0,
        mvp_important: 0.75,
        future: 0.5,
        deferred: 0.25,
      },
    }

    expect(() => EvidenceMetricsSchema.parse(metrics)).not.toThrow()
  })
})

describe('ResolutionMetricsSchema validation', () => {
  it('validates metrics with null averages', () => {
    const metrics = {
      averageTimeByCategory: {
        mvp_blocking: null,
        mvp_important: null,
        future: null,
        deferred: null,
      },
      overallAverageMs: null,
      resolvedCount: 0,
      resolutionRate: 0,
    }

    expect(() => ResolutionMetricsSchema.parse(metrics)).not.toThrow()
  })

  it('validates metrics with values', () => {
    const metrics = {
      averageTimeByCategory: {
        mvp_blocking: 86400000,
        mvp_important: 172800000,
        future: null,
        deferred: null,
      },
      overallAverageMs: 129600000,
      resolvedCount: 5,
      resolutionRate: 0.5,
    }

    expect(() => ResolutionMetricsSchema.parse(metrics)).not.toThrow()
  })
})

describe('GapAnalyticsResultSchema validation', () => {
  it('validates successful result', () => {
    const result = {
      storyId: 'flow-041',
      analyzedAt: new Date().toISOString(),
      yieldMetrics: {
        suggested: 10,
        accepted: 7,
        rejected: 2,
        yieldRatio: 0.7,
        calculatedAt: new Date().toISOString(),
      },
      acceptanceRates: {
        pm: 0.8,
        ux: 0.6,
        qa: 0.9,
        attack: 0.4,
        counts: { pm: 5, ux: 2, qa: 2, attack: 1 },
      },
      evidenceMetrics: {
        evidenceBackedCount: 8,
        total: 10,
        rate: 0.8,
        byCategory: {
          mvp_blocking: 1.0,
          mvp_important: 0.75,
          future: 0.5,
          deferred: 0.25,
        },
      },
      resolutionMetrics: {
        averageTimeByCategory: {
          mvp_blocking: 86400000,
          mvp_important: null,
          future: null,
          deferred: null,
        },
        overallAverageMs: 86400000,
        resolvedCount: 3,
        resolutionRate: 0.3,
      },
      totalGapsAnalyzed: 10,
      insights: ['High gap yield ratio (70.0%)'],
      success: true,
    }

    expect(() => GapAnalyticsResultSchema.parse(result)).not.toThrow()
  })

  it('validates failed result', () => {
    const result = {
      storyId: 'flow-041',
      analyzedAt: new Date().toISOString(),
      yieldMetrics: {
        suggested: 0,
        accepted: 0,
        rejected: 0,
        yieldRatio: 0,
        calculatedAt: new Date().toISOString(),
      },
      acceptanceRates: {
        pm: 0,
        ux: 0,
        qa: 0,
        attack: 0,
        counts: { pm: 0, ux: 0, qa: 0, attack: 0 },
      },
      evidenceMetrics: {
        evidenceBackedCount: 0,
        total: 0,
        rate: 0,
        byCategory: {
          mvp_blocking: 0,
          mvp_important: 0,
          future: 0,
          deferred: 0,
        },
      },
      resolutionMetrics: {
        averageTimeByCategory: {
          mvp_blocking: null,
          mvp_important: null,
          future: null,
          deferred: null,
        },
        overallAverageMs: null,
        resolvedCount: 0,
        resolutionRate: 0,
      },
      totalGapsAnalyzed: 0,
      insights: ['No gap history available'],
      success: false,
      error: 'No hygiene result provided',
    }

    expect(() => GapAnalyticsResultSchema.parse(result)).not.toThrow()
  })
})

describe('GapAnalyticsConfigSchema validation', () => {
  it('applies default values', () => {
    const config = GapAnalyticsConfigSchema.parse({})

    expect(config.minGapsForAnalysis).toBe(5)
    expect(config.includeMergedGaps).toBe(true)
    expect(config.useRecencyWeighting).toBe(false)
    expect(config.recencyWindowMs).toBe(7 * 24 * 60 * 60 * 1000)
  })

  it('validates custom config', () => {
    const config = {
      minGapsForAnalysis: 10,
      includeMergedGaps: false,
      useRecencyWeighting: true,
      recencyWindowMs: 14 * 24 * 60 * 60 * 1000,
    }

    const parsed = GapAnalyticsConfigSchema.parse(config)

    expect(parsed.minGapsForAnalysis).toBe(10)
    expect(parsed.includeMergedGaps).toBe(false)
    expect(parsed.useRecencyWeighting).toBe(true)
  })
})
