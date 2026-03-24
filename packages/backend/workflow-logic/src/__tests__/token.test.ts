/**
 * Unit tests for token/ module
 *
 * Tests estimateTokenCount for 0, positive, and non-multiple-of-4 byte values.
 * Tests formatTokenSummary output format matches token-tracking.md pattern.
 * Tests TokenUsageSchema rejects negative values (AC-8 edge case EC-3).
 */

import { describe, it, expect } from 'vitest'
import { estimateTokenCount, formatTokenSummary, TokenUsageSchema } from '../token/index.js'
import type { TokenUsage } from '../token/index.js'

describe('estimateTokenCount', () => {
  // =========================================================================
  // Zero bytes
  // =========================================================================

  it('0 bytes → 0 tokens', () => {
    expect(estimateTokenCount(0)).toBe(0)
  })

  // =========================================================================
  // Positive values — exact multiples of 4
  // =========================================================================

  it('4 bytes → 1 token', () => {
    expect(estimateTokenCount(4)).toBe(1)
  })

  it('8 bytes → 2 tokens', () => {
    expect(estimateTokenCount(8)).toBe(2)
  })

  it('400 bytes → 100 tokens', () => {
    expect(estimateTokenCount(400)).toBe(100)
  })

  it('4000 bytes → 1000 tokens', () => {
    expect(estimateTokenCount(4000)).toBe(1000)
  })

  // =========================================================================
  // Non-multiples of 4 — should round to nearest integer
  // =========================================================================

  it('1 byte → 0 tokens (rounds down)', () => {
    expect(estimateTokenCount(1)).toBe(0)
  })

  it('2 bytes → 1 token (rounds up from 0.5)', () => {
    expect(estimateTokenCount(2)).toBe(1)
  })

  it('3 bytes → 1 token (rounds down from 0.75)', () => {
    expect(estimateTokenCount(3)).toBe(1)
  })

  it('5 bytes → 1 token (rounds down from 1.25)', () => {
    expect(estimateTokenCount(5)).toBe(1)
  })

  it('6 bytes → 2 tokens (rounds up from 1.5)', () => {
    expect(estimateTokenCount(6)).toBe(2)
  })

  it('7 bytes → 2 tokens (rounds down from 1.75)', () => {
    expect(estimateTokenCount(7)).toBe(2)
  })

  // =========================================================================
  // Larger non-multiples
  // =========================================================================

  it('100 bytes → 25 tokens', () => {
    expect(estimateTokenCount(100)).toBe(25)
  })

  it('101 bytes → 25 tokens (rounds down from 25.25)', () => {
    expect(estimateTokenCount(101)).toBe(25)
  })

  it('102 bytes → 26 tokens (rounds up from 25.5)', () => {
    expect(estimateTokenCount(102)).toBe(26)
  })

  it('returns an integer', () => {
    expect(Number.isInteger(estimateTokenCount(7))).toBe(true)
  })
})

describe('formatTokenSummary', () => {
  // =========================================================================
  // Standard format: "In: ~X Out: ~Y"
  // =========================================================================

  it('formats basic usage without phase', () => {
    const usage: TokenUsage = { inputTokens: 100, outputTokens: 200 }
    expect(formatTokenSummary(usage)).toBe('In: ~100 Out: ~200')
  })

  it('formats zero usage', () => {
    const usage: TokenUsage = { inputTokens: 0, outputTokens: 0 }
    expect(formatTokenSummary(usage)).toBe('In: ~0 Out: ~0')
  })

  it('formats large token counts', () => {
    const usage: TokenUsage = { inputTokens: 32000, outputTokens: 4096 }
    expect(formatTokenSummary(usage)).toBe('In: ~32000 Out: ~4096')
  })

  // =========================================================================
  // With optional phase: "In: ~X Out: ~Y (phase)"
  // =========================================================================

  it('includes phase when provided', () => {
    const usage: TokenUsage = { inputTokens: 1000, outputTokens: 500, phase: 'implementation' }
    expect(formatTokenSummary(usage)).toBe('In: ~1000 Out: ~500 (implementation)')
  })

  it('includes phase for setup', () => {
    const usage: TokenUsage = { inputTokens: 200, outputTokens: 50, phase: 'setup' }
    expect(formatTokenSummary(usage)).toBe('In: ~200 Out: ~50 (setup)')
  })

  // =========================================================================
  // Without phase (undefined)
  // =========================================================================

  it('omits phase suffix when phase is undefined', () => {
    const usage: TokenUsage = { inputTokens: 500, outputTokens: 250, phase: undefined }
    expect(formatTokenSummary(usage)).toBe('In: ~500 Out: ~250')
  })
})

describe('TokenUsageSchema', () => {
  // =========================================================================
  // Valid inputs
  // =========================================================================

  it('accepts zero values', () => {
    const result = TokenUsageSchema.safeParse({ inputTokens: 0, outputTokens: 0 })
    expect(result.success).toBe(true)
  })

  it('accepts positive integer values', () => {
    const result = TokenUsageSchema.safeParse({ inputTokens: 1000, outputTokens: 500 })
    expect(result.success).toBe(true)
  })

  it('accepts with optional phase', () => {
    const result = TokenUsageSchema.safeParse({
      inputTokens: 100,
      outputTokens: 200,
      phase: 'implementation',
    })
    expect(result.success).toBe(true)
  })

  it('accepts without phase (phase is optional)', () => {
    const result = TokenUsageSchema.safeParse({ inputTokens: 100, outputTokens: 200 })
    expect(result.success).toBe(true)
  })

  // =========================================================================
  // Rejection: negative values (AC-8 edge case EC-3)
  // =========================================================================

  it('rejects negative inputTokens', () => {
    const result = TokenUsageSchema.safeParse({ inputTokens: -1, outputTokens: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects negative outputTokens', () => {
    const result = TokenUsageSchema.safeParse({ inputTokens: 0, outputTokens: -1 })
    expect(result.success).toBe(false)
  })

  it('rejects both negative values', () => {
    const result = TokenUsageSchema.safeParse({ inputTokens: -5, outputTokens: -10 })
    expect(result.success).toBe(false)
  })

  // =========================================================================
  // Rejection: non-integer values
  // =========================================================================

  it('rejects float inputTokens', () => {
    const result = TokenUsageSchema.safeParse({ inputTokens: 1.5, outputTokens: 0 })
    expect(result.success).toBe(false)
  })

  it('rejects float outputTokens', () => {
    const result = TokenUsageSchema.safeParse({ inputTokens: 0, outputTokens: 2.7 })
    expect(result.success).toBe(false)
  })

  // =========================================================================
  // Rejection: missing required fields
  // =========================================================================

  it('rejects missing inputTokens', () => {
    const result = TokenUsageSchema.safeParse({ outputTokens: 100 })
    expect(result.success).toBe(false)
  })

  it('rejects missing outputTokens', () => {
    const result = TokenUsageSchema.safeParse({ inputTokens: 100 })
    expect(result.success).toBe(false)
  })
})
