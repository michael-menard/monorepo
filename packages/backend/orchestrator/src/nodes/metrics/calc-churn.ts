/**
 * Churn Placement Index Calculator Node
 *
 * Calculates churn distribution across workflow phases for SYSTEM LEARNING purposes.
 * Churn is classified into discovery, elaboration, development, and post-dev phases.
 *
 * A HEALTHY SYSTEM shows churn concentrated early (discovery/elaboration)
 * with a sharp drop at commitment. Post-commitment churn is costly and indicates
 * planning gaps.
 *
 * IMPORTANT: These metrics are for system learning only, NOT performance evaluation.
 *
 * FLOW-039: LangGraph Metrics Node - Churn Placement Index Calculator
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import {
  WorkflowPhaseSchema,
  type WorkflowEvent,
  type WorkflowPhase,
  type EventType,
} from './collect-events.js'

/**
 * Churn phase classification - grouped phases for churn analysis.
 * Per PLAN.md, these are the four buckets for churn tracking.
 */
export const ChurnPhaseSchema = z.enum(['discovery', 'elaboration', 'development', 'post_dev'])

export type ChurnPhase = z.infer<typeof ChurnPhaseSchema>

/**
 * Schema for a churn event - a scope change or clarification that indicates planning adjustment.
 */
export const ChurnEventSchema = z.object({
  /** Story ID this churn relates to */
  storyId: z.string().min(1),
  /** The classified churn phase */
  churnPhase: ChurnPhaseSchema,
  /** Original workflow phase */
  originalPhase: WorkflowPhaseSchema,
  /** Type of churn event (clarification or scope_change) */
  type: z.enum(['clarification', 'scope_change']),
  /** When the churn occurred */
  timestamp: z.string().datetime(),
  /** Original event ID */
  originalEventId: z.string().min(1),
  /** Brief description */
  description: z.string().optional(),
})

export type ChurnEvent = z.infer<typeof ChurnEventSchema>

/**
 * Churn distribution percentages by phase.
 */
export const ChurnDistributionSchema = z.object({
  /** Percentage of churn in discovery phase (0-1) */
  discovery: z.number().min(0).max(1),
  /** Percentage of churn in elaboration phase (0-1) */
  elaboration: z.number().min(0).max(1),
  /** Percentage of churn in development phase (0-1) */
  development: z.number().min(0).max(1),
  /** Percentage of churn in post-dev/QA phase (0-1) */
  post_dev: z.number().min(0).max(1),
  /** Raw counts by phase */
  counts: z.object({
    discovery: z.number().int().min(0),
    elaboration: z.number().int().min(0),
    development: z.number().int().min(0),
    post_dev: z.number().int().min(0),
  }),
  /** Total churn events */
  total: z.number().int().min(0),
})

export type ChurnDistribution = z.infer<typeof ChurnDistributionSchema>

/**
 * Churn Placement Index result.
 * Measures whether churn is concentrated early (healthy) or late (problematic).
 */
export const ChurnPlacementIndexSchema = z.object({
  /** Churn distribution percentages */
  distribution: ChurnDistributionSchema,
  /** Combined early phase percentage (discovery + elaboration) */
  earlyChurnRatio: z.number().min(0).max(1),
  /** Combined late phase percentage (development + post_dev) */
  lateChurnRatio: z.number().min(0).max(1),
  /** Whether the pattern is considered healthy (early concentration) */
  isHealthyPattern: z.boolean(),
  /** Health score (0-100): higher = more churn early, lower = more churn late */
  healthScore: z.number().min(0).max(100),
  /** Sharpness of drop at commitment (ratio of early to late, capped at 10) */
  commitmentDropRatio: z.number().min(0),
})

export type ChurnPlacementIndex = z.infer<typeof ChurnPlacementIndexSchema>

/**
 * Complete churn calculation result.
 */
export const ChurnResultSchema = z.object({
  /** Story ID analyzed */
  storyId: z.string().min(1),
  /** Timestamp of calculation */
  calculatedAt: z.string().datetime(),
  /** Churn placement index */
  index: ChurnPlacementIndexSchema,
  /** Classified churn events */
  events: z.array(ChurnEventSchema),
  /** Total churn events analyzed */
  totalChurnEvents: z.number().int().min(0),
  /** Key insights for system learning */
  insights: z.array(z.string()).default([]),
  /** Whether calculation was successful */
  success: z.boolean(),
  /** Error message if calculation failed */
  error: z.string().optional(),
})

export type ChurnResult = z.infer<typeof ChurnResultSchema>

/**
 * Configuration for churn calculation.
 */
export const ChurnConfigSchema = z.object({
  /** Minimum churn events required for meaningful analysis */
  minChurnEvents: z.number().int().positive().default(3),
  /** Early churn ratio threshold for healthy pattern (default: 70%) */
  healthyThreshold: z.number().min(0).max(1).default(0.7),
  /** Warning threshold for late churn (default: 40%) */
  warningThreshold: z.number().min(0).max(1).default(0.4),
  /** Critical threshold for late churn (default: 60%) */
  criticalThreshold: z.number().min(0).max(1).default(0.6),
})

export type ChurnConfig = z.infer<typeof ChurnConfigSchema>

/**
 * Maps a workflow phase to a churn phase category.
 * Per PLAN.md:
 * - Discovery: seed, review (early gap analysis)
 * - Elaboration: elaboration, hygiene, readiness
 * - Development: commitment, implementation
 * - Post-dev: verification, complete
 *
 * @param phase - Original workflow phase
 * @returns Classified churn phase
 */
export function mapToChurnPhase(phase: WorkflowPhase): ChurnPhase {
  switch (phase) {
    case 'seed':
    case 'review':
      return 'discovery'
    case 'elaboration':
    case 'hygiene':
    case 'readiness':
      return 'elaboration'
    case 'commitment':
    case 'implementation':
      return 'development'
    case 'verification':
    case 'complete':
      return 'post_dev'
    default:
      // Fallback to elaboration for unknown phases
      return 'elaboration'
  }
}

/**
 * Identifies churn events from workflow events.
 * Churn events are clarifications and scope changes.
 *
 * @param events - Array of workflow events
 * @returns Array of churn events
 */
export function identifyChurnEvents(events: readonly WorkflowEvent[]): ChurnEvent[] {
  if (!events || events.length === 0) {
    return []
  }

  const churnTypes: EventType[] = ['clarification', 'scope_change']
  const churnEvents: ChurnEvent[] = []

  for (const event of events) {
    if (churnTypes.includes(event.type)) {
      churnEvents.push({
        storyId: event.storyId,
        churnPhase: mapToChurnPhase(event.phase),
        originalPhase: event.phase,
        type: event.type as 'clarification' | 'scope_change',
        timestamp: event.timestamp,
        originalEventId: event.id,
        description: event.details.description,
      })
    }
  }

  return churnEvents
}

/**
 * Classifies churn events by phase.
 * Groups events into discovery, elaboration, development, and post_dev.
 *
 * @param events - Array of workflow events
 * @returns Array of classified churn events
 */
export function classifyChurnByPhase(events: readonly WorkflowEvent[]): ChurnEvent[] {
  return identifyChurnEvents(events)
}

/**
 * Calculates churn distribution from churn events.
 * Returns percentages for each phase.
 *
 * @param churnEvents - Array of classified churn events
 * @returns Churn distribution with percentages and counts
 */
export function calculateDistribution(churnEvents: readonly ChurnEvent[]): ChurnDistribution {
  const counts = {
    discovery: 0,
    elaboration: 0,
    development: 0,
    post_dev: 0,
  }

  for (const event of churnEvents) {
    counts[event.churnPhase]++
  }

  const total = churnEvents.length

  return {
    discovery: total > 0 ? counts.discovery / total : 0,
    elaboration: total > 0 ? counts.elaboration / total : 0,
    development: total > 0 ? counts.development / total : 0,
    post_dev: total > 0 ? counts.post_dev / total : 0,
    counts,
    total,
  }
}

/**
 * Assesses whether the churn distribution pattern is healthy.
 * A healthy pattern has churn concentrated early with a sharp drop at commitment.
 *
 * @param distribution - Churn distribution
 * @param config - Configuration with thresholds
 * @returns Assessment results
 */
export function assessChurnHealthiness(
  distribution: ChurnDistribution,
  config: ChurnConfig = ChurnConfigSchema.parse({}),
): {
  isHealthy: boolean
  earlyRatio: number
  lateRatio: number
  healthScore: number
  commitmentDropRatio: number
} {
  const earlyRatio = distribution.discovery + distribution.elaboration
  const lateRatio = distribution.development + distribution.post_dev

  // Health score: 100 if all churn is early, 0 if all churn is late
  // Linear interpolation based on early churn ratio
  const healthScore = Math.round(earlyRatio * 100)

  // Commitment drop ratio: how much more churn is early vs late
  // Capped at 10 to avoid extreme values
  const commitmentDropRatio = lateRatio > 0 ? Math.min(earlyRatio / lateRatio, 10) : 10

  // Pattern is healthy if early churn exceeds threshold
  const isHealthy = earlyRatio >= config.healthyThreshold

  return {
    isHealthy,
    earlyRatio,
    lateRatio,
    healthScore,
    commitmentDropRatio,
  }
}

/**
 * Generates insights from churn metrics for system learning.
 *
 * @param index - Churn placement index
 * @param distribution - Churn distribution
 * @param config - Configuration with thresholds
 * @returns Array of insight strings
 */
function generateChurnInsights(
  index: ChurnPlacementIndex,
  distribution: ChurnDistribution,
  config: ChurnConfig,
): string[] {
  const insights: string[] = []

  if (distribution.total === 0) {
    insights.push('No churn events detected - insufficient data for analysis')
    return insights
  }

  // Health assessment
  if (index.isHealthyPattern) {
    insights.push(
      `Healthy churn pattern: ${(index.earlyChurnRatio * 100).toFixed(0)}% of churn in early phases`,
    )
  } else {
    insights.push(
      `Unhealthy churn pattern: only ${(index.earlyChurnRatio * 100).toFixed(0)}% of churn in early phases`,
    )
  }

  // Late churn warnings
  if (index.lateChurnRatio >= config.criticalThreshold) {
    insights.push(
      `Critical: ${(index.lateChurnRatio * 100).toFixed(0)}% of churn after commitment - ` +
        `significant planning gaps`,
    )
  } else if (index.lateChurnRatio >= config.warningThreshold) {
    insights.push(
      `Warning: ${(index.lateChurnRatio * 100).toFixed(0)}% of churn after commitment - ` +
        `consider improving elaboration phase`,
    )
  }

  // Phase-specific insights
  if (distribution.post_dev > 0.2) {
    insights.push(
      `${(distribution.post_dev * 100).toFixed(0)}% of churn in post-dev/QA - ` +
        `upstream processes need improvement`,
    )
  }

  if (distribution.discovery > 0.5) {
    insights.push(
      `${(distribution.discovery * 100).toFixed(0)}% of churn in discovery - ` +
        `healthy exploration of requirements`,
    )
  }

  // Commitment drop insight
  if (index.commitmentDropRatio >= 3) {
    insights.push(
      `Strong commitment boundary: ${index.commitmentDropRatio.toFixed(1)}x more churn before commitment`,
    )
  } else if (index.commitmentDropRatio < 1 && distribution.total > 0) {
    insights.push(`Weak commitment boundary: more churn after commitment than before`)
  }

  // Health score summary
  insights.push(`Churn health score: ${index.healthScore}/100`)

  return insights
}

/**
 * Calculates the complete Churn Placement Index from workflow events.
 * Main function that processes events and generates the index.
 *
 * @param storyId - Story ID being analyzed
 * @param events - Array of workflow events
 * @param config - Configuration options
 * @returns Complete churn result
 */
export async function calculateChurnIndex(
  storyId: string,
  events: readonly WorkflowEvent[] | null | undefined,
  config: Partial<ChurnConfig> = {},
): Promise<ChurnResult> {
  const fullConfig = ChurnConfigSchema.parse(config)
  const now = new Date().toISOString()

  // Handle missing input
  if (!events || events.length === 0) {
    return {
      storyId,
      calculatedAt: now,
      index: {
        distribution: {
          discovery: 0,
          elaboration: 0,
          development: 0,
          post_dev: 0,
          counts: { discovery: 0, elaboration: 0, development: 0, post_dev: 0 },
          total: 0,
        },
        earlyChurnRatio: 0,
        lateChurnRatio: 0,
        isHealthyPattern: true, // No churn is technically healthy
        healthScore: 100,
        commitmentDropRatio: 10,
      },
      events: [],
      totalChurnEvents: 0,
      insights: ['No events available for churn analysis'],
      success: false,
      error: 'No events provided for churn calculation',
    }
  }

  // Identify and classify churn events
  const churnEvents = classifyChurnByPhase(events)

  // Check minimum events
  if (churnEvents.length < fullConfig.minChurnEvents) {
    const distribution = calculateDistribution(churnEvents)
    const assessment = assessChurnHealthiness(distribution, fullConfig)

    return {
      storyId,
      calculatedAt: now,
      index: {
        distribution,
        earlyChurnRatio: assessment.earlyRatio,
        lateChurnRatio: assessment.lateRatio,
        isHealthyPattern: assessment.isHealthy,
        healthScore: assessment.healthScore,
        commitmentDropRatio: assessment.commitmentDropRatio,
      },
      events: churnEvents,
      totalChurnEvents: churnEvents.length,
      insights: [
        `Insufficient churn events for meaningful analysis (${churnEvents.length} < ${fullConfig.minChurnEvents})`,
      ],
      success: true,
    }
  }

  // Calculate distribution
  const distribution = calculateDistribution(churnEvents)

  // Assess healthiness
  const assessment = assessChurnHealthiness(distribution, fullConfig)

  // Build the index
  const index: ChurnPlacementIndex = {
    distribution,
    earlyChurnRatio: assessment.earlyRatio,
    lateChurnRatio: assessment.lateRatio,
    isHealthyPattern: assessment.isHealthy,
    healthScore: assessment.healthScore,
    commitmentDropRatio: assessment.commitmentDropRatio,
  }

  // Generate insights
  const insights = generateChurnInsights(index, distribution, fullConfig)

  return {
    storyId,
    calculatedAt: now,
    index,
    events: churnEvents,
    totalChurnEvents: churnEvents.length,
    insights,
    success: true,
  }
}

/**
 * Extended graph state with churn calculation.
 */
export interface GraphStateWithChurn extends GraphState {
  /** Collected workflow events (from collect-events node) */
  collectedEvents?: WorkflowEvent[]
  /** Churn calculation result */
  churnResult?: ChurnResult | null
  /** Whether churn calculation was successful */
  churnCalculated?: boolean
}

/**
 * Churn Placement Index calculator node implementation.
 *
 * Calculates churn distribution across workflow phases for system learning.
 * Identifies whether churn is healthy (early concentration) or problematic
 * (late concentration after commitment).
 *
 * IMPORTANT: These metrics are for SYSTEM LEARNING only, not performance evaluation.
 *
 * @param state - Current graph state (must have collected events)
 * @returns Partial state update with churn result
 */
export const calcChurnNode = createToolNode(
  'calc_churn',
  async (state: GraphState): Promise<Partial<GraphStateWithChurn>> => {
    const stateWithEvents = state as GraphStateWithChurn

    const storyId = stateWithEvents.storyId || 'unknown'
    const events = stateWithEvents.collectedEvents

    const result = await calculateChurnIndex(storyId, events)

    return updateState({
      churnResult: result,
      churnCalculated: result.success,
    } as Partial<GraphStateWithChurn>)
  },
)

/**
 * Creates a churn calculator node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createCalcChurnNode(config: Partial<ChurnConfig> = {}) {
  return createToolNode(
    'calc_churn',
    async (state: GraphState): Promise<Partial<GraphStateWithChurn>> => {
      const stateWithEvents = state as GraphStateWithChurn

      const storyId = stateWithEvents.storyId || 'unknown'
      const events = stateWithEvents.collectedEvents

      const result = await calculateChurnIndex(storyId, events, config)

      return updateState({
        churnResult: result,
        churnCalculated: result.success,
      } as Partial<GraphStateWithChurn>)
    },
  )
}
