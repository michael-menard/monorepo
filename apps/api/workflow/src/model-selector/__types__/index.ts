/**
 * model-selector/__types__/index.ts
 *
 * Zod schemas and inferred types for the model leaderboard feature.
 * Defines RunRecord (extends QualityEvaluation), LeaderboardEntry, and Leaderboard.
 *
 * MODL-0040: Model Leaderboard
 *
 * @module model-selector/__types__
 */

import { z } from 'zod'
import { QualityEvaluationSchema } from '../../models/__types__/quality-evaluation.js'

// ============================================================================
// RunRecord Schema
// ============================================================================

/**
 * A single run record extending QualityEvaluation with cost and latency fields.
 * Persisted as part of the leaderboard YAML.
 *
 * Extends QualityEvaluationSchema with:
 * - cost_usd: Actual cost incurred for this run (0 for Ollama)
 * - latency_ms: Wall-clock time for the model inference
 * - task_id: Human-readable task identifier for grouping
 */
export const RunRecordSchema = QualityEvaluationSchema.extend({
  /**
   * Actual cost in USD for this run.
   * Set to 0 for Ollama (zero-cost sentinel).
   */
  cost_usd: z.number().min(0),

  /**
   * Wall-clock latency in milliseconds for model inference.
   */
  latency_ms: z.number().min(0),

  /**
   * Human-readable task identifier (e.g., 'code_generation_medium').
   * Groups runs by task for per-task leaderboard entries.
   */
  task_id: z.string().min(1),
})

export type RunRecord = z.infer<typeof RunRecordSchema>

// ============================================================================
// Convergence Status
// ============================================================================

/**
 * Convergence status for a leaderboard entry.
 * - exploring: Not enough data to determine best model
 * - converging: Data accumulating, best model emerging
 * - converged: Sufficient data; best model identified with confidence
 */
export const ConvergenceStatusSchema = z.enum(['exploring', 'converging', 'converged'])
export type ConvergenceStatus = z.infer<typeof ConvergenceStatusSchema>

// ============================================================================
// Quality Trend
// ============================================================================

/**
 * Rolling quality trend for a leaderboard entry.
 * - improving: Recent runs show quality increase
 * - stable: Recent runs show stable quality
 * - degrading: Recent runs show quality decrease (triggers logger.warn)
 */
export const QualityTrendSchema = z.enum(['improving', 'stable', 'degrading'])
export type QualityTrend = z.infer<typeof QualityTrendSchema>

// ============================================================================
// LeaderboardEntry Schema
// ============================================================================

/**
 * Aggregated leaderboard entry for a (task_id, model) pair.
 * Updated incrementally on each run via recordRun().
 *
 * @example
 * ```typescript
 * const entry = LeaderboardEntrySchema.parse({
 *   task_id: 'code_generation_medium',
 *   model: 'anthropic/claude-sonnet-4.5',
 *   runs_count: 5,
 *   avg_quality: 82.4,
 *   avg_cost_usd: 0.0023,
 *   avg_latency_ms: 1200,
 *   value_score: 35826.09,
 *   recent_run_scores: [80, 82, 83, 84, 82],
 *   convergence_status: 'exploring',
 *   convergence_confidence: 0,
 *   quality_trend: 'stable',
 *   last_run_at: '2026-02-18T10:00:00Z',
 * })
 * ```
 */
export const LeaderboardEntrySchema = z.object({
  /**
   * Human-readable task identifier.
   */
  task_id: z.string().min(1),

  /**
   * Model identifier (e.g., 'anthropic/claude-sonnet-4.5').
   */
  model: z.string().min(1),

  /**
   * Total number of runs recorded for this (task_id, model) pair.
   */
  runs_count: z.number().int().min(0),

  /**
   * Running average quality score (0-100).
   */
  avg_quality: z.number().min(0).max(100),

  /**
   * Running average cost in USD per run.
   * Zero for Ollama models.
   */
  avg_cost_usd: z.number().min(0),

  /**
   * Running average latency in milliseconds.
   */
  avg_latency_ms: z.number().min(0),

  /**
   * Value score for ranking.
   *
   * When avg_cost_usd > 0: value_score = avg_quality / avg_cost_usd
   * When avg_cost_usd === 0 (Ollama zero-cost sentinel):
   *   value_score = avg_quality (to avoid division-by-zero and preserve ranking)
   *
   * Capped at 9999999.99.
   */
  value_score: z.number().min(0).max(9999999.99),

  /**
   * Rolling window of the last 5 quality scores (newest last).
   * Used for quality_trend computation.
   */
  recent_run_scores: z.array(z.number().min(0).max(100)).max(5),

  /**
   * Current convergence status for this entry.
   */
  convergence_status: ConvergenceStatusSchema,

  /**
   * Confidence level for convergence (0.0 to 1.0).
   * 0.95 indicates high confidence the best model is identified.
   */
  convergence_confidence: z.number().min(0).max(1),

  /**
   * Rolling quality trend based on recent_run_scores.
   */
  quality_trend: QualityTrendSchema,

  /**
   * ISO 8601 timestamp of the most recent run.
   */
  last_run_at: z.string().datetime(),
})

export type LeaderboardEntry = z.infer<typeof LeaderboardEntrySchema>

// ============================================================================
// Leaderboard Schema
// ============================================================================

/**
 * Complete leaderboard YAML structure.
 * Persisted to disk as a YAML file at MODEL_LEADERBOARD_PATH.
 *
 * @example
 * ```typescript
 * const leaderboard = LeaderboardSchema.parse({
 *   schema: 1,
 *   story_id: 'MODL-0040',
 *   updated_at: '2026-02-18T10:00:00Z',
 *   entries: [...],
 * })
 * ```
 */
export const LeaderboardSchema = z.object({
  /**
   * Schema version for forward compatibility.
   */
  schema: z.literal(1),

  /**
   * Story ID that created/owns this leaderboard.
   */
  story_id: z.string().min(1),

  /**
   * ISO 8601 timestamp of the last update.
   */
  updated_at: z.string().datetime(),

  /**
   * All leaderboard entries, one per (task_id, model) pair.
   */
  entries: z.array(LeaderboardEntrySchema),
})

export type Leaderboard = z.infer<typeof LeaderboardSchema>
