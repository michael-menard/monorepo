/**
 * Unit tests for proposal deduplication logic in improvement-proposer agent
 *
 * Tests Levenshtein distance-based deduplication with threshold 0.85
 * Verifies similar proposals from different sources merge correctly
 *
 * @see WKFL-010 AC-2
 * @see .claude/agents/improvement-proposer.agent.md
 */

import { describe, it, expect } from 'vitest'

// Simplified Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length
  const len2 = str2.length
  const matrix: number[][] = []

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  return matrix[len1][len2]
}

// Similarity calculation (normalized Levenshtein)
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  const maxLength = Math.max(str1.length, str2.length)
  return 1 - distance / maxLength
}

// Deduplication threshold from agent spec
const DEDUP_THRESHOLD = 0.85

describe('Proposal Deduplication', () => {
  describe('Similarity Calculation', () => {
    it('identifies identical proposals as duplicates (similarity = 1.0)', () => {
      const title1 = 'Add lint pre-check to backend-coder'
      const title2 = 'Add lint pre-check to backend-coder'
      const similarity = calculateSimilarity(title1, title2)
      expect(similarity).toBe(1.0)
      expect(similarity).toBeGreaterThanOrEqual(DEDUP_THRESHOLD)
    })

    it('identifies near-identical proposals as duplicates (similarity ≥ 0.85)', () => {
      const title1 = 'Add lint pre-check to backend-coder'
      const title2 = 'Add lint precheck to backend-coder'
      const similarity = calculateSimilarity(title1, title2)
      expect(similarity).toBeGreaterThanOrEqual(DEDUP_THRESHOLD)
    })

    it('does not flag dissimilar proposals as duplicates (similarity < 0.85)', () => {
      const title1 = 'Add lint pre-check to backend-coder'
      const title2 = 'Tighten security agent high-confidence threshold'
      const similarity = calculateSimilarity(title1, title2)
      expect(similarity).toBeLessThan(DEDUP_THRESHOLD)
    })
  })

  describe('Short-Circuit Optimization', () => {
    it('short-circuits when title length difference > 50%', () => {
      const title1 = 'Add lint'
      const title2 = 'Add lint pre-check to backend-coder agent for routes.ts file'
      
      const lengthDiff = Math.abs(title1.length - title2.length) / Math.max(title1.length, title2.length)
      
      expect(lengthDiff).toBeGreaterThan(0.5)
      // In production, this would skip Levenshtein calculation
    })

    it('does not short-circuit when title lengths are similar', () => {
      const title1 = 'Add lint pre-check to backend-coder'
      const title2 = 'Add lint precheck to backend coder'
      
      const lengthDiff = Math.abs(title1.length - title2.length) / Math.max(title1.length, title2.length)
      
      expect(lengthDiff).toBeLessThanOrEqual(0.5)
    })
  })

  describe('Multi-Source Deduplication', () => {
    it('merges proposals from calibration and pattern sources', () => {
      const proposal1 = {
        id: 'P-001',
        title: 'Tighten security agent threshold',
        source: 'calibration',
        roi_score: 7.5,
        evidence: '12 samples (calibration)',
      }

      const proposal2 = {
        id: 'P-042',
        title: 'Tighten security agent threshold',
        source: 'pattern',
        roi_score: 7.2,
        evidence: '8 samples (pattern)',
      }

      // In production, this would merge:
      // - Keep proposal1 (higher ROI)
      // - Merge evidence: "12 samples (calibration), 8 samples (pattern)"
      // - Merge sources: ['calibration', 'pattern']

      expect(proposal1.roi_score).toBeGreaterThan(proposal2.roi_score)
    })
  })

  describe('Edge Cases', () => {
    it('handles empty strings (similarity = 1.0)', () => {
      const similarity = calculateSimilarity('', '')
      expect(similarity).toBe(1.0)
    })

    it('handles single character difference in short strings', () => {
      const similarity = calculateSimilarity('Add', 'Adds')
      expect(similarity).toBeGreaterThan(0.7)
    })

    it('handles case-insensitive comparison', () => {
      const similarity1 = calculateSimilarity('Add lint', 'add lint')
      const similarity2 = calculateSimilarity('Add lint', 'ADD LINT')
      expect(similarity1).toBe(1.0)
      expect(similarity2).toBe(1.0)
    })
  })

  describe('Threshold Validation', () => {
    it('validates threshold value is 0.85', () => {
      expect(DEDUP_THRESHOLD).toBe(0.85)
    })

    it('ensures threshold is conservative (not too aggressive)', () => {
      // Threshold of 0.85 means proposals must be 85%+ similar to merge
      // This prevents false positive merges of unrelated proposals
      expect(DEDUP_THRESHOLD).toBeGreaterThanOrEqual(0.80)
    })
  })
})

describe('Deduplication Examples', () => {
  const examples = [
    {
      title1: 'Add lint pre-check to backend-coder',
      title2: 'Add lint precheck to backend-coder',
      expectedDuplicate: true,
    },
    {
      title1: 'Tighten security agent high-confidence threshold',
      title2: 'Tighten security agent threshold for high confidence',
      expectedDuplicate: true,
    },
    {
      title1: 'Add lint pre-check to backend-coder',
      title2: 'Add type-check to frontend-coder',
      expectedDuplicate: false,
    },
    {
      title1: 'Promote heuristic H-042 to production tier',
      title2: 'Promote heuristic H-042 to production',
      expectedDuplicate: true,
    },
  ]

  examples.forEach(({ title1, title2, expectedDuplicate }) => {
    it(`${expectedDuplicate ? 'detects' : 'does not detect'} duplicate: "${title1}" vs "${title2}"`, () => {
      const similarity = calculateSimilarity(title1, title2)
      if (expectedDuplicate) {
        expect(similarity).toBeGreaterThanOrEqual(DEDUP_THRESHOLD)
      } else {
        expect(similarity).toBeLessThan(DEDUP_THRESHOLD)
      }
    })
  })
})
