/**
 * benchmark-harness.ts
 *
 * Benchmark harness runner for Ollama model evaluation.
 * Iterates all REQUIRED_MODELS against each task in the benchmark corpus,
 * measures latency, invokes evaluateQuality() and recordRun(), and builds a summary table.
 *
 * WINT-0270: Benchmark Harness for Ollama Model Selection
 * ARCH-002: Direct HTTP fetch to Ollama (not via PipelineModelRouter).
 * ARCH-003: REQUIRED_MODELS imported from constants.ts.
 *
 * IMPORTANT — QUALITY EVALUATOR LIMITATION:
 * See QUALITY_EVALUATOR_LIMITATION constant below for documentation.
 *
 * @module model-selector/benchmark-harness
 */

import { logger } from '@repo/logger'
import { createTaskContract } from '../models/__types__/task-contract.js'
import { evaluateQuality } from '../models/quality-evaluator.js'
import { recordRun } from './leaderboard.js'
import {
  MODEL_LEADERBOARD_PATH,
  REQUIRED_MODELS,
  OLLAMA_BASE_URL,
  OLLAMA_GENERATE_PATH,
  OLLAMA_TIMEOUT_MS,
} from './constants.js'
import type {
  BenchmarkTask,
  BenchmarkResult,
  BenchmarkSummary,
  ModelSummaryRow,
} from './__types__/benchmark.js'
import { BenchmarkResultSchema, BenchmarkSummarySchema } from './__types__/benchmark.js'
import { BENCHMARK_CORPUS } from './benchmark-corpus.js'

// ============================================================================
// Quality Evaluator Limitation (AC-4)
// ============================================================================

/**
 * Documents the fundamental limitation of the quality evaluator used in the benchmark.
 *
 * AC-4 REQUIREMENT: This limitation MUST be documented and printed in the summary table header.
 *
 * The evaluateQuality() function from quality-evaluator.ts uses heuristic scoring only:
 *   - Keyword matching: checks for task-type keywords in output
 *   - Length heuristics: score based on output length vs expected minimum
 *   - Structural checks: paragraph count, transition words, list presence
 *   - NO semantic analysis
 *   - NO execution/compilation of generated code
 *   - NO comparison to reference outputs
 *
 * Scores should be treated as relative indicators for ranking, NOT absolute quality measures.
 * A model scoring 80 does not mean 80% correctness — it means it scored well on the heuristics.
 */
export const QUALITY_EVALUATOR_LIMITATION =
  'WARNING: Quality scores are HEURISTIC-ONLY (keyword matching, length heuristics). ' +
  'No semantic analysis, no code execution, no reference comparison. ' +
  'Use scores for relative model ranking only, not absolute quality assessment.'

// ============================================================================
// Ollama HTTP Client
// ============================================================================

/**
 * Response shape from Ollama /api/generate endpoint (non-streaming).
 */
const OllamaResponseSchema = {
  response: '',
  done: false,
}
type OllamaResponse = typeof OllamaResponseSchema & { response: string; done: boolean }

/**
 * Call the Ollama generate API for a single (model, prompt) pair.
 *
 * ARCH-002: Direct HTTP fetch — no PipelineModelRouter.
 * Returns raw text from the model response.
 *
 * @param model - Ollama model identifier (e.g., 'qwen2.5-coder:14b')
 * @param prompt - The prompt string to send
 * @param baseUrl - Base URL for Ollama API (injectable for tests)
 * @param timeoutMs - Timeout in milliseconds
 * @returns Raw response text from the model
 * @throws Error if the request fails or the model returns a non-OK status
 */
export async function callOllama(
  model: string,
  prompt: string,
  baseUrl: string = OLLAMA_BASE_URL,
  timeoutMs: number = OLLAMA_TIMEOUT_MS,
): Promise<string> {
  const url = `${baseUrl}${OLLAMA_GENERATE_PATH}`

  logger.info('benchmark_harness', {
    event: 'ollama_call_start',
    model,
    prompt_length: prompt.length,
    url,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    throw new Error(`Ollama returned HTTP ${response.status} for model ${model}`)
  }

  const data = (await response.json()) as OllamaResponse

  logger.info('benchmark_harness', {
    event: 'ollama_call_complete',
    model,
    response_length: data.response?.length ?? 0,
    done: data.done,
  })

  return data.response ?? ''
}

// ============================================================================
// Single Run Executor
// ============================================================================

/**
 * Execute a single (model, task) benchmark run.
 *
 * Steps:
 * 1. Call Ollama to get raw output + measure latency
 * 2. Create a TaskContract for the task category
 * 3. Call evaluateQuality() to get heuristic quality score
 * 4. Return BenchmarkResult (does NOT persist — caller does recordRun)
 *
 * AC-7: cost_usd is always set to 0 (Ollama zero-cost sentinel per WINT-0260).
 *
 * @param model - Ollama model identifier
 * @param task - Benchmark task to run
 * @param leaderboardPath - Path to leaderboard YAML (for recordRun)
 * @param ollamaBaseUrl - Injectable base URL for tests
 * @returns BenchmarkResult (may include error if Ollama call failed)
 */
export async function runSingleBenchmark(
  model: string,
  task: BenchmarkTask,
  leaderboardPath: string,
  ollamaBaseUrl: string = OLLAMA_BASE_URL,
): Promise<BenchmarkResult> {
  const startTime = Date.now()
  let output = ''
  let error: string | null = null
  let qualityScore = 0

  try {
    output = await callOllama(model, task.prompt, ollamaBaseUrl)

    // Build task contract for quality evaluation
    const contract = createTaskContract({
      taskType: task.category,
      complexity: 'medium',
      qualityRequirement: 'good',
      requiresReasoning: false,
      securitySensitive: false,
      allowOllama: true,
    })

    // Evaluate quality using heuristic evaluator
    // NOTE: See QUALITY_EVALUATOR_LIMITATION for heuristic-only warning
    const evaluation = evaluateQuality(contract, 'tier-3', output)
    qualityScore = evaluation.qualityScore

    const latencyMs = Date.now() - startTime

    // Persist to leaderboard via recordRun
    // AC-7: cost_usd = 0 (Ollama zero-cost sentinel)
    await recordRun(leaderboardPath, {
      ...evaluation,
      modelUsed: model,
      cost_usd: 0,
      latency_ms: latencyMs,
      task_id: task.id,
    })

    const result = BenchmarkResultSchema.parse({
      taskId: task.id,
      model,
      category: task.category,
      output,
      latency_ms: latencyMs,
      cost_usd: 0,
      qualityScore,
      error: null,
    })

    logger.info('benchmark_harness', {
      event: 'run_complete',
      model,
      task_id: task.id,
      quality_score: qualityScore,
      latency_ms: latencyMs,
    })

    return result
  } catch (err) {
    const latencyMs = Date.now() - startTime
    error = err instanceof Error ? err.message : String(err)

    logger.warn('benchmark_harness', {
      event: 'run_failed',
      model,
      task_id: task.id,
      error,
      latency_ms: latencyMs,
    })

    return BenchmarkResultSchema.parse({
      taskId: task.id,
      model,
      category: task.category,
      output: '',
      latency_ms: latencyMs,
      cost_usd: 0,
      qualityScore: 0,
      error,
    })
  }
}

// ============================================================================
// Summary Table Builder
// ============================================================================

/**
 * Build a per-model summary from all benchmark results.
 *
 * AC-2: Aggregates results across all tasks for each model.
 * Sorts by avgQualityScore descending.
 *
 * @param results - All benchmark results
 * @param leaderboardPath - Path to leaderboard YAML
 * @returns BenchmarkSummary
 */
export function buildSummary(
  results: BenchmarkResult[],
  leaderboardPath: string,
): BenchmarkSummary {
  const modelMap = new Map<string, BenchmarkResult[]>()

  for (const result of results) {
    const existing = modelMap.get(result.model) ?? []
    existing.push(result)
    modelMap.set(result.model, existing)
  }

  const modelRows: ModelSummaryRow[] = []

  for (const [model, modelResults] of modelMap) {
    const successful = modelResults.filter(r => r.error === null)
    const failed = modelResults.filter(r => r.error !== null)

    const avgQuality =
      successful.length > 0
        ? successful.reduce((sum, r) => sum + r.qualityScore, 0) / successful.length
        : 0

    const avgLatency =
      successful.length > 0
        ? successful.reduce((sum, r) => sum + r.latency_ms, 0) / successful.length
        : 0

    // Per-category averages
    const categoryScores: Record<string, number> = {}
    const categories = ['code_generation', 'code_review', 'elaboration_analysis', 'lint_syntax']

    for (const category of categories) {
      const catResults = successful.filter(r => r.category === category)
      categoryScores[category] =
        catResults.length > 0
          ? catResults.reduce((sum, r) => sum + r.qualityScore, 0) / catResults.length
          : 0
    }

    modelRows.push({
      model,
      tasksCompleted: successful.length,
      tasksFailed: failed.length,
      avgQualityScore: Math.round(avgQuality * 100) / 100,
      avgLatencyMs: Math.round(avgLatency),
      categoryScores,
    })
  }

  // Sort by avgQualityScore descending
  modelRows.sort((a, b) => b.avgQualityScore - a.avgQualityScore)

  const totalRuns = results.length
  const successfulRuns = results.filter(r => r.error === null).length
  const failedRuns = results.filter(r => r.error !== null).length

  return BenchmarkSummarySchema.parse({
    timestamp: new Date().toISOString(),
    totalRuns,
    successfulRuns,
    failedRuns,
    modelRows,
    leaderboardPath,
  })
}

// ============================================================================
// Summary Table Printer
// ============================================================================

/**
 * Print the benchmark summary table to the logger.
 *
 * AC-4: Prints QUALITY_EVALUATOR_LIMITATION in the header.
 *
 * @param summary - The benchmark summary to print
 */
export function printSummaryTable(summary: BenchmarkSummary): void {
  logger.info('benchmark_harness', {
    event: 'summary_header',
    message: `\n${'='.repeat(80)}\nBENCHMARK SUMMARY — ${summary.timestamp}\n${'='.repeat(80)}`,
  })

  // AC-4: Print limitation warning
  logger.info('benchmark_harness', {
    event: 'quality_evaluator_limitation',
    message: QUALITY_EVALUATOR_LIMITATION,
  })

  logger.info('benchmark_harness', {
    event: 'summary_stats',
    total_runs: summary.totalRuns,
    successful_runs: summary.successfulRuns,
    failed_runs: summary.failedRuns,
    leaderboard_path: summary.leaderboardPath,
  })

  logger.info('benchmark_harness', {
    event: 'summary_table_header',
    message: 'Model Rankings (sorted by avg quality score, descending):',
  })

  for (let i = 0; i < summary.modelRows.length; i++) {
    const row = summary.modelRows[i]
    logger.info('benchmark_harness', {
      event: 'summary_table_row',
      rank: i + 1,
      model: row.model,
      avg_quality: row.avgQualityScore,
      avg_latency_ms: row.avgLatencyMs,
      tasks_completed: row.tasksCompleted,
      tasks_failed: row.tasksFailed,
      category_scores: row.categoryScores,
    })
  }
}

// ============================================================================
// Main Harness Runner
// ============================================================================

/**
 * Options for the benchmark harness runner.
 */
export const BenchmarkOptionsSchema = {
  /**
   * Path to the leaderboard YAML. Defaults to MODEL_LEADERBOARD_PATH.
   * Inject a temp path for tests.
   */
  leaderboardPath: MODEL_LEADERBOARD_PATH,

  /**
   * Override models to benchmark. Defaults to REQUIRED_MODELS.
   */
  models: REQUIRED_MODELS as readonly string[],

  /**
   * Override task corpus. Defaults to BENCHMARK_CORPUS.
   */
  corpus: BENCHMARK_CORPUS as readonly BenchmarkTask[],

  /**
   * Ollama base URL. Defaults to OLLAMA_BASE_URL.
   * Inject for tests.
   */
  ollamaBaseUrl: OLLAMA_BASE_URL,
}

export type BenchmarkOptions = Partial<typeof BenchmarkOptionsSchema>

/**
 * Run the full benchmark harness.
 *
 * Iterates REQUIRED_MODELS x BENCHMARK_CORPUS tasks, measuring:
 * - latency_ms for each (model, task) pair
 * - qualityScore from evaluateQuality()
 * - Persists each run to the leaderboard via recordRun()
 *
 * AC-2: All 5 REQUIRED_MODELS x all tasks.
 * AC-3: evaluateQuality() + recordRun() called for each (model, task) pair.
 * AC-4: QUALITY_EVALUATOR_LIMITATION printed in summary header.
 * AC-7: cost_usd = 0 for all Ollama runs.
 *
 * @param options - Injectable options for leaderboard path, models, corpus, Ollama URL
 * @returns BenchmarkSummary with all results
 */
export async function runBenchmarkHarness(
  options: BenchmarkOptions = {},
): Promise<BenchmarkSummary> {
  const leaderboardPath = options.leaderboardPath ?? MODEL_LEADERBOARD_PATH
  const models = options.models ?? REQUIRED_MODELS
  const corpus = options.corpus ?? BENCHMARK_CORPUS
  const ollamaBaseUrl = options.ollamaBaseUrl ?? OLLAMA_BASE_URL

  logger.info('benchmark_harness', {
    event: 'harness_start',
    model_count: models.length,
    task_count: corpus.length,
    total_runs: models.length * corpus.length,
    leaderboard_path: leaderboardPath,
    quality_evaluator_limitation: QUALITY_EVALUATOR_LIMITATION,
  })

  const allResults: BenchmarkResult[] = []

  // Iterate models x tasks sequentially (avoid overwhelming local Ollama)
  for (const model of models) {
    for (const task of corpus) {
      logger.info('benchmark_harness', {
        event: 'run_start',
        model,
        task_id: task.id,
        category: task.category,
      })

      const result = await runSingleBenchmark(model, task, leaderboardPath, ollamaBaseUrl)
      allResults.push(result)
    }
  }

  const summary = buildSummary(allResults, leaderboardPath)
  printSummaryTable(summary)

  logger.info('benchmark_harness', {
    event: 'harness_complete',
    total_runs: summary.totalRuns,
    successful_runs: summary.successfulRuns,
    failed_runs: summary.failedRuns,
  })

  return summary
}
