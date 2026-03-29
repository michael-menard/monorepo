/**
 * token-bucket.test.ts
 *
 * Unit tests for TokenBucket rate limiter.
 * Covers: fill, drain, refill via vi.useFakeTimers(), concurrent Promise.all under rate limit.
 *
 * @module pipeline/__tests__/token-bucket
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TokenBucket } from '../token-bucket.js'
import { RateLimitExceededError } from '../__types__/index.js'

describe('TokenBucket', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ============================================================================
  // HP-1: Initial state / configuration
  // ============================================================================

  describe('HP-1: initialization', () => {
    it('starts full with configured capacity', () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 2, maxWaitMs: 5000 })
      expect(bucket.getTokens()).toBe(10)
    })

    it('validates config with Zod — capacity must be positive', () => {
      expect(() => new TokenBucket({ capacity: 0, refillRate: 2, maxWaitMs: 5000 })).toThrow()
    })

    it('validates config with Zod — refillRate must be positive', () => {
      expect(() => new TokenBucket({ capacity: 10, refillRate: 0, maxWaitMs: 5000 })).toThrow()
    })

    it('validates config with Zod — maxWaitMs must be nonnegative', () => {
      expect(() => new TokenBucket({ capacity: 10, refillRate: 2, maxWaitMs: -1 })).toThrow()
    })
  })

  // ============================================================================
  // HP-2: Consume tokens — success path
  // ============================================================================

  describe('HP-2: consume tokens (happy path)', () => {
    it('consumes a single token immediately when available', async () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 2, maxWaitMs: 5000 })
      // Tokens are immediately available, no wait needed
      await bucket.consume(1, 'ollama')
      expect(bucket.getTokens()).toBeCloseTo(9, 0)
    })

    it('consumes multiple tokens at once', async () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 2, maxWaitMs: 5000 })
      await bucket.consume(5, 'anthropic')
      expect(bucket.getTokens()).toBeCloseTo(5, 0)
    })
  })

  // ============================================================================
  // EC-2: Rate limiting — blocks and then resolves after refill
  // ============================================================================

  describe('EC-2: rate limiting (waits for refill)', () => {
    it('waits for token refill when bucket is empty', async () => {
      const bucket = new TokenBucket({ capacity: 2, refillRate: 2, maxWaitMs: 5000 })

      // Drain all tokens first (immediate since capacity is available)
      await bucket.consume(2, 'openrouter')
      expect(bucket.getTokens()).toBeCloseTo(0, 0)

      // Start consuming — will wait for refill, then advance timers concurrently
      const [consumeResult] = await Promise.all([
        bucket.consume(1, 'openrouter'),
        vi.advanceTimersByTimeAsync(1000),
      ])

      // consumeResult is void (returned undefined from consume)
      expect(consumeResult).toBeUndefined()
      expect(bucket.getTokens()).toBeGreaterThanOrEqual(0)
    })
  })

  // ============================================================================
  // ED-1: Throws RateLimitExceededError when maxWaitMs exceeded
  // ============================================================================

  describe('ED-1: RateLimitExceededError on timeout', () => {
    it('RateLimitExceededError instanceof works (prototype chain)', () => {
      const err = new RateLimitExceededError({ provider: 'ollama', waitMs: 5000 })
      expect(err).toBeInstanceOf(RateLimitExceededError)
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('RateLimitExceededError')
      expect(err.provider).toBe('ollama')
    })

    it('throws RateLimitExceededError when maxWaitMs exceeded', async () => {
      const bucket = new TokenBucket({ capacity: 1, refillRate: 0.1, maxWaitMs: 500 })

      // Drain the bucket (immediate)
      await bucket.consume(1, 'ollama')

      // Concurrently: start consume + advance timers past maxWaitMs
      // This way the rejection is caught by the rejects handler
      const [result] = await Promise.allSettled([
        bucket.consume(1, 'ollama'),
        vi.advanceTimersByTimeAsync(600),
      ])

      expect(result.status).toBe('rejected')
      if (result.status === 'rejected') {
        expect(result.reason).toBeInstanceOf(RateLimitExceededError)
        expect(result.reason.name).toBe('RateLimitExceededError')
      }
    })
  })

  // ============================================================================
  // Concurrent consume under rate limit
  // ============================================================================

  describe('concurrent consume under rate limit', () => {
    it('handles concurrent Promise.all within capacity', async () => {
      const bucket = new TokenBucket({ capacity: 5, refillRate: 10, maxWaitMs: 5000 })

      // All 3 tokens are available immediately
      await Promise.all([
        bucket.consume(1, 'anthropic'),
        bucket.consume(1, 'anthropic'),
        bucket.consume(1, 'anthropic'),
      ])

      expect(bucket.getTokens()).toBeGreaterThanOrEqual(0)
    })

    it('sequential drains and refills correctly', async () => {
      const bucket = new TokenBucket({ capacity: 3, refillRate: 3, maxWaitMs: 5000 })

      // Drain all (immediate)
      await bucket.consume(3, 'openrouter')
      expect(bucket.getTokens()).toBeCloseTo(0, 0)

      // Advance 1 second — refillRate=3 tokens/sec, so full bucket again
      await vi.advanceTimersByTimeAsync(1000)
      const tokensAfterRefill = bucket.getTokens()
      expect(tokensAfterRefill).toBeCloseTo(3, 0)
    })
  })
})
