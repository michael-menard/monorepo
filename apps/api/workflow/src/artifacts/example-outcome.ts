import { z } from 'zod'

/**
 * Example Outcome Schema
 *
 * Tracks the effectiveness of examples over time to measure which examples
 * are most valuable for agent learning and decision-making.
 *
 * This schema supports the WINT learning loop by enabling data-driven
 * curation of the example library.
 *
 * Version: 1.0.0
 * Story: WINT-0180
 */

/**
 * Outcome event type - what happened with this example
 */
export const OutcomeEventTypeSchema = z.enum([
  'queried', // Example was retrieved in a query
  'followed', // Agent followed the example's guidance
  'ignored', // Agent saw but chose not to follow
  'success', // Following the example led to success
  'failure', // Following the example led to failure
  'deprecated', // Example was deprecated
])

export type OutcomeEventType = z.infer<typeof OutcomeEventTypeSchema>

/**
 * Single outcome event - a discrete interaction with an example
 */
export const ExampleOutcomeEventSchema = z.object({
  // Event identification
  event_id: z.string(),
  example_id: z.string(), // Foreign key to ExampleEntry

  // Event metadata
  event_type: OutcomeEventTypeSchema,
  timestamp: z.string().datetime(),

  // Context of the event
  story_id: z.string().nullable().optional(), // Which story was being worked on
  agent_id: z.string().nullable().optional(), // Which agent used this example
  decision_id: z.string().nullable().optional(), // Link to wint.agentDecisions if applicable

  // Outcome details
  was_successful: z.boolean().nullable().optional(), // Did following this example work?
  confidence: z.number().min(0).max(1).nullable().optional(), // Agent's confidence in using this

  // Additional context
  notes: z.string().nullable().optional(),
})

export type ExampleOutcomeEvent = z.infer<typeof ExampleOutcomeEventSchema>

/**
 * Aggregated outcome metrics for an example
 *
 * This is the summary view of all outcome events for a single example.
 * It can be computed from ExampleOutcomeEvent records or stored denormalized
 * for performance.
 */
export const ExampleOutcomeMetricsSchema = z.object({
  // Example reference
  example_id: z.string(),

  // Usage metrics
  times_referenced: z.number().int().min(0).default(0), // How many times queried
  times_followed: z.number().int().min(0).default(0), // How many times agent followed it
  times_ignored: z.number().int().min(0).default(0), // How many times agent saw but ignored

  // Effectiveness metrics
  success_count: z.number().int().min(0).default(0), // Times it led to success
  failure_count: z.number().int().min(0).default(0), // Times it led to failure
  success_rate: z.number().min(0).max(1).nullable().optional(), // success / (success + failure)

  // Follow rate - how often agents choose to follow this example when they see it
  follow_rate: z.number().min(0).max(1).nullable().optional(), // followed / referenced

  // Temporal tracking
  first_used_at: z.string().datetime().nullable().optional(),
  last_used_at: z.string().datetime().nullable().optional(),
  last_updated_at: z.string().datetime(),

  // Agent diversity - how many unique agents have used this
  unique_agents: z.number().int().min(0).default(0),

  // Story diversity - how many unique stories referenced this
  unique_stories: z.number().int().min(0).default(0),
})

export type ExampleOutcomeMetrics = z.infer<typeof ExampleOutcomeMetricsSchema>

/**
 * Create a new outcome event
 */
export function createOutcomeEvent(params: {
  example_id: string
  event_type: OutcomeEventType
  story_id?: string | null
  agent_id?: string | null
  decision_id?: string | null
  was_successful?: boolean | null
  confidence?: number | null
  notes?: string | null
}): ExampleOutcomeEvent {
  return {
    event_id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    example_id: params.example_id,
    event_type: params.event_type,
    timestamp: new Date().toISOString(),
    story_id: params.story_id || null,
    agent_id: params.agent_id || null,
    decision_id: params.decision_id || null,
    was_successful: params.was_successful || null,
    confidence: params.confidence || null,
    notes: params.notes || null,
  }
}

/**
 * Initialize empty outcome metrics for a new example
 */
export function createOutcomeMetrics(exampleId: string): ExampleOutcomeMetrics {
  return {
    example_id: exampleId,
    times_referenced: 0,
    times_followed: 0,
    times_ignored: 0,
    success_count: 0,
    failure_count: 0,
    success_rate: null,
    follow_rate: null,
    first_used_at: null,
    last_used_at: null,
    last_updated_at: new Date().toISOString(),
    unique_agents: 0,
    unique_stories: 0,
  }
}

/**
 * Update outcome metrics after a new event
 *
 * This is a pure function that recalculates metrics based on the new event.
 * In practice, you would either:
 * 1. Store events and compute metrics on-demand
 * 2. Store metrics denormalized and update them incrementally
 */
export function updateOutcomeMetrics(
  current: ExampleOutcomeMetrics,
  event: ExampleOutcomeEvent,
): ExampleOutcomeMetrics {
  const now = new Date().toISOString()

  // Update counts based on event type
  let times_referenced = current.times_referenced
  let times_followed = current.times_followed
  let times_ignored = current.times_ignored
  let success_count = current.success_count
  let failure_count = current.failure_count

  if (event.event_type === 'queried') {
    times_referenced += 1
  }

  if (event.event_type === 'followed') {
    times_followed += 1
  }

  if (event.event_type === 'ignored') {
    times_ignored += 1
  }

  if (event.event_type === 'success') {
    success_count += 1
  }

  if (event.event_type === 'failure') {
    failure_count += 1
  }

  // Calculate rates
  const total_outcomes = success_count + failure_count
  const success_rate = total_outcomes > 0 ? success_count / total_outcomes : null

  const follow_rate = times_referenced > 0 ? times_followed / times_referenced : null

  // Update temporal tracking
  const first_used_at = current.first_used_at || event.timestamp
  const last_used_at = event.timestamp

  return {
    ...current,
    times_referenced,
    times_followed,
    times_ignored,
    success_count,
    failure_count,
    success_rate,
    follow_rate,
    first_used_at,
    last_used_at,
    last_updated_at: now,
  }
}

/**
 * Calculate effectiveness score (0-100)
 *
 * Composite metric combining success rate and usage frequency.
 * Higher score = more effective example.
 */
export function calculateEffectivenessScore(metrics: ExampleOutcomeMetrics): number {
  // If no usage data, return 0
  if (metrics.times_referenced === 0) {
    return 0
  }

  // Weight success rate heavily (70%)
  const successWeight = 0.7
  const successScore = (metrics.success_rate || 0) * 100

  // Weight follow rate moderately (30%)
  const followWeight = 0.3
  const followScore = (metrics.follow_rate || 0) * 100

  const rawScore = successWeight * successScore + followWeight * followScore

  // Boost score slightly for high usage (popularity bonus)
  const usageBonus = Math.min(10, Math.log10(metrics.times_referenced) * 2)

  return Math.min(100, Math.round(rawScore + usageBonus))
}
