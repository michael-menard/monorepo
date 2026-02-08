/**
 * Analytics Operations
 *
 * MCP operations for analytics and insights about story workflows.
 * Provides:
 * - kb_get_token_summary: Token usage aggregation
 * - kb_get_bottleneck_analysis: Phase dwell times and stuck stories
 * - kb_get_churn_analysis: Iteration counts and feature churn
 *
 * @see Implementation plan for analytics tools
 */

import { z } from 'zod'
import { eq, and, gte, lte, sql, desc, asc, type SQL } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'
import { storyTokenUsage, stories } from '../db/schema.js'
import { TokenGroupBySchema } from '../__types__/index.js'

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Input schema for kb_get_token_summary tool.
 */
export const KbGetTokenSummaryInputSchema = z.object({
  /** Grouping dimension */
  group_by: TokenGroupBySchema,

  /** Filter by feature (optional) */
  feature: z.string().optional(),

  /** Filter by story ID (optional) */
  story_id: z.string().optional(),

  /** Start date for time range (optional) */
  start_date: z.coerce.date().optional(),

  /** End date for time range (optional) */
  end_date: z.coerce.date().optional(),

  /** Maximum results (1-100, default 20) */
  limit: z.number().int().min(1).max(100).optional().default(20),
})

export type KbGetTokenSummaryInput = z.infer<typeof KbGetTokenSummaryInputSchema>

/**
 * Input schema for kb_get_bottleneck_analysis tool.
 */
export const KbGetBottleneckAnalysisInputSchema = z.object({
  /** Days threshold for "stuck" stories (default 7) */
  stuck_threshold_days: z.number().int().min(1).optional().default(7),

  /** Filter by feature (optional) */
  feature: z.string().optional(),

  /** Maximum stuck stories to return (default 20) */
  limit: z.number().int().min(1).max(100).optional().default(20),
})

export type KbGetBottleneckAnalysisInput = z.infer<typeof KbGetBottleneckAnalysisInputSchema>

/**
 * Input schema for kb_get_churn_analysis tool.
 */
export const KbGetChurnAnalysisInputSchema = z.object({
  /** Minimum iterations to be considered high churn (default 2) */
  min_iterations: z.number().int().min(1).optional().default(2),

  /** Filter by feature (optional) */
  feature: z.string().optional(),

  /** Maximum results (default 20) */
  limit: z.number().int().min(1).max(100).optional().default(20),
})

export type KbGetChurnAnalysisInput = z.infer<typeof KbGetChurnAnalysisInputSchema>

// ============================================================================
// Dependencies
// ============================================================================

export interface AnalyticsDeps {
  db: NodePgDatabase<typeof schema>
}

// ============================================================================
// Token Summary
// ============================================================================

/**
 * Get token usage summary grouped by specified dimension.
 *
 * @param deps - Database dependencies
 * @param input - Grouping and filter options
 * @returns Token usage breakdown
 */
export async function kb_get_token_summary(
  deps: AnalyticsDeps,
  input: KbGetTokenSummaryInput,
): Promise<{
  results: {
    group: string
    input_tokens: number
    output_tokens: number
    total_tokens: number
    count: number
  }[]
  total: number
  message: string
}> {
  const validated = KbGetTokenSummaryInputSchema.parse(input)

  // Build WHERE condition
  let whereCondition: SQL<unknown> | undefined
  const conditions: SQL<unknown>[] = []

  if (validated.feature) {
    conditions.push(eq(storyTokenUsage.feature, validated.feature))
  }
  if (validated.story_id) {
    conditions.push(eq(storyTokenUsage.storyId, validated.story_id))
  }
  if (validated.start_date) {
    conditions.push(gte(storyTokenUsage.loggedAt, validated.start_date))
  }
  if (validated.end_date) {
    conditions.push(lte(storyTokenUsage.loggedAt, validated.end_date))
  }

  if (conditions.length === 1) {
    whereCondition = conditions[0]
  } else if (conditions.length > 1) {
    whereCondition = and(...conditions)
  }

  // Determine grouping column
  const groupColumn =
    validated.group_by === 'phase'
      ? storyTokenUsage.phase
      : validated.group_by === 'feature'
        ? storyTokenUsage.feature
        : validated.group_by === 'story'
          ? storyTokenUsage.storyId
          : storyTokenUsage.agent

  // Execute aggregation query
  const result = await deps.db
    .select({
      group: groupColumn,
      inputTokens: sql<number>`sum(${storyTokenUsage.inputTokens})::int`,
      outputTokens: sql<number>`sum(${storyTokenUsage.outputTokens})::int`,
      totalTokens: sql<number>`sum(${storyTokenUsage.totalTokens})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(storyTokenUsage)
    .where(whereCondition)
    .groupBy(groupColumn)
    .orderBy(desc(sql`sum(${storyTokenUsage.totalTokens})`))
    .limit(validated.limit)

  // Calculate total across all groups
  const total = result.reduce((sum, r) => sum + (r.totalTokens ?? 0), 0)

  return {
    results: result.map(r => ({
      group: r.group ?? 'unknown',
      input_tokens: r.inputTokens ?? 0,
      output_tokens: r.outputTokens ?? 0,
      total_tokens: r.totalTokens ?? 0,
      count: r.count ?? 0,
    })),
    total,
    message: `Token summary grouped by ${validated.group_by}: ${total} total tokens`,
  }
}

// ============================================================================
// Bottleneck Analysis
// ============================================================================

/**
 * Analyze workflow bottlenecks: phase dwell times and stuck stories.
 *
 * @param deps - Database dependencies
 * @param input - Analysis options
 * @returns Bottleneck analysis results
 */
export async function kb_get_bottleneck_analysis(
  deps: AnalyticsDeps,
  input: KbGetBottleneckAnalysisInput,
): Promise<{
  phase_distribution: { phase: string; count: number }[]
  stuck_stories: {
    story_id: string
    phase: string | null
    state: string | null
    days_stuck: number
  }[]
  state_distribution: { state: string; count: number }[]
  message: string
}> {
  const validated = KbGetBottleneckAnalysisInputSchema.parse(input)

  // Active stories condition
  const activeCondition = sql`${stories.state} NOT IN ('completed', 'cancelled', 'deferred')`

  // Build phase distribution condition
  const phaseDistCondition = validated.feature
    ? and(eq(stories.feature, validated.feature), activeCondition)
    : activeCondition

  // Get phase distribution for active stories
  const phaseDistribution = await deps.db
    .select({
      phase: stories.phase,
      count: sql<number>`count(*)::int`,
    })
    .from(stories)
    .where(phaseDistCondition)
    .groupBy(stories.phase)
    .orderBy(desc(sql`count(*)`))

  // Build state distribution condition
  const stateDistCondition = validated.feature ? eq(stories.feature, validated.feature) : undefined

  // Get state distribution
  const stateDistribution = await deps.db
    .select({
      state: stories.state,
      count: sql<number>`count(*)::int`,
    })
    .from(stories)
    .where(stateDistCondition)
    .groupBy(stories.state)
    .orderBy(desc(sql`count(*)`))

  // Find stuck stories (not updated in threshold days)
  const thresholdDate = new Date()
  thresholdDate.setDate(thresholdDate.getDate() - validated.stuck_threshold_days)

  // Build stuck stories condition
  const stuckConditions = [lte(stories.updatedAt, thresholdDate), activeCondition]
  if (validated.feature) {
    stuckConditions.push(eq(stories.feature, validated.feature))
  }
  const stuckCondition = and(...stuckConditions)

  const stuckStories = await deps.db
    .select({
      storyId: stories.storyId,
      phase: stories.phase,
      state: stories.state,
      updatedAt: stories.updatedAt,
    })
    .from(stories)
    .where(stuckCondition)
    .orderBy(asc(stories.updatedAt))
    .limit(validated.limit)

  // Calculate days stuck for each story
  const now = Date.now()
  const stuckWithDays = stuckStories.map(s => ({
    story_id: s.storyId,
    phase: s.phase,
    state: s.state,
    days_stuck: Math.floor((now - s.updatedAt.getTime()) / (1000 * 60 * 60 * 24)),
  }))

  return {
    phase_distribution: phaseDistribution.map(p => ({
      phase: p.phase ?? 'unknown',
      count: p.count ?? 0,
    })),
    stuck_stories: stuckWithDays,
    state_distribution: stateDistribution.map(s => ({
      state: s.state ?? 'unknown',
      count: s.count ?? 0,
    })),
    message: `Found ${stuckWithDays.length} stuck stories (>${validated.stuck_threshold_days} days)`,
  }
}

// ============================================================================
// Churn Analysis
// ============================================================================

/**
 * Analyze story churn: iteration counts and feature patterns.
 *
 * @param deps - Database dependencies
 * @param input - Analysis options
 * @returns Churn analysis results
 */
export async function kb_get_churn_analysis(
  deps: AnalyticsDeps,
  input: KbGetChurnAnalysisInput,
): Promise<{
  high_churn_stories: {
    story_id: string
    iteration: number
    feature: string | null
    phase: string | null
    state: string | null
  }[]
  feature_averages: {
    feature: string
    avg_iterations: number
    story_count: number
    max_iterations: number
  }[]
  message: string
}> {
  const validated = KbGetChurnAnalysisInputSchema.parse(input)

  // Build high churn condition
  const iterationCondition = gte(stories.iteration, validated.min_iterations)
  const highChurnCondition = validated.feature
    ? and(eq(stories.feature, validated.feature), iterationCondition)
    : iterationCondition

  // Find high-churn stories (iteration >= threshold)
  const highChurnStories = await deps.db
    .select({
      storyId: stories.storyId,
      iteration: stories.iteration,
      feature: stories.feature,
      phase: stories.phase,
      state: stories.state,
    })
    .from(stories)
    .where(highChurnCondition)
    .orderBy(desc(stories.iteration))
    .limit(validated.limit)

  // Build feature averages condition
  const featureCondition = validated.feature ? eq(stories.feature, validated.feature) : undefined

  // Get average iterations by feature
  const featureAverages = await deps.db
    .select({
      feature: stories.feature,
      avgIterations: sql<number>`avg(${stories.iteration})::float`,
      storyCount: sql<number>`count(*)::int`,
      maxIterations: sql<number>`max(${stories.iteration})::int`,
    })
    .from(stories)
    .where(featureCondition)
    .groupBy(stories.feature)
    .orderBy(desc(sql`avg(${stories.iteration})`))

  return {
    high_churn_stories: highChurnStories.map(s => ({
      story_id: s.storyId,
      iteration: s.iteration ?? 0,
      feature: s.feature,
      phase: s.phase,
      state: s.state,
    })),
    feature_averages: featureAverages.map(f => ({
      feature: f.feature ?? 'unknown',
      avg_iterations: Math.round((f.avgIterations ?? 0) * 100) / 100,
      story_count: f.storyCount ?? 0,
      max_iterations: f.maxIterations ?? 0,
    })),
    message: `Found ${highChurnStories.length} high-churn stories (>=${validated.min_iterations} iterations)`,
  }
}
