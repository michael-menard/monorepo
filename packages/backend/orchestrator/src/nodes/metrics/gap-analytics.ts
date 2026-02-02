/**
 * Gap Analytics Metrics Node
 *
 * Calculates metrics from gap history for SYSTEM LEARNING purposes.
 * Tracks yield, acceptance rates, evidence backing, and resolution times
 * to improve gap detection and prioritization over time.
 *
 * IMPORTANT: These metrics are for system learning only, NOT performance evaluation.
 *
 * FLOW-041: LangGraph Metrics Node - Gap Analytics
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import type {
  HygieneResult,
  RankedGap,
  GapSource,
  GapCategory,
  HistoryAction,
} from '../story/gap-hygiene.js'

/**
 * Gap yield metrics - how many suggested gaps were accepted vs rejected.
 */
export const GapYieldMetricsSchema = z.object({
  /** Total gaps suggested by the system */
  suggested: z.number().int().min(0),
  /** Gaps that were accepted (acknowledged or resolved) */
  accepted: z.number().int().min(0),
  /** Gaps that were rejected (marked as deferred without acknowledgment) */
  rejected: z.number().int().min(0),
  /** Yield ratio (accepted / suggested), 0-1 */
  yieldRatio: z.number().min(0).max(1),
  /** Timestamp of calculation */
  calculatedAt: z.string().datetime(),
})

export type GapYieldMetrics = z.infer<typeof GapYieldMetricsSchema>

/**
 * Acceptance rates by gap source (PM, UX, QA, Attack).
 */
export const AcceptanceRatesBySourceSchema = z.object({
  /** PM gap acceptance rate */
  pm: z.number().min(0).max(1),
  /** UX gap acceptance rate */
  ux: z.number().min(0).max(1),
  /** QA gap acceptance rate */
  qa: z.number().min(0).max(1),
  /** Attack gap acceptance rate */
  attack: z.number().min(0).max(1),
  /** Total gaps analyzed per source */
  counts: z.object({
    pm: z.number().int().min(0),
    ux: z.number().int().min(0),
    qa: z.number().int().min(0),
    attack: z.number().int().min(0),
  }),
})

export type AcceptanceRatesBySource = z.infer<typeof AcceptanceRatesBySourceSchema>

/**
 * Evidence backing metrics - how many gaps had evidence attached.
 */
export const EvidenceMetricsSchema = z.object({
  /** Gaps that have evidence backing (related ACs, suggestions, etc.) */
  evidenceBackedCount: z.number().int().min(0),
  /** Total gaps analyzed */
  total: z.number().int().min(0),
  /** Evidence rate (evidence_backed / total), 0-1 */
  rate: z.number().min(0).max(1),
  /** Breakdown by category */
  byCategory: z.object({
    mvp_blocking: z.number().min(0).max(1),
    mvp_important: z.number().min(0).max(1),
    future: z.number().min(0).max(1),
    deferred: z.number().min(0).max(1),
  }),
})

export type EvidenceMetrics = z.infer<typeof EvidenceMetricsSchema>

/**
 * Resolution time metrics - average time to resolve gaps by category.
 */
export const ResolutionMetricsSchema = z.object({
  /** Average resolution time in milliseconds by category */
  averageTimeByCategory: z.object({
    mvp_blocking: z.number().min(0).nullable(),
    mvp_important: z.number().min(0).nullable(),
    future: z.number().min(0).nullable(),
    deferred: z.number().min(0).nullable(),
  }),
  /** Overall average resolution time */
  overallAverageMs: z.number().min(0).nullable(),
  /** Total resolved gaps */
  resolvedCount: z.number().int().min(0),
  /** Resolution rate */
  resolutionRate: z.number().min(0).max(1),
})

export type ResolutionMetrics = z.infer<typeof ResolutionMetricsSchema>

/**
 * Complete gap analytics result aggregating all metrics.
 */
export const GapAnalyticsResultSchema = z.object({
  /** Story ID analyzed */
  storyId: z.string().min(1),
  /** Timestamp of analysis */
  analyzedAt: z.string().datetime(),
  /** Gap yield metrics */
  yieldMetrics: GapYieldMetricsSchema,
  /** Acceptance rates by source */
  acceptanceRates: AcceptanceRatesBySourceSchema,
  /** Evidence backing metrics */
  evidenceMetrics: EvidenceMetricsSchema,
  /** Resolution time metrics */
  resolutionMetrics: ResolutionMetricsSchema,
  /** Total gaps in history */
  totalGapsAnalyzed: z.number().int().min(0),
  /** Key insights for system learning */
  insights: z.array(z.string()).default([]),
  /** Whether analysis was successful */
  success: z.boolean(),
  /** Error message if analysis failed */
  error: z.string().optional(),
})

export type GapAnalyticsResult = z.infer<typeof GapAnalyticsResultSchema>

/**
 * Configuration for gap analytics.
 */
export const GapAnalyticsConfigSchema = z.object({
  /** Minimum gaps required for meaningful analysis */
  minGapsForAnalysis: z.number().int().positive().default(5),
  /** Include gaps that have been merged */
  includeMergedGaps: z.boolean().default(true),
  /** Weight recent gaps more heavily in calculations */
  useRecencyWeighting: z.boolean().default(false),
  /** Time window for recency weighting (ms) */
  recencyWindowMs: z.number().positive().default(7 * 24 * 60 * 60 * 1000), // 7 days
})

export type GapAnalyticsConfig = z.infer<typeof GapAnalyticsConfigSchema>

/**
 * Determines source category from gap source.
 */
function getSourceCategory(source: GapSource): 'pm' | 'ux' | 'qa' | 'attack' {
  if (source.startsWith('pm_')) return 'pm'
  if (source.startsWith('ux_')) return 'ux'
  if (source.startsWith('qa_')) return 'qa'
  return 'attack'
}

/**
 * Checks if a gap was accepted (acknowledged or resolved).
 */
function isGapAccepted(gap: RankedGap): boolean {
  return gap.acknowledged || gap.resolved
}

/**
 * Checks if a gap was explicitly rejected.
 * A gap is considered rejected if it was deferred without being acknowledged.
 */
function isGapRejected(gap: RankedGap): boolean {
  const hasDeferred = gap.history.some(h => h.action === 'deferred')
  return hasDeferred && !gap.acknowledged && !gap.resolved
}

/**
 * Checks if a gap has evidence backing.
 */
function hasEvidenceBacking(gap: RankedGap): boolean {
  return (
    gap.relatedACs.length > 0 ||
    (gap.suggestion !== undefined && gap.suggestion.length > 10) ||
    gap.mergedFrom.length > 0
  )
}

/**
 * Calculates gap yield from history.
 * Measures how many suggested gaps were actually useful.
 *
 * @param gaps - Array of ranked gaps with history
 * @returns Gap yield metrics
 */
export function calculateGapYield(gaps: readonly RankedGap[]): GapYieldMetrics {
  const suggested = gaps.length
  const accepted = gaps.filter(isGapAccepted).length
  const rejected = gaps.filter(isGapRejected).length

  return {
    suggested,
    accepted,
    rejected,
    yieldRatio: suggested > 0 ? accepted / suggested : 0,
    calculatedAt: new Date().toISOString(),
  }
}

/**
 * Calculates acceptance rates by gap source.
 * Helps identify which sources produce more valuable gaps.
 *
 * @param gaps - Array of ranked gaps
 * @returns Acceptance rates by source
 */
export function calculateAcceptanceRates(gaps: readonly RankedGap[]): AcceptanceRatesBySource {
  const bySource = {
    pm: { total: 0, accepted: 0 },
    ux: { total: 0, accepted: 0 },
    qa: { total: 0, accepted: 0 },
    attack: { total: 0, accepted: 0 },
  }

  for (const gap of gaps) {
    const category = getSourceCategory(gap.source)
    bySource[category].total++
    if (isGapAccepted(gap)) {
      bySource[category].accepted++
    }
  }

  return {
    pm: bySource.pm.total > 0 ? bySource.pm.accepted / bySource.pm.total : 0,
    ux: bySource.ux.total > 0 ? bySource.ux.accepted / bySource.ux.total : 0,
    qa: bySource.qa.total > 0 ? bySource.qa.accepted / bySource.qa.total : 0,
    attack: bySource.attack.total > 0 ? bySource.attack.accepted / bySource.attack.total : 0,
    counts: {
      pm: bySource.pm.total,
      ux: bySource.ux.total,
      qa: bySource.qa.total,
      attack: bySource.attack.total,
    },
  }
}

/**
 * Calculates evidence backing rates.
 * Measures how well gaps are supported by evidence.
 *
 * @param gaps - Array of ranked gaps
 * @returns Evidence metrics
 */
export function calculateEvidenceRates(gaps: readonly RankedGap[]): EvidenceMetrics {
  const total = gaps.length
  const evidenceBackedCount = gaps.filter(hasEvidenceBacking).length

  const byCategory: Record<GapCategory, { total: number; backed: number }> = {
    mvp_blocking: { total: 0, backed: 0 },
    mvp_important: { total: 0, backed: 0 },
    future: { total: 0, backed: 0 },
    deferred: { total: 0, backed: 0 },
  }

  for (const gap of gaps) {
    byCategory[gap.category].total++
    if (hasEvidenceBacking(gap)) {
      byCategory[gap.category].backed++
    }
  }

  return {
    evidenceBackedCount,
    total,
    rate: total > 0 ? evidenceBackedCount / total : 0,
    byCategory: {
      mvp_blocking:
        byCategory.mvp_blocking.total > 0
          ? byCategory.mvp_blocking.backed / byCategory.mvp_blocking.total
          : 0,
      mvp_important:
        byCategory.mvp_important.total > 0
          ? byCategory.mvp_important.backed / byCategory.mvp_important.total
          : 0,
      future: byCategory.future.total > 0 ? byCategory.future.backed / byCategory.future.total : 0,
      deferred:
        byCategory.deferred.total > 0
          ? byCategory.deferred.backed / byCategory.deferred.total
          : 0,
    },
  }
}

/**
 * Calculates resolution time from gap history.
 * Finds time between 'created' and 'resolved' actions.
 *
 * @param gap - A ranked gap with history
 * @returns Resolution time in ms, or null if not resolved
 */
function calculateGapResolutionTime(gap: RankedGap): number | null {
  if (!gap.resolved) return null

  const createdEntry = gap.history.find(h => h.action === 'created')
  const resolvedEntry = gap.history.find(h => h.action === 'resolved')

  if (!createdEntry || !resolvedEntry) return null

  const createdTime = new Date(createdEntry.timestamp).getTime()
  const resolvedTime = new Date(resolvedEntry.timestamp).getTime()

  if (isNaN(createdTime) || isNaN(resolvedTime)) return null

  return resolvedTime - createdTime
}

/**
 * Calculates resolution time metrics by category.
 * Helps understand how quickly different priority gaps are addressed.
 *
 * @param gaps - Array of ranked gaps
 * @returns Resolution metrics
 */
export function calculateResolutionTimes(gaps: readonly RankedGap[]): ResolutionMetrics {
  const byCategory: Record<GapCategory, number[]> = {
    mvp_blocking: [],
    mvp_important: [],
    future: [],
    deferred: [],
  }

  const allResolutionTimes: number[] = []

  for (const gap of gaps) {
    const resolutionTime = calculateGapResolutionTime(gap)
    if (resolutionTime !== null) {
      byCategory[gap.category].push(resolutionTime)
      allResolutionTimes.push(resolutionTime)
    }
  }

  const calculateAverage = (times: number[]): number | null => {
    if (times.length === 0) return null
    return times.reduce((sum, t) => sum + t, 0) / times.length
  }

  const resolvedCount = gaps.filter(g => g.resolved).length

  return {
    averageTimeByCategory: {
      mvp_blocking: calculateAverage(byCategory.mvp_blocking),
      mvp_important: calculateAverage(byCategory.mvp_important),
      future: calculateAverage(byCategory.future),
      deferred: calculateAverage(byCategory.deferred),
    },
    overallAverageMs: calculateAverage(allResolutionTimes),
    resolvedCount,
    resolutionRate: gaps.length > 0 ? resolvedCount / gaps.length : 0,
  }
}

/**
 * Generates insights from the analytics for system learning.
 *
 * @param yieldMetrics - Yield metrics
 * @param acceptanceRates - Acceptance rates by source
 * @param evidenceMetrics - Evidence metrics
 * @param resolutionMetrics - Resolution metrics
 * @returns Array of insight strings
 */
function generateInsights(
  yieldMetrics: GapYieldMetrics,
  acceptanceRates: AcceptanceRatesBySource,
  evidenceMetrics: EvidenceMetrics,
  resolutionMetrics: ResolutionMetrics,
): string[] {
  const insights: string[] = []

  // Yield insights
  if (yieldMetrics.yieldRatio < 0.3) {
    insights.push(
      `Low gap yield ratio (${(yieldMetrics.yieldRatio * 100).toFixed(1)}%) - consider refining gap detection criteria`,
    )
  } else if (yieldMetrics.yieldRatio > 0.8) {
    insights.push(
      `High gap yield ratio (${(yieldMetrics.yieldRatio * 100).toFixed(1)}%) - gap detection is well-calibrated`,
    )
  }

  // Source acceptance insights
  const sources: Array<{ name: string; rate: number; count: number }> = [
    { name: 'PM', rate: acceptanceRates.pm, count: acceptanceRates.counts.pm },
    { name: 'UX', rate: acceptanceRates.ux, count: acceptanceRates.counts.ux },
    { name: 'QA', rate: acceptanceRates.qa, count: acceptanceRates.counts.qa },
    { name: 'Attack', rate: acceptanceRates.attack, count: acceptanceRates.counts.attack },
  ]

  const significantSources = sources.filter(s => s.count >= 3)

  const bestSource = significantSources.reduce(
    (best, s) => (s.rate > best.rate ? s : best),
    significantSources[0],
  )
  const worstSource = significantSources.reduce(
    (worst, s) => (s.rate < worst.rate ? s : worst),
    significantSources[0],
  )

  if (bestSource && worstSource && bestSource.rate - worstSource.rate > 0.2) {
    insights.push(
      `${bestSource.name} gaps have highest acceptance (${(bestSource.rate * 100).toFixed(0)}%), ` +
        `${worstSource.name} lowest (${(worstSource.rate * 100).toFixed(0)}%)`,
    )
  }

  // Evidence insights
  if (evidenceMetrics.rate < 0.5) {
    insights.push(
      `Only ${(evidenceMetrics.rate * 100).toFixed(0)}% of gaps have evidence - improve gap substantiation`,
    )
  }

  // Resolution insights
  if (resolutionMetrics.resolutionRate < 0.2 && resolutionMetrics.resolvedCount > 0) {
    insights.push(
      `Low resolution rate (${(resolutionMetrics.resolutionRate * 100).toFixed(0)}%) - gaps may be accumulating`,
    )
  }

  if (
    resolutionMetrics.averageTimeByCategory.mvp_blocking !== null &&
    resolutionMetrics.averageTimeByCategory.mvp_blocking > 7 * 24 * 60 * 60 * 1000
  ) {
    const days = Math.round(
      resolutionMetrics.averageTimeByCategory.mvp_blocking / (24 * 60 * 60 * 1000),
    )
    insights.push(`MVP-blocking gaps taking ${days} days on average to resolve`)
  }

  return insights
}

/**
 * Generates comprehensive gap analytics from hygiene history.
 * Main function that aggregates all metrics for system learning.
 *
 * @param storyId - Story ID being analyzed
 * @param hygieneResult - Current or accumulated hygiene results
 * @param config - Configuration options
 * @returns Complete gap analytics result
 */
export async function generateGapAnalytics(
  storyId: string,
  hygieneResult: HygieneResult | null | undefined,
  config: Partial<GapAnalyticsConfig> = {},
): Promise<GapAnalyticsResult> {
  const fullConfig = GapAnalyticsConfigSchema.parse(config)
  const now = new Date().toISOString()

  // Handle missing input
  if (!hygieneResult) {
    return {
      storyId,
      analyzedAt: now,
      yieldMetrics: {
        suggested: 0,
        accepted: 0,
        rejected: 0,
        yieldRatio: 0,
        calculatedAt: now,
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
      insights: ['No gap history available for analysis'],
      success: false,
      error: 'No hygiene result provided for analytics',
    }
  }

  const gaps = hygieneResult.rankedGaps

  // Check minimum gaps
  if (gaps.length < fullConfig.minGapsForAnalysis) {
    return {
      storyId,
      analyzedAt: now,
      yieldMetrics: calculateGapYield(gaps),
      acceptanceRates: calculateAcceptanceRates(gaps),
      evidenceMetrics: calculateEvidenceRates(gaps),
      resolutionMetrics: calculateResolutionTimes(gaps),
      totalGapsAnalyzed: gaps.length,
      insights: [
        `Insufficient gaps for meaningful analysis (${gaps.length} < ${fullConfig.minGapsForAnalysis})`,
      ],
      success: true,
    }
  }

  // Calculate all metrics
  const yieldMetrics = calculateGapYield(gaps)
  const acceptanceRates = calculateAcceptanceRates(gaps)
  const evidenceMetrics = calculateEvidenceRates(gaps)
  const resolutionMetrics = calculateResolutionTimes(gaps)

  // Generate insights
  const insights = generateInsights(yieldMetrics, acceptanceRates, evidenceMetrics, resolutionMetrics)

  return {
    storyId,
    analyzedAt: now,
    yieldMetrics,
    acceptanceRates,
    evidenceMetrics,
    resolutionMetrics,
    totalGapsAnalyzed: gaps.length,
    insights,
    success: true,
  }
}

/**
 * Extended graph state with gap analytics.
 */
export interface GraphStateWithGapAnalytics extends GraphState {
  /** Gap hygiene result to analyze */
  gapHygieneResult?: HygieneResult | null
  /** Gap analytics result */
  gapAnalyticsResult?: GapAnalyticsResult | null
  /** Whether analytics was successful */
  gapAnalyticsCompleted?: boolean
}

/**
 * Gap Analytics metrics node implementation.
 *
 * Calculates system learning metrics from gap history.
 * Uses the tool preset (lower retries, shorter timeout) since this is
 * primarily computation with no external calls.
 *
 * IMPORTANT: These metrics are for SYSTEM LEARNING only, not performance evaluation.
 *
 * @param state - Current graph state (must have gap hygiene result)
 * @returns Partial state update with gap analytics
 */
export const gapAnalyticsNode = createToolNode(
  'gap_analytics',
  async (state: GraphState): Promise<Partial<GraphStateWithGapAnalytics>> => {
    const stateWithHygiene = state as GraphStateWithGapAnalytics

    // Use story ID from hygiene result or fallback to state
    const storyId =
      stateWithHygiene.gapHygieneResult?.storyId || stateWithHygiene.storyId || 'unknown'

    const result = await generateGapAnalytics(storyId, stateWithHygiene.gapHygieneResult)

    return updateState({
      gapAnalyticsResult: result,
      gapAnalyticsCompleted: result.success,
    } as Partial<GraphStateWithGapAnalytics>)
  },
)

/**
 * Creates a gap analytics node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createGapAnalyticsNode(config: Partial<GapAnalyticsConfig> = {}) {
  return createToolNode(
    'gap_analytics',
    async (state: GraphState): Promise<Partial<GraphStateWithGapAnalytics>> => {
      const stateWithHygiene = state as GraphStateWithGapAnalytics

      const storyId =
        stateWithHygiene.gapHygieneResult?.storyId || stateWithHygiene.storyId || 'unknown'

      const result = await generateGapAnalytics(storyId, stateWithHygiene.gapHygieneResult, config)

      return updateState({
        gapAnalyticsResult: result,
        gapAnalyticsCompleted: result.success,
      } as Partial<GraphStateWithGapAnalytics>)
    },
  )
}
