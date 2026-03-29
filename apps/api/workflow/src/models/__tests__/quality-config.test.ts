/**
 * quality-config.test.ts
 *
 * Tests for quality configuration constants.
 * Verifies threshold values, tier expectations, and default weights.
 */

import { describe, it, expect, vi } from 'vitest'
import {
  QUALITY_THRESHOLDS,
  TIER_QUALITY_EXPECTATIONS,
  DEFAULT_DIMENSION_WEIGHTS,
  OVER_PROVISIONING_MARGIN,
  evaluateQuality,
} from '../quality-evaluator.js'
import { createTaskContract } from '../__types__/task-contract.js'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ============================================================================
// QUALITY_THRESHOLDS tests
// ============================================================================

describe('QUALITY_THRESHOLDS', () => {
  it('should have adequate threshold of 60', () => {
    expect(QUALITY_THRESHOLDS.adequate).toBe(60)
  })

  it('should have good threshold of 75', () => {
    expect(QUALITY_THRESHOLDS.good).toBe(75)
  })

  it('should have high threshold of 85', () => {
    expect(QUALITY_THRESHOLDS.high).toBe(85)
  })

  it('should have critical threshold of 95', () => {
    expect(QUALITY_THRESHOLDS.critical).toBe(95)
  })

  it('should have thresholds in ascending order', () => {
    const thresholds = Object.values(QUALITY_THRESHOLDS)
    const sorted = [...thresholds].sort((a, b) => a - b)
    expect(thresholds).toEqual(sorted)
  })
})

// ============================================================================
// TIER_QUALITY_EXPECTATIONS tests
// ============================================================================

describe('TIER_QUALITY_EXPECTATIONS', () => {
  it('should have tier-0 expectation of 95', () => {
    expect(TIER_QUALITY_EXPECTATIONS['tier-0']).toBe(95)
  })

  it('should have tier-1 expectation of 85', () => {
    expect(TIER_QUALITY_EXPECTATIONS['tier-1']).toBe(85)
  })

  it('should have tier-2 expectation of 75', () => {
    expect(TIER_QUALITY_EXPECTATIONS['tier-2']).toBe(75)
  })

  it('should have tier-3 expectation of 60', () => {
    expect(TIER_QUALITY_EXPECTATIONS['tier-3']).toBe(60)
  })

  it('should have tier expectations in descending order (higher tier = lower expectation)', () => {
    expect(TIER_QUALITY_EXPECTATIONS['tier-0']).toBeGreaterThan(TIER_QUALITY_EXPECTATIONS['tier-1'])
    expect(TIER_QUALITY_EXPECTATIONS['tier-1']).toBeGreaterThan(TIER_QUALITY_EXPECTATIONS['tier-2'])
    expect(TIER_QUALITY_EXPECTATIONS['tier-2']).toBeGreaterThan(TIER_QUALITY_EXPECTATIONS['tier-3'])
  })
})

// ============================================================================
// DEFAULT_DIMENSION_WEIGHTS tests
// ============================================================================

describe('DEFAULT_DIMENSION_WEIGHTS', () => {
  it('should have correctness weight of 0.2', () => {
    expect(DEFAULT_DIMENSION_WEIGHTS.correctness).toBe(0.2)
  })

  it('should have completeness weight of 0.2', () => {
    expect(DEFAULT_DIMENSION_WEIGHTS.completeness).toBe(0.2)
  })

  it('should have coherence weight of 0.2', () => {
    expect(DEFAULT_DIMENSION_WEIGHTS.coherence).toBe(0.2)
  })

  it('should have compliance weight of 0.2', () => {
    expect(DEFAULT_DIMENSION_WEIGHTS.compliance).toBe(0.2)
  })

  it('should have cost_efficiency weight of 0.2', () => {
    expect(DEFAULT_DIMENSION_WEIGHTS.cost_efficiency).toBe(0.2)
  })

  it('should have all weights sum to 1.0', () => {
    const total = Object.values(DEFAULT_DIMENSION_WEIGHTS).reduce((sum, w) => sum + w, 0)
    expect(total).toBeCloseTo(1.0, 10)
  })

  it('should have all weights equal', () => {
    const weights = Object.values(DEFAULT_DIMENSION_WEIGHTS)
    const firstWeight = weights[0]
    for (const weight of weights) {
      expect(weight).toBe(firstWeight)
    }
  })
})

// ============================================================================
// OVER_PROVISIONING_MARGIN test
// ============================================================================

describe('OVER_PROVISIONING_MARGIN', () => {
  it('should be 20', () => {
    expect(OVER_PROVISIONING_MARGIN).toBe(20)
  })
})

// ============================================================================
// Weight override test
// ============================================================================

describe('Weight override behavior', () => {
  it('should use dimension weights from evaluator output', () => {
    const contract = createTaskContract({ taskType: 'code_generation' })
    const result = evaluateQuality(contract, 'tier-1', 'some output')
    // All dimensions should have weight 0.2
    for (const dim of result.qualityDimensions) {
      expect(dim.weight).toBe(0.2)
    }
  })
})
