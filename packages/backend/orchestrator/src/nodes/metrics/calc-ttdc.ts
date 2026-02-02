/**
 * TTDC (Time to Dev Complete) Calculator Node
 *
 * Calculates time from commitment to dev-complete with statistical analysis.
 * Focuses on PREDICTABILITY over raw speed for system learning.
 *
 * IMPORTANT: These metrics are for system learning only, NOT performance evaluation.
 *
 * FLOW-036: LangGraph Metrics Node - TTDC Calculator
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import type { WorkflowEvent } from './collect-events.js'

/**
 * A single TTDC data point representing one story's commitment-to-completion cycle.
 */
export const TTDCDataPointSchema = z.object({
  /** Story ID this data point belongs to */
  storyId: z.string().min(1),
  /** When the story was committed to (ISO datetime) */
  commitmentTime: z.string().datetime(),
  /** When the story reached dev-complete (ISO datetime) */
  completionTime: z.string().datetime(),
  /** Duration in milliseconds from commitment to completion */
  durationMs: z.number().min(0),
  /** Duration in hours for readability */
  durationHours: z.number().min(0),
  /** Whether this data point is an outlier (>2 sigma from mean) */
  isOutlier: z.boolean().default(false),
})

export type TTDCDataPoint = z.infer<typeof TTDCDataPointSchema>

/**
 * Statistical metrics for TTDC analysis.
 * We value PREDICTABILITY over raw speed.
 */
export const TTDCMetricsSchema = z.object({
  /** Median TTDC in milliseconds (central tendency, robust to outliers) */
  medianMs: z.number().min(0).nullable(),
  /** Median TTDC in hours for readability */
  medianHours: z.number().min(0).nullable(),
  /** Mean TTDC in milliseconds */
  meanMs: z.number().min(0).nullable(),
  /** Mean TTDC in hours for readability */
  meanHours: z.number().min(0).nullable(),
  /** Variance in milliseconds squared (measure of predictability) */
  varianceMs: z.number().min(0).nullable(),
  /** Standard deviation in milliseconds */
  stdDevMs: z.number().min(0).nullable(),
  /** Standard deviation in hours for readability */
  stdDevHours: z.number().min(0).nullable(),
  /** Coefficient of variation (stdDev / mean) - lower = more predictable */
  coefficientOfVariation: z.number().min(0).nullable(),
  /** Minimum TTDC in milliseconds */
  minMs: z.number().min(0).nullable(),
  /** Minimum TTDC in hours */
  minHours: z.number().min(0).nullable(),
  /** Maximum TTDC in milliseconds */
  maxMs: z.number().min(0).nullable(),
  /** Maximum TTDC in hours */
  maxHours: z.number().min(0).nullable(),
  /** Number of data points used for calculation */
  count: z.number().int().min(0),
  /** Timestamp when metrics were calculated */
  calculatedAt: z.string().datetime(),
})

export type TTDCMetrics = z.infer<typeof TTDCMetricsSchema>

/**
 * Complete TTDC calculation result.
 */
export const TTDCResultSchema = z.object({
  /** Story ID or scope being analyzed */
  storyId: z.string().min(1),
  /** When analysis was performed */
  analyzedAt: z.string().datetime(),
  /** Calculated TTDC metrics */
  metrics: TTDCMetricsSchema,
  /** Individual data points used */
  dataPoints: z.array(TTDCDataPointSchema),
  /** Data points identified as outliers */
  outliers: z.array(TTDCDataPointSchema),
  /** Number of outliers detected */
  outlierCount: z.number().int().min(0),
  /** Key insights for system learning */
  insights: z.array(z.string()).default([]),
  /** Whether calculation was successful */
  success: z.boolean(),
  /** Error message if calculation failed */
  error: z.string().optional(),
})

export type TTDCResult = z.infer<typeof TTDCResultSchema>

/**
 * Configuration for TTDC calculation.
 */
export const TTDCConfigSchema = z.object({
  /** Minimum data points required for meaningful analysis */
  minDataPoints: z.number().int().positive().default(3),
  /** Number of standard deviations for outlier detection */
  outlierSigmaThreshold: z.number().positive().default(2),
  /** Whether to exclude outliers from metrics calculation */
  excludeOutliers: z.boolean().default(false),
  /** Maximum age of events to consider (ms), 0 = no limit */
  maxEventAgeMs: z.number().min(0).default(0),
})

export type TTDCConfig = z.infer<typeof TTDCConfigSchema>

/**
 * Converts milliseconds to hours with 2 decimal precision.
 */
function msToHours(ms: number): number {
  return Math.round((ms / (1000 * 60 * 60)) * 100) / 100
}

/**
 * Extracts TTDC data points from workflow events.
 * Finds commitment-completion pairs and calculates durations.
 *
 * @param events - Array of workflow events
 * @param config - Configuration options
 * @returns Array of TTDC data points
 */
export function extractTTDCDataPoints(
  events: readonly WorkflowEvent[],
  config: Partial<TTDCConfig> = {},
): TTDCDataPoint[] {
  const fullConfig = TTDCConfigSchema.parse(config)
  const now = Date.now()

  // Group events by story ID
  const eventsByStory = new Map<string, WorkflowEvent[]>()

  for (const event of events) {
    // Filter by age if configured
    if (fullConfig.maxEventAgeMs > 0) {
      const eventTime = new Date(event.timestamp).getTime()
      if (now - eventTime > fullConfig.maxEventAgeMs) {
        continue
      }
    }

    const storyEvents = eventsByStory.get(event.storyId) || []
    storyEvents.push(event)
    eventsByStory.set(event.storyId, storyEvents)
  }

  const dataPoints: TTDCDataPoint[] = []

  // For each story, find commitment and completion events
  for (const [storyId, storyEvents] of eventsByStory) {
    // Find commitment event
    const commitmentEvent = storyEvents.find(e => e.type === 'commitment')
    if (!commitmentEvent) continue

    // Find completion event (phase === 'complete')
    const completionEvent = storyEvents.find(e => e.phase === 'complete' && e.type === 'completion')
    if (!completionEvent) continue

    const commitmentTime = new Date(commitmentEvent.timestamp).getTime()
    const completionTime = new Date(completionEvent.timestamp).getTime()

    // Validate times
    if (
      isNaN(commitmentTime) ||
      isNaN(completionTime) ||
      completionTime <= commitmentTime
    ) {
      continue
    }

    const durationMs = completionTime - commitmentTime

    dataPoints.push({
      storyId,
      commitmentTime: commitmentEvent.timestamp,
      completionTime: completionEvent.timestamp,
      durationMs,
      durationHours: msToHours(durationMs),
      isOutlier: false, // Will be set later by identifyOutliers
    })
  }

  return dataPoints
}

/**
 * Calculates the median of a sorted array of numbers.
 *
 * @param sortedValues - Array of numbers, must be sorted ascending
 * @returns Median value, or null if array is empty
 */
export function calculateMedian(sortedValues: readonly number[]): number | null {
  if (sortedValues.length === 0) return null

  const mid = Math.floor(sortedValues.length / 2)

  if (sortedValues.length % 2 === 0) {
    // Even number of elements: average of two middle values
    return (sortedValues[mid - 1] + sortedValues[mid]) / 2
  }

  // Odd number of elements: middle value
  return sortedValues[mid]
}

/**
 * Calculates the variance of values given the mean.
 *
 * @param values - Array of numbers
 * @param mean - The mean of the values
 * @returns Variance, or null if fewer than 2 values
 */
export function calculateVariance(values: readonly number[], mean: number): number | null {
  if (values.length < 2) return null

  const sumSquaredDiffs = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0)

  // Use sample variance (N-1) for unbiased estimate
  return sumSquaredDiffs / (values.length - 1)
}

/**
 * Identifies outliers in data points using sigma threshold.
 * Outliers are points more than threshold standard deviations from mean.
 *
 * @param dataPoints - Array of TTDC data points
 * @param mean - Mean duration in ms
 * @param stdDev - Standard deviation in ms
 * @param sigmaThreshold - Number of standard deviations for outlier detection
 * @returns Data points with isOutlier flag set appropriately
 */
export function identifyOutliers(
  dataPoints: TTDCDataPoint[],
  mean: number | null,
  stdDev: number | null,
  sigmaThreshold: number = 2,
): TTDCDataPoint[] {
  // Can't identify outliers without mean and stdDev
  if (mean === null || stdDev === null || stdDev === 0) {
    return dataPoints
  }

  return dataPoints.map(point => {
    const zScore = Math.abs(point.durationMs - mean) / stdDev
    return {
      ...point,
      isOutlier: zScore > sigmaThreshold,
    }
  })
}

/**
 * Generates insights from TTDC metrics for system learning.
 *
 * @param metrics - Calculated TTDC metrics
 * @param outlierCount - Number of outliers detected
 * @param dataPointCount - Total number of data points
 * @returns Array of insight strings
 */
function generateTTDCInsights(
  metrics: TTDCMetrics,
  outlierCount: number,
  dataPointCount: number,
): string[] {
  const insights: string[] = []

  if (metrics.count === 0) {
    insights.push('No complete commitment-to-completion cycles found for analysis')
    return insights
  }

  // Predictability insight (coefficient of variation)
  if (metrics.coefficientOfVariation !== null) {
    if (metrics.coefficientOfVariation < 0.3) {
      insights.push(
        `High predictability: CV=${(metrics.coefficientOfVariation * 100).toFixed(0)}% - ` +
          `delivery times are consistent`,
      )
    } else if (metrics.coefficientOfVariation > 0.7) {
      insights.push(
        `Low predictability: CV=${(metrics.coefficientOfVariation * 100).toFixed(0)}% - ` +
          `delivery times vary significantly`,
      )
    }
  }

  // Median vs mean comparison (skewness indicator)
  if (metrics.medianHours !== null && metrics.meanHours !== null) {
    const skewRatio = metrics.meanHours / metrics.medianHours
    if (skewRatio > 1.3) {
      insights.push(
        `Right-skewed distribution: mean (${metrics.meanHours.toFixed(1)}h) > median (${metrics.medianHours.toFixed(1)}h) - ` +
          `some stories take much longer than typical`,
      )
    } else if (skewRatio < 0.8) {
      insights.push(
        `Left-skewed distribution: mean (${metrics.meanHours.toFixed(1)}h) < median (${metrics.medianHours.toFixed(1)}h) - ` +
          `some stories complete faster than typical`,
      )
    }
  }

  // Outlier insight
  if (outlierCount > 0) {
    const outlierPercent = ((outlierCount / dataPointCount) * 100).toFixed(0)
    insights.push(
      `${outlierCount} outlier${outlierCount > 1 ? 's' : ''} detected (${outlierPercent}% of data points)`,
    )
  }

  // Range insight
  if (metrics.minHours !== null && metrics.maxHours !== null) {
    const range = metrics.maxHours - metrics.minHours
    if (range > 0) {
      insights.push(
        `TTDC range: ${metrics.minHours.toFixed(1)}h to ${metrics.maxHours.toFixed(1)}h ` +
          `(spread: ${range.toFixed(1)}h)`,
      )
    }
  }

  return insights
}

/**
 * Calculates comprehensive TTDC metrics from workflow events.
 * Main function that computes all statistics and identifies outliers.
 *
 * @param storyId - Story ID or scope identifier
 * @param events - Array of workflow events to analyze
 * @param config - Configuration options
 * @returns Complete TTDC result with metrics and insights
 */
export async function calculateTTDCMetrics(
  storyId: string,
  events: readonly WorkflowEvent[],
  config: Partial<TTDCConfig> = {},
): Promise<TTDCResult> {
  const fullConfig = TTDCConfigSchema.parse(config)
  const now = new Date().toISOString()

  // Extract data points
  let dataPoints = extractTTDCDataPoints(events, fullConfig)

  // Check minimum data points
  if (dataPoints.length < fullConfig.minDataPoints) {
    return {
      storyId,
      analyzedAt: now,
      metrics: {
        medianMs: null,
        medianHours: null,
        meanMs: null,
        meanHours: null,
        varianceMs: null,
        stdDevMs: null,
        stdDevHours: null,
        coefficientOfVariation: null,
        minMs: null,
        minHours: null,
        maxMs: null,
        maxHours: null,
        count: dataPoints.length,
        calculatedAt: now,
      },
      dataPoints,
      outliers: [],
      outlierCount: 0,
      insights: [
        `Insufficient data points for meaningful analysis (${dataPoints.length} < ${fullConfig.minDataPoints})`,
      ],
      success: true,
    }
  }

  // Calculate basic statistics on all data
  const durations = dataPoints.map(dp => dp.durationMs)
  const sortedDurations = [...durations].sort((a, b) => a - b)

  const sum = durations.reduce((acc, val) => acc + val, 0)
  const meanMs = sum / durations.length
  const varianceMs = calculateVariance(durations, meanMs)
  const stdDevMs = varianceMs !== null ? Math.sqrt(varianceMs) : null

  // Identify outliers
  dataPoints = identifyOutliers(dataPoints, meanMs, stdDevMs, fullConfig.outlierSigmaThreshold)
  const outliers = dataPoints.filter(dp => dp.isOutlier)

  // Calculate final metrics, optionally excluding outliers
  let finalDurations = durations
  let finalDataPoints = dataPoints

  if (fullConfig.excludeOutliers && outliers.length > 0) {
    finalDataPoints = dataPoints.filter(dp => !dp.isOutlier)
    finalDurations = finalDataPoints.map(dp => dp.durationMs)
  }

  // Recalculate if we excluded outliers
  const finalSortedDurations = [...finalDurations].sort((a, b) => a - b)
  const finalSum = finalDurations.reduce((acc, val) => acc + val, 0)
  const finalMeanMs = finalDurations.length > 0 ? finalSum / finalDurations.length : null
  const finalVarianceMs =
    finalMeanMs !== null ? calculateVariance(finalDurations, finalMeanMs) : null
  const finalStdDevMs = finalVarianceMs !== null ? Math.sqrt(finalVarianceMs) : null

  const medianMs = calculateMedian(finalSortedDurations)
  const minMs = finalSortedDurations.length > 0 ? finalSortedDurations[0] : null
  const maxMs =
    finalSortedDurations.length > 0
      ? finalSortedDurations[finalSortedDurations.length - 1]
      : null

  // Calculate coefficient of variation (measure of predictability)
  const coefficientOfVariation =
    finalMeanMs !== null && finalMeanMs > 0 && finalStdDevMs !== null
      ? finalStdDevMs / finalMeanMs
      : null

  const metrics: TTDCMetrics = {
    medianMs,
    medianHours: medianMs !== null ? msToHours(medianMs) : null,
    meanMs: finalMeanMs,
    meanHours: finalMeanMs !== null ? msToHours(finalMeanMs) : null,
    varianceMs: finalVarianceMs,
    stdDevMs: finalStdDevMs,
    stdDevHours: finalStdDevMs !== null ? msToHours(finalStdDevMs) : null,
    coefficientOfVariation,
    minMs,
    minHours: minMs !== null ? msToHours(minMs) : null,
    maxMs,
    maxHours: maxMs !== null ? msToHours(maxMs) : null,
    count: finalDurations.length,
    calculatedAt: now,
  }

  // Generate insights
  const insights = generateTTDCInsights(metrics, outliers.length, dataPoints.length)

  return {
    storyId,
    analyzedAt: now,
    metrics,
    dataPoints,
    outliers,
    outlierCount: outliers.length,
    insights,
    success: true,
  }
}

/**
 * Extended graph state with TTDC calculation.
 */
export interface GraphStateWithTTDC extends GraphState {
  /** Collected workflow events for analysis */
  collectedEvents?: WorkflowEvent[]
  /** TTDC calculation result */
  ttdcResult?: TTDCResult | null
  /** Whether TTDC calculation was successful */
  ttdcCalculationCompleted?: boolean
}

/**
 * TTDC Calculator metrics node implementation.
 *
 * Calculates time-to-dev-complete metrics from workflow events.
 * Uses the tool preset (lower retries, shorter timeout) since this is
 * primarily computation with no external calls.
 *
 * IMPORTANT: These metrics are for SYSTEM LEARNING only, not performance evaluation.
 * We value PREDICTABILITY over raw speed.
 *
 * @param state - Current graph state (must have collected events)
 * @returns Partial state update with TTDC result
 */
export const calcTTDCNode = createToolNode(
  'calc_ttdc',
  async (state: GraphState): Promise<Partial<GraphStateWithTTDC>> => {
    const stateWithEvents = state as GraphStateWithTTDC

    const storyId = stateWithEvents.storyId || 'unknown'
    const events = stateWithEvents.collectedEvents || []

    const result = await calculateTTDCMetrics(storyId, events)

    return updateState({
      ttdcResult: result,
      ttdcCalculationCompleted: result.success,
    } as Partial<GraphStateWithTTDC>)
  },
)

/**
 * Creates a TTDC calculator node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createCalcTTDCNode(config: Partial<TTDCConfig> = {}) {
  return createToolNode(
    'calc_ttdc',
    async (state: GraphState): Promise<Partial<GraphStateWithTTDC>> => {
      const stateWithEvents = state as GraphStateWithTTDC

      const storyId = stateWithEvents.storyId || 'unknown'
      const events = stateWithEvents.collectedEvents || []

      const result = await calculateTTDCMetrics(storyId, events, config)

      return updateState({
        ttdcResult: result,
        ttdcCalculationCompleted: result.success,
      } as Partial<GraphStateWithTTDC>)
    },
  )
}
