/**
 * reports.ts
 *
 * Report generation for the model leaderboard.
 * Provides three report modes: summary, by-task, and by-model.
 *
 * MODL-0040: Model Leaderboard
 *
 * @module model-selector/reports
 */

import type { Leaderboard, LeaderboardEntry } from './__types__/index.js'

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format a convergence display string.
 *
 * @param entry - Leaderboard entry
 * @returns e.g. 'CONVERGED (95%)' or 'exploring' or 'converging'
 */
function formatConvergence(entry: LeaderboardEntry): string {
  if (entry.convergence_status === 'converged') {
    const pct = Math.round(entry.convergence_confidence * 100)
    return `CONVERGED (${pct}%)`
  }
  return entry.convergence_status
}

/**
 * Format a single leaderboard entry as a markdown table row.
 * Prefixes with [ALERT] if quality_trend === 'degrading'.
 *
 * @param entry - Leaderboard entry to format
 * @returns Markdown table row string
 */
function formatRow(entry: LeaderboardEntry): string {
  const alert = entry.quality_trend === 'degrading' ? '[ALERT] ' : ''
  return (
    `| ${alert}${entry.task_id} | ${entry.model} | ${entry.runs_count} ` +
    `| ${entry.avg_quality.toFixed(1)} | ${entry.avg_cost_usd.toFixed(6)} ` +
    `| ${entry.avg_latency_ms.toFixed(0)}ms | ${entry.value_score.toFixed(2)} ` +
    `| ${formatConvergence(entry)} | ${entry.quality_trend} |`
  )
}

/**
 * Markdown table header for leaderboard reports.
 */
const TABLE_HEADER = [
  '| Task ID | Model | Runs | Avg Quality | Avg Cost (USD) | Avg Latency | Value Score | Convergence | Trend |',
  '|---------|-------|------|-------------|----------------|-------------|-------------|-------------|-------|',
].join('\n')

// ============================================================================
// Report Generators
// ============================================================================

/**
 * Generate a summary report of the entire leaderboard, sorted by value_score descending.
 *
 * Shows all entries across all tasks and models.
 * Entries with quality_trend === 'degrading' are prefixed with [ALERT].
 *
 * @param leaderboard - The loaded leaderboard
 * @returns Markdown string with summary table, or empty-state message
 */
export function generateSummaryReport(leaderboard: Leaderboard): string {
  if (leaderboard.entries.length === 0) {
    return 'No leaderboard entries found. Run models to populate the leaderboard.'
  }

  const sorted = [...leaderboard.entries].sort((a, b) => b.value_score - a.value_score)

  const rows = sorted.map(formatRow).join('\n')

  return [
    `# Model Leaderboard Summary`,
    ``,
    `Updated: ${leaderboard.updated_at}`,
    ``,
    TABLE_HEADER,
    rows,
  ].join('\n')
}

/**
 * Generate a report filtered to a specific task_id, sorted by avg_quality descending.
 *
 * Shows all models that have run for the given task.
 * Entries with quality_trend === 'degrading' are prefixed with [ALERT].
 *
 * @param leaderboard - The loaded leaderboard
 * @param taskId - Task ID to filter on
 * @returns Markdown string with task-filtered table, or empty-state message
 */
export function generateByTaskReport(leaderboard: Leaderboard, taskId: string): string {
  const filtered = leaderboard.entries.filter(e => e.task_id === taskId)

  if (filtered.length === 0) {
    return `No entries found for task '${taskId}'.`
  }

  const sorted = [...filtered].sort((a, b) => b.avg_quality - a.avg_quality)
  const rows = sorted.map(formatRow).join('\n')

  return [
    `# Model Leaderboard — Task: ${taskId}`,
    ``,
    `Updated: ${leaderboard.updated_at}`,
    ``,
    TABLE_HEADER,
    rows,
  ].join('\n')
}

/**
 * Generate a report filtered to a specific model, sorted by avg_quality descending.
 *
 * Shows all tasks that have used the given model.
 * Entries with quality_trend === 'degrading' are prefixed with [ALERT].
 *
 * @param leaderboard - The loaded leaderboard
 * @param modelName - Model identifier to filter on
 * @returns Markdown string with model-filtered table, or empty-state message
 */
export function generateByModelReport(leaderboard: Leaderboard, modelName: string): string {
  const filtered = leaderboard.entries.filter(e => e.model === modelName)

  if (filtered.length === 0) {
    return `No entries found for model '${modelName}'.`
  }

  const sorted = [...filtered].sort((a, b) => b.avg_quality - a.avg_quality)
  const rows = sorted.map(formatRow).join('\n')

  return [
    `# Model Leaderboard — Model: ${modelName}`,
    ``,
    `Updated: ${leaderboard.updated_at}`,
    ``,
    TABLE_HEADER,
    rows,
  ].join('\n')
}
