/**
 * Analytics Operations
 *
 * MCP operations for analytics and insights about story workflows.
 * Provides:
 * - kb_get_token_summary: Token usage aggregation
 * - kb_get_bottleneck_analysis: Phase dwell times and stuck stories
 * - kb_get_churn_analysis: Iteration counts and feature churn
 * - kb_get_scoreboard: Composite workflow health scoreboard
 *
 * @see Implementation plan for analytics tools
 */

import { z } from 'zod'
import { eq, and, gte, lte, sql, desc, asc, isNotNull, type SQL } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as schema from '../db/schema.js'
import { storyTokenUsage, stories, storyOutcomes, agentInvocations } from '../db/schema.js'
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

export const KbGetScoreboardInputSchema = z.object({
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  feature: z.string().optional(),
})

export type KbGetScoreboardInput = z.infer<typeof KbGetScoreboardInputSchema>

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

  // Get state distribution for active stories (state replaced phase column)
  const phaseDistribution = await deps.db
    .select({
      phase: stories.state,
      count: sql<number>`count(*)::int`,
    })
    .from(stories)
    .where(phaseDistCondition)
    .groupBy(stories.state)
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
      phase: stories.state,
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

  // Derive iteration count from storyOutcomes (reviewIterations + qaIterations)
  // phase/iteration columns were removed from stories table
  const iterationExpr = sql<number>`coalesce(${storyOutcomes.reviewIterations}, 0) + coalesce(${storyOutcomes.qaIterations}, 0)`

  // Build high churn condition
  const highChurnConditions: SQL<unknown>[] = [gte(iterationExpr, validated.min_iterations)]
  if (validated.feature) {
    highChurnConditions.push(eq(stories.feature, validated.feature))
  }

  // Find high-churn stories (total iterations >= threshold)
  const highChurnStories = await deps.db
    .select({
      storyId: stories.storyId,
      iteration: iterationExpr,
      feature: stories.feature,
      phase: stories.state,
      state: stories.state,
    })
    .from(stories)
    .innerJoin(storyOutcomes, eq(stories.storyId, storyOutcomes.storyId))
    .where(and(...highChurnConditions))
    .orderBy(desc(iterationExpr))
    .limit(validated.limit)

  // Build feature averages condition
  const featureCondition = validated.feature ? eq(stories.feature, validated.feature) : undefined

  // Get average iterations by feature (from stories with outcomes)
  const featureAverages = await deps.db
    .select({
      feature: stories.feature,
      avgIterations: sql<number>`avg(${iterationExpr})::float`,
      storyCount: sql<number>`count(*)::int`,
      maxIterations: sql<number>`max(${iterationExpr})::int`,
    })
    .from(stories)
    .innerJoin(storyOutcomes, eq(stories.storyId, storyOutcomes.storyId))
    .where(featureCondition)
    .groupBy(stories.feature)
    .orderBy(desc(sql`avg(${iterationExpr})`))

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

// ============================================================================
// Scoreboard
// ============================================================================

/**
 * Get composite workflow health scoreboard with 5 key metrics.
 *
 * @param deps - Database dependencies
 * @param input - Optional date range and feature filter
 * @returns Scoreboard with throughput, cycle time, first-pass success, cost efficiency, and agent reliability
 */
export async function kb_get_scoreboard(
  deps: AnalyticsDeps,
  input: KbGetScoreboardInput,
): Promise<{
  throughput: {
    stories_completed_per_week: number
    total_completed: number
    weeks_observed: number
  }
  cycle_time: {
    avg_cycle_time_days: number | null
    min_cycle_time_days: number | null
    max_cycle_time_days: number | null
    sample_size: number
  }
  first_pass_success: {
    total_completed: number
    first_pass_count: number
    first_pass_rate: number
  }
  cost_efficiency: {
    avg_cost_per_story: number | null
    total_cost: number
    story_count: number
  }
  agent_reliability: {
    agents: Array<{
      agent_name: string
      total_invocations: number
      successful_invocations: number
      success_rate: number
    }>
  }
  generated_at: string
  message: string
}> {
  const validated = KbGetScoreboardInputSchema.parse(input)

  // ── Metric 1: Throughput ──────────────────────────────────────────────────

  const throughputConditions: SQL<unknown>[] = [
    sql`${stories.state} IN ('UAT', 'completed')`,
    isNotNull(stories.completedAt),
  ]
  if (validated.feature) {
    throughputConditions.push(eq(stories.feature, validated.feature))
  }
  if (validated.start_date) {
    throughputConditions.push(gte(stories.completedAt, validated.start_date))
  }
  if (validated.end_date) {
    throughputConditions.push(lte(stories.completedAt, validated.end_date))
  }

  const throughputResult = await deps.db
    .select({
      total: sql<number>`count(*)::int`,
      minCompletedAt: sql<Date | null>`min(${stories.completedAt})`,
      maxCompletedAt: sql<Date | null>`max(${stories.completedAt})`,
    })
    .from(stories)
    .where(and(...throughputConditions))

  const throughputRow = throughputResult[0]
  const totalCompleted = throughputRow?.total ?? 0
  const minDate = throughputRow?.minCompletedAt
  const maxDate = throughputRow?.maxCompletedAt

  let weeksObserved = 0
  let storiesPerWeek = 0

  if (minDate && maxDate && totalCompleted > 0) {
    const spanMs = new Date(maxDate).getTime() - new Date(minDate).getTime()
    weeksObserved = Math.ceil(spanMs / 604_800_000) || 1
    storiesPerWeek = Math.round((totalCompleted / weeksObserved) * 100) / 100
  }

  // ── Metric 2: Cycle Time ─────────────────────────────────────────────────

  const cycleConditions: SQL<unknown>[] = [
    isNotNull(stories.startedAt),
    isNotNull(stories.completedAt),
    sql`${stories.state} IN ('UAT', 'completed')`,
  ]
  if (validated.feature) {
    cycleConditions.push(eq(stories.feature, validated.feature))
  }
  if (validated.start_date) {
    cycleConditions.push(gte(stories.completedAt, validated.start_date))
  }
  if (validated.end_date) {
    cycleConditions.push(lte(stories.completedAt, validated.end_date))
  }

  const cycleResult = await deps.db
    .select({
      avgDays: sql<
        number | null
      >`round(avg(extract(epoch from (${stories.completedAt} - ${stories.startedAt})) / 86400.0)::numeric, 2)::float`,
      minDays: sql<
        number | null
      >`round(min(extract(epoch from (${stories.completedAt} - ${stories.startedAt})) / 86400.0)::numeric, 2)::float`,
      maxDays: sql<
        number | null
      >`round(max(extract(epoch from (${stories.completedAt} - ${stories.startedAt})) / 86400.0)::numeric, 2)::float`,
      sampleSize: sql<number>`count(*)::int`,
    })
    .from(stories)
    .where(and(...cycleConditions))

  const cycleRow = cycleResult[0]

  // ── Metric 3: First-Pass Success ─────────────────────────────────────────

  const firstPassConditions: SQL<unknown>[] = [eq(storyOutcomes.finalVerdict, 'pass')]
  if (validated.feature) {
    firstPassConditions.push(eq(stories.feature, validated.feature))
  }
  if (validated.start_date) {
    firstPassConditions.push(gte(stories.completedAt, validated.start_date))
  }
  if (validated.end_date) {
    firstPassConditions.push(lte(stories.completedAt, validated.end_date))
  }

  const firstPassResult = await deps.db
    .select({
      total: sql<number>`count(*)::int`,
      firstPass: sql<number>`count(*) filter (where ${storyOutcomes.reviewIterations} = 0 and ${storyOutcomes.qaIterations} <= 1)::int`,
    })
    .from(storyOutcomes)
    .innerJoin(stories, eq(storyOutcomes.storyId, stories.storyId))
    .where(and(...firstPassConditions))

  const fpRow = firstPassResult[0]
  const fpTotal = fpRow?.total ?? 0
  const fpCount = fpRow?.firstPass ?? 0
  const fpRate = fpTotal > 0 ? Math.round((fpCount / fpTotal) * 10000) / 10000 : 0

  // ── Metric 4: Cost Efficiency ────────────────────────────────────────────

  const costConditions: SQL<unknown>[] = [eq(storyOutcomes.finalVerdict, 'pass')]
  if (validated.feature) {
    costConditions.push(eq(stories.feature, validated.feature))
  }
  if (validated.start_date) {
    costConditions.push(gte(stories.completedAt, validated.start_date))
  }
  if (validated.end_date) {
    costConditions.push(lte(stories.completedAt, validated.end_date))
  }

  const costResult = await deps.db
    .select({
      avgCost: sql<number | null>`avg(${storyOutcomes.estimatedTotalCost}::float)`,
      totalCost: sql<number>`coalesce(sum(${storyOutcomes.estimatedTotalCost}::float), 0)`,
      storyCount: sql<number>`count(*)::int`,
    })
    .from(storyOutcomes)
    .innerJoin(stories, eq(storyOutcomes.storyId, stories.storyId))
    .where(and(...costConditions))

  const costRow = costResult[0]

  // ── Metric 5: Agent Reliability ──────────────────────────────────────────

  const agentConditions: SQL<unknown>[] = []
  if (validated.start_date) {
    agentConditions.push(gte(agentInvocations.startedAt, validated.start_date))
  }
  if (validated.end_date) {
    agentConditions.push(lte(agentInvocations.startedAt, validated.end_date))
  }

  const agentResult = await deps.db
    .select({
      agentName: agentInvocations.agentName,
      total: sql<number>`count(*)::int`,
      successful: sql<number>`count(*) filter (where ${agentInvocations.status} = 'success')::int`,
    })
    .from(agentInvocations)
    .where(agentConditions.length > 0 ? and(...agentConditions) : undefined)
    .groupBy(agentInvocations.agentName)
    .orderBy(desc(sql`count(*)`))

  return {
    throughput: {
      stories_completed_per_week: storiesPerWeek,
      total_completed: totalCompleted,
      weeks_observed: weeksObserved,
    },
    cycle_time: {
      avg_cycle_time_days: cycleRow?.avgDays ?? null,
      min_cycle_time_days: cycleRow?.minDays ?? null,
      max_cycle_time_days: cycleRow?.maxDays ?? null,
      sample_size: cycleRow?.sampleSize ?? 0,
    },
    first_pass_success: {
      total_completed: fpTotal,
      first_pass_count: fpCount,
      first_pass_rate: fpRate,
    },
    cost_efficiency: {
      avg_cost_per_story: costRow?.avgCost ?? null,
      total_cost: costRow?.totalCost ?? 0,
      story_count: costRow?.storyCount ?? 0,
    },
    agent_reliability: {
      agents: agentResult.map(a => ({
        agent_name: a.agentName,
        total_invocations: a.total ?? 0,
        successful_invocations: a.successful ?? 0,
        success_rate:
          (a.total ?? 0) > 0
            ? Math.round(((a.successful ?? 0) / (a.total ?? 1)) * 10000) / 10000
            : 0,
      })),
    },
    generated_at: new Date().toISOString(),
    message: `Scoreboard: ${totalCompleted} stories completed, ${agentResult.length} agents tracked`,
  }
}
