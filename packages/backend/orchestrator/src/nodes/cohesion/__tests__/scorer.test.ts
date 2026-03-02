/**
 * Unit tests for cohesion scorer.
 *
 * AC-12: Scorer tests covering threshold evaluation and weighted composite score.
 * AC-4: Deterministic inputs produce correct CohesionScoreSchema per category.
 * AC-5: Weighted composite score computed from configurable weights.
 */

import { describe, it, expect } from 'vitest'
import {
  computeWeightedViolationCount,
  computeCategoryScore,
  computeCompositeScore,
  assembleScanResult,
} from '../scorer.js'
import type { PatternViolation, CohesionScore } from '../__types__/index.js'
import { CohesionScannerConfigSchema } from '../__types__/index.js'

// ============================================================================
// Test Fixtures
// ============================================================================

const makeViolation = (
  category: PatternViolation['category'],
  confidence: PatternViolation['confidence'],
): PatternViolation => ({
  category,
  rule: 'test-rule',
  filePath: '/test/file.ts',
  description: 'Test violation',
  confidence,
})

const defaultConfig = CohesionScannerConfigSchema.parse({
  rootDir: '/test',
})

// ============================================================================
// computeWeightedViolationCount
// ============================================================================

describe('computeWeightedViolationCount', () => {
  it('returns 0 for empty violations array', () => {
    expect(computeWeightedViolationCount([])).toBe(0)
  })

  it('weights high confidence violations as 1.0', () => {
    const violations = [makeViolation('route-handler', 'high')]
    expect(computeWeightedViolationCount(violations)).toBe(1.0)
  })

  it('weights medium confidence violations as 0.7', () => {
    const violations = [makeViolation('zod-naming', 'medium')]
    expect(computeWeightedViolationCount(violations)).toBeCloseTo(0.7)
  })

  it('weights low confidence violations as 0.3', () => {
    const violations = [makeViolation('import-convention', 'low')]
    expect(computeWeightedViolationCount(violations)).toBeCloseTo(0.3)
  })

  it('sums mixed confidence violations correctly', () => {
    const violations = [
      makeViolation('route-handler', 'high'),    // 1.0
      makeViolation('zod-naming', 'medium'),     // 0.7
      makeViolation('import-convention', 'low'), // 0.3
    ]
    expect(computeWeightedViolationCount(violations)).toBeCloseTo(2.0)
  })
})

// ============================================================================
// computeCategoryScore
// ============================================================================

describe('computeCategoryScore', () => {
  it('returns score 1.0 with thresholdMet: true for 0 sample size', () => {
    const score = computeCategoryScore('route-handler', [], 0, 0.8)
    expect(score.score).toBe(1.0)
    expect(score.thresholdMet).toBe(true)
    expect(score.sampleSize).toBe(0)
    expect(score.violationCount).toBe(0)
  })

  it('returns score 1.0 for no violations', () => {
    const score = computeCategoryScore('zod-naming', [], 100, 0.8)
    expect(score.score).toBe(1.0)
    expect(score.thresholdMet).toBe(true)
  })

  it('correctly computes score from violations', () => {
    // 10 high-confidence violations in 100 files = 1 - 10/100 = 0.9
    const violations = Array.from({ length: 10 }, () =>
      makeViolation('import-convention', 'high'),
    )
    const score = computeCategoryScore('import-convention', violations, 100, 0.8)
    expect(score.score).toBeCloseTo(0.9)
    expect(score.thresholdMet).toBe(true) // 0.9 >= 0.8
  })

  it('sets thresholdMet: false when score is below threshold', () => {
    // 50 high violations in 100 files = 1 - 50/100 = 0.5
    const violations = Array.from({ length: 50 }, () =>
      makeViolation('react-directory', 'high'),
    )
    const score = computeCategoryScore('react-directory', violations, 100, 0.8)
    expect(score.score).toBeCloseTo(0.5)
    expect(score.thresholdMet).toBe(false) // 0.5 < 0.8
  })

  it('clamps score to 0 when violations exceed sample size', () => {
    // More violations than files → score = max(0, negative) = 0
    const violations = Array.from({ length: 200 }, () =>
      makeViolation('route-handler', 'high'),
    )
    const score = computeCategoryScore('route-handler', violations, 100, 0.8)
    expect(score.score).toBe(0)
  })

  it('returns correct CohesionScoreSchema shape', () => {
    const score = computeCategoryScore('zod-naming', [], 50, 0.8)
    expect(score).toMatchObject({
      category: 'zod-naming',
      score: expect.any(Number),
      violationCount: expect.any(Number),
      sampleSize: 50,
      thresholdMet: expect.any(Boolean),
      violations: expect.any(Array),
    })
  })
})

// ============================================================================
// computeCompositeScore
// ============================================================================

describe('computeCompositeScore', () => {
  it('returns 1.0 for empty category scores', () => {
    expect(computeCompositeScore([], {})).toBe(1.0)
  })

  it('computes equal-weight composite score', () => {
    const scores: CohesionScore[] = [
      { category: 'route-handler', score: 0.8, violationCount: 0, sampleSize: 10, thresholdMet: true, violations: [] },
      { category: 'zod-naming', score: 0.6, violationCount: 0, sampleSize: 10, thresholdMet: false, violations: [] },
    ]
    const weights = { 'route-handler': 0.5, 'zod-naming': 0.5 }
    // (0.8 * 0.5 + 0.6 * 0.5) / 1.0 = 0.7
    const composite = computeCompositeScore(scores, weights)
    expect(composite).toBeCloseTo(0.7)
  })

  it('computes weighted composite score correctly', () => {
    const scores: CohesionScore[] = [
      { category: 'route-handler', score: 1.0, violationCount: 0, sampleSize: 10, thresholdMet: true, violations: [] },
      { category: 'zod-naming', score: 0.0, violationCount: 0, sampleSize: 10, thresholdMet: false, violations: [] },
    ]
    // Route-handler has 3x weight of zod-naming
    const weights = { 'route-handler': 0.75, 'zod-naming': 0.25 }
    // (1.0 * 0.75 + 0.0 * 0.25) / 1.0 = 0.75
    const composite = computeCompositeScore(scores, weights)
    expect(composite).toBeCloseTo(0.75)
  })

  it('falls back to equal weights for missing category', () => {
    const scores: CohesionScore[] = [
      { category: 'route-handler', score: 0.5, violationCount: 0, sampleSize: 5, thresholdMet: false, violations: [] },
    ]
    // No weights provided → falls back to 1/N per category
    const composite = computeCompositeScore(scores, {})
    expect(composite).toBeCloseTo(0.5)
  })
})

// ============================================================================
// assembleScanResult
// ============================================================================

describe('assembleScanResult', () => {
  it('identifies categoriesBelow correctly', () => {
    const scores: CohesionScore[] = [
      { category: 'route-handler', score: 0.9, violationCount: 0, sampleSize: 10, thresholdMet: true, violations: [] },
      { category: 'zod-naming', score: 0.5, violationCount: 5, sampleSize: 10, thresholdMet: false, violations: [] },
    ]
    const result = assembleScanResult(scores, defaultConfig, '/test')
    expect(result.categoriesBelow).toEqual(['zod-naming'])
    expect(result.overallThresholdMet).toBe(false)
  })

  it('sets overallThresholdMet: true when all categories pass', () => {
    const scores: CohesionScore[] = [
      { category: 'route-handler', score: 0.9, violationCount: 0, sampleSize: 10, thresholdMet: true, violations: [] },
      { category: 'zod-naming', score: 0.85, violationCount: 0, sampleSize: 10, thresholdMet: true, violations: [] },
    ]
    const result = assembleScanResult(scores, defaultConfig, '/test')
    expect(result.overallThresholdMet).toBe(true)
    expect(result.categoriesBelow).toHaveLength(0)
  })

  it('returns valid CohesionScanResultSchema shape', () => {
    const result = assembleScanResult([], defaultConfig, '/test')
    expect(result).toMatchObject({
      scannedAt: expect.any(String),
      rootDir: '/test',
      scores: expect.any(Array),
      compositeScore: expect.any(Number),
      overallThresholdMet: expect.any(Boolean),
      totalViolations: expect.any(Number),
      filesScanned: expect.any(Number),
      categoriesBelow: expect.any(Array),
    })
  })
})
