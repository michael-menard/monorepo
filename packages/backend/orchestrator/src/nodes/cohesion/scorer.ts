/**
 * Cohesion Score Computation
 *
 * Computes per-category scores and the weighted composite score from
 * detected pattern violations. Scores are in [0, 1] with 1 = fully compliant.
 *
 * Confidence weights: high=1.0, medium=0.7, low=0.3
 *
 * Story: APIP-4020 - Cohesion Scanner
 */

import {
  CohesionScoreSchema,
  CohesionScanResultSchema,
  type CohesionCategory,
  type CohesionScore,
  type CohesionScanResult,
  type PatternViolation,
  type CohesionScannerConfig,
} from './__types__/index.js'

// ============================================================================
// Constants
// ============================================================================

/** Confidence-to-weight mapping for scoring */
const CONFIDENCE_WEIGHTS: Record<'high' | 'medium' | 'low', number> = {
  high: 1.0,
  medium: 0.7,
  low: 0.3,
}

// ============================================================================
// Score Computation
// ============================================================================

/**
 * Computes the confidence-weighted violation count for a list of violations.
 *
 * @param violations - Violations to weight
 * @returns Weighted count (float)
 */
export function computeWeightedViolationCount(violations: readonly PatternViolation[]): number {
  return violations.reduce((sum, v) => sum + CONFIDENCE_WEIGHTS[v.confidence], 0)
}

/**
 * Computes a category score from violations and sample size.
 *
 * Score formula:
 *   score = max(0, 1 - (weightedViolations / sampleSize))
 *
 * A file can contribute at most 1 weighted violation unit. The score
 * represents the fraction of sampled files that are compliant.
 *
 * AC-4: Deterministic inputs produce correct CohesionScoreSchema per category.
 *
 * @param category - The category being scored
 * @param violations - All violations detected for this category
 * @param sampleSize - Number of files that were sampled
 * @param threshold - Minimum acceptable score for this category
 * @returns CohesionScore
 */
export function computeCategoryScore(
  category: CohesionCategory,
  violations: readonly PatternViolation[],
  sampleSize: number,
  threshold: number,
): CohesionScore {
  if (sampleSize === 0) {
    return CohesionScoreSchema.parse({
      category,
      score: 1.0,
      violationCount: 0,
      sampleSize: 0,
      thresholdMet: true,
      violations: [],
    })
  }

  const weightedCount = computeWeightedViolationCount(violations)
  // Cap the penalty so a single file can't tank the entire score below 0
  const score = Math.max(0, 1 - weightedCount / sampleSize)

  return CohesionScoreSchema.parse({
    category,
    score,
    violationCount: weightedCount,
    sampleSize,
    thresholdMet: score >= threshold,
    violations: [...violations],
  })
}

/**
 * Computes the weighted composite score from per-category scores.
 *
 * AC-5: Weighted composite score computed from configurable weights.
 *
 * @param categoryScores - Array of per-category scores
 * @param weightings - Weight per category (should sum to ~1.0)
 * @returns Composite score in [0, 1]
 */
export function computeCompositeScore(
  categoryScores: readonly CohesionScore[],
  weightings: Partial<Record<CohesionCategory, number>>,
): number {
  if (categoryScores.length === 0) return 1.0

  let weightedSum = 0
  let totalWeight = 0

  for (const categoryScore of categoryScores) {
    const weight = weightings[categoryScore.category] ?? 1 / categoryScores.length
    weightedSum += categoryScore.score * weight
    totalWeight += weight
  }

  if (totalWeight === 0) return 1.0

  return Math.min(1, Math.max(0, weightedSum / totalWeight))
}

/**
 * Assembles a complete CohesionScanResult from per-category scores and config.
 *
 * @param categoryScores - Per-category scores (already computed)
 * @param config - Scanner configuration for weightings and thresholds
 * @param rootDir - Directory that was scanned
 * @returns Full scan result
 */
export function assembleScanResult(
  categoryScores: CohesionScore[],
  config: CohesionScannerConfig,
  rootDir: string,
): CohesionScanResult {
  const compositeScore = computeCompositeScore(categoryScores, config.weightings)

  const categoriesBelow = categoryScores.filter(s => !s.thresholdMet).map(s => s.category)

  const totalViolations = categoryScores.reduce((sum, s) => sum + s.violationCount, 0)
  const filesScanned = categoryScores.reduce((sum, s) => sum + s.sampleSize, 0)

  // Overall threshold is met if ALL categories meet their thresholds
  const overallThresholdMet = categoriesBelow.length === 0

  return CohesionScanResultSchema.parse({
    scannedAt: new Date().toISOString(),
    rootDir,
    scores: categoryScores,
    compositeScore,
    overallThresholdMet,
    totalViolations,
    filesScanned,
    categoriesBelow,
  })
}
