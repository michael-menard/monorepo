/**
 * Weekly Report Types
 *
 * Zod schemas and inferred types for the weekly pipeline summary report.
 *
 * APIP-4070: Weekly Pipeline Report — Automated Slack Summary
 */

import { z } from 'zod'

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration for the weekly report job.
 */
export const WeeklyReportConfigSchema = z.object({
  /** Number of days to look back for data (default 7) */
  lookbackDays: z.number().int().positive().default(7),
  /** Minimum number of history weeks required for trend analysis */
  minHistoryWeeks: z.number().int().positive().default(2),
  /** Cron expression for the job schedule */
  cronExpression: z.string().min(1).default('0 9 * * 1'),
})

export type WeeklyReportConfig = z.infer<typeof WeeklyReportConfigSchema>

// ============================================================================
// Time Window
// ============================================================================

/**
 * Time window for report aggregation.
 */
export const TimeWindowSchema = z.object({
  /** Start of the window (inclusive) */
  start: z.date(),
  /** End of the window (exclusive) */
  end: z.date(),
})

export type TimeWindow = z.infer<typeof TimeWindowSchema>

// ============================================================================
// Data Unavailable Result
// ============================================================================

/**
 * Sentinel value for sections where data is not available
 * (e.g., dependency table doesn't exist — PostgreSQL error 42P01).
 */
export const DataUnavailableResultSchema = z.object({
  data_unavailable: z.literal(true),
})

export type DataUnavailableResult = z.infer<typeof DataUnavailableResultSchema>

// ============================================================================
// Report Section Schemas
// ============================================================================

/**
 * Throughput metrics — how many stories were completed/blocked in the window.
 */
export const ThroughputResultSchema = z.object({
  /** Number of stories that reached 'completed' status */
  stories_completed: z.number().int().min(0),
  /** Number of stories that are currently blocked */
  stories_blocked: z.number().int().min(0),
  /** Success rate: stories_completed / (stories_completed + stories_blocked) */
  success_rate: z.number().min(0).max(1),
})

export type ThroughputResult = z.infer<typeof ThroughputResultSchema>

/**
 * Cost metrics — total spend and per-provider breakdown.
 */
export const CostResultSchema = z.object({
  /** Total cost in USD */
  total_usd: z.number().min(0),
  /** Cost broken down by model provider */
  by_provider: z.record(z.string(), z.number().min(0)),
})

export type CostResult = z.infer<typeof CostResultSchema>

/**
 * Per-model performance stats.
 */
export const ModelPerformanceEntrySchema = z.object({
  /** Rate of stories that succeeded on first try (no escalation) */
  first_try_success_rate: z.number().min(0).max(1),
  /** Rate of stories that required escalation to a larger model */
  escalation_rate: z.number().min(0).max(1),
  /** Trend relative to prior period: improving, stable, or declining */
  trend_direction: z.enum(['improving', 'stable', 'declining']),
})

export type ModelPerformanceEntry = z.infer<typeof ModelPerformanceEntrySchema>

/**
 * Model performance metrics — per-model breakdown.
 */
export const ModelPerformanceResultSchema = z.object({
  /** Performance stats keyed by model name */
  by_model: z.record(z.string(), ModelPerformanceEntrySchema),
})

export type ModelPerformanceResult = z.infer<typeof ModelPerformanceResultSchema>

/**
 * Codebase health metrics — drift from baseline thresholds.
 */
export const CodebaseHealthResultSchema = z.object({
  /** Number of metrics within acceptable threshold */
  metrics_within_threshold: z.number().int().min(0),
  /** Number of metrics that have drifted outside threshold */
  metrics_drifted: z.number().int().min(0),
  /** Delta comparison between recent and baseline snapshot */
  delta_from_baseline: z.record(z.string(), z.number()),
})

export type CodebaseHealthResult = z.infer<typeof CodebaseHealthResultSchema>

// ============================================================================
// Top-Level Weekly Summary
// ============================================================================

/**
 * The full weekly pipeline summary.
 */
export const WeeklyPipelineSummarySchema = z.object({
  /** ISO 8601 start/end strings for the report period */
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  /** Throughput section (or data_unavailable) */
  throughput: z.union([ThroughputResultSchema, DataUnavailableResultSchema]),
  /** Cost section (or data_unavailable) */
  costs: z.union([CostResultSchema, DataUnavailableResultSchema]),
  /** Model performance section (or data_unavailable) */
  model_performance: z.union([ModelPerformanceResultSchema, DataUnavailableResultSchema]),
  /** Codebase health section (or data_unavailable) */
  codebase_health: z.union([CodebaseHealthResultSchema, DataUnavailableResultSchema]),
  /** Human-readable top improvement observed this week, or null */
  top_improvement: z.string().nullable(),
  /** Human-readable top concern observed this week, or null */
  top_concern: z.string().nullable(),
})

export type WeeklyPipelineSummary = z.infer<typeof WeeklyPipelineSummarySchema>

// ============================================================================
// Notification Config
// ============================================================================

/**
 * Configuration for notification dispatch (e.g., Slack webhook URL).
 * To be replaced with the APIP-2010 NotificationConfig when that lands.
 */
export const NotificationConfigSchema = z.object({
  /** Slack webhook URL for posting the report */
  slackWebhookUrl: z.string().url(),
})

export type NotificationConfig = z.infer<typeof NotificationConfigSchema>

// ============================================================================
// Injectable Function Type
// ============================================================================

/**
 * Injectable notification dispatch function.
 *
 * ARCH-001: Local type alias until APIP-2010 merges.
 * When APIP-2010 lands, update this import to use their exported type.
 */
export type DispatchNotificationFn = (payload: unknown, config: NotificationConfig) => Promise<void>
