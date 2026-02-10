/**
 * Unit tests for ROI calculation logic in improvement-proposer agent
 *
 * Tests the ROI formula: (impact / effort) * (10/9)
 * Verifies correct scoring for all combinations of impact/effort levels
 *
 * @see WKFL-010 AC-2
 * @see .claude/agents/improvement-proposer.agent.md
 */

import { describe, it, expect } from 'vitest'

// ROI calculation function (extracted from agent logic)
function calculateROI(impact: 'high' | 'medium' | 'low', effort: 'low' | 'medium' | 'high'): number {
  const impactScores = { high: 9, medium: 5, low: 2 }
  const effortScores = { low: 1, medium: 3, high: 9 }

  const impactScore = impactScores[impact]
  const effortScore = effortScores[effort]

  return (impactScore / effortScore) * (10 / 9)
}

describe('ROI Calculation', () => {
  describe('High Impact Proposals', () => {
    it('calculates ROI for high impact + low effort', () => {
      const roi = calculateROI('high', 'low')
      expect(roi).toBeCloseTo(10.0, 1)
    })

    it('calculates ROI for high impact + medium effort', () => {
      const roi = calculateROI('high', 'medium')
      expect(roi).toBeCloseTo(3.33, 2)
    })

    it('calculates ROI for high impact + high effort', () => {
      const roi = calculateROI('high', 'high')
      expect(roi).toBeCloseTo(1.11, 2)
    })
  })

  describe('Medium Impact Proposals', () => {
    it('calculates ROI for medium impact + low effort', () => {
      const roi = calculateROI('medium', 'low')
      expect(roi).toBeCloseTo(5.56, 2)
    })

    it('calculates ROI for medium impact + medium effort', () => {
      const roi = calculateROI('medium', 'medium')
      expect(roi).toBeCloseTo(1.85, 2)
    })

    it('calculates ROI for medium impact + high effort', () => {
      const roi = calculateROI('medium', 'high')
      expect(roi).toBeCloseTo(0.62, 2)
    })
  })

  describe('Low Impact Proposals', () => {
    it('calculates ROI for low impact + low effort', () => {
      const roi = calculateROI('low', 'low')
      expect(roi).toBeCloseTo(2.22, 2)
    })

    it('calculates ROI for low impact + medium effort', () => {
      const roi = calculateROI('low', 'medium')
      expect(roi).toBeCloseTo(0.74, 2)
    })

    it('calculates ROI for low impact + high effort', () => {
      const roi = calculateROI('low', 'high')
      expect(roi).toBeCloseTo(0.25, 2)
    })
  })

  describe('ROI Range Validation', () => {
    it('ensures maximum ROI is 10.0 (high/low)', () => {
      const roi = calculateROI('high', 'low')
      expect(roi).toBeLessThanOrEqual(10.0)
    })

    it('ensures minimum ROI is > 0 (low/high)', () => {
      const roi = calculateROI('low', 'high')
      expect(roi).toBeGreaterThan(0)
    })
  })

  describe('Priority Bucketing', () => {
    it('categorizes high/low as High Priority (ROI ≥ 7.0)', () => {
      const roi = calculateROI('high', 'low')
      expect(roi).toBeGreaterThanOrEqual(7.0)
    })

    it('categorizes medium/low as Medium Priority (5.0 ≤ ROI < 7.0)', () => {
      const roi = calculateROI('medium', 'low')
      expect(roi).toBeGreaterThanOrEqual(5.0)
      expect(roi).toBeLessThan(7.0)
    })

    it('categorizes low/low as Low Priority (ROI < 5.0)', () => {
      const roi = calculateROI('low', 'low')
      expect(roi).toBeLessThan(5.0)
    })
  })
})

describe('Edge Cases', () => {
  it('handles identical impact and effort scores', () => {
    const roi1 = calculateROI('high', 'high')
    const roi2 = calculateROI('medium', 'medium')
    const roi3 = calculateROI('low', 'low')

    // When impact = effort, ROI should be (1) * (10/9) = 1.11
    expect(roi1).toBeCloseTo(1.11, 2)
    expect(roi2).toBeCloseTo(1.85, 2) // medium/medium = (5/3) * (10/9)
    expect(roi3).toBeCloseTo(2.22, 2) // low/low = (2/1) * (10/9)
  })
})
