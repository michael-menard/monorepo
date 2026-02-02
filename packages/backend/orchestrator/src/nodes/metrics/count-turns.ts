/**
 * Turn Counter Metrics Node
 *
 * Counts stakeholder turns (interactions) that occur AFTER commitment.
 * Tracks PM<->Dev, UX<->Dev, QA<->Dev interactions post-commitment
 * to measure planning quality and identify communication patterns.
 *
 * IMPORTANT: Pre-commitment turns are EXPLICITLY EXCLUDED.
 * These metrics are for system learning only, NOT performance evaluation.
 *
 * FLOW-038: LangGraph Metrics Node - Turn Counter
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import { WorkflowPhaseSchema, type WorkflowEvent, type WorkflowPhase } from './collect-events.js'

/**
 * Stakeholder type enum - roles that interact during story workflow.
 */
export const StakeholderTypeSchema = z.enum(['pm', 'ux', 'qa', 'dev', 'architect'])

export type StakeholderType = z.infer<typeof StakeholderTypeSchema>

/**
 * Turn trigger enum - what caused the turn/interaction.
 */
export const TurnTriggerSchema = z.enum(['clarification', 'scope_change'])

export type TurnTrigger = z.infer<typeof TurnTriggerSchema>

/**
 * Schema for a stakeholder turn event.
 * Represents an interaction between two stakeholders post-commitment.
 */
export const TurnEventSchema = z.object({
  /** Stakeholder who initiated the turn */
  from: StakeholderTypeSchema,
  /** Stakeholder who received/responded to the turn */
  to: StakeholderTypeSchema,
  /** Story ID this turn relates to */
  storyId: z.string().min(1),
  /** When the turn occurred */
  timestamp: z.string().datetime(),
  /** Workflow phase when the turn occurred */
  phase: WorkflowPhaseSchema,
  /** What triggered this turn */
  trigger: TurnTriggerSchema,
  /** Original event ID from event collection */
  originalEventId: z.string().min(1).optional(),
  /** Brief description of the turn */
  description: z.string().optional(),
})

export type TurnEvent = z.infer<typeof TurnEventSchema>

/**
 * Stakeholder pair for aggregation.
 * Always normalized to alphabetical order (e.g., "dev_pm" not "pm_dev").
 */
export const StakeholderPairSchema = z.enum([
  'dev_pm',
  'dev_qa',
  'dev_ux',
  'architect_dev',
  'architect_pm',
  'architect_qa',
  'architect_ux',
  'pm_qa',
  'pm_ux',
  'qa_ux',
])

export type StakeholderPair = z.infer<typeof StakeholderPairSchema>

/**
 * Schema for turn counts by stakeholder pair.
 */
export const TurnCountsByPairSchema = z.object({
  dev_pm: z.number().int().min(0).default(0),
  dev_qa: z.number().int().min(0).default(0),
  dev_ux: z.number().int().min(0).default(0),
  architect_dev: z.number().int().min(0).default(0),
  architect_pm: z.number().int().min(0).default(0),
  architect_qa: z.number().int().min(0).default(0),
  architect_ux: z.number().int().min(0).default(0),
  pm_qa: z.number().int().min(0).default(0),
  pm_ux: z.number().int().min(0).default(0),
  qa_ux: z.number().int().min(0).default(0),
})

export type TurnCountsByPair = z.infer<typeof TurnCountsByPairSchema>

/**
 * Schema for turn counts by trigger type.
 */
export const TurnCountsByTriggerSchema = z.object({
  clarification: z.number().int().min(0).default(0),
  scope_change: z.number().int().min(0).default(0),
})

export type TurnCountsByTrigger = z.infer<typeof TurnCountsByTriggerSchema>

/**
 * Schema for turn metrics.
 * Aggregated statistics about stakeholder turns.
 */
export const TurnMetricsSchema = z.object({
  /** Total number of turns post-commitment */
  totalTurns: z.number().int().min(0),
  /** Turns broken down by stakeholder pair */
  byPair: TurnCountsByPairSchema,
  /** Turns broken down by trigger type */
  byTrigger: TurnCountsByTriggerSchema,
  /** Average turns per story (when analyzing multiple stories) */
  averageTurnsPerStory: z.number().min(0),
  /** Breakdown by phase (only post-commitment phases) */
  byPhase: z.object({
    implementation: z.number().int().min(0),
    verification: z.number().int().min(0),
    complete: z.number().int().min(0),
  }),
})

export type TurnMetrics = z.infer<typeof TurnMetricsSchema>

/**
 * Schema for turn count result.
 */
export const TurnCountResultSchema = z.object({
  /** Primary story ID analyzed (or "multi" for batch analysis) */
  storyId: z.string().min(1),
  /** Timestamp of calculation */
  calculatedAt: z.string().datetime(),
  /** Aggregated metrics */
  metrics: TurnMetricsSchema,
  /** Individual turn events (post-commitment only) */
  events: z.array(TurnEventSchema),
  /** Number of stories analyzed */
  storiesAnalyzed: z.number().int().min(0),
  /** Whether a commitment event was found */
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

export type TurnCountResult = z.infer<typeof TurnCountResultSchema>

/**
 * Schema for turn counter configuration.
 */
export const TurnCountConfigSchema = z.object({
  /** Whether to include events from 'complete' phase */
  includeCompletePhase: z.boolean().default(true),
  /** Threshold for high turn count warning (turns per story) */
  highTurnThreshold: z.number().positive().default(5),
  /** Threshold for critical turn count warning (turns per story) */
  criticalTurnThreshold: z.number().positive().default(10),
})

export type TurnCountConfig = z.infer<typeof TurnCountConfigSchema>

/**
 * Phases that are considered post-commitment.
 * Turns in these phases are counted.
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
 * Pre-commitment turns are EXPLICITLY EXCLUDED per PLAN.md.
 *
 * @param events - Array of workflow events
 * @param commitmentTimestamp - Optional timestamp of commitment event
 * @returns Array of post-commitment events
 */
export function filterPostCommitmentTurns(
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
    // Only consider clarification and scope_change events
    if (event.type !== 'clarification' && event.type !== 'scope_change') {
      return false
    }

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
 * Mapping of actor strings to stakeholder types.
 * Used to classify who is involved in an interaction.
 */
const ACTOR_TO_STAKEHOLDER: Record<string, StakeholderType> = {
  pm: 'pm',
  product: 'pm',
  product_manager: 'pm',
  ux: 'ux',
  design: 'ux',
  designer: 'ux',
  qa: 'qa',
  test: 'qa',
  tester: 'qa',
  quality: 'qa',
  dev: 'dev',
  developer: 'dev',
  engineer: 'dev',
  architect: 'architect',
  system: 'dev', // Default system events to dev
  user: 'pm', // Default user interactions to PM
  assistant: 'dev', // Default assistant responses to dev
}

/**
 * Normalizes a stakeholder pair to alphabetical order.
 *
 * @param from - First stakeholder
 * @param to - Second stakeholder
 * @returns Normalized stakeholder pair string
 */
function normalizeStakeholderPair(from: StakeholderType, to: StakeholderType): StakeholderPair {
  const sorted = [from, to].sort()
  return `${sorted[0]}_${sorted[1]}` as StakeholderPair
}

/**
 * Classifies a workflow event as a stakeholder turn.
 * Determines the from/to stakeholders based on event metadata.
 *
 * @param event - Workflow event to classify
 * @returns TurnEvent if classifiable, null otherwise
 */
export function classifyStakeholderTurn(event: WorkflowEvent): TurnEvent | null {
  // Only clarification and scope_change events are turns
  if (event.type !== 'clarification' && event.type !== 'scope_change') {
    return null
  }

  // Determine the actor (who initiated)
  const actorString = event.details.actor?.toLowerCase() || 'system'
  const fromStakeholder = ACTOR_TO_STAKEHOLDER[actorString] || 'dev'

  // Determine the recipient based on context
  // For clarifications: typically PM/UX asking Dev for clarity, or Dev asking PM/UX
  // For scope changes: typically PM initiating, Dev receiving
  let toStakeholder: StakeholderType

  if (event.type === 'clarification') {
    // If user/PM asks, dev responds; if dev asks, PM responds
    toStakeholder = fromStakeholder === 'dev' ? 'pm' : 'dev'

    // Check metadata for more specific recipient
    const metadata = event.details.metadata
    if (metadata && typeof metadata === 'object') {
      const recipient = (metadata as Record<string, unknown>).recipient as string | undefined
      if (recipient && ACTOR_TO_STAKEHOLDER[recipient.toLowerCase()]) {
        toStakeholder = ACTOR_TO_STAKEHOLDER[recipient.toLowerCase()]
      }
    }
  } else {
    // scope_change - typically PM/architect initiates, dev receives
    toStakeholder = fromStakeholder === 'dev' ? 'pm' : 'dev'
  }

  // Don't count self-turns
  if (fromStakeholder === toStakeholder) {
    return null
  }

  return {
    from: fromStakeholder,
    to: toStakeholder,
    storyId: event.storyId,
    timestamp: event.timestamp,
    phase: event.phase,
    trigger: event.type as TurnTrigger,
    originalEventId: event.id,
    description: event.details.description,
  }
}

/**
 * Counts turns by stakeholder pair.
 *
 * @param turns - Array of turn events
 * @returns Counts grouped by stakeholder pair
 */
export function countTurnsByPair(turns: readonly TurnEvent[]): TurnCountsByPair {
  const counts: TurnCountsByPair = {
    dev_pm: 0,
    dev_qa: 0,
    dev_ux: 0,
    architect_dev: 0,
    architect_pm: 0,
    architect_qa: 0,
    architect_ux: 0,
    pm_qa: 0,
    pm_ux: 0,
    qa_ux: 0,
  }

  for (const turn of turns) {
    const pair = normalizeStakeholderPair(turn.from, turn.to)
    if (pair in counts) {
      counts[pair]++
    }
  }

  return TurnCountsByPairSchema.parse(counts)
}

/**
 * Calculates comprehensive turn metrics from workflow events.
 * Main calculation function that aggregates all stakeholder turns post-commitment.
 *
 * @param events - Array of workflow events (from event collection)
 * @param config - Optional configuration
 * @returns Turn metrics and classified events
 */
export function calculateTurnMetrics(
  events: readonly WorkflowEvent[],
  config: Partial<TurnCountConfig> = {},
): { metrics: TurnMetrics; turnEvents: TurnEvent[] } {
  const fullConfig = TurnCountConfigSchema.parse(config)

  // Filter to post-commitment events
  const postCommitmentEvents = filterPostCommitmentTurns(events)

  // Classify events as turns
  const turnEvents: TurnEvent[] = []

  const byTrigger: TurnCountsByTrigger = {
    clarification: 0,
    scope_change: 0,
  }

  const byPhase = {
    implementation: 0,
    verification: 0,
    complete: 0,
  }

  for (const event of postCommitmentEvents) {
    const turn = classifyStakeholderTurn(event)
    if (turn) {
      // Skip complete phase if configured
      if (!fullConfig.includeCompletePhase && turn.phase === 'complete') {
        continue
      }

      turnEvents.push(turn)

      // Count by trigger
      byTrigger[turn.trigger]++

      // Count by phase
      if (turn.phase === 'implementation') {
        byPhase.implementation++
      } else if (turn.phase === 'verification') {
        byPhase.verification++
      } else if (turn.phase === 'complete') {
        byPhase.complete++
      }
    }
  }

  // Count by stakeholder pair
  const byPair = countTurnsByPair(turnEvents)

  const totalTurns = turnEvents.length
  const averageTurnsPerStory = totalTurns // Single story for now

  return {
    metrics: TurnMetricsSchema.parse({
      totalTurns,
      byPair,
      byTrigger,
      averageTurnsPerStory,
      byPhase,
    }),
    turnEvents,
  }
}

/**
 * Generates insights from turn metrics for system learning.
 *
 * @param metrics - Turn metrics
 * @param hasCommitment - Whether commitment was found
 * @param config - Configuration with thresholds
 * @returns Array of insight strings
 */
function generateTurnInsights(
  metrics: TurnMetrics,
  hasCommitment: boolean,
  config: TurnCountConfig,
): string[] {
  const insights: string[] = []

  if (!hasCommitment) {
    insights.push('No commitment event found - turn metrics may be incomplete')
    return insights
  }

  if (metrics.totalTurns === 0) {
    insights.push('Excellent: Zero post-commitment turns - planning was thorough')
    return insights
  }

  // Rate-based insights
  if (metrics.averageTurnsPerStory >= config.criticalTurnThreshold) {
    insights.push(
      `Critical turn count (${metrics.averageTurnsPerStory.toFixed(1)} turns/story) - ` +
        `significant communication overhead needs investigation`,
    )
  } else if (metrics.averageTurnsPerStory >= config.highTurnThreshold) {
    insights.push(
      `High turn count (${metrics.averageTurnsPerStory.toFixed(1)} turns/story) - ` +
        `consider improving pre-commitment planning`,
    )
  } else if (metrics.averageTurnsPerStory > 0) {
    insights.push(
      `Moderate turn count (${metrics.averageTurnsPerStory.toFixed(1)} turns/story) - ` +
        `room for improvement in upfront planning`,
    )
  }

  // Trigger breakdown insights
  if (metrics.byTrigger.clarification > metrics.byTrigger.scope_change * 2) {
    insights.push(
      `Clarification-heavy (${metrics.byTrigger.clarification} vs ${metrics.byTrigger.scope_change} scope changes) - ` +
        `requirements may lack clarity`,
    )
  } else if (metrics.byTrigger.scope_change > metrics.byTrigger.clarification * 2) {
    insights.push(
      `Scope-change-heavy (${metrics.byTrigger.scope_change} vs ${metrics.byTrigger.clarification} clarifications) - ` +
        `scope may not be fully defined at commitment`,
    )
  }

  // Stakeholder pair insights
  const devPmTurns = metrics.byPair.dev_pm
  const devQaTurns = metrics.byPair.dev_qa
  const devUxTurns = metrics.byPair.dev_ux

  if (devPmTurns > devQaTurns + devUxTurns) {
    insights.push(
      `High PM<->Dev interaction (${devPmTurns} turns) - ` +
        `requirements may need more upfront elaboration`,
    )
  }

  if (devQaTurns > devPmTurns && devQaTurns > devUxTurns) {
    insights.push(
      `High QA<->Dev interaction (${devQaTurns} turns) - ` +
        `test criteria may need earlier definition`,
    )
  }

  if (devUxTurns > devPmTurns && devUxTurns > devQaTurns) {
    insights.push(
      `High UX<->Dev interaction (${devUxTurns} turns) - ` +
        `design specs may need more detail upfront`,
    )
  }

  // Phase distribution insights
  const implementationRatio =
    metrics.totalTurns > 0 ? metrics.byPhase.implementation / metrics.totalTurns : 0

  if (implementationRatio > 0.7) {
    insights.push(
      `${(implementationRatio * 100).toFixed(0)}% of turns in implementation phase - ` +
        `consider more thorough pre-dev review`,
    )
  }

  if (metrics.byPhase.verification > 0) {
    insights.push(
      `${metrics.byPhase.verification} turns during verification - ` +
        `QA is identifying issues that should be caught earlier`,
    )
  }

  return insights
}

/**
 * Generates complete turn count analysis for a story.
 *
 * @param storyId - Story ID being analyzed
 * @param events - Array of workflow events
 * @param config - Optional configuration
 * @returns Complete turn count result
 */
export async function generateTurnCountAnalysis(
  storyId: string,
  events: readonly WorkflowEvent[] | null | undefined,
  config: Partial<TurnCountConfig> = {},
): Promise<TurnCountResult> {
  const fullConfig = TurnCountConfigSchema.parse(config)
  const now = new Date().toISOString()

  // Handle missing input
  if (!events || events.length === 0) {
    return {
      storyId,
      calculatedAt: now,
      metrics: {
        totalTurns: 0,
        byPair: TurnCountsByPairSchema.parse({}),
        byTrigger: TurnCountsByTriggerSchema.parse({}),
        averageTurnsPerStory: 0,
        byPhase: {
          implementation: 0,
          verification: 0,
          complete: 0,
        },
      },
      events: [],
      storiesAnalyzed: 0,
      hasCommitment: false,
      insights: ['No events available for turn count analysis'],
      success: false,
      error: 'No events provided for turn count calculation',
    }
  }

  // Find commitment event
  const commitmentEvent = events.find(e => e.type === 'commitment')
  const hasCommitment = commitmentEvent !== undefined
  const commitmentTimestamp = commitmentEvent?.timestamp

  // Calculate metrics
  const { metrics, turnEvents } = calculateTurnMetrics(events, fullConfig)

  // Generate insights
  const insights = generateTurnInsights(metrics, hasCommitment, fullConfig)

  return TurnCountResultSchema.parse({
    storyId,
    calculatedAt: now,
    metrics,
    events: turnEvents,
    storiesAnalyzed: 1,
    hasCommitment,
    commitmentTimestamp,
    insights,
    success: true,
  })
}

/**
 * Extended graph state with turn count calculation.
 */
export interface GraphStateWithTurnCount extends GraphState {
  /** Collected workflow events (from collect-events node) */
  collectedEvents?: WorkflowEvent[]
  /** Turn count calculation result */
  turnCountResult?: TurnCountResult | null
  /** Whether turn count calculation was successful */
  turnCountCalculated?: boolean
}

/**
 * Turn Counter metrics node implementation.
 *
 * Counts stakeholder turns (PM<->Dev, UX<->Dev, QA<->Dev) that occur after
 * the commitment gate passes. Pre-commitment turns are EXCLUDED.
 *
 * IMPORTANT: These metrics are for SYSTEM LEARNING only, not performance evaluation.
 *
 * @param state - Current graph state (must have collected events)
 * @returns Partial state update with turn count result
 */
export const countTurnsNode = createToolNode(
  'count_turns',
  async (state: GraphState): Promise<Partial<GraphStateWithTurnCount>> => {
    const stateWithEvents = state as GraphStateWithTurnCount

    const storyId = stateWithEvents.storyId || 'unknown'
    const events = stateWithEvents.collectedEvents

    const result = await generateTurnCountAnalysis(storyId, events)

    return updateState({
      turnCountResult: result,
      turnCountCalculated: result.success,
    } as Partial<GraphStateWithTurnCount>)
  },
)

/**
 * Creates a turn counter node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createCountTurnsNode(config: Partial<TurnCountConfig> = {}) {
  return createToolNode(
    'count_turns',
    async (state: GraphState): Promise<Partial<GraphStateWithTurnCount>> => {
      const stateWithEvents = state as GraphStateWithTurnCount

      const storyId = stateWithEvents.storyId || 'unknown'
      const events = stateWithEvents.collectedEvents

      const result = await generateTurnCountAnalysis(storyId, events, config)

      return updateState({
        turnCountResult: result,
        turnCountCalculated: result.success,
      } as Partial<GraphStateWithTurnCount>)
    },
  )
}
