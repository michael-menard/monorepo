/**
 * leaderboard.ts
 *
 * YAML-persisted leaderboard for per-task, per-model quality/cost/latency tracking.
 * Provides recordRun(), loadLeaderboard(), and saveLeaderboard() with atomic writes,
 * convergence detection, and quality trend computation.
 *
 * MODL-0040: Model Leaderboard
 *
 * @module model-selector/leaderboard
 *
 * TODO: Upgrade to Wilson score interval when >= 5 models have run.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'yaml'
import { logger } from '@repo/logger'
import type {
  RunRecord,
  Leaderboard,
  LeaderboardEntry,
  ConvergenceStatus,
  QualityTrend,
} from './__types__/index.js'
import { LeaderboardSchema } from './__types__/index.js'

// ============================================================================
// Constants
// ============================================================================

/**
 * Maximum number of recent run scores to retain per entry.
 * Used for quality_trend rolling window.
 */
const MAX_RECENT_SCORES = 5

/**
 * Minimum runs required before convergence analysis can start.
 */
const MIN_RUNS_FOR_CONVERGENCE = 20

/**
 * Minimum quality gap (in points) between the best and second-best model
 * for per-task convergence to trigger.
 */
const MIN_QUALITY_GAP_FOR_CONVERGENCE = 5.0

/**
 * Minimum runs the best model must have accumulated for convergence.
 */
const MIN_BEST_MODEL_RUNS_FOR_CONVERGENCE = 10

/**
 * Confidence level when the convergence conditions are fully met.
 */
const CONVERGENCE_CONFIDENCE = 0.95

/**
 * Maximum value_score cap (to prevent infinity for zero-cost models).
 */
const MAX_VALUE_SCORE = 9999999.99

/**
 * Degradation threshold: if the average of recent scores falls more than
 * this percentage below the established baseline, quality_trend = 'degrading'.
 * Exactly 10.0% drop is stable; 10.01% is degrading.
 */
const DEGRADATION_THRESHOLD_PERCENT = 10.0

// ============================================================================
// Persistence: Load & Save
// ============================================================================

/**
 * Empty leaderboard template returned when the file is absent or unparseable.
 */
function createEmptyLeaderboard(): Leaderboard {
  return {
    schema: 1,
    story_id: 'MODL-0040',
    updated_at: new Date().toISOString(),
    entries: [],
  }
}

/**
 * Generate a temporary file path for atomic writes.
 * Uses the same pattern as yaml-artifact-writer.ts.
 *
 * @param targetPath - The final target file path
 * @returns A temp file path in the same directory
 */
function getTempFilePath(targetPath: string): string {
  const dir = path.dirname(targetPath)
  const ext = path.extname(targetPath)
  const base = path.basename(targetPath, ext)
  const randomSuffix = Math.random().toString(36).substring(2, 10)
  return path.join(dir, `.${base}.${randomSuffix}.tmp${ext}`)
}

/**
 * Load the leaderboard from disk.
 * Returns an empty leaderboard when the file does not exist (no error thrown).
 * Logs a warning if the file exists but fails schema validation.
 *
 * @param filePath - Absolute path to the leaderboard YAML file
 * @returns Parsed Leaderboard, or empty leaderboard if file is absent
 */
export async function loadLeaderboard(filePath: string): Promise<Leaderboard> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const parsed = yaml.parse(content)
    const result = LeaderboardSchema.safeParse(parsed)

    if (!result.success) {
      logger.warn('leaderboard', {
        event: 'load_schema_error',
        file: filePath,
        error: result.error.message,
      })
      return createEmptyLeaderboard()
    }

    return result.data
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException
    if (nodeError.code === 'ENOENT') {
      // File does not exist — normal first-run case
      return createEmptyLeaderboard()
    }

    logger.warn('leaderboard', {
      event: 'load_read_error',
      file: filePath,
      error: nodeError.message,
    })
    return createEmptyLeaderboard()
  }
}

/**
 * Save the leaderboard to disk atomically (temp file → rename).
 * Creates the target directory if it does not exist.
 * Uses indent: 2 and lineWidth: 120 for consistent formatting.
 *
 * @param filePath - Absolute path to the leaderboard YAML file
 * @param leaderboard - The leaderboard data to persist
 */
export async function saveLeaderboard(filePath: string, leaderboard: Leaderboard): Promise<void> {
  const dir = path.dirname(filePath)

  // Ensure directory exists
  await fs.mkdir(dir, { recursive: true })

  const content = yaml.stringify(leaderboard, {
    indent: 2,
    lineWidth: 120,
  })

  const tempPath = getTempFilePath(filePath)

  try {
    await fs.writeFile(tempPath, content, 'utf-8')
    await fs.rename(tempPath, filePath)
  } catch (error) {
    // Clean up temp file if rename fails
    try {
      await fs.unlink(tempPath)
    } catch {
      // Ignore cleanup errors
    }
    throw error
  }
}

// ============================================================================
// Value Score Computation
// ============================================================================

/**
 * Compute the value score for a leaderboard entry.
 *
 * When avg_cost_usd > 0: value_score = avg_quality / avg_cost_usd
 * When avg_cost_usd === 0 (Ollama zero-cost sentinel):
 *   value_score = avg_quality to avoid division-by-zero and preserve ranking.
 *
 * Capped at MAX_VALUE_SCORE (9999999.99).
 *
 * @param avgQuality - Running average quality score (0-100)
 * @param avgCostUsd - Running average cost in USD (0 for Ollama)
 * @returns value_score capped at MAX_VALUE_SCORE
 */
export function computeValueScore(avgQuality: number, avgCostUsd: number): number {
  let score: number

  if (avgCostUsd === 0) {
    // Ollama zero-cost sentinel: use quality directly to avoid division-by-zero
    score = avgQuality
  } else {
    score = avgQuality / avgCostUsd
  }

  return Math.min(MAX_VALUE_SCORE, Math.round(score * 100) / 100)
}

// ============================================================================
// Convergence Detection
// ============================================================================

/**
 * Determine convergence status for a given task's entries.
 *
 * Algorithm:
 * 1. If fewer than MIN_RUNS_FOR_CONVERGENCE total runs across all models → 'exploring'
 * 2. If only one model has run >= MIN_RUNS_FOR_CONVERGENCE runs → 'converged' (single-model task)
 * 3. If best model has >= MIN_BEST_MODEL_RUNS_FOR_CONVERGENCE runs AND
 *    quality gap between best and second-best >= MIN_QUALITY_GAP_FOR_CONVERGENCE → 'converged'
 * 4. Otherwise → 'converging'
 *
 * TODO: Upgrade to Wilson score interval when >= 5 models have run.
 *
 * @param taskEntries - All entries for a single task_id
 * @param currentEntry - The entry being updated (to check if it's the best)
 * @returns { convergence_status, convergence_confidence }
 */
export function computeConvergence(taskEntries: LeaderboardEntry[]): {
  convergence_status: ConvergenceStatus
  convergence_confidence: number
} {
  const totalRuns = taskEntries.reduce((sum, e) => sum + e.runs_count, 0)

  // Phase 1: Not enough data
  if (totalRuns < MIN_RUNS_FOR_CONVERGENCE) {
    return { convergence_status: 'exploring', convergence_confidence: 0 }
  }

  // Sort entries by avg_quality descending
  const sorted = [...taskEntries].sort((a, b) => b.avg_quality - a.avg_quality)
  const best = sorted[0]

  // Phase 2: Single-model task with sufficient runs
  if (sorted.length === 1 && best.runs_count >= MIN_RUNS_FOR_CONVERGENCE) {
    return { convergence_status: 'converged', convergence_confidence: CONVERGENCE_CONFIDENCE }
  }

  // Phase 3: Multi-model — check quality gap and best model run count
  if (sorted.length >= 2) {
    const secondBest = sorted[1]
    const qualityGap = best.avg_quality - secondBest.avg_quality

    if (
      best.runs_count >= MIN_BEST_MODEL_RUNS_FOR_CONVERGENCE &&
      qualityGap >= MIN_QUALITY_GAP_FOR_CONVERGENCE
    ) {
      return { convergence_status: 'converged', convergence_confidence: CONVERGENCE_CONFIDENCE }
    }
  }

  // Otherwise converging
  return { convergence_status: 'converging', convergence_confidence: 0 }
}

// ============================================================================
// Quality Trend Computation
// ============================================================================

/**
 * Compute the quality trend from the recent_run_scores rolling window.
 *
 * Uses the first score in the window as the baseline.
 * If the average of subsequent scores drops more than DEGRADATION_THRESHOLD_PERCENT
 * below the baseline, the trend is 'degrading'.
 * If average of subsequent scores is higher than baseline, trend is 'improving'.
 * Otherwise 'stable'.
 *
 * With fewer than 2 scores, returns 'stable' (insufficient data).
 *
 * @param recentScores - Rolling window of up to 5 quality scores (newest last)
 * @returns QualityTrend
 */
export function computeQualityTrend(recentScores: number[]): QualityTrend {
  if (recentScores.length < 2) {
    return 'stable'
  }

  const baseline = recentScores[0]
  if (baseline === 0) {
    return 'stable'
  }

  const subsequent = recentScores.slice(1)
  const avgSubsequent = subsequent.reduce((sum, s) => sum + s, 0) / subsequent.length

  const percentChange = ((avgSubsequent - baseline) / baseline) * 100

  // Strictly greater than DEGRADATION_THRESHOLD_PERCENT (10.0%) drop is degrading
  // Exactly 10.0% drop is stable (boundary = stable)
  if (percentChange < -DEGRADATION_THRESHOLD_PERCENT) {
    return 'degrading'
  }

  if (percentChange > 0) {
    return 'improving'
  }

  return 'stable'
}

// ============================================================================
// Core: recordRun
// ============================================================================

/**
 * Record a run in the leaderboard and return the updated entry.
 *
 * Flow:
 * 1. Load existing leaderboard from filePath
 * 2. Find or create LeaderboardEntry for (run.task_id, run.modelUsed)
 * 3. Increment runs_count
 * 4. Update running averages (avg_quality, avg_cost_usd, avg_latency_ms)
 * 5. Append to recent_run_scores (trim to MAX_RECENT_SCORES)
 * 6. Compute value_score
 * 7. Compute convergence_status (per-task, across all entries for task_id)
 * 8. Compute quality_trend
 * 9. Log warning if quality_trend transitions to 'degrading'
 * 10. Save atomically
 * 11. Return updated entry
 *
 * @param filePath - Absolute path to the leaderboard YAML file
 * @param run - RunRecord from a completed model run
 * @returns The updated LeaderboardEntry for the (task_id, model) pair
 */
export async function recordRun(filePath: string, run: RunRecord): Promise<LeaderboardEntry> {
  const leaderboard = await loadLeaderboard(filePath)

  const taskId = run.task_id
  const model = run.modelUsed

  // Find existing entry or create new one
  let entryIndex = leaderboard.entries.findIndex(e => e.task_id === taskId && e.model === model)

  if (entryIndex === -1) {
    // Create new entry
    const newEntry: LeaderboardEntry = {
      task_id: taskId,
      model,
      runs_count: 0,
      avg_quality: 0,
      avg_cost_usd: 0,
      avg_latency_ms: 0,
      value_score: 0,
      recent_run_scores: [],
      convergence_status: 'exploring',
      convergence_confidence: 0,
      quality_trend: 'stable',
      last_run_at: run.timestamp,
    }
    leaderboard.entries.push(newEntry)
    entryIndex = leaderboard.entries.length - 1
  }

  const entry = leaderboard.entries[entryIndex]
  const prevQualityTrend = entry.quality_trend

  // Increment runs_count
  const newRunsCount = entry.runs_count + 1

  // Update running averages using incremental formula:
  // new_avg = old_avg + (new_value - old_avg) / new_count
  const newAvgQuality = entry.avg_quality + (run.qualityScore - entry.avg_quality) / newRunsCount
  const newAvgCostUsd = entry.avg_cost_usd + (run.cost_usd - entry.avg_cost_usd) / newRunsCount
  const newAvgLatencyMs =
    entry.avg_latency_ms + (run.latency_ms - entry.avg_latency_ms) / newRunsCount

  // Append to recent_run_scores and trim to MAX_RECENT_SCORES
  const newRecentScores = [...entry.recent_run_scores, run.qualityScore].slice(-MAX_RECENT_SCORES)

  // Compute value_score
  const newValueScore = computeValueScore(newAvgQuality, newAvgCostUsd)

  // Compute quality_trend from rolling window
  const newQualityTrend = computeQualityTrend(newRecentScores)

  // Update entry
  entry.runs_count = newRunsCount
  entry.avg_quality = Math.round(newAvgQuality * 100) / 100
  entry.avg_cost_usd = Math.round(newAvgCostUsd * 1000000) / 1000000
  entry.avg_latency_ms = Math.round(newAvgLatencyMs * 100) / 100
  entry.recent_run_scores = newRecentScores
  entry.value_score = newValueScore
  entry.quality_trend = newQualityTrend
  entry.last_run_at = run.timestamp

  // Warn on degradation flip
  if (newQualityTrend === 'degrading' && prevQualityTrend !== 'degrading') {
    logger.warn('leaderboard', {
      event: 'quality_degradation_detected',
      task_id: taskId,
      model,
      prev_trend: prevQualityTrend,
      recent_scores: newRecentScores,
      avg_quality: entry.avg_quality,
    })
  }

  // Compute convergence for all entries sharing this task_id (after updating current)
  const taskEntries = leaderboard.entries.filter(e => e.task_id === taskId)
  const { convergence_status, convergence_confidence } = computeConvergence(taskEntries)

  // Apply convergence to all entries for this task (consistency)
  for (const taskEntry of leaderboard.entries) {
    if (taskEntry.task_id === taskId) {
      taskEntry.convergence_status = convergence_status
      taskEntry.convergence_confidence = convergence_confidence
    }
  }

  // Update leaderboard metadata
  leaderboard.updated_at = new Date().toISOString()

  // Save atomically
  await saveLeaderboard(filePath, leaderboard)

  return entry
}
