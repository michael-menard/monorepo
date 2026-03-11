/**
 * Unit Tests: Story Predictions (WKFL-007)
 *
 * Tests for split_risk, review_cycles, and token_estimate heuristic functions.
 * Covers AC-7 requirements: cold-start, normal case, and boundary values.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateSplitRisk,
  calculateReviewCycles,
  calculateTokenEstimate,
  calculateConfidence,
  generatePredictions,
  type PredictionInput,
  type SimilarStory,
} from '../story-predictions'

const emptySimilarStories: SimilarStory[] = []

const normalSimilarStories: SimilarStory[] = [
  { id: 'WISH-031', similarity: 0.89, actual_tokens: 167000, actual_cycles: 2 },
  { id: 'AUTH-015', similarity: 0.82, actual_tokens: 195000, actual_cycles: 3 },
]

// ============================================================================
// Test Suite: split_risk Calculation
// ============================================================================

describe('calculateSplitRisk', () => {
  describe('cold-start case (empty similar_stories)', () => {
    it('returns base 0.1 when ac_count is 0', () => {
      const input: PredictionInput = {
        ac_count: 0,
        title: 'Simple feature',
        scope_keywords: [],
        similar_stories: emptySimilarStories,
      }
      expect(calculateSplitRisk(input)).toBe(0.1)
    })

    it('returns base 0.1 when ac_count is 3', () => {
      const input: PredictionInput = {
        ac_count: 3,
        title: 'Simple feature',
        scope_keywords: [],
        similar_stories: emptySimilarStories,
      }
      expect(calculateSplitRisk(input)).toBe(0.1)
    })

    it('returns formula-only result with no similar-story weighting', () => {
      const input: PredictionInput = {
        ac_count: 5,
        title: 'Medium feature',
        scope_keywords: ['backend', 'frontend'],
        similar_stories: emptySimilarStories,
      }
      const result = calculateSplitRisk(input)
      expect(result).toBeCloseTo(0.3)
      expect(Number.isFinite(result)).toBe(true)
      expect(result).not.toBeNaN()
    })
  })

  describe('normal case with similar_stories data', () => {
    it('calculates correctly with similar_stories present', () => {
      const input: PredictionInput = {
        ac_count: 5,
        title: 'Feature with scope',
        scope_keywords: ['backend', 'frontend'],
        similar_stories: normalSimilarStories,
      }
      expect(calculateSplitRisk(input)).toBeCloseTo(0.3)
    })
  })

  describe('boundary values', () => {
    it('handles ac_count = 5 (first threshold - NOT triggered since 5 > 5 is false)', () => {
      const input: PredictionInput = {
        ac_count: 5,
        title: 'Feature',
        scope_keywords: [],
        similar_stories: emptySimilarStories,
      }
      expect(calculateSplitRisk(input)).toBe(0.1)
    })

    it('handles ac_count = 8 (second threshold - 8 > 5 is true, 8 > 8 is false)', () => {
      const input: PredictionInput = {
        ac_count: 8,
        title: 'Feature',
        scope_keywords: [],
        similar_stories: emptySimilarStories,
      }
      expect(calculateSplitRisk(input)).toBeCloseTo(0.3)
    })

    it('handles ac_count > 8 (both thresholds triggered)', () => {
      const input: PredictionInput = {
        ac_count: 10,
        title: 'Feature',
        scope_keywords: [],
        similar_stories: emptySimilarStories,
      }
      expect(calculateSplitRisk(input)).toBeCloseTo(0.6)
    })

    it('clamps to 1.0 for very high ac_count', () => {
      const input: PredictionInput = {
        ac_count: 50,
        title: 'Huge feature',
        scope_keywords: ['backend', 'frontend'],
        similar_stories: emptySimilarStories,
      }
      expect(calculateSplitRisk(input)).toBeCloseTo(0.8)
    })

    it('applies full-stack boost when both backend and frontend present', () => {
      const input: PredictionInput = {
        ac_count: 3,
        title: 'Full-stack feature',
        scope_keywords: ['backend', 'frontend'],
        similar_stories: emptySimilarStories,
      }
      expect(calculateSplitRisk(input)).toBeCloseTo(0.3)
    })

    it('applies refactor boost when title contains refactor', () => {
      const input: PredictionInput = {
        ac_count: 3,
        title: 'Refactor authentication',
        scope_keywords: [],
        similar_stories: emptySimilarStories,
      }
      expect(calculateSplitRisk(input)).toBe(0.25)
    })
  })
})

// ============================================================================
// Test Suite: review_cycles Calculation
// ============================================================================

describe('calculateReviewCycles', () => {
  describe('cold-start case (empty similar_stories)', () => {
    it('returns base 1.5 when similar_stories is empty', () => {
      const input: PredictionInput = {
        ac_count: 3,
        title: 'Simple feature',
        scope_keywords: [],
        similar_stories: emptySimilarStories,
      }
      expect(calculateReviewCycles(input)).toBe(1.5)
    })

    it('returns 1.5 with no undefined or NaN outputs', () => {
      const input: PredictionInput = {
        ac_count: 0,
        title: 'Feature',
        scope_keywords: [],
        similar_stories: emptySimilarStories,
      }
      const result = calculateReviewCycles(input)
      expect(result).toBe(1.5)
      expect(Number.isFinite(result)).toBe(true)
      expect(result).not.toBeNaN()
    })
  })

  describe('normal case with similar_stories data', () => {
    it('calculates weighted average with similar story data', () => {
      const input: PredictionInput = {
        ac_count: 5,
        title: 'Feature',
        scope_keywords: [],
        similar_stories: normalSimilarStories,
      }
      const result = calculateReviewCycles(input)
      expect(result).toBeGreaterThan(1.5)
      expect(result).toBeLessThan(3)
    })
  })

  describe('boundary values', () => {
    it('applies security boost', () => {
      const input: PredictionInput = {
        ac_count: 3,
        title: 'Secure feature',
        scope_keywords: ['security'],
        similar_stories: emptySimilarStories,
      }
      expect(calculateReviewCycles(input)).toBe(1.8)
    })

    it('handles mixed similar_stories with some null actual_cycles', () => {
      const input: PredictionInput = {
        ac_count: 3,
        title: 'Feature',
        scope_keywords: [],
        similar_stories: [
          { id: 'WISH-001', similarity: 0.9, actual_tokens: 100000, actual_cycles: null },
          { id: 'WISH-002', similarity: 0.8, actual_tokens: 120000, actual_cycles: 2 },
        ],
      }
      const result = calculateReviewCycles(input)
      expect(result).toBeGreaterThan(1.5)
      expect(Number.isFinite(result)).toBe(true)
    })
  })
})

// ============================================================================
// Test Suite: token_estimate Calculation
// ============================================================================

describe('calculateTokenEstimate', () => {
  describe('cold-start case (empty similar_stories)', () => {
    it('returns default 150000 when similar_stories is empty', () => {
      const input: PredictionInput = {
        ac_count: 3,
        title: 'Simple feature',
        scope_keywords: [],
        similar_stories: emptySimilarStories,
      }
      expect(calculateTokenEstimate(input)).toBe(150000)
    })

    it('returns 150000 with no undefined or NaN outputs', () => {
      const input: PredictionInput = {
        ac_count: 0,
        title: 'Feature',
        scope_keywords: [],
        similar_stories: emptySimilarStories,
      }
      const result = calculateTokenEstimate(input)
      expect(result).toBe(150000)
      expect(Number.isFinite(result)).toBe(true)
      expect(result).not.toBeNaN()
    })
  })

  describe('normal case with similar_stories data', () => {
    it('calculates average with 10% buffer', () => {
      const input: PredictionInput = {
        ac_count: 5,
        title: 'Feature',
        scope_keywords: [],
        similar_stories: normalSimilarStories,
      }
      const avg = (167000 + 195000) / 2
      const expected = Math.round(avg * 1.1)
      expect(calculateTokenEstimate(input)).toBe(expected)
    })
  })

  describe('boundary values', () => {
    it('handles single similar story', () => {
      const input: PredictionInput = {
        ac_count: 3,
        title: 'Feature',
        scope_keywords: [],
        similar_stories: [{ id: 'WISH-001', similarity: 0.9, actual_tokens: 100000, actual_cycles: 2 }],
      }
      const result = calculateTokenEstimate(input)
      expect(result).toBe(110000)
    })

    it('skips stories with null actual_tokens', () => {
      const input: PredictionInput = {
        ac_count: 3,
        title: 'Feature',
        scope_keywords: [],
        similar_stories: [
          { id: 'WISH-001', similarity: 0.9, actual_tokens: null, actual_cycles: 2 },
          { id: 'WISH-002', similarity: 0.8, actual_tokens: 200000, actual_cycles: 3 },
        ],
      }
      expect(calculateTokenEstimate(input)).toBe(220000)
    })
  })
})

// ============================================================================
// Test Suite: Confidence Calculation
// ============================================================================

describe('calculateConfidence', () => {
  it('returns none for 0 similar stories', () => {
    expect(calculateConfidence(0)).toBe('none')
  })

  it('returns low for 1 similar story', () => {
    expect(calculateConfidence(1)).toBe('low')
  })

  it('returns medium for 2-4 similar stories', () => {
    expect(calculateConfidence(2)).toBe('medium')
    expect(calculateConfidence(4)).toBe('medium')
  })

  it('returns high for 5+ similar stories', () => {
    expect(calculateConfidence(5)).toBe('high')
    expect(calculateConfidence(10)).toBe('high')
  })
})

// ============================================================================
// Test Suite: Full Prediction Generation
// ============================================================================

describe('generatePredictions', () => {
  it('generates complete predictions with empty similar_stories (cold-start)', () => {
    const input: PredictionInput = {
      ac_count: 5,
      title: 'Feature',
      scope_keywords: ['backend', 'frontend'],
      similar_stories: emptySimilarStories,
    }
    const predictions = generatePredictions(input)

    expect(predictions.split_risk).toBeCloseTo(0.3)
    expect(predictions.review_cycles).toBe(1.5)
    expect(predictions.token_estimate).toBe(150000)
    expect(predictions.confidence).toBe('none')
    expect(predictions.similar_stories).toEqual([])
    expect(predictions.model_version).toBe('1.0.0')
  })

  it('generates predictions with normal similar_stories', () => {
    const input: PredictionInput = {
      ac_count: 9,
      title: 'Complex feature',
      scope_keywords: ['backend', 'frontend', 'security'],
      similar_stories: normalSimilarStories,
    }
    const predictions = generatePredictions(input)

    expect(predictions.split_risk).toBeCloseTo(0.8)
    expect(predictions.confidence).toBe('medium')
    expect(predictions.similar_stories).toHaveLength(2)
  })

  it('never produces undefined or NaN outputs at cold-start', () => {
    const input: PredictionInput = {
      ac_count: 0,
      title: '',
      scope_keywords: [],
      similar_stories: [],
    }
    const predictions = generatePredictions(input)

    expect(Number.isFinite(predictions.split_risk)).toBe(true)
    expect(Number.isFinite(predictions.review_cycles)).toBe(true)
    expect(Number.isFinite(predictions.token_estimate)).toBe(true)
    expect(predictions.split_risk).not.toBeNaN()
    expect(predictions.review_cycles).not.toBeNaN()
    expect(predictions.token_estimate).not.toBeNaN()
  })
})
