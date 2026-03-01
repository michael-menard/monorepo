/**
 * budget-accumulator.test.ts
 *
 * Unit tests for BudgetAccumulator per-story token tracking.
 * Covers: accumulation, cap crossing, cross-story isolation, instanceof check.
 *
 * @module pipeline/__tests__/budget-accumulator
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BudgetAccumulator } from '../budget-accumulator.js'
import { BudgetExhaustedError } from '../__types__/index.js'

describe('BudgetAccumulator', () => {
  let acc: BudgetAccumulator

  beforeEach(() => {
    acc = new BudgetAccumulator()
  })

  // ============================================================================
  // HP-3: Record and retrieve usage
  // ============================================================================

  describe('HP-3: record and getStoryUsage', () => {
    it('returns 0 for unknown storyId', () => {
      expect(acc.getStoryUsage('STORY-999')).toBe(0)
    })

    it('accumulates tokens for a single story', () => {
      acc.record('STORY-001', 100)
      acc.record('STORY-001', 200)
      acc.record('STORY-001', 300)
      expect(acc.getStoryUsage('STORY-001')).toBe(600)
    })

    it('tracks multiple stories independently', () => {
      acc.record('STORY-001', 500)
      acc.record('STORY-002', 300)
      acc.record('STORY-001', 200)

      expect(acc.getStoryUsage('STORY-001')).toBe(700)
      expect(acc.getStoryUsage('STORY-002')).toBe(300)
    })
  })

  // ============================================================================
  // EC-1: BudgetExhaustedError when cap is crossed
  // ============================================================================

  describe('EC-1: checkBudget — BudgetExhaustedError on cap crossing', () => {
    it('does not throw when well under cap', () => {
      acc.record('STORY-001', 1000)
      expect(() => acc.checkBudget('STORY-001', 500, 10000)).not.toThrow()
    })

    it('does not throw at exactly the cap boundary', () => {
      acc.record('STORY-001', 5000)
      // 5000 + 5000 == 10000 which is exactly the cap
      expect(() => acc.checkBudget('STORY-001', 5000, 10000)).not.toThrow()
    })

    it('throws BudgetExhaustedError when projected exceeds cap', () => {
      acc.record('STORY-001', 8000)
      expect(() => acc.checkBudget('STORY-001', 3000, 10000)).toThrow(BudgetExhaustedError)
    })

    it('throws BudgetExhaustedError with correct storyId, tokensUsed, budgetCap', () => {
      acc.record('STORY-001', 8000)

      let caught: unknown
      try {
        acc.checkBudget('STORY-001', 3000, 10000)
      } catch (e) {
        caught = e
      }

      expect(caught).toBeInstanceOf(BudgetExhaustedError)
      if (caught instanceof BudgetExhaustedError) {
        expect(caught.storyId).toBe('STORY-001')
        expect(caught.tokensUsed).toBe(11000) // 8000 + 3000
        expect(caught.budgetCap).toBe(10000)
      }
    })
  })

  // ============================================================================
  // ED-2: Cross-story isolation
  // ============================================================================

  describe('ED-2: cross-story isolation', () => {
    it('does not mix token usage across different stories', () => {
      acc.record('STORY-A', 9500)
      acc.record('STORY-B', 500)

      // STORY-A is near cap, but STORY-B checkBudget should not be affected
      expect(() => acc.checkBudget('STORY-B', 1000, 10000)).not.toThrow()
      // STORY-A should throw
      expect(() => acc.checkBudget('STORY-A', 1000, 10000)).toThrow(BudgetExhaustedError)
    })

    it('checkBudget for unknown story uses 0 as baseline', () => {
      // No prior records for STORY-NEW
      expect(() => acc.checkBudget('STORY-NEW', 5000, 10000)).not.toThrow()
      expect(() => acc.checkBudget('STORY-NEW', 10001, 10000)).toThrow(BudgetExhaustedError)
    })
  })

  // ============================================================================
  // ED-4: BudgetExhaustedError instanceof and prototype chain
  // ============================================================================

  describe('ED-4: BudgetExhaustedError prototype chain', () => {
    it('BudgetExhaustedError instanceof works after transpilation', () => {
      const err = new BudgetExhaustedError({
        storyId: 'STORY-001',
        tokensUsed: 11000,
        budgetCap: 10000,
      })

      expect(err).toBeInstanceOf(BudgetExhaustedError)
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('BudgetExhaustedError')
      expect(err.message).toContain('STORY-001')
      expect(err.storyId).toBe('STORY-001')
      expect(err.tokensUsed).toBe(11000)
      expect(err.budgetCap).toBe(10000)
    })
  })

  // ============================================================================
  // Reset
  // ============================================================================

  describe('reset', () => {
    it('clears all story usage', () => {
      acc.record('STORY-001', 500)
      acc.record('STORY-002', 300)
      acc.reset()
      expect(acc.getStoryUsage('STORY-001')).toBe(0)
      expect(acc.getStoryUsage('STORY-002')).toBe(0)
    })
  })
})
