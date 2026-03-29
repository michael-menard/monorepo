/**
 * quality-evaluation.ts
 *
 * Zod schemas and inferred types for quality evaluation results.
 * Defines the contract for evaluating model output quality across
 * five dimensions: correctness, completeness, coherence, compliance,
 * and cost_efficiency.
 *
 * @module models/__types__/quality-evaluation
 */

import { z } from 'zod'
import { TaskContractSchema } from './task-contract.js'

// ============================================================================
// Dimension Score Schema
// ============================================================================

/**
 * Quality dimension score for a single evaluation dimension.
 * Each dimension produces a score (0-100), a rationale, and a weight.
 *
 * @example
 * ```typescript
 * const score = QualityDimensionScoreSchema.parse({
 *   dimension: 'correctness',
 *   score: 85,
 *   rationale: 'Output matched 4 of 5 required elements',
 *   weight: 0.2,
 * })
 * ```
 */
export const QualityDimensionScoreSchema = z.object({
  /**
   * The evaluation dimension.
   * - correctness: Does the output fulfill stated requirements?
   * - completeness: Are all required elements present?
   * - coherence: Is the output logically structured?
   * - compliance: Does the output respect contract flags (security, ollama)?
   * - cost_efficiency: Was the selected tier appropriate for the quality achieved?
   */
  dimension: z.enum(['correctness', 'completeness', 'coherence', 'compliance', 'cost_efficiency']),

  /**
   * Dimension score from 0 to 100 (inclusive).
   */
  score: z.number().min(0).max(100),

  /**
   * Human-readable rationale explaining the score.
   */
  rationale: z.string(),

  /**
   * Weight for this dimension in the overall weighted average.
   * Must be between 0 and 1. Default is 0.2 (equal weight across 5 dimensions).
   */
  weight: z.number().min(0).max(1).optional().default(0.2),
})

export type QualityDimensionScore = z.infer<typeof QualityDimensionScoreSchema>

// ============================================================================
// Quality Evaluation Schema
// ============================================================================

/**
 * Complete quality evaluation result for a model output.
 * Captures the task contract, selected tier, model used, and quality metrics.
 *
 * @example
 * ```typescript
 * const evaluation = QualityEvaluationSchema.parse({
 *   taskContract: { taskType: 'code_generation', complexity: 'medium', ... },
 *   selectedTier: 'tier-1',
 *   modelUsed: 'anthropic/claude-sonnet-4.5',
 *   qualityScore: 82.5,
 *   qualityDimensions: [...],
 *   contractMismatch: false,
 *   timestamp: new Date().toISOString(),
 * })
 * ```
 */
export const QualityEvaluationSchema = z.object({
  /**
   * The original task contract used for model selection.
   */
  taskContract: TaskContractSchema,

  /**
   * The tier that was selected for task execution.
   */
  selectedTier: z.enum(['tier-0', 'tier-1', 'tier-2', 'tier-3']),

  /**
   * The model identifier used (e.g., 'anthropic/claude-sonnet-4.5').
   */
  modelUsed: z.string(),

  /**
   * Overall quality score (0-100), calculated as weighted average of dimensions.
   */
  qualityScore: z.number().min(0).max(100),

  /**
   * Scores for each of the five evaluation dimensions.
   */
  qualityDimensions: z.array(QualityDimensionScoreSchema),

  /**
   * Whether a contract mismatch was detected.
   * - true if over-provisioned (score exceeds threshold by 20+ points) or
   *   under-provisioned (score falls below quality requirement threshold).
   */
  contractMismatch: z.boolean().optional(),

  /**
   * Human-readable recommendation for tier adjustment (when mismatch detected).
   */
  recommendation: z.string().optional(),

  /**
   * ISO 8601 timestamp of when the evaluation was performed.
   */
  timestamp: z.string().datetime(),
})

export type QualityEvaluation = z.infer<typeof QualityEvaluationSchema>
