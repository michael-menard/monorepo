/**
 * contract-mismatch.test.ts
 *
 * Tests for detectContractMismatch() - over/under-provisioning detection.
 * 10+ test cases covering thresholds, margins, and edge cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { detectContractMismatch, QUALITY_THRESHOLDS, OVER_PROVISIONING_MARGIN } from '../quality-evaluator.js'
import { createTaskContract } from '../__types__/task-contract.js'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { logger } from '@repo/logger'

// ============================================================================
// Helpers
// ============================================================================

const makeContract = (qualityRequirement: 'adequate' | 'good' | 'high' | 'critical') =>
  createTaskContract({ taskType: 'test_task', qualityRequirement })

// ============================================================================
// detectContractMismatch() tests
// ============================================================================

describe('detectContractMismatch()', () => {
  beforeEach(() => vi.clearAllMocks())

  // --- No mismatch cases ---

  it('should return contractMismatch=false when score equals threshold exactly', () => {
    const contract = makeContract('adequate') // threshold=60
    const result = detectContractMismatch(contract, 60, 'tier-3')
    expect(result.contractMismatch).toBe(false)
    expect(result.recommendation).toBeUndefined()
  })

  it('should return contractMismatch=false when score is 1 point above threshold', () => {
    const contract = makeContract('adequate') // threshold=60
    const result = detectContractMismatch(contract, 61, 'tier-3')
    expect(result.contractMismatch).toBe(false)
  })

  it('should return contractMismatch=false when score is 19 points above threshold (under over-provisioning boundary)', () => {
    const contract = makeContract('adequate') // threshold=60, over-provisioning at 80+
    const result = detectContractMismatch(contract, 79, 'tier-1')
    expect(result.contractMismatch).toBe(false)
  })

  it('should return contractMismatch=false for good quality at threshold', () => {
    const contract = makeContract('good') // threshold=75
    const result = detectContractMismatch(contract, 75, 'tier-2')
    expect(result.contractMismatch).toBe(false)
  })

  // --- Under-provisioning cases ---

  it('should detect under-provisioning for adequate quality when score is below 60', () => {
    const contract = makeContract('adequate') // threshold=60
    const result = detectContractMismatch(contract, 59, 'tier-3')
    expect(result.contractMismatch).toBe(true)
    expect(result.recommendation).toContain('Under-provisioned')
    expect(result.recommendation).toContain('60') // threshold
  })

  it('should detect under-provisioning for critical quality (threshold 95) with score 80', () => {
    const contract = makeContract('critical') // threshold=95
    const result = detectContractMismatch(contract, 80, 'tier-1')
    expect(result.contractMismatch).toBe(true)
    expect(result.recommendation).toContain('Under-provisioned')
  })

  it('should detect under-provisioning for high quality (threshold 85) with score 70', () => {
    const contract = makeContract('high') // threshold=85
    const result = detectContractMismatch(contract, 70, 'tier-2')
    expect(result.contractMismatch).toBe(true)
    expect(result.recommendation).toContain('Under-provisioned')
    expect(result.recommendation).toContain('higher-tier')
  })

  it('should call logger.warn on under-provisioning detection', () => {
    const contract = makeContract('adequate')
    detectContractMismatch(contract, 40, 'tier-3')
    expect(logger.warn).toHaveBeenCalled()
    const warnCalls = (logger.warn as ReturnType<typeof vi.fn>).mock.calls
    const events = warnCalls.map((c: any[]) => c[0])
    expect(events).toContain('contract_mismatch_detected')
  })

  // --- Over-provisioning cases ---

  it('should detect over-provisioning for adequate quality (threshold 60) when score is 82+', () => {
    const contract = makeContract('adequate') // threshold=60, margin=20, trigger at 80
    const result = detectContractMismatch(contract, 82, 'tier-0')
    expect(result.contractMismatch).toBe(true)
    expect(result.recommendation).toContain('Over-provisioned')
  })

  it('should detect over-provisioning for good quality (threshold 75) when score is 97+', () => {
    const contract = makeContract('good') // threshold=75, trigger at 95
    const result = detectContractMismatch(contract, 97, 'tier-0')
    expect(result.contractMismatch).toBe(true)
    expect(result.recommendation).toContain('Over-provisioned')
  })

  it('should suggest lower tier in recommendation when over-provisioned', () => {
    const contract = makeContract('adequate') // threshold=60
    const result = detectContractMismatch(contract, 85, 'tier-0')
    expect(result.contractMismatch).toBe(true)
    expect(result.recommendation).toContain('tier-')
  })

  it('should call logger.warn on over-provisioning detection', () => {
    const contract = makeContract('adequate')
    detectContractMismatch(contract, 85, 'tier-0')
    expect(logger.warn).toHaveBeenCalled()
    const warnCalls = (logger.warn as ReturnType<typeof vi.fn>).mock.calls
    const events = warnCalls.map((c: any[]) => c[0])
    expect(events).toContain('contract_mismatch_detected')
  })

  it('should not trigger over-provisioning at exactly OVER_PROVISIONING_MARGIN - 1 above threshold', () => {
    const contract = makeContract('adequate') // threshold=60
    const score = 60 + OVER_PROVISIONING_MARGIN - 1 // 79
    const result = detectContractMismatch(contract, score, 'tier-1')
    expect(result.contractMismatch).toBe(false)
  })

  it('should trigger over-provisioning at exactly OVER_PROVISIONING_MARGIN above threshold', () => {
    const contract = makeContract('adequate') // threshold=60
    const score = 60 + OVER_PROVISIONING_MARGIN // 80
    const result = detectContractMismatch(contract, score, 'tier-1')
    expect(result.contractMismatch).toBe(true)
  })

  it('should verify QUALITY_THRESHOLDS values are correct', () => {
    expect(QUALITY_THRESHOLDS.adequate).toBe(60)
    expect(QUALITY_THRESHOLDS.good).toBe(75)
    expect(QUALITY_THRESHOLDS.high).toBe(85)
    expect(QUALITY_THRESHOLDS.critical).toBe(95)
  })
})
