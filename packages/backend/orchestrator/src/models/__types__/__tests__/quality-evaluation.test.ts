/**
 * quality-evaluation.test.ts
 *
 * Tests for QualityEvaluationSchema and QualityDimensionScoreSchema.
 * Covers validation, optional fields, invalid inputs, and type inference.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  QualityDimensionScoreSchema,
  QualityEvaluationSchema,
  type QualityDimensionScore,
  type QualityEvaluation,
} from '../quality-evaluation.js'

// ============================================================================
// Helper: Minimal valid task contract
// ============================================================================

const validTaskContract = {
  taskType: 'code_generation',
  complexity: 'medium' as const,
  qualityRequirement: 'good' as const,
  requiresReasoning: false,
  securitySensitive: false,
  allowOllama: true,
}

const validDimension = {
  dimension: 'correctness' as const,
  score: 80,
  rationale: 'Output matched requirements well',
  weight: 0.2,
}

const validEvaluation = {
  taskContract: validTaskContract,
  selectedTier: 'tier-1' as const,
  modelUsed: 'anthropic/claude-sonnet-4.5',
  qualityScore: 80,
  qualityDimensions: [
    { dimension: 'correctness', score: 80, rationale: 'good', weight: 0.2 },
    { dimension: 'completeness', score: 75, rationale: 'ok', weight: 0.2 },
    { dimension: 'coherence', score: 85, rationale: 'great', weight: 0.2 },
    { dimension: 'compliance', score: 90, rationale: 'compliant', weight: 0.2 },
    { dimension: 'cost_efficiency', score: 70, rationale: 'efficient', weight: 0.2 },
  ],
  timestamp: new Date().toISOString(),
}

// ============================================================================
// QualityDimensionScoreSchema tests
// ============================================================================

describe('QualityDimensionScoreSchema', () => {
  it('should parse a valid dimension score with all fields', () => {
    const result = QualityDimensionScoreSchema.parse(validDimension)
    expect(result.dimension).toBe('correctness')
    expect(result.score).toBe(80)
    expect(result.rationale).toBe('Output matched requirements well')
    expect(result.weight).toBe(0.2)
  })

  it('should parse without optional weight (defaults to 0.2)', () => {
    const result = QualityDimensionScoreSchema.parse({
      dimension: 'completeness',
      score: 75,
      rationale: 'All elements present',
    })
    expect(result.weight).toBe(0.2)
  })

  it('should accept all valid dimension enum values', () => {
    const dimensions = ['correctness', 'completeness', 'coherence', 'compliance', 'cost_efficiency'] as const
    for (const dim of dimensions) {
      const result = QualityDimensionScoreSchema.parse({
        dimension: dim,
        score: 70,
        rationale: `Testing ${dim}`,
      })
      expect(result.dimension).toBe(dim)
    }
  })

  it('should reject invalid dimension enum value', () => {
    expect(() =>
      QualityDimensionScoreSchema.parse({
        dimension: 'invalid_dimension',
        score: 70,
        rationale: 'test',
      }),
    ).toThrow(z.ZodError)
  })

  it('should reject score below 0', () => {
    expect(() =>
      QualityDimensionScoreSchema.parse({ ...validDimension, score: -1 }),
    ).toThrow(z.ZodError)
  })

  it('should reject score above 100', () => {
    expect(() =>
      QualityDimensionScoreSchema.parse({ ...validDimension, score: 101 }),
    ).toThrow(z.ZodError)
  })

  it('should accept score of exactly 0', () => {
    const result = QualityDimensionScoreSchema.parse({ ...validDimension, score: 0 })
    expect(result.score).toBe(0)
  })

  it('should accept score of exactly 100', () => {
    const result = QualityDimensionScoreSchema.parse({ ...validDimension, score: 100 })
    expect(result.score).toBe(100)
  })

  it('should reject weight below 0', () => {
    expect(() =>
      QualityDimensionScoreSchema.parse({ ...validDimension, weight: -0.1 }),
    ).toThrow(z.ZodError)
  })

  it('should reject weight above 1', () => {
    expect(() =>
      QualityDimensionScoreSchema.parse({ ...validDimension, weight: 1.1 }),
    ).toThrow(z.ZodError)
  })

  it('should accept weight of exactly 0', () => {
    const result = QualityDimensionScoreSchema.parse({ ...validDimension, weight: 0 })
    expect(result.weight).toBe(0)
  })

  it('should accept weight of exactly 1', () => {
    const result = QualityDimensionScoreSchema.parse({ ...validDimension, weight: 1 })
    expect(result.weight).toBe(1)
  })

  it('should infer correct TypeScript type', () => {
    const score: QualityDimensionScore = QualityDimensionScoreSchema.parse(validDimension)
    // Type check: dimension must be the enum type
    expect(['correctness', 'completeness', 'coherence', 'compliance', 'cost_efficiency']).toContain(
      score.dimension,
    )
  })
})

// ============================================================================
// QualityEvaluationSchema tests
// ============================================================================

describe('QualityEvaluationSchema', () => {
  it('should parse a valid evaluation with all fields', () => {
    const result = QualityEvaluationSchema.parse(validEvaluation)
    expect(result.selectedTier).toBe('tier-1')
    expect(result.qualityScore).toBe(80)
    expect(result.qualityDimensions).toHaveLength(5)
    expect(result.contractMismatch).toBeUndefined()
    expect(result.recommendation).toBeUndefined()
  })

  it('should parse valid evaluation with optional contractMismatch and recommendation', () => {
    const result = QualityEvaluationSchema.parse({
      ...validEvaluation,
      contractMismatch: true,
      recommendation: 'Consider using tier-2 to reduce cost',
    })
    expect(result.contractMismatch).toBe(true)
    expect(result.recommendation).toBe('Consider using tier-2 to reduce cost')
  })

  it('should parse without optional fields', () => {
    const result = QualityEvaluationSchema.parse(validEvaluation)
    expect(result.contractMismatch).toBeUndefined()
    expect(result.recommendation).toBeUndefined()
  })

  it('should accept all valid selectedTier enum values', () => {
    const tiers = ['tier-0', 'tier-1', 'tier-2', 'tier-3'] as const
    for (const tier of tiers) {
      const result = QualityEvaluationSchema.parse({ ...validEvaluation, selectedTier: tier })
      expect(result.selectedTier).toBe(tier)
    }
  })

  it('should reject invalid selectedTier', () => {
    expect(() =>
      QualityEvaluationSchema.parse({ ...validEvaluation, selectedTier: 'tier-4' }),
    ).toThrow(z.ZodError)
  })

  it('should reject qualityScore below 0', () => {
    expect(() =>
      QualityEvaluationSchema.parse({ ...validEvaluation, qualityScore: -1 }),
    ).toThrow(z.ZodError)
  })

  it('should reject qualityScore above 100', () => {
    expect(() =>
      QualityEvaluationSchema.parse({ ...validEvaluation, qualityScore: 101 }),
    ).toThrow(z.ZodError)
  })

  it('should reject invalid taskContract (bad qualityRequirement)', () => {
    expect(() =>
      QualityEvaluationSchema.parse({
        ...validEvaluation,
        taskContract: { ...validTaskContract, qualityRequirement: 'excellent' },
      }),
    ).toThrow(z.ZodError)
  })

  it('should reject missing required fields', () => {
    const { taskContract: _, ...withoutContract } = validEvaluation
    expect(() => QualityEvaluationSchema.parse(withoutContract)).toThrow(z.ZodError)
  })

  it('should reject invalid timestamp format', () => {
    expect(() =>
      QualityEvaluationSchema.parse({ ...validEvaluation, timestamp: 'not-a-date' }),
    ).toThrow(z.ZodError)
  })

  it('should accept a valid ISO 8601 timestamp', () => {
    const ts = '2026-02-16T12:00:00Z'
    const result = QualityEvaluationSchema.parse({ ...validEvaluation, timestamp: ts })
    expect(result.timestamp).toBe(ts)
  })

  it('should infer correct TypeScript type', () => {
    const evaluation: QualityEvaluation = QualityEvaluationSchema.parse(validEvaluation)
    expect(typeof evaluation.qualityScore).toBe('number')
    expect(Array.isArray(evaluation.qualityDimensions)).toBe(true)
  })

  it('should reject taskContract with invalid complexity', () => {
    expect(() =>
      QualityEvaluationSchema.parse({
        ...validEvaluation,
        taskContract: { ...validTaskContract, complexity: 'extreme' },
      }),
    ).toThrow(z.ZodError)
  })
})
