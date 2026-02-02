/**
 * PCAR (Post-Commitment Ambiguity Rate) Calculator Node
 *
 * Calculates the NORTH STAR METRIC for planning quality.
 * PCAR measures clarification and scope-change events that occur
 * AFTER commitment to development. Any ambiguity post-commitment
 * indicates planning gaps that should have been resolved earlier.
 *
 * IMPORTANT: These metrics are for system learning only, NOT performance evaluation.
 *
 * FLOW-037: LangGraph Metrics Node - PCAR Calculator
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import { WorkflowPhaseSchema, type WorkflowEvent, type WorkflowPhase } from './collect-events.js'

/**
 * Ambiguity event type - the two categories that indicate planning gaps.
 */
export const AmbiguityEventTypeSchema = z.enum(['clarification', 'scope_change'])

export type AmbiguityEventType = z.infer<typeof AmbiguityEventTypeSchema>

/**
 * Schema for an ambiguity event.
 * Represents a clarification or scope change that occurred post-commitment.
 */
export const AmbiguityEventSchema = z.object({
  /** The type of ambiguity event */
  type: AmbiguityEventTypeSchema,
  /** Story ID this event relates to */
  storyId: z.string().min(1),
  /** When the event occurred */
  timestamp: z.string().datetime(),
  /** Workflow phase when the event occurred */
  phase: WorkflowPhaseSchema,
  /** Original event ID from event collection */
  originalEventId: z.string().min(1),
  /** Brief description of the ambiguity */
  description: z.string().optional(),
  /** Actor who triggered the event */
  actor: z.string().optional(),
})

export type AmbiguityEvent = z.infer<typeof AmbiguityEventSchema>

/**
 * Schema for PCAR metrics breakdown.
 */
export const PCARMetricsSchema = z.object({
  /** Count of clarification events post-commitment */
  clarificationCount: z.number().int().min(0),
  /** Count of scope change events post-commitment */
  scopeChangeCount: z.number().int().min(0),
  /** Total ambiguity events (clarification + scope_change) */
  totalAmbiguity: z.number().int().min(0),
  /** PCAR rate: ambiguity events per story */
  rate: z.number().min(0),
  /** Breakdown by phase (only post-commitment phases) */
  byPhase: z.object({
    implementation: z.number().int().min(0),
    verification: z.number().int().min(0),
    complete: z.number().int().min(0),
  }),
})

export type PCARMetrics = z.infer<typeof PCARMetricsSchema>

/**
 * Schema for PCAR calculation result.
 */
export const PCARResultSchema = z.object({
  /** Story ID analyzed */
  storyId: z.string().min(1),
  /** Timestamp of calculation */
  calculatedAt: z.string().datetime(),
  /** PCAR metrics */
  metrics: PCARMetricsSchema,
  /** Filtered ambiguity events (post-commitment only) */
  events: z.array(AmbiguityEventSchema),
  /** Number of stories analyzed (for rate calculation) */
  storiesAnalyzed: z.number().int().min(0),
  /** Whether a commitment event was found (PCAR only meaningful if true) */
  hasCommitment: z.boolean(),
  /** Timestamp of commitment (if found) */
  commitmentTimestamp: z.string().datetime().optional(),
  /** Key insights for system learning */
  insights: z.array(z.string()).default([]),
  /** Whether calculation was successful */
  success: z.boolean(),
  /** Error message if calculation failed */
  error: z.string().optional(),
})

export type PCARResult = z.infer<typeof PCARResultSchema>

/**
 * Schema for PCAR calculation configuration.
 */
export const PCARConfigSchema = z.object({
  /** Whether to include events from 'complete' phase */
  includeCompletePhase: z.boolean().default(true),
  /** Threshold for high PCAR warning (events per story) */
  highPCARThreshold: z.number().positive().default(3),
  /** Threshold for critical PCAR warning (events per story) */
  criticalPCARThreshold: z.number().positive().default(5),
})

export type PCARConfig = z.infer<typeof PCARConfigSchema>

/**
 * Phases that are considered post-commitment.
 * Events in these phases count toward PCAR.
 */
const POST_COMMITMENT_PHASES: readonly WorkflowPhase[] = [
  'implementation',
  'verification',
  'complete',
]

/**
 * Checks if a phase is post-commitment.
 *
 * @param phase - Workflow phase to check
 * @returns True if the phase is after commitment
 */
function isPostCommitmentPhase(phase: WorkflowPhase): boolean {
  return POST_COMMITMENT_PHASES.includes(phase)
}

/**
 * Filters events to only those occurring after commitment.
 * An event is post-commitment if:
 * 1. Its phase is implementation, verification, or complete
 * 2. OR its timestamp is after the commitment event timestamp
 *
 * @param events - Array of workflow events
 * @param commitmentTimestamp - Optional timestamp of commitment event
 * @returns Array of post-commitment events
 */
export function filterPostCommitmentEvents(
  events: readonly WorkflowEvent[],
  commitmentTimestamp?: string,
): WorkflowEvent[] {
  if (!events || events.length === 0) {
    return []
  }

  // Find commitment event if not provided
  let commitTime: Date | null = null
  if (commitmentTimestamp) {
    commitTime = new Date(commitmentTimestamp)
  } else {
    const commitmentEvent = events.find(e => e.type === 'commitment')
    if (commitmentEvent) {
      commitTime = new Date(commitmentEvent.timestamp)
    }
  }

  return events.filter(event => {
    // Always include events in post-commitment phases
    if (isPostCommitmentPhase(event.phase)) {
      return true
    }

    // If we have a commitment timestamp, include events after it
    if (commitTime) {
      const eventTime = new Date(event.timestamp)
      return eventTime > commitTime
    }

    return false
  })
}

/**
 * Classifies a workflow event as an ambiguity event.
 * Only clarification and scope_change events are considered ambiguity.
 *
 * @param event - Workflow event to classify
 * @returns AmbiguityEvent if applicable, null otherwise
 */
export function classifyAmbiguityEvent(event: WorkflowEvent): AmbiguityEvent | null {
  // Only clarification and scope_change are ambiguity events
  if (event.type !== 'clarification' && event.type !== 'scope_change') {
    return null
  }

  return {
    type: event.type as AmbiguityEventType,
    storyId: event.storyId,
    timestamp: event.timestamp,
    phase: event.phase,
    originalEventId: event.id,
    description: event.details.description,
    actor: event.details.actor,
  }
}

/**
 * Calculates PCAR rate.
 * Rate is ambiguity events per story analyzed.
 *
 * @param ambiguityCount - Total ambiguity events
 * @param storiesCount - Number of stories analyzed
 * @returns PCAR rate (0 if no stories)
 */
export function calculatePCARRate(ambiguityCount: number, storiesCount: number): number {
  if (storiesCount <= 0) {
    return 0
  }
  return ambiguityCount / storiesCount
}

/**
 * Calculates PCAR metrics from workflow events.
 * Main calculation function that aggregates all ambiguity events post-commitment.
 *
 * @param events - Array of workflow events (from event collection)
 * @param config - Optional configuration
 * @returns PCAR metrics
 */
export function calculatePCARMetrics(
  events: readonly WorkflowEvent[],
  config: Partial<PCARConfig> = {},
): { metrics: PCARMetrics; ambiguityEvents: AmbiguityEvent[] } {
  const fullConfig = PCARConfigSchema.parse(config)

  // Filter to post-commitment events
  const postCommitmentEvents = filterPostCommitmentEvents(events)

  // Classify ambiguity events
  const ambiguityEvents: AmbiguityEvent[] = []
  let clarificationCount = 0
  let scopeChangeCount = 0

  const byPhase = {
    implementation: 0,
    verification: 0,
    complete: 0,
  }

  for (const event of postCommitmentEvents) {
    const ambiguityEvent = classifyAmbiguityEvent(event)
    if (ambiguityEvent) {
      // Skip complete phase if configured
      if (!fullConfig.includeCompletePhase && ambiguityEvent.phase === 'complete') {
        continue
      }

      ambiguityEvents.push(ambiguityEvent)

      if (ambiguityEvent.type === 'clarification') {
        clarificationCount++
      } else {
        scopeChangeCount++
      }

      // Count by phase
      if (ambiguityEvent.phase === 'implementation') {
        byPhase.implementation++
      } else if (ambiguityEvent.phase === 'verification') {
        byPhase.verification++
      } else if (ambiguityEvent.phase === 'complete') {
        byPhase.complete++
      }
    }
  }

  const totalAmbiguity = clarificationCount + scopeChangeCount

  // For single-story analysis, storiesCount is 1
  const rate = calculatePCARRate(totalAmbiguity, 1)

  return {
    metrics: {
      clarificationCount,
      scopeChangeCount,
      totalAmbiguity,
      rate,
      byPhase,
    },
    ambiguityEvents,
  }
}

/**
 * Generates insights from PCAR metrics for system learning.
 *
 * @param metrics - PCAR metrics
 * @param hasCommitment - Whether commitment was found
 * @param config - Configuration with thresholds
 * @returns Array of insight strings
 */
function generatePCARInsights(
  metrics: PCARMetrics,
  hasCommitment: boolean,
  config: PCARConfig,
): string[] {
  const insights: string[] = []

  if (!hasCommitment) {
    insights.push('No commitment event found - PCAR metrics may be incomplete')
    return insights
  }

  if (metrics.totalAmbiguity === 0) {
    insights.push('Excellent: Zero post-commitment ambiguity events - planning was thorough')
    return insights
  }

  // Rate-based insights
  if (metrics.rate >= config.criticalPCARThreshold) {
    insights.push(
      `Critical PCAR (${metrics.rate.toFixed(1)} events/story) - ` +
        `significant planning gaps need investigation`,
    )
  } else if (metrics.rate >= config.highPCARThreshold) {
    insights.push(
      `High PCAR (${metrics.rate.toFixed(1)} events/story) - ` +
        `consider improving elaboration phase`,
    )
  } else if (metrics.rate > 0) {
    insights.push(
      `Moderate PCAR (${metrics.rate.toFixed(1)} events/story) - ` +
        `room for improvement in planning`,
    )
  }

  // Type breakdown insights
  if (metrics.clarificationCount > metrics.scopeChangeCount * 2) {
    insights.push(
      `Clarification-heavy (${metrics.clarificationCount} vs ${metrics.scopeChangeCount} scope changes) - ` +
        `requirements may lack clarity`,
    )
  } else if (metrics.scopeChangeCount > metrics.clarificationCount * 2) {
    insights.push(
      `Scope-change-heavy (${metrics.scopeChangeCount} vs ${metrics.clarificationCount} clarifications) - ` +
        `scope may not be fully defined at commitment`,
    )
  }

  // Phase distribution insights
  const implementationRatio =
    metrics.totalAmbiguity > 0 ? metrics.byPhase.implementation / metrics.totalAmbiguity : 0

  if (implementationRatio > 0.7) {
    insights.push(
      `${(implementationRatio * 100).toFixed(0)}% of ambiguity in implementation phase - ` +
        `consider more thorough pre-dev review`,
    )
  }

  if (metrics.byPhase.verification > 0) {
    insights.push(
      `${metrics.byPhase.verification} ambiguity events during verification - ` +
        `QA is finding gaps that should be caught earlier`,
    )
  }

  return insights
}

/**
 * Generates complete PCAR analysis for a story.
 *
 * @param storyId - Story ID being analyzed
 * @param events - Array of workflow events
 * @param config - Optional configuration
 * @returns Complete PCAR result
 */
export async function generatePCARAnalysis(
  storyId: string,
  events: readonly WorkflowEvent[] | null | undefined,
  config: Partial<PCARConfig> = {},
): Promise<PCARResult> {
  const fullConfig = PCARConfigSchema.parse(config)
  const now = new Date().toISOString()

  // Handle missing input
  if (!events || events.length === 0) {
    return {
      storyId,
      calculatedAt: now,
      metrics: {
        clarificationCount: 0,
        scopeChangeCount: 0,
        totalAmbiguity: 0,
        rate: 0,
        byPhase: {
          implementation: 0,
          verification: 0,
          complete: 0,
        },
      },
      events: [],
      storiesAnalyzed: 0,
      hasCommitment: false,
      insights: ['No events available for PCAR analysis'],
      success: false,
      error: 'No events provided for PCAR calculation',
    }
  }

  // Find commitment event
  const commitmentEvent = events.find(e => e.type === 'commitment')
  const hasCommitment = commitmentEvent !== undefined
  const commitmentTimestamp = commitmentEvent?.timestamp

  // Calculate metrics
  const { metrics, ambiguityEvents } = calculatePCARMetrics(events, fullConfig)

  // Generate insights
  const insights = generatePCARInsights(metrics, hasCommitment, fullConfig)

  return {
    storyId,
    calculatedAt: now,
    metrics,
    events: ambiguityEvents,
    storiesAnalyzed: 1,
    hasCommitment,
    commitmentTimestamp,
    insights,
    success: true,
  }
}

/**
 * Extended graph state with PCAR calculation.
 */
export interface GraphStateWithPCAR extends GraphState {
  /** Collected workflow events (from collect-events node) */
  collectedEvents?: WorkflowEvent[]
  /** PCAR calculation result */
  pcarResult?: PCARResult | null
  /** Whether PCAR calculation was successful */
  pcarCalculated?: boolean
}

/**
 * PCAR Calculator metrics node implementation.
 *
 * Calculates the NORTH STAR METRIC for planning quality.
 * Counts clarification and scope-change events that occur after
 * the commitment gate passes.
 *
 * IMPORTANT: These metrics are for SYSTEM LEARNING only, not performance evaluation.
 *
 * @param state - Current graph state (must have collected events)
 * @returns Partial state update with PCAR result
 */
export const calcPCARNode = createToolNode(
  'calc_pcar',
  async (state: GraphState): Promise<Partial<GraphStateWithPCAR>> => {
    const stateWithEvents = state as GraphStateWithPCAR

    const storyId = stateWithEvents.storyId || 'unknown'
    const events = stateWithEvents.collectedEvents

    const result = await generatePCARAnalysis(storyId, events)

    return updateState({
      pcarResult: result,
      pcarCalculated: result.success,
    } as Partial<GraphStateWithPCAR>)
  },
)

/**
 * Creates a PCAR calculator node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createCalcPCARNode(config: Partial<PCARConfig> = {}) {
  return createToolNode(
    'calc_pcar',
    async (state: GraphState): Promise<Partial<GraphStateWithPCAR>> => {
      const stateWithEvents = state as GraphStateWithPCAR

      const storyId = stateWithEvents.storyId || 'unknown'
      const events = stateWithEvents.collectedEvents

      const result = await generatePCARAnalysis(storyId, events, config)

      return updateState({
        pcarResult: result,
        pcarCalculated: result.success,
      } as Partial<GraphStateWithPCAR>)
    },
  )
}
