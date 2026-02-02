/**
 * Metrics Collection Graph
 *
 * Composes a complete metrics collection and analysis graph using LangGraph.
 * Orchestrates the collection of gap analytics and other system learning metrics.
 *
 * FLOW-044: LangGraph Graph - Metrics Collection Flow
 */

import { z } from 'zod'
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import type { GraphState } from '../state/index.js'
import {
  GapAnalyticsResultSchema,
  GapAnalyticsConfigSchema,
  type GapAnalyticsResult,
  type GapAnalyticsConfig,
  type GraphStateWithGapAnalytics,
} from '../nodes/metrics/gap-analytics.js'
import type { HygieneResult } from '../nodes/story/gap-hygiene.js'
import { createToolNode } from '../runner/node-factory.js'
import { updateState } from '../runner/state-helpers.js'

/**
 * Metrics types to collect.
 */
export const MetricsTypeSchema = z.enum([
  'gap_analytics', // Gap yield, acceptance rates, evidence metrics, resolution times
  'workflow_metrics', // Node execution times, retry rates, error rates
  'quality_metrics', // Story quality scores, AC completeness
])

export type MetricsType = z.infer<typeof MetricsTypeSchema>

/**
 * Configuration for the metrics graph.
 */
export const MetricsGraphConfigSchema = z.object({
  /** Which metrics to collect */
  metricsToCollect: z.array(MetricsTypeSchema).default(['gap_analytics']),
  /** Gap analytics configuration */
  gapAnalyticsConfig: GapAnalyticsConfigSchema.optional(),
  /** Whether to include insights in output */
  includeInsights: z.boolean().default(true),
  /** Whether to include raw metrics data */
  includeRawData: z.boolean().default(true),
  /** Timeout for each metrics node in ms */
  nodeTimeoutMs: z.number().positive().default(30000),
})

export type MetricsGraphConfig = z.infer<typeof MetricsGraphConfigSchema>

/**
 * Single metric entry in the aggregated report.
 */
export const MetricEntrySchema = z.object({
  /** Type of metric */
  type: MetricsTypeSchema,
  /** Whether collection was successful */
  success: z.boolean(),
  /** Error message if failed */
  error: z.string().optional(),
  /** Timestamp of collection */
  collectedAt: z.string().datetime(),
  /** The metric data (varies by type) */
  data: z.unknown().optional(),
})

export type MetricEntry = z.infer<typeof MetricEntrySchema>

/**
 * Aggregated metrics from all collectors.
 */
export const AggregatedMetricsSchema = z.object({
  /** Story ID analyzed */
  storyId: z.string().min(1),
  /** Timestamp when aggregation completed */
  aggregatedAt: z.string().datetime(),
  /** Individual metric entries */
  metrics: z.array(MetricEntrySchema),
  /** Total metrics collected */
  totalCollected: z.number().int().min(0),
  /** Number of successful collections */
  successfulCollections: z.number().int().min(0),
  /** Combined insights from all metrics */
  combinedInsights: z.array(z.string()).default([]),
  /** Overall collection success */
  overallSuccess: z.boolean(),
})

export type AggregatedMetrics = z.infer<typeof AggregatedMetricsSchema>

/**
 * Final metrics report output.
 */
export const MetricsReportSchema = z.object({
  /** Story ID */
  storyId: z.string().min(1),
  /** Report generation timestamp */
  generatedAt: z.string().datetime(),
  /** Configuration used */
  config: MetricsGraphConfigSchema,
  /** Aggregated metrics */
  aggregatedMetrics: AggregatedMetricsSchema,
  /** Gap analytics result (if collected) */
  gapAnalytics: GapAnalyticsResultSchema.nullable(),
  /** Executive summary */
  summary: z.string().min(1),
  /** Recommendations based on metrics */
  recommendations: z.array(z.string()).default([]),
  /** Report was successfully generated */
  success: z.boolean(),
  /** Error if report generation failed */
  error: z.string().optional(),
})

export type MetricsReport = z.infer<typeof MetricsReportSchema>

/**
 * LangGraph state annotation for metrics collection.
 * Extends GraphState with metrics-specific fields.
 */
// Simple overwrite reducer for most fields
const overwrite = <T>(_: T, b: T): T => b

export const MetricsGraphStateAnnotation = Annotation.Root({
  // Base graph state fields (subset needed for metrics)
  storyId: Annotation<string>(),
  epicPrefix: Annotation<string>(),

  // Metrics configuration
  metricsConfig: Annotation<MetricsGraphConfig | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Input: hygiene result for gap analytics
  gapHygieneResult: Annotation<HygieneResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Gap analytics output
  gapAnalyticsResult: Annotation<GapAnalyticsResult | null>({
    reducer: overwrite,
    default: () => null,
  }),
  gapAnalyticsCompleted: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Aggregated metrics
  aggregatedMetrics: Annotation<AggregatedMetrics | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Final report
  metricsReport: Annotation<MetricsReport | null>({
    reducer: overwrite,
    default: () => null,
  }),

  // Collection status
  collectionInitialized: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),
  collectionComplete: Annotation<boolean>({
    reducer: overwrite,
    default: () => false,
  }),

  // Errors during collection (append reducer)
  collectionErrors: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
})

/** TypeScript type for metrics graph state */
export type MetricsGraphState = typeof MetricsGraphStateAnnotation.State

/**
 * Extended graph state for metrics operations.
 * Used when metrics graph interacts with main workflow state.
 */
export interface GraphStateWithMetrics extends GraphState, GraphStateWithGapAnalytics {
  /** Metrics collection configuration */
  metricsConfig?: MetricsGraphConfig | null
  /** Aggregated metrics from collection */
  aggregatedMetrics?: AggregatedMetrics | null
  /** Final metrics report */
  metricsReport?: MetricsReport | null
  /** Whether metrics collection has completed */
  metricsCollectionComplete?: boolean
}

/**
 * Initialize metrics collection node.
 * Sets up configuration and validates input state.
 */
export function createInitializeNode(config: Partial<MetricsGraphConfig> = {}) {
  return async (state: MetricsGraphState): Promise<Partial<MetricsGraphState>> => {
    const fullConfig = MetricsGraphConfigSchema.parse(config)

    // Validate we have a story ID
    if (!state.storyId) {
      return {
        collectionInitialized: false,
        collectionErrors: ['No story ID provided for metrics collection'],
      }
    }

    return {
      metricsConfig: fullConfig,
      collectionInitialized: true,
      collectionErrors: [],
    }
  }
}

/**
 * Gap analytics collection node wrapper for the metrics graph.
 * Adapts the gap analytics node to work with MetricsGraphState.
 */
export function createGapAnalyticsCollectorNode(config: Partial<GapAnalyticsConfig> = {}) {
  return async (state: MetricsGraphState): Promise<Partial<MetricsGraphState>> => {
    const storyId = state.storyId

    // Check if we should collect gap analytics
    const metricsConfig = state.metricsConfig
    if (metricsConfig && !metricsConfig.metricsToCollect.includes('gap_analytics')) {
      return {
        gapAnalyticsResult: null,
        gapAnalyticsCompleted: true,
      }
    }

    // Import and use the generateGapAnalytics function directly
    const { generateGapAnalytics } = await import('../nodes/metrics/gap-analytics.js')

    const result = await generateGapAnalytics(storyId, state.gapHygieneResult, config)

    return {
      gapAnalyticsResult: result,
      gapAnalyticsCompleted: result.success,
      collectionErrors: result.success ? [] : [result.error || 'Gap analytics failed'],
    }
  }
}

/**
 * Aggregation node that combines all collected metrics.
 */
export function createAggregationNode() {
  return async (state: MetricsGraphState): Promise<Partial<MetricsGraphState>> => {
    const now = new Date().toISOString()
    const metrics: MetricEntry[] = []
    const insights: string[] = []

    // Aggregate gap analytics
    if (state.gapAnalyticsCompleted) {
      metrics.push({
        type: 'gap_analytics',
        success: state.gapAnalyticsResult?.success ?? false,
        error: state.gapAnalyticsResult?.error,
        collectedAt: state.gapAnalyticsResult?.analyzedAt ?? now,
        data: state.metricsConfig?.includeRawData ? state.gapAnalyticsResult : undefined,
      })

      if (state.metricsConfig?.includeInsights && state.gapAnalyticsResult?.insights) {
        insights.push(...state.gapAnalyticsResult.insights)
      }
    }

    const successfulCollections = metrics.filter(m => m.success).length

    const aggregated: AggregatedMetrics = {
      storyId: state.storyId,
      aggregatedAt: now,
      metrics,
      totalCollected: metrics.length,
      successfulCollections,
      combinedInsights: insights,
      overallSuccess: successfulCollections > 0,
    }

    return {
      aggregatedMetrics: aggregated,
    }
  }
}

/**
 * Generates executive summary from aggregated metrics.
 */
function generateSummary(
  storyId: string,
  aggregated: AggregatedMetrics,
  gapAnalytics: GapAnalyticsResult | null,
): string {
  const parts: string[] = []

  parts.push(`Metrics report for story ${storyId}.`)

  if (aggregated.totalCollected === 0) {
    parts.push('No metrics were collected.')
    return parts.join(' ')
  }

  parts.push(
    `Collected ${aggregated.successfulCollections}/${aggregated.totalCollected} metrics successfully.`,
  )

  if (gapAnalytics?.success) {
    const { yieldMetrics, totalGapsAnalyzed } = gapAnalytics
    parts.push(
      `Gap analytics analyzed ${totalGapsAnalyzed} gaps with ${(yieldMetrics.yieldRatio * 100).toFixed(1)}% yield ratio.`,
    )

    if (yieldMetrics.yieldRatio < 0.3) {
      parts.push('Gap detection may need calibration.')
    } else if (yieldMetrics.yieldRatio > 0.8) {
      parts.push('Gap detection is well-calibrated.')
    }
  }

  return parts.join(' ')
}

/**
 * Generates recommendations based on collected metrics.
 */
function generateRecommendations(
  gapAnalytics: GapAnalyticsResult | null,
  aggregated: AggregatedMetrics,
): string[] {
  const recommendations: string[] = []

  if (!gapAnalytics?.success) {
    recommendations.push('Ensure gap hygiene analysis completes before collecting gap analytics')
    return recommendations
  }

  const { yieldMetrics, acceptanceRates, evidenceMetrics, resolutionMetrics } = gapAnalytics

  // Yield recommendations
  if (yieldMetrics.yieldRatio < 0.3) {
    recommendations.push(
      'Review gap detection criteria - low yield suggests too many false positives',
    )
  }

  // Source-specific recommendations
  const sourceRates = [
    { name: 'PM', rate: acceptanceRates.pm, count: acceptanceRates.counts.pm },
    { name: 'UX', rate: acceptanceRates.ux, count: acceptanceRates.counts.ux },
    { name: 'QA', rate: acceptanceRates.qa, count: acceptanceRates.counts.qa },
    { name: 'Attack', rate: acceptanceRates.attack, count: acceptanceRates.counts.attack },
  ]

  const lowPerformingSources = sourceRates.filter(s => s.count >= 3 && s.rate < 0.4)
  for (const source of lowPerformingSources) {
    recommendations.push(
      `Review ${source.name} gap detection - only ${(source.rate * 100).toFixed(0)}% acceptance rate`,
    )
  }

  // Evidence recommendations
  if (evidenceMetrics.rate < 0.5) {
    recommendations.push('Improve gap substantiation - most gaps lack supporting evidence')
  }

  // Resolution recommendations
  if (resolutionMetrics.resolutionRate < 0.2 && resolutionMetrics.resolvedCount > 0) {
    recommendations.push('Address gap backlog - resolution rate is low')
  }

  // Add general recommendation if none specific
  if (recommendations.length === 0 && aggregated.overallSuccess) {
    recommendations.push('Metrics are healthy - continue current practices')
  }

  return recommendations
}

/**
 * Output node that produces the final metrics report.
 */
export function createOutputNode() {
  return async (state: MetricsGraphState): Promise<Partial<MetricsGraphState>> => {
    const now = new Date().toISOString()

    // Validate we have aggregated metrics
    if (!state.aggregatedMetrics) {
      const errorReport: MetricsReport = {
        storyId: state.storyId,
        generatedAt: now,
        config: state.metricsConfig || MetricsGraphConfigSchema.parse({}),
        aggregatedMetrics: {
          storyId: state.storyId,
          aggregatedAt: now,
          metrics: [],
          totalCollected: 0,
          successfulCollections: 0,
          combinedInsights: [],
          overallSuccess: false,
        },
        gapAnalytics: null,
        summary: 'Metrics report generation failed - no aggregated metrics available',
        recommendations: ['Ensure metrics collection completes before generating report'],
        success: false,
        error: 'No aggregated metrics available',
      }

      return {
        metricsReport: errorReport,
        collectionComplete: true,
      }
    }

    const summary = generateSummary(
      state.storyId,
      state.aggregatedMetrics,
      state.gapAnalyticsResult,
    )

    const recommendations = generateRecommendations(
      state.gapAnalyticsResult,
      state.aggregatedMetrics,
    )

    const report: MetricsReport = {
      storyId: state.storyId,
      generatedAt: now,
      config: state.metricsConfig || MetricsGraphConfigSchema.parse({}),
      aggregatedMetrics: state.aggregatedMetrics,
      gapAnalytics: state.gapAnalyticsResult,
      summary,
      recommendations,
      success: state.aggregatedMetrics.overallSuccess,
    }

    return {
      metricsReport: report,
      collectionComplete: true,
    }
  }
}

/**
 * Conditional edge function to determine if we should collect gap analytics.
 */
function shouldCollectGapAnalytics(state: MetricsGraphState): 'gap_analytics' | 'aggregation' {
  const config = state.metricsConfig
  if (!config) return 'aggregation'

  if (config.metricsToCollect.includes('gap_analytics')) {
    return 'gap_analytics'
  }

  return 'aggregation'
}

/**
 * Creates a metrics collection graph with the specified configuration.
 *
 * Graph structure:
 * START -> initialize -> [gap_analytics] -> aggregation -> output -> END
 *
 * @param config - Configuration for metrics collection
 * @returns Compiled StateGraph for metrics collection
 */
export function createMetricsGraph(config: Partial<MetricsGraphConfig> = {}) {
  const fullConfig = MetricsGraphConfigSchema.parse(config)

  const graph = new StateGraph(MetricsGraphStateAnnotation)
    // Entry node: initialize metrics collection
    .addNode('initialize', createInitializeNode(fullConfig))

    // Gap analytics node: collect gap metrics
    .addNode('gap_analytics', createGapAnalyticsCollectorNode(fullConfig.gapAnalyticsConfig))

    // Aggregation node: combine all metrics
    .addNode('aggregation', createAggregationNode())

    // Output node: produce final metrics report
    .addNode('output', createOutputNode())

    // Edges
    .addEdge(START, 'initialize')
    .addConditionalEdges('initialize', shouldCollectGapAnalytics, {
      gap_analytics: 'gap_analytics',
      aggregation: 'aggregation',
    })
    .addEdge('gap_analytics', 'aggregation')
    .addEdge('aggregation', 'output')
    .addEdge('output', END)

  return graph.compile()
}

/**
 * Convenience function to run metrics collection for a story.
 *
 * @param storyId - Story ID to collect metrics for
 * @param hygieneResult - Gap hygiene result for gap analytics
 * @param config - Optional configuration
 * @returns Metrics report
 */
export async function runMetricsCollection(
  storyId: string,
  hygieneResult: HygieneResult | null,
  config: Partial<MetricsGraphConfig> = {},
): Promise<MetricsReport> {
  const graph = createMetricsGraph(config)

  // Extract epic prefix from story ID
  const epicPrefix = storyId.toLowerCase().split('-')[0]

  const initialState: Partial<MetricsGraphState> = {
    storyId,
    epicPrefix,
    gapHygieneResult: hygieneResult,
  }

  const result = await graph.invoke(initialState)

  // Return the metrics report or a fallback error report
  if (result.metricsReport) {
    return result.metricsReport
  }

  // Fallback if something went wrong
  return {
    storyId,
    generatedAt: new Date().toISOString(),
    config: MetricsGraphConfigSchema.parse(config),
    aggregatedMetrics: {
      storyId,
      aggregatedAt: new Date().toISOString(),
      metrics: [],
      totalCollected: 0,
      successfulCollections: 0,
      combinedInsights: [],
      overallSuccess: false,
    },
    gapAnalytics: null,
    summary: 'Metrics collection failed unexpectedly',
    recommendations: ['Check logs for errors during metrics collection'],
    success: false,
    error: 'Metrics report was not generated',
  }
}

/**
 * Node adapter for using metrics collection within main workflow graphs.
 * Creates a tool node that runs the metrics graph and returns results in workflow state format.
 */
export const metricsCollectionNode = createToolNode(
  'metrics_collection',
  async (state: GraphState): Promise<Partial<GraphStateWithMetrics>> => {
    const stateWithMetrics = state as GraphStateWithMetrics

    // Get story ID
    const storyId = stateWithMetrics.storyId

    // Run metrics collection
    const report = await runMetricsCollection(storyId, stateWithMetrics.gapHygieneResult || null)

    return updateState({
      metricsReport: report,
      aggregatedMetrics: report.aggregatedMetrics,
      metricsCollectionComplete: report.success,
    } as Partial<GraphStateWithMetrics>)
  },
)

/**
 * Creates a metrics collection node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createMetricsCollectionNode(config: Partial<MetricsGraphConfig> = {}) {
  return createToolNode(
    'metrics_collection',
    async (state: GraphState): Promise<Partial<GraphStateWithMetrics>> => {
      const stateWithMetrics = state as GraphStateWithMetrics

      const storyId = stateWithMetrics.storyId

      const report = await runMetricsCollection(
        storyId,
        stateWithMetrics.gapHygieneResult || null,
        config,
      )

      return updateState({
        metricsReport: report,
        aggregatedMetrics: report.aggregatedMetrics,
        metricsCollectionComplete: report.success,
      } as Partial<GraphStateWithMetrics>)
    },
  )
}
