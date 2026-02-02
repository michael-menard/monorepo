/**
 * Unknown Leakage Tracker Node
 *
 * Detects and tracks "unknown unknowns" that are discovered AFTER commitment.
 * These are requirements, constraints, or technical considerations that were
 * not identified during planning but emerged during implementation or QA.
 *
 * Per PLAN.md: Any leakage indicates UPSTREAM FAILURE.
 * This is a critical signal for improving the planning process.
 *
 * IMPORTANT: These metrics are for system learning only, NOT performance evaluation.
 *
 * FLOW-040: LangGraph Metrics Node - Unknown Leakage Tracker
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import { WorkflowPhaseSchema, type WorkflowEvent, type WorkflowPhase } from './collect-events.js'

/**
 * Severity levels for leakage events.
 */
export const LeakageSeveritySchema = z.enum(['low', 'medium', 'high', 'critical'])

export type LeakageSeverity = z.infer<typeof LeakageSeveritySchema>

/**
 * Categories of unknown leakage.
 */
export const LeakageCategorySchema = z.enum([
  'requirement', // New requirement discovered post-commitment
  'constraint', // Technical or business constraint not identified
  'dependency', // External dependency not accounted for
  'edge_case', // Edge case not covered in AC
  'integration', // Integration issue not anticipated
  'performance', // Performance requirement not specified
  'security', // Security consideration overlooked
  'accessibility', // A11y requirement missed
  'other', // Other unknown type
])

export type LeakageCategory = z.infer<typeof LeakageCategorySchema>

/**
 * Schema for a leakage event - an unknown discovered after commitment.
 */
export const LeakageEventSchema = z.object({
  /** Unique ID for this leakage event */
  id: z.string().min(1),
  /** Story ID this leakage relates to */
  storyId: z.string().min(1),
  /** Description of the unknown that was discovered */
  unknownDescription: z.string().min(1),
  /** Phase where the unknown was discovered */
  discoveredPhase: WorkflowPhaseSchema,
  /** When the leakage was detected */
  timestamp: z.string().datetime(),
  /** Category of leakage */
  category: LeakageCategorySchema,
  /** Severity of the leakage */
  severity: LeakageSeveritySchema,
  /** Original event ID that triggered leakage detection */
  sourceEventId: z.string().optional(),
  /** Impact description */
  impact: z.string().optional(),
  /** Was this leakage addressed/resolved? */
  addressed: z.boolean().default(false),
})

export type LeakageEvent = z.infer<typeof LeakageEventSchema>

/**
 * Aggregated leakage metrics.
 */
export const LeakageMetricsSchema = z.object({
  /** Total count of leakage events */
  count: z.number().int().min(0),
  /** Breakdown by discovery phase */
  byPhase: z.object({
    implementation: z.number().int().min(0),
    verification: z.number().int().min(0),
    complete: z.number().int().min(0),
  }),
  /** Breakdown by category */
  byCategory: z.record(LeakageCategorySchema, z.number().int().min(0)),
  /** Breakdown by severity */
  bySeverity: z.object({
    low: z.number().int().min(0),
    medium: z.number().int().min(0),
    high: z.number().int().min(0),
    critical: z.number().int().min(0),
  }),
  /** Leakage rate (leakage events per story) */
  rate: z.number().min(0),
  /** High severity leakage rate (high + critical per story) */
  highSeverityRate: z.number().min(0),
  /** Percentage of leakage addressed */
  addressedRate: z.number().min(0).max(1),
})

export type LeakageMetrics = z.infer<typeof LeakageMetricsSchema>

/**
 * Complete leakage tracking result.
 */
export const LeakageResultSchema = z.object({
  /** Story ID analyzed */
  storyId: z.string().min(1),
  /** Timestamp of analysis */
  analyzedAt: z.string().datetime(),
  /** Leakage metrics */
  metrics: LeakageMetricsSchema,
  /** Detected leakage events */
  events: z.array(LeakageEventSchema),
  /** Total events analyzed */
  totalEventsAnalyzed: z.number().int().min(0),
  /** Whether a commitment event was found (leakage only meaningful post-commitment) */
  hasCommitment: z.boolean(),
  /** Timestamp of commitment (if found) */
  commitmentTimestamp: z.string().datetime().optional(),
  /** Key insights for system learning */
  insights: z.array(z.string()).default([]),
  /** Whether analysis was successful */
  success: z.boolean(),
  /** Error message if analysis failed */
  error: z.string().optional(),
})

export type LeakageResult = z.infer<typeof LeakageResultSchema>

/**
 * Known unknowns - things that were explicitly identified as unknowns during planning.
 * These should NOT count as leakage since they were anticipated.
 */
export const KnownUnknownSchema = z.object({
  /** ID of the known unknown */
  id: z.string().min(1),
  /** Description of what is unknown */
  description: z.string().min(1),
  /** When it was identified */
  identifiedAt: z.string().datetime().optional(),
  /** Whether it has been resolved */
  resolved: z.boolean().default(false),
})

export type KnownUnknown = z.infer<typeof KnownUnknownSchema>

/**
 * Configuration for leakage tracking.
 */
export const LeakageConfigSchema = z.object({
  /** Patterns that indicate a clarification is actually leakage (requirement discovery) */
  leakagePatterns: z
    .array(z.string())
    .default([
      'didn.t know',
      'wasn.t aware',
      'missed',
      'forgot',
      'overlooked',
      'not mentioned',
      'not specified',
      'not covered',
      'new requirement',
      'discovered',
      'just realized',
      'turns out',
      'unexpected',
      'unforeseen',
      'surprise',
      'edge case',
      'didn.t consider',
      'wasn.t considered',
      'need to add',
      'needs to handle',
      'also needs',
      'additionally',
      'found an issue',
      'found a bug',
      'breaking change',
    ]),
  /** Minimum leakage events for meaningful analysis */
  minLeakageForAnalysis: z.number().int().positive().default(1),
  /** High severity threshold (rate per story) */
  highSeverityThreshold: z.number().positive().default(1),
  /** Critical leakage threshold (count) */
  criticalThreshold: z.number().int().positive().default(3),
})

export type LeakageConfig = z.infer<typeof LeakageConfigSchema>

/**
 * Post-commitment phases where leakage can occur.
 */
const POST_COMMITMENT_PHASES: readonly WorkflowPhase[] = [
  'implementation',
  'verification',
  'complete',
]

/**
 * Leakage ID counter for generating unique IDs.
 */
let leakageIdCounter = 0

/**
 * Generates a unique leakage event ID.
 */
function generateLeakageId(storyId: string): string {
  leakageIdCounter += 1
  const timestamp = Date.now().toString(36)
  return `LEAK-${storyId}-${timestamp}-${leakageIdCounter.toString().padStart(4, '0')}`
}

/**
 * Checks if a phase is post-commitment.
 */
function isPostCommitmentPhase(phase: WorkflowPhase): boolean {
  return POST_COMMITMENT_PHASES.includes(phase)
}

/**
 * Determines severity of a leakage event based on description and phase.
 */
function determineSeverity(description: string, phase: WorkflowPhase): LeakageSeverity {
  const lowerDesc = description.toLowerCase()

  // Critical keywords
  if (
    lowerDesc.includes('security') ||
    lowerDesc.includes('data loss') ||
    lowerDesc.includes('breaking') ||
    lowerDesc.includes('critical')
  ) {
    return 'critical'
  }

  // High severity keywords
  if (
    lowerDesc.includes('major') ||
    lowerDesc.includes('significant') ||
    lowerDesc.includes('blocker') ||
    lowerDesc.includes('regression')
  ) {
    return 'high'
  }

  // Post-dev leakage is inherently more severe
  if (phase === 'verification' || phase === 'complete') {
    return 'high'
  }

  // Medium keywords
  if (lowerDesc.includes('need') || lowerDesc.includes('missing') || lowerDesc.includes('must')) {
    return 'medium'
  }

  return 'low'
}

/**
 * Determines category of a leakage event based on description.
 */
function determineCategory(description: string): LeakageCategory {
  const lowerDesc = description.toLowerCase()

  if (
    lowerDesc.includes('security') ||
    lowerDesc.includes('auth') ||
    lowerDesc.includes('permission')
  ) {
    return 'security'
  }
  if (
    lowerDesc.includes('accessib') ||
    lowerDesc.includes('a11y') ||
    lowerDesc.includes('screen reader')
  ) {
    return 'accessibility'
  }
  if (
    lowerDesc.includes('performance') ||
    lowerDesc.includes('slow') ||
    lowerDesc.includes('optimize')
  ) {
    return 'performance'
  }
  if (
    lowerDesc.includes('integrat') ||
    lowerDesc.includes('api') ||
    lowerDesc.includes('external')
  ) {
    return 'integration'
  }
  if (
    lowerDesc.includes('depend') ||
    lowerDesc.includes('library') ||
    lowerDesc.includes('package')
  ) {
    return 'dependency'
  }
  if (
    lowerDesc.includes('edge case') ||
    lowerDesc.includes('corner case') ||
    lowerDesc.includes('special case')
  ) {
    return 'edge_case'
  }
  if (
    lowerDesc.includes('constraint') ||
    lowerDesc.includes('limit') ||
    lowerDesc.includes('restriction')
  ) {
    return 'constraint'
  }
  if (lowerDesc.includes('require') || lowerDesc.includes('need') || lowerDesc.includes('must')) {
    return 'requirement'
  }

  return 'other'
}

/**
 * Checks if event content matches leakage patterns.
 */
function matchesLeakagePatterns(content: string, patterns: string[]): boolean {
  const lowerContent = content.toLowerCase()
  return patterns.some(pattern => {
    const regex = new RegExp(pattern, 'i')
    return regex.test(lowerContent)
  })
}

/**
 * Checks if an event describes something that was a known unknown.
 */
function isKnownUnknown(event: WorkflowEvent, knownUnknowns: readonly KnownUnknown[]): boolean {
  if (!knownUnknowns || knownUnknowns.length === 0) {
    return false
  }

  const eventContent = `${event.details.description} ${JSON.stringify(event.details.metadata || {})}`
  const lowerContent = eventContent.toLowerCase()

  // Check if any known unknown matches this event
  return knownUnknowns.some(ku => {
    const kuDesc = ku.description.toLowerCase()
    // Simple substring match - could be made more sophisticated
    return (
      lowerContent.includes(kuDesc) ||
      kuDesc.includes(event.details.description.toLowerCase().substring(0, 50))
    )
  })
}

/**
 * Detects unknown leakage from workflow events.
 * Identifies clarification and scope change events that indicate discovery
 * of unknowns after commitment.
 *
 * @param events - Array of workflow events
 * @param knownUnknowns - Array of known unknowns to exclude from leakage
 * @param config - Configuration with leakage patterns
 * @returns Array of detected leakage events
 */
export function detectUnknownLeakage(
  events: readonly WorkflowEvent[],
  knownUnknowns: readonly KnownUnknown[] = [],
  config: LeakageConfig = LeakageConfigSchema.parse({}),
): LeakageEvent[] {
  if (!events || events.length === 0) {
    return []
  }

  const leakageEvents: LeakageEvent[] = []

  // Find commitment timestamp
  const commitmentEvent = events.find(e => e.type === 'commitment')
  const commitmentTime = commitmentEvent ? new Date(commitmentEvent.timestamp).getTime() : null

  for (const event of events) {
    // Only consider clarification and scope_change events
    if (event.type !== 'clarification' && event.type !== 'scope_change') {
      continue
    }

    // Must be post-commitment
    const isPostCommitment =
      isPostCommitmentPhase(event.phase) ||
      (commitmentTime !== null && new Date(event.timestamp).getTime() > commitmentTime)

    if (!isPostCommitment) {
      continue
    }

    // Skip if this was a known unknown
    if (isKnownUnknown(event, knownUnknowns)) {
      continue
    }

    // Check if content matches leakage patterns
    const eventContent = `${event.details.description} ${JSON.stringify(event.details.metadata || {})}`
    if (!matchesLeakagePatterns(eventContent, config.leakagePatterns)) {
      continue
    }

    // This is a leakage event
    leakageEvents.push({
      id: generateLeakageId(event.storyId),
      storyId: event.storyId,
      unknownDescription: event.details.description,
      discoveredPhase: event.phase,
      timestamp: event.timestamp,
      category: determineCategory(event.details.description),
      severity: determineSeverity(event.details.description, event.phase),
      sourceEventId: event.id,
      addressed: false,
    })
  }

  return leakageEvents
}

/**
 * Calculates aggregated leakage metrics from leakage events.
 *
 * @param leakageEvents - Array of leakage events
 * @returns Aggregated metrics
 */
export function calculateLeakageMetrics(leakageEvents: readonly LeakageEvent[]): LeakageMetrics {
  const count = leakageEvents.length

  const byPhase = {
    implementation: 0,
    verification: 0,
    complete: 0,
  }

  const byCategory: Record<LeakageCategory, number> = {
    requirement: 0,
    constraint: 0,
    dependency: 0,
    edge_case: 0,
    integration: 0,
    performance: 0,
    security: 0,
    accessibility: 0,
    other: 0,
  }

  const bySeverity = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  }

  let addressedCount = 0

  for (const event of leakageEvents) {
    // By phase
    if (event.discoveredPhase === 'implementation') {
      byPhase.implementation++
    } else if (event.discoveredPhase === 'verification') {
      byPhase.verification++
    } else if (event.discoveredPhase === 'complete') {
      byPhase.complete++
    }

    // By category
    byCategory[event.category]++

    // By severity
    bySeverity[event.severity]++

    // Addressed
    if (event.addressed) {
      addressedCount++
    }
  }

  const highSeverityCount = bySeverity.high + bySeverity.critical

  return {
    count,
    byPhase,
    byCategory,
    bySeverity,
    rate: count, // Rate per story (single story analysis)
    highSeverityRate: highSeverityCount,
    addressedRate: count > 0 ? addressedCount / count : 0,
  }
}

/**
 * Generates insights from leakage metrics for system learning.
 */
function generateLeakageInsights(
  metrics: LeakageMetrics,
  hasCommitment: boolean,
  config: LeakageConfig,
): string[] {
  const insights: string[] = []

  if (!hasCommitment) {
    insights.push('No commitment event found - leakage tracking requires commitment boundary')
    return insights
  }

  if (metrics.count === 0) {
    insights.push('Excellent: Zero post-commitment leakage - planning was comprehensive')
    return insights
  }

  // Main leakage insight
  insights.push(
    `${metrics.count} unknown(s) leaked post-commitment - indicates upstream planning gaps`,
  )

  // Severity distribution
  if (metrics.bySeverity.critical > 0) {
    insights.push(
      `CRITICAL: ${metrics.bySeverity.critical} critical leakage event(s) - immediate attention required`,
    )
  }
  if (metrics.highSeverityRate >= config.highSeverityThreshold) {
    insights.push(
      `${metrics.highSeverityRate} high-severity leakage events - planning process needs improvement`,
    )
  }

  // Phase distribution
  if (metrics.byPhase.verification > 0) {
    insights.push(
      `${metrics.byPhase.verification} unknowns discovered in QA - ` +
        `requirements validation should happen earlier`,
    )
  }
  if (metrics.byPhase.complete > 0) {
    insights.push(
      `${metrics.byPhase.complete} unknowns discovered post-dev-complete - ` +
        `significant planning breakdown`,
    )
  }

  // Category insights - find most common
  const categoryEntries = Object.entries(metrics.byCategory)
    .filter(entry => entry[1] > 0)
    .sort((a, b) => b[1] - a[1])

  if (categoryEntries.length > 0) {
    const topCategory = categoryEntries[0]
    insights.push(`Most common leakage type: ${topCategory[0]} (${topCategory[1]} occurrences)`)
  }

  // Critical threshold warning
  if (metrics.count >= config.criticalThreshold) {
    insights.push(
      `Leakage count (${metrics.count}) exceeds critical threshold (${config.criticalThreshold}) - ` +
        `planning process review recommended`,
    )
  }

  return insights
}

/**
 * Main function to track unknown leakage from workflow events.
 *
 * @param storyId - Story ID being analyzed
 * @param events - Array of workflow events
 * @param knownUnknowns - Optional array of known unknowns to exclude
 * @param config - Configuration options
 * @returns Complete leakage tracking result
 */
export async function trackLeakage(
  storyId: string,
  events: readonly WorkflowEvent[] | null | undefined,
  knownUnknowns: readonly KnownUnknown[] = [],
  config: Partial<LeakageConfig> = {},
): Promise<LeakageResult> {
  const fullConfig = LeakageConfigSchema.parse(config)
  const now = new Date().toISOString()

  // Handle missing input
  if (!events || events.length === 0) {
    return {
      storyId,
      analyzedAt: now,
      metrics: {
        count: 0,
        byPhase: { implementation: 0, verification: 0, complete: 0 },
        byCategory: {
          requirement: 0,
          constraint: 0,
          dependency: 0,
          edge_case: 0,
          integration: 0,
          performance: 0,
          security: 0,
          accessibility: 0,
          other: 0,
        },
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        rate: 0,
        highSeverityRate: 0,
        addressedRate: 0,
      },
      events: [],
      totalEventsAnalyzed: 0,
      hasCommitment: false,
      insights: ['No events available for leakage analysis'],
      success: false,
      error: 'No events provided for leakage tracking',
    }
  }

  // Find commitment
  const commitmentEvent = events.find(e => e.type === 'commitment')
  const hasCommitment = commitmentEvent !== undefined
  const commitmentTimestamp = commitmentEvent?.timestamp

  // Detect leakage events
  const leakageEvents = detectUnknownLeakage(events, knownUnknowns, fullConfig)

  // Calculate metrics
  const metrics = calculateLeakageMetrics(leakageEvents)

  // Generate insights
  const insights = generateLeakageInsights(metrics, hasCommitment, fullConfig)

  return {
    storyId,
    analyzedAt: now,
    metrics,
    events: leakageEvents,
    totalEventsAnalyzed: events.length,
    hasCommitment,
    commitmentTimestamp,
    insights,
    success: true,
  }
}

/**
 * Extended graph state with leakage tracking.
 */
export interface GraphStateWithLeakage extends GraphState {
  /** Collected workflow events (from collect-events node) */
  collectedEvents?: WorkflowEvent[]
  /** Known unknowns identified during planning */
  knownUnknowns?: KnownUnknown[]
  /** Leakage tracking result */
  leakageResult?: LeakageResult | null
  /** Whether leakage tracking was successful */
  leakageTracked?: boolean
}

/**
 * Unknown Leakage Tracker node implementation.
 *
 * Detects unknowns discovered after commitment for system learning.
 * Any leakage indicates upstream planning failure.
 *
 * IMPORTANT: These metrics are for SYSTEM LEARNING only, not performance evaluation.
 *
 * @param state - Current graph state (must have collected events)
 * @returns Partial state update with leakage result
 */
export const trackLeakageNode = createToolNode(
  'track_leakage',
  async (state: GraphState): Promise<Partial<GraphStateWithLeakage>> => {
    const stateWithEvents = state as GraphStateWithLeakage

    const storyId = stateWithEvents.storyId || 'unknown'
    const events = stateWithEvents.collectedEvents
    const knownUnknowns = stateWithEvents.knownUnknowns || []

    const result = await trackLeakage(storyId, events, knownUnknowns)

    return updateState({
      leakageResult: result,
      leakageTracked: result.success,
    } as Partial<GraphStateWithLeakage>)
  },
)

/**
 * Creates a leakage tracker node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createTrackLeakageNode(config: Partial<LeakageConfig> = {}) {
  return createToolNode(
    'track_leakage',
    async (state: GraphState): Promise<Partial<GraphStateWithLeakage>> => {
      const stateWithEvents = state as GraphStateWithLeakage

      const storyId = stateWithEvents.storyId || 'unknown'
      const events = stateWithEvents.collectedEvents
      const knownUnknowns = stateWithEvents.knownUnknowns || []

      const result = await trackLeakage(storyId, events, knownUnknowns, config)

      return updateState({
        leakageResult: result,
        leakageTracked: result.success,
      } as Partial<GraphStateWithLeakage>)
    },
  )
}
