import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { HygieneResult, RankedGap } from '../../nodes/story/gap-hygiene.js'
import {
  createMetricsGraph,
  runMetricsCollection,
  createInitializeNode,
  createGapAnalyticsCollectorNode,
  createAggregationNode,
  createOutputNode,
  MetricsGraphConfigSchema,
  MetricEntrySchema,
  AggregatedMetricsSchema,
  MetricsReportSchema,
  MetricsTypeSchema,
  type MetricsGraphState,
  type MetricsGraphConfig,
} from '../metrics.js'

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

const createTestHygieneResult = (overrides: Partial<HygieneResult> = {}): HygieneResult => ({
  storyId: 'flow-044',
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

const createTestState = (overrides: Partial<MetricsGraphState> = {}): MetricsGraphState => ({
  storyId: 'flow-044',
  epicPrefix: 'flow',
  metricsConfig: null,
  gapHygieneResult: null,
  gapAnalyticsResult: null,
  gapAnalyticsCompleted: false,
  aggregatedMetrics: null,
  metricsReport: null,
  collectionInitialized: false,
  collectionComplete: false,
  collectionErrors: [],
  ...overrides,
})

describe('MetricsTypeSchema', () => {
  it('validates gap_analytics type', () => {
    expect(MetricsTypeSchema.parse('gap_analytics')).toBe('gap_analytics')
  })

  it('validates workflow_metrics type', () => {
    expect(MetricsTypeSchema.parse('workflow_metrics')).toBe('workflow_metrics')
  })

  it('validates quality_metrics type', () => {
    expect(MetricsTypeSchema.parse('quality_metrics')).toBe('quality_metrics')
  })

  it('rejects invalid types', () => {
    expect(() => MetricsTypeSchema.parse('invalid')).toThrow()
  })
})

describe('MetricsGraphConfigSchema', () => {
  it('applies default values', () => {
    const config = MetricsGraphConfigSchema.parse({})

    expect(config.metricsToCollect).toEqual(['gap_analytics'])
    expect(config.includeInsights).toBe(true)
    expect(config.includeRawData).toBe(true)
    expect(config.nodeTimeoutMs).toBe(30000)
  })

  it('validates custom config', () => {
    const config = {
      metricsToCollect: ['gap_analytics', 'workflow_metrics'],
      includeInsights: false,
      includeRawData: false,
      nodeTimeoutMs: 60000,
    }

    const parsed = MetricsGraphConfigSchema.parse(config)

    expect(parsed.metricsToCollect).toEqual(['gap_analytics', 'workflow_metrics'])
    expect(parsed.includeInsights).toBe(false)
    expect(parsed.includeRawData).toBe(false)
    expect(parsed.nodeTimeoutMs).toBe(60000)
  })

  it('rejects negative timeout', () => {
    expect(() => MetricsGraphConfigSchema.parse({ nodeTimeoutMs: -1 })).toThrow()
  })
})

describe('MetricEntrySchema', () => {
  it('validates complete entry', () => {
    const entry = {
      type: 'gap_analytics',
      success: true,
      collectedAt: new Date().toISOString(),
      data: { test: 'data' },
    }

    expect(() => MetricEntrySchema.parse(entry)).not.toThrow()
  })

  it('validates failed entry with error', () => {
    const entry = {
      type: 'gap_analytics',
      success: false,
      error: 'Collection failed',
      collectedAt: new Date().toISOString(),
    }

    expect(() => MetricEntrySchema.parse(entry)).not.toThrow()
  })
})

describe('AggregatedMetricsSchema', () => {
  it('validates complete aggregated metrics', () => {
    const metrics = {
      storyId: 'flow-044',
      aggregatedAt: new Date().toISOString(),
      metrics: [
        {
          type: 'gap_analytics',
          success: true,
          collectedAt: new Date().toISOString(),
        },
      ],
      totalCollected: 1,
      successfulCollections: 1,
      combinedInsights: ['Test insight'],
      overallSuccess: true,
    }

    expect(() => AggregatedMetricsSchema.parse(metrics)).not.toThrow()
  })

  it('validates empty metrics', () => {
    const metrics = {
      storyId: 'flow-044',
      aggregatedAt: new Date().toISOString(),
      metrics: [],
      totalCollected: 0,
      successfulCollections: 0,
      combinedInsights: [],
      overallSuccess: false,
    }

    expect(() => AggregatedMetricsSchema.parse(metrics)).not.toThrow()
  })
})

describe('MetricsReportSchema', () => {
  it('validates successful report', () => {
    const report = {
      storyId: 'flow-044',
      generatedAt: new Date().toISOString(),
      config: MetricsGraphConfigSchema.parse({}),
      aggregatedMetrics: {
        storyId: 'flow-044',
        aggregatedAt: new Date().toISOString(),
        metrics: [],
        totalCollected: 0,
        successfulCollections: 0,
        combinedInsights: [],
        overallSuccess: true,
      },
      gapAnalytics: null,
      summary: 'Test summary',
      recommendations: ['Test recommendation'],
      success: true,
    }

    expect(() => MetricsReportSchema.parse(report)).not.toThrow()
  })

  it('validates failed report with error', () => {
    const report = {
      storyId: 'flow-044',
      generatedAt: new Date().toISOString(),
      config: MetricsGraphConfigSchema.parse({}),
      aggregatedMetrics: {
        storyId: 'flow-044',
        aggregatedAt: new Date().toISOString(),
        metrics: [],
        totalCollected: 0,
        successfulCollections: 0,
        combinedInsights: [],
        overallSuccess: false,
      },
      gapAnalytics: null,
      summary: 'Report failed',
      recommendations: [],
      success: false,
      error: 'Something went wrong',
    }

    expect(() => MetricsReportSchema.parse(report)).not.toThrow()
  })
})

describe('createInitializeNode', () => {
  it('initializes with default config', async () => {
    const node = createInitializeNode()
    const state = createTestState()

    const result = await node(state)

    expect(result.collectionInitialized).toBe(true)
    expect(result.metricsConfig).toBeDefined()
    expect(result.collectionErrors).toEqual([])
  })

  it('initializes with custom config', async () => {
    const config: Partial<MetricsGraphConfig> = {
      metricsToCollect: ['gap_analytics', 'workflow_metrics'],
      includeInsights: false,
    }
    const node = createInitializeNode(config)
    const state = createTestState()

    const result = await node(state)

    expect(result.collectionInitialized).toBe(true)
    expect(result.metricsConfig?.metricsToCollect).toEqual(['gap_analytics', 'workflow_metrics'])
    expect(result.metricsConfig?.includeInsights).toBe(false)
  })

  it('fails initialization without story ID', async () => {
    const node = createInitializeNode()
    const state = createTestState({ storyId: '' })

    const result = await node(state)

    expect(result.collectionInitialized).toBe(false)
    expect(result.collectionErrors).toContain('No story ID provided for metrics collection')
  })
})

describe('createGapAnalyticsCollectorNode', () => {
  it('collects gap analytics from hygiene result', async () => {
    const node = createGapAnalyticsCollectorNode()
    const hygieneResult = createTestHygieneResult({
      rankedGaps: [
        createTestGap({ id: 'RG-001', originalId: 'PM-1', source: 'pm_scope', acknowledged: true }),
        createTestGap({ id: 'RG-002', originalId: 'UX-1', source: 'ux_accessibility' }),
        createTestGap({ id: 'RG-003', originalId: 'QA-1', source: 'qa_edge_case', resolved: true }),
        createTestGap({ id: 'RG-004', originalId: 'ATK-1', source: 'attack_edge_case' }),
        createTestGap({ id: 'RG-005', originalId: 'PM-2', source: 'pm_requirement' }),
      ],
    })
    const state = createTestState({
      gapHygieneResult: hygieneResult,
      metricsConfig: MetricsGraphConfigSchema.parse({}),
    })

    const result = await node(state)

    expect(result.gapAnalyticsCompleted).toBe(true)
    expect(result.gapAnalyticsResult).toBeDefined()
    expect(result.gapAnalyticsResult?.success).toBe(true)
    expect(result.gapAnalyticsResult?.totalGapsAnalyzed).toBe(5)
  })

  it('handles null hygiene result', async () => {
    const node = createGapAnalyticsCollectorNode()
    const state = createTestState({
      metricsConfig: MetricsGraphConfigSchema.parse({}),
    })

    const result = await node(state)

    expect(result.gapAnalyticsCompleted).toBe(false)
    expect(result.gapAnalyticsResult?.success).toBe(false)
  })

  it('skips collection when gap_analytics not in metricsToCollect', async () => {
    const node = createGapAnalyticsCollectorNode()
    const state = createTestState({
      metricsConfig: MetricsGraphConfigSchema.parse({
        metricsToCollect: ['workflow_metrics'],
      }),
    })

    const result = await node(state)

    expect(result.gapAnalyticsResult).toBeNull()
    expect(result.gapAnalyticsCompleted).toBe(true)
  })
})

describe('createAggregationNode', () => {
  it('aggregates successful gap analytics', async () => {
    const node = createAggregationNode()
    const state = createTestState({
      gapAnalyticsCompleted: true,
      gapAnalyticsResult: {
        storyId: 'flow-044',
        analyzedAt: new Date().toISOString(),
        yieldMetrics: {
          suggested: 5,
          accepted: 2,
          rejected: 1,
          yieldRatio: 0.4,
          calculatedAt: new Date().toISOString(),
        },
        acceptanceRates: {
          pm: 0.5,
          ux: 1,
          qa: 0,
          attack: 0,
          counts: { pm: 2, ux: 1, qa: 1, attack: 1 },
        },
        evidenceMetrics: {
          evidenceBackedCount: 3,
          total: 5,
          rate: 0.6,
          byCategory: {
            mvp_blocking: 1,
            mvp_important: 0.5,
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
          resolvedCount: 1,
          resolutionRate: 0.2,
        },
        totalGapsAnalyzed: 5,
        insights: ['Test insight 1', 'Test insight 2'],
        success: true,
      },
      metricsConfig: MetricsGraphConfigSchema.parse({}),
    })

    const result = await node(state)

    expect(result.aggregatedMetrics).toBeDefined()
    expect(result.aggregatedMetrics?.totalCollected).toBe(1)
    expect(result.aggregatedMetrics?.successfulCollections).toBe(1)
    expect(result.aggregatedMetrics?.overallSuccess).toBe(true)
    expect(result.aggregatedMetrics?.combinedInsights).toContain('Test insight 1')
    expect(result.aggregatedMetrics?.combinedInsights).toContain('Test insight 2')
  })

  it('aggregates failed gap analytics', async () => {
    const node = createAggregationNode()
    const state = createTestState({
      gapAnalyticsCompleted: true,
      gapAnalyticsResult: {
        storyId: 'flow-044',
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
        insights: [],
        success: false,
        error: 'No hygiene result',
      },
      metricsConfig: MetricsGraphConfigSchema.parse({}),
    })

    const result = await node(state)

    expect(result.aggregatedMetrics).toBeDefined()
    expect(result.aggregatedMetrics?.totalCollected).toBe(1)
    expect(result.aggregatedMetrics?.successfulCollections).toBe(0)
    expect(result.aggregatedMetrics?.overallSuccess).toBe(false)
  })

  it('excludes raw data when includeRawData is false', async () => {
    const node = createAggregationNode()
    const state = createTestState({
      gapAnalyticsCompleted: true,
      gapAnalyticsResult: {
        storyId: 'flow-044',
        analyzedAt: new Date().toISOString(),
        yieldMetrics: {
          suggested: 5,
          accepted: 2,
          rejected: 1,
          yieldRatio: 0.4,
          calculatedAt: new Date().toISOString(),
        },
        acceptanceRates: {
          pm: 0.5,
          ux: 1,
          qa: 0,
          attack: 0,
          counts: { pm: 2, ux: 1, qa: 1, attack: 1 },
        },
        evidenceMetrics: {
          evidenceBackedCount: 3,
          total: 5,
          rate: 0.6,
          byCategory: {
            mvp_blocking: 1,
            mvp_important: 0.5,
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
          resolvedCount: 1,
          resolutionRate: 0.2,
        },
        totalGapsAnalyzed: 5,
        insights: [],
        success: true,
      },
      metricsConfig: MetricsGraphConfigSchema.parse({ includeRawData: false }),
    })

    const result = await node(state)

    expect(result.aggregatedMetrics?.metrics[0]?.data).toBeUndefined()
  })
})

describe('createOutputNode', () => {
  it('generates successful report', async () => {
    const node = createOutputNode()
    const state = createTestState({
      aggregatedMetrics: {
        storyId: 'flow-044',
        aggregatedAt: new Date().toISOString(),
        metrics: [
          {
            type: 'gap_analytics',
            success: true,
            collectedAt: new Date().toISOString(),
          },
        ],
        totalCollected: 1,
        successfulCollections: 1,
        combinedInsights: ['Test insight'],
        overallSuccess: true,
      },
      gapAnalyticsResult: {
        storyId: 'flow-044',
        analyzedAt: new Date().toISOString(),
        yieldMetrics: {
          suggested: 5,
          accepted: 2,
          rejected: 1,
          yieldRatio: 0.4,
          calculatedAt: new Date().toISOString(),
        },
        acceptanceRates: {
          pm: 0.5,
          ux: 1,
          qa: 0,
          attack: 0,
          counts: { pm: 2, ux: 1, qa: 1, attack: 1 },
        },
        evidenceMetrics: {
          evidenceBackedCount: 3,
          total: 5,
          rate: 0.6,
          byCategory: {
            mvp_blocking: 1,
            mvp_important: 0.5,
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
          resolvedCount: 1,
          resolutionRate: 0.2,
        },
        totalGapsAnalyzed: 5,
        insights: ['Test insight'],
        success: true,
      },
      metricsConfig: MetricsGraphConfigSchema.parse({}),
    })

    const result = await node(state)

    expect(result.metricsReport).toBeDefined()
    expect(result.metricsReport?.success).toBe(true)
    expect(result.metricsReport?.summary).toContain('flow-044')
    expect(result.collectionComplete).toBe(true)
  })

  it('generates error report when no aggregated metrics', async () => {
    const node = createOutputNode()
    const state = createTestState()

    const result = await node(state)

    expect(result.metricsReport).toBeDefined()
    expect(result.metricsReport?.success).toBe(false)
    expect(result.metricsReport?.error).toContain('No aggregated metrics')
    expect(result.collectionComplete).toBe(true)
  })

  it('generates recommendations for low yield ratio', async () => {
    const node = createOutputNode()
    const state = createTestState({
      aggregatedMetrics: {
        storyId: 'flow-044',
        aggregatedAt: new Date().toISOString(),
        metrics: [],
        totalCollected: 1,
        successfulCollections: 1,
        combinedInsights: [],
        overallSuccess: true,
      },
      gapAnalyticsResult: {
        storyId: 'flow-044',
        analyzedAt: new Date().toISOString(),
        yieldMetrics: {
          suggested: 10,
          accepted: 2,
          rejected: 5,
          yieldRatio: 0.2, // Low yield
          calculatedAt: new Date().toISOString(),
        },
        acceptanceRates: {
          pm: 0.5,
          ux: 0.5,
          qa: 0.5,
          attack: 0.5,
          counts: { pm: 2, ux: 2, qa: 2, attack: 4 },
        },
        evidenceMetrics: {
          evidenceBackedCount: 5,
          total: 10,
          rate: 0.5,
          byCategory: {
            mvp_blocking: 0.5,
            mvp_important: 0.5,
            future: 0.5,
            deferred: 0.5,
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
        totalGapsAnalyzed: 10,
        insights: [],
        success: true,
      },
      metricsConfig: MetricsGraphConfigSchema.parse({}),
    })

    const result = await node(state)

    expect(result.metricsReport?.recommendations).toContain(
      'Review gap detection criteria - low yield suggests too many false positives',
    )
  })
})

describe('runMetricsCollection', () => {
  it('runs complete metrics collection flow', async () => {
    const hygieneResult = createTestHygieneResult({
      rankedGaps: [
        createTestGap({ id: 'RG-001', originalId: 'PM-1', source: 'pm_scope', acknowledged: true }),
        createTestGap({ id: 'RG-002', originalId: 'UX-1', source: 'ux_accessibility' }),
        createTestGap({ id: 'RG-003', originalId: 'QA-1', source: 'qa_edge_case', resolved: true }),
        createTestGap({ id: 'RG-004', originalId: 'ATK-1', source: 'attack_edge_case' }),
        createTestGap({ id: 'RG-005', originalId: 'PM-2', source: 'pm_requirement' }),
      ],
    })

    const report = await runMetricsCollection('flow-044', hygieneResult)

    expect(report).toBeDefined()
    expect(report.storyId).toBe('flow-044')
    expect(report.success).toBe(true)
    expect(report.gapAnalytics).toBeDefined()
    expect(report.gapAnalytics?.totalGapsAnalyzed).toBe(5)
    expect(report.aggregatedMetrics.totalCollected).toBe(1)
    expect(report.aggregatedMetrics.successfulCollections).toBe(1)
  })

  it('handles null hygiene result', async () => {
    const report = await runMetricsCollection('flow-044', null)

    expect(report).toBeDefined()
    expect(report.storyId).toBe('flow-044')
    expect(report.gapAnalytics?.success).toBe(false)
  })

  it('respects custom configuration', async () => {
    const hygieneResult = createTestHygieneResult()

    const report = await runMetricsCollection('flow-044', hygieneResult, {
      includeInsights: false,
      includeRawData: false,
    })

    expect(report).toBeDefined()
    expect(report.config.includeInsights).toBe(false)
    expect(report.config.includeRawData).toBe(false)
  })

  it('extracts epic prefix from story ID', async () => {
    const hygieneResult = createTestHygieneResult({ storyId: 'wrkf-1234' })

    const report = await runMetricsCollection('wrkf-1234', hygieneResult)

    expect(report.storyId).toBe('wrkf-1234')
  })
})

describe('createMetricsGraph', () => {
  it('creates compilable graph with default config', () => {
    const graph = createMetricsGraph()
    expect(graph).toBeDefined()
  })

  it('creates compilable graph with custom config', () => {
    const graph = createMetricsGraph({
      metricsToCollect: ['gap_analytics'],
      includeInsights: false,
    })
    expect(graph).toBeDefined()
  })
})
