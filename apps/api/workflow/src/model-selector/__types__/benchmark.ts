/**
 * benchmark.ts
 *
 * Zod schemas and inferred types for the benchmark harness.
 * Defines BenchmarkTask, BenchmarkResult, and BenchmarkSummary.
 *
 * WINT-0270: Benchmark Harness for Ollama Model Selection
 *
 * @module model-selector/__types__/benchmark
 */

import { z } from 'zod'

// ============================================================================
// Task Category Schema
// ============================================================================

/**
 * Benchmark task categories matching the four task types in scope.
 * Each category maps to real orchestrator work performed by Ollama models.
 */
export const BenchmarkCategorySchema = z.enum([
  'code_generation',
  'code_review',
  'elaboration_analysis',
  'lint_syntax',
])

export type BenchmarkCategory = z.infer<typeof BenchmarkCategorySchema>

// ============================================================================
// BenchmarkTask Schema
// ============================================================================

/**
 * A single benchmark task — one prompt to be run against each model.
 *
 * @example
 * ```typescript
 * const task = BenchmarkTaskSchema.parse({
 *   id: 'code_generation_001',
 *   category: 'code_generation',
 *   prompt: 'Write a TypeScript function that validates an email address using a Zod schema.',
 *   expectedKeywords: ['z.string()', 'email()', 'schema'],
 * })
 * ```
 */
export const BenchmarkTaskSchema = z.object({
  /**
   * Unique identifier for the task (e.g., 'code_generation_001').
   * Used as task_id in RunRecord for leaderboard grouping.
   */
  id: z.string().min(1),

  /**
   * Task category — maps to the four benchmark categories.
   */
  category: BenchmarkCategorySchema,

  /**
   * The prompt to send to the model.
   * Should be sourced from real monorepo context (actual TypeScript snippets,
   * real YAML fragments, real lint output).
   */
  prompt: z.string().min(10),

  /**
   * Optional list of keywords expected in a quality response.
   * Used by the heuristic quality evaluator as hints.
   */
  expectedKeywords: z.array(z.string()).optional().default([]),

  /**
   * Optional description of what a good response looks like.
   * For documentation purposes only — not used in evaluation logic.
   */
  description: z.string().optional(),
})

export type BenchmarkTask = z.infer<typeof BenchmarkTaskSchema>

// ============================================================================
// BenchmarkResult Schema
// ============================================================================

/**
 * The result of running a single benchmark task against a single model.
 *
 * @example
 * ```typescript
 * const result = BenchmarkResultSchema.parse({
 *   taskId: 'code_generation_001',
 *   model: 'qwen2.5-coder:14b',
 *   category: 'code_generation',
 *   output: 'function validateEmail...',
 *   latency_ms: 1234,
 *   cost_usd: 0,
 *   qualityScore: 72.5,
 *   error: null,
 * })
 * ```
 */
export const BenchmarkResultSchema = z.object({
  /**
   * The task ID that was executed.
   */
  taskId: z.string().min(1),

  /**
   * The Ollama model that generated this result.
   */
  model: z.string().min(1),

  /**
   * Category of the task.
   */
  category: BenchmarkCategorySchema,

  /**
   * Raw model output text. Empty string if error occurred.
   */
  output: z.string(),

  /**
   * Wall-clock latency in milliseconds for the inference call.
   */
  latency_ms: z.number().min(0),

  /**
   * Cost in USD. Always 0 for Ollama (zero-cost sentinel per WINT-0260).
   */
  cost_usd: z.literal(0),

  /**
   * Quality score from evaluateQuality() (0-100).
   * 0 if an error occurred.
   */
  qualityScore: z.number().min(0).max(100),

  /**
   * Error message if the Ollama call failed. Null on success.
   */
  error: z.string().nullable(),
})

export type BenchmarkResult = z.infer<typeof BenchmarkResultSchema>

// ============================================================================
// BenchmarkSummary Schema
// ============================================================================

/**
 * Per-model summary row for the benchmark summary table.
 *
 * Aggregates results across all tasks for a given model.
 */
export const ModelSummaryRowSchema = z.object({
  /**
   * Model identifier.
   */
  model: z.string().min(1),

  /**
   * Total number of tasks successfully completed (no error).
   */
  tasksCompleted: z.number().int().min(0),

  /**
   * Total number of tasks that failed with an error.
   */
  tasksFailed: z.number().int().min(0),

  /**
   * Average quality score across all successful tasks (0-100).
   */
  avgQualityScore: z.number().min(0).max(100),

  /**
   * Average latency in milliseconds across all successful tasks.
   */
  avgLatencyMs: z.number().min(0),

  /**
   * Average quality per category.
   */
  categoryScores: z.record(z.string(), z.number().min(0).max(100)),
})

export type ModelSummaryRow = z.infer<typeof ModelSummaryRowSchema>

/**
 * Complete benchmark summary — all models + per-category rankings.
 */
export const BenchmarkSummarySchema = z.object({
  /**
   * ISO 8601 timestamp of when the benchmark completed.
   */
  timestamp: z.string().datetime(),

  /**
   * Total number of (model, task) pairs attempted.
   */
  totalRuns: z.number().int().min(0),

  /**
   * Number of successful runs (no error).
   */
  successfulRuns: z.number().int().min(0),

  /**
   * Number of failed runs (Ollama error, timeout, etc.).
   */
  failedRuns: z.number().int().min(0),

  /**
   * Per-model summary rows, sorted by avgQualityScore descending.
   */
  modelRows: z.array(ModelSummaryRowSchema),

  /**
   * Path to the leaderboard YAML file where results were persisted.
   */
  leaderboardPath: z.string(),
})

export type BenchmarkSummary = z.infer<typeof BenchmarkSummarySchema>
