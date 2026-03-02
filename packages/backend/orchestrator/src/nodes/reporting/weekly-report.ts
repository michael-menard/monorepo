/**
 * Weekly Pipeline Report
 *
 * Aggregates throughput, cost, model performance, and codebase health
 * metrics over a 7-day window, then formats and dispatches a Slack
 * Block Kit message.
 *
 * Design decisions:
 * - Raw pg.Pool queries (no Drizzle) — consistent with cron job pattern
 * - data_unavailable sentinel when dependency tables don't exist (42P01)
 * - Injectable pool, window, and dispatch function — no singletons
 * - pg_try_advisory_lock to prevent concurrent runs
 *
 * APIP-4070: Weekly Pipeline Report — Automated Slack Summary
 */

import type { Pool } from 'pg'
import { logger } from '@repo/logger'
import { LOCK_KEYS } from '../../cron/constants.js'
import type {
  WeeklyReportConfig,
  TimeWindow,
  ThroughputResult,
  CostResult,
  ModelPerformanceResult,
  CodebaseHealthResult,
  WeeklyPipelineSummary,
  DataUnavailableResult,
  DispatchNotificationFn,
  NotificationConfig,
} from './__types__/index.js'
import { WeeklyReportConfigSchema } from './__types__/index.js'

// ============================================================================
// Helpers
// ============================================================================

/**
 * Returns true if the PostgreSQL error code indicates the table doesn't exist.
 * Code 42P01 = undefined_table.
 */
function isUndefinedTableError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '42P01'
  )
}

const DATA_UNAVAILABLE: DataUnavailableResult = { data_unavailable: true }

// ============================================================================
// Aggregation Functions
// ============================================================================

/**
 * Aggregates throughput metrics from wint.change_telemetry.
 *
 * Queries the number of stories completed and blocked within the given window.
 * Returns data_unavailable if the table doesn't exist (42P01).
 *
 * @param pool - pg Pool instance
 * @param window - Time window for aggregation
 * @returns ThroughputResult or DataUnavailableResult
 */
export async function aggregateThroughput(
  pool: Pool,
  window: TimeWindow,
): Promise<ThroughputResult | DataUnavailableResult> {
  try {
    const result = await pool.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text AS count
       FROM wint.change_telemetry
       WHERE created_at >= $1 AND created_at < $2
         AND status IN ('completed', 'blocked')
       GROUP BY status`,
      [window.start, window.end],
    )

    let stories_completed = 0
    let stories_blocked = 0

    for (const row of result.rows) {
      const count = parseInt(row.count, 10)
      if (row.status === 'completed') stories_completed = count
      if (row.status === 'blocked') stories_blocked = count
    }

    const total = stories_completed + stories_blocked
    const success_rate = total > 0 ? stories_completed / total : 0

    return { stories_completed, stories_blocked, success_rate }
  } catch (err) {
    if (isUndefinedTableError(err)) {
      logger.warn('weekly_report.throughput.table_missing', {
        error: 'wint.change_telemetry does not exist',
      })
      return DATA_UNAVAILABLE
    }
    throw err
  }
}

/**
 * Aggregates cost metrics from wint.change_telemetry.
 *
 * Sums estimated_cost_usd by model_provider within the window.
 * Returns data_unavailable if the table doesn't exist (42P01).
 *
 * @param pool - pg Pool instance
 * @param window - Time window for aggregation
 * @returns CostResult or DataUnavailableResult
 */
export async function aggregateCosts(
  pool: Pool,
  window: TimeWindow,
): Promise<CostResult | DataUnavailableResult> {
  try {
    const result = await pool.query<{ model_provider: string; total_cost: string }>(
      `SELECT model_provider, SUM(estimated_cost_usd)::text AS total_cost
       FROM wint.change_telemetry
       WHERE created_at >= $1 AND created_at < $2
         AND estimated_cost_usd IS NOT NULL
       GROUP BY model_provider`,
      [window.start, window.end],
    )

    const by_provider: Record<string, number> = {}
    let total_usd = 0

    for (const row of result.rows) {
      const cost = parseFloat(row.total_cost)
      if (!isNaN(cost)) {
        by_provider[row.model_provider] = Math.round(cost * 10000) / 10000
        total_usd += cost
      }
    }

    return {
      total_usd: Math.round(total_usd * 10000) / 10000,
      by_provider,
    }
  } catch (err) {
    if (isUndefinedTableError(err)) {
      logger.warn('weekly_report.costs.table_missing', {
        error: 'wint.change_telemetry does not exist',
      })
      return DATA_UNAVAILABLE
    }
    throw err
  }
}

/**
 * Aggregates model performance from wint.model_affinity_profiles.
 *
 * Returns per-model first_try_success_rate, escalation_rate, and trend_direction.
 * Returns data_unavailable if the table doesn't exist (42P01).
 *
 * @param pool - pg Pool instance
 * @param window - Time window for aggregation
 * @returns ModelPerformanceResult or DataUnavailableResult
 */
export async function aggregateModelPerformance(
  pool: Pool,
  window: TimeWindow,
): Promise<ModelPerformanceResult | DataUnavailableResult> {
  try {
    const result = await pool.query<{
      model_id: string
      first_try_success_rate: string
      escalation_rate: string
      trend_direction: string
    }>(
      `SELECT
         model_id,
         COALESCE(first_try_success_rate, 0)::text AS first_try_success_rate,
         COALESCE(escalation_rate, 0)::text AS escalation_rate,
         COALESCE(trend_direction, 'stable') AS trend_direction
       FROM wint.model_affinity_profiles
       WHERE updated_at >= $1 AND updated_at < $2`,
      [window.start, window.end],
    )

    const by_model: ModelPerformanceResult['by_model'] = {}

    for (const row of result.rows) {
      const trend = row.trend_direction as 'improving' | 'stable' | 'declining'
      by_model[row.model_id] = {
        first_try_success_rate: parseFloat(row.first_try_success_rate),
        escalation_rate: parseFloat(row.escalation_rate),
        trend_direction: ['improving', 'stable', 'declining'].includes(trend) ? trend : 'stable',
      }
    }

    return { by_model }
  } catch (err) {
    if (isUndefinedTableError(err)) {
      logger.warn('weekly_report.model_performance.table_missing', {
        error: 'wint.model_affinity_profiles does not exist',
      })
      return DATA_UNAVAILABLE
    }
    throw err
  }
}

/**
 * Aggregates codebase health metrics from wint.codebase_health.
 *
 * Compares the most recent snapshot to the oldest snapshot in the window
 * to compute delta_from_baseline.
 * Returns data_unavailable if the table doesn't exist (42P01)
 * or if fewer than 2 snapshots are available for comparison.
 *
 * @param pool - pg Pool instance
 * @param window - Time window for aggregation
 * @returns CodebaseHealthResult or DataUnavailableResult
 */
export async function aggregateCodebaseHealth(
  pool: Pool,
  window: TimeWindow,
): Promise<CodebaseHealthResult | DataUnavailableResult> {
  try {
    const result = await pool.query<{
      snapshot_at: string
      metrics: Record<string, number>
      thresholds: Record<string, number>
    }>(
      `SELECT snapshot_at, metrics, thresholds
       FROM wint.codebase_health
       WHERE snapshot_at >= $1 AND snapshot_at < $2
       ORDER BY snapshot_at ASC`,
      [window.start, window.end],
    )

    if (result.rows.length < 2) {
      logger.warn('weekly_report.codebase_health.insufficient_snapshots', {
        count: result.rows.length,
        required: 2,
      })
      return DATA_UNAVAILABLE
    }

    const baseline = result.rows[0]
    const recent = result.rows[result.rows.length - 1]

    const baselineMetrics: Record<string, number> = baseline.metrics ?? {}
    const recentMetrics: Record<string, number> = recent.metrics ?? {}
    const thresholds: Record<string, number> = recent.thresholds ?? {}

    const delta_from_baseline: Record<string, number> = {}
    let metrics_within_threshold = 0
    let metrics_drifted = 0

    const allKeys = new Set([...Object.keys(baselineMetrics), ...Object.keys(recentMetrics)])

    for (const key of allKeys) {
      const baselineVal = baselineMetrics[key] ?? 0
      const recentVal = recentMetrics[key] ?? 0
      const delta = recentVal - baselineVal
      delta_from_baseline[key] = Math.round(delta * 10000) / 10000

      const threshold = thresholds[key]
      if (threshold !== undefined) {
        if (Math.abs(delta) <= Math.abs(threshold)) {
          metrics_within_threshold++
        } else {
          metrics_drifted++
        }
      }
    }

    return { metrics_within_threshold, metrics_drifted, delta_from_baseline }
  } catch (err) {
    if (isUndefinedTableError(err)) {
      logger.warn('weekly_report.codebase_health.table_missing', {
        error: 'wint.codebase_health does not exist',
      })
      return DATA_UNAVAILABLE
    }
    throw err
  }
}

// ============================================================================
// Pure Helper Functions
// ============================================================================

/**
 * Derives human-readable top improvement and top concern from the summary.
 *
 * Pure function — no side effects, no DB access.
 *
 * @param summary - Assembled weekly pipeline summary
 * @returns Object with top_improvement and top_concern strings, or null if unavailable
 */
export function deriveTopImprovementAndConcern(summary: {
  throughput: WeeklyPipelineSummary['throughput']
  costs: WeeklyPipelineSummary['costs']
  model_performance: WeeklyPipelineSummary['model_performance']
  codebase_health: WeeklyPipelineSummary['codebase_health']
}): { top_improvement: string | null; top_concern: string | null } {
  let top_improvement: string | null = null
  let top_concern: string | null = null

  // Derive improvement from throughput
  if (!('data_unavailable' in summary.throughput)) {
    const { success_rate, stories_completed } = summary.throughput
    if (success_rate >= 0.8 && stories_completed > 0) {
      top_improvement = `High throughput week: ${stories_completed} stories completed with ${Math.round(success_rate * 100)}% success rate`
    }
    if (success_rate < 0.5 && stories_completed + summary.throughput.stories_blocked > 0) {
      top_concern = `Low success rate: only ${Math.round(success_rate * 100)}% of stories completed (${summary.throughput.stories_blocked} blocked)`
    }
  }

  // Derive from model performance if throughput didn't give us anything
  if (!('data_unavailable' in summary.model_performance)) {
    const models = Object.entries(summary.model_performance.by_model)
    const improving = models.filter(([_, m]) => m.trend_direction === 'improving')
    const declining = models.filter(([_, m]) => m.trend_direction === 'declining')

    if (improving.length > 0 && top_improvement === null) {
      const best = improving[0]
      top_improvement = `Model ${best[0]} trending up: ${Math.round(best[1].first_try_success_rate * 100)}% first-try success rate`
    }

    if (declining.length > 0 && top_concern === null) {
      const worst = declining[0]
      top_concern = `Model ${worst[0]} declining: ${Math.round(worst[1].escalation_rate * 100)}% escalation rate`
    }
  }

  // Derive from codebase health
  if (!('data_unavailable' in summary.codebase_health)) {
    const { metrics_drifted, metrics_within_threshold } = summary.codebase_health
    const total = metrics_drifted + metrics_within_threshold

    if (metrics_drifted > 0 && top_concern === null) {
      top_concern = `Codebase health: ${metrics_drifted}/${total} metrics drifted outside threshold`
    }

    if (metrics_drifted === 0 && total > 0 && top_improvement === null) {
      top_improvement = `All ${total} codebase health metrics within threshold`
    }
  }

  return { top_improvement, top_concern }
}

/**
 * Formats the weekly summary as a Slack Block Kit payload.
 *
 * Unavailable sections are rendered as italic placeholder text.
 * Pure function — no side effects.
 *
 * @param summary - Assembled weekly pipeline summary
 * @returns Slack Block Kit payload object
 */
export function formatSlackMessage(summary: WeeklyPipelineSummary): unknown {
  const unavailableText = '_Data unavailable_'

  const throughputText =
    'data_unavailable' in summary.throughput
      ? unavailableText
      : `*Completed:* ${summary.throughput.stories_completed} | *Blocked:* ${summary.throughput.stories_blocked} | *Success Rate:* ${Math.round(summary.throughput.success_rate * 100)}%`

  const costsText =
    'data_unavailable' in summary.costs
      ? unavailableText
      : `*Total:* $${summary.costs.total_usd.toFixed(2)} | *By Provider:* ${
          Object.entries(summary.costs.by_provider)
            .map(([p, c]) => `${p}: $${Number(c).toFixed(2)}`)
            .join(', ') || 'none'
        }`

  const modelText =
    'data_unavailable' in summary.model_performance
      ? unavailableText
      : Object.entries(summary.model_performance.by_model)
          .map(
            ([model, stats]) =>
              `*${model}:* ${Math.round(stats.first_try_success_rate * 100)}% first-try, ` +
              `${Math.round(stats.escalation_rate * 100)}% escalation (${stats.trend_direction})`,
          )
          .join('\n') || unavailableText

  const healthText =
    'data_unavailable' in summary.codebase_health
      ? unavailableText
      : `*Within threshold:* ${summary.codebase_health.metrics_within_threshold} | *Drifted:* ${summary.codebase_health.metrics_drifted}`

  const blocks: unknown[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Weekly Pipeline Report',
        emoji: true,
      },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Period: ${summary.period.start} → ${summary.period.end}`,
        },
      ],
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Throughput*\n${throughputText}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Costs*\n${costsText}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Model Performance*\n${modelText}`,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Codebase Health*\n${healthText}`,
      },
    },
  ]

  if (summary.top_improvement !== null || summary.top_concern !== null) {
    blocks.push({ type: 'divider' })

    if (summary.top_improvement !== null) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:chart_with_upwards_trend: *Top Improvement:* ${summary.top_improvement}`,
        },
      })
    }

    if (summary.top_concern !== null) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:warning: *Top Concern:* ${summary.top_concern}`,
        },
      })
    }
  }

  return { blocks }
}

// ============================================================================
// Orchestrator
// ============================================================================

/**
 * Triggers the weekly pipeline report.
 *
 * 1. Acquires a PostgreSQL advisory lock (pg_try_advisory_lock) to prevent
 *    concurrent runs. Emits weekly_report_skipped (reason=lock_held) and
 *    returns immediately if the lock is already held.
 * 2. Aggregates all four sections in parallel.
 * 3. Skips dispatch if ALL sections are data_unavailable.
 *    Emits weekly_report_skipped (reason=no_data).
 * 4. Derives top_improvement and top_concern.
 * 5. Formats the Slack Block Kit payload.
 * 6. Dispatches the notification via the injectable dispatch function.
 * 7. Emits weekly_report_dispatched.
 *
 * @param config - Report configuration (lookbackDays, minHistoryWeeks, cronExpression)
 * @param pool - pg Pool instance for DB queries and advisory lock
 * @param dispatch - Injectable notification dispatch function
 * @param notificationConfig - Optional notification config (e.g., Slack webhook)
 */
export async function triggerWeeklyReport(
  config: WeeklyReportConfig,
  pool: Pool,
  dispatch: DispatchNotificationFn,
  notificationConfig?: NotificationConfig,
): Promise<void> {
  const fullConfig = WeeklyReportConfigSchema.parse(config)

  // Step 1: Acquire advisory lock
  const client = await pool.connect()
  let lockAcquired = false

  try {
    const lockResult = await client.query<{ pg_try_advisory_lock: boolean }>(
      'SELECT pg_try_advisory_lock($1)',
      [LOCK_KEYS.WEEKLY_REPORT],
    )
    lockAcquired = lockResult.rows[0]?.pg_try_advisory_lock ?? false
  } finally {
    client.release()
  }

  if (!lockAcquired) {
    logger.info('weekly_report_skipped', {
      reason: 'lock_held',
      lockKey: LOCK_KEYS.WEEKLY_REPORT,
    })
    return
  }

  logger.info('weekly_report.starting', {
    lockKey: LOCK_KEYS.WEEKLY_REPORT,
    lookbackDays: fullConfig.lookbackDays,
  })

  try {
    // Step 2: Build time window
    const now = new Date()
    const start = new Date(now.getTime() - fullConfig.lookbackDays * 24 * 60 * 60 * 1000)
    const window: TimeWindow = { start, end: now }

    // Step 3: Aggregate all sections in parallel
    const [throughput, costs, model_performance, codebase_health] = await Promise.all([
      aggregateThroughput(pool, window),
      aggregateCosts(pool, window),
      aggregateModelPerformance(pool, window),
      aggregateCodebaseHealth(pool, window),
    ])

    // Step 4: Check if all sections are unavailable — skip dispatch
    const allUnavailable =
      'data_unavailable' in throughput &&
      'data_unavailable' in costs &&
      'data_unavailable' in model_performance &&
      'data_unavailable' in codebase_health

    if (allUnavailable) {
      logger.warn('weekly_report_skipped', {
        reason: 'no_data',
        message: 'All sections returned data_unavailable — no report dispatched',
      })
      return
    }

    // Step 5: Build summary
    const partialSummary = {
      throughput,
      costs,
      model_performance,
      codebase_health,
    }

    const { top_improvement, top_concern } = deriveTopImprovementAndConcern(partialSummary)

    const summary: WeeklyPipelineSummary = {
      period: {
        start: start.toISOString(),
        end: now.toISOString(),
      },
      throughput,
      costs,
      model_performance,
      codebase_health,
      top_improvement,
      top_concern,
    }

    // Step 6: Format Slack message
    const payload = formatSlackMessage(summary)

    // Step 7: Dispatch notification (only if config provided)
    if (notificationConfig !== undefined) {
      await dispatch(payload, notificationConfig)
    }

    logger.info('weekly_report_dispatched', {
      period_start: summary.period.start,
      period_end: summary.period.end,
      throughput_available: !('data_unavailable' in throughput),
      costs_available: !('data_unavailable' in costs),
      model_performance_available: !('data_unavailable' in model_performance),
      codebase_health_available: !('data_unavailable' in codebase_health),
      top_improvement,
      top_concern,
    })
  } finally {
    // Advisory lock is released when pool ends or client disconnects
    logger.info('weekly_report.finished', { lockKey: LOCK_KEYS.WEEKLY_REPORT })
  }
}
