/**
 * token-bucket.ts
 *
 * In-memory TokenBucket rate limiter for per-provider request throttling.
 * Uses setTimeout-based wait logic for vi.useFakeTimers() compatibility.
 *
 * @module pipeline/token-bucket
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { RateLimitExceededError } from './__types__/index.js'

// ============================================================================
// Config Schema
// ============================================================================

/**
 * Configuration for a TokenBucket rate limiter.
 */
export const TokenBucketConfigSchema = z.object({
  /** Maximum number of tokens the bucket can hold */
  capacity: z.number().int().positive(),

  /** Number of tokens refilled per second */
  refillRate: z.number().positive(),

  /** Maximum time in milliseconds to wait for tokens before throwing */
  maxWaitMs: z.number().int().nonnegative(),
})

export type TokenBucketConfig = z.infer<typeof TokenBucketConfigSchema>

// ============================================================================
// TokenBucket Class
// ============================================================================

/**
 * Token bucket rate limiter.
 * Tracks available tokens and refills them at a configured rate.
 *
 * consume() waits asynchronously (via setTimeout) until tokens are available
 * or maxWaitMs is exceeded, at which point it throws RateLimitExceededError.
 *
 * @example
 * ```typescript
 * const bucket = new TokenBucket({ capacity: 10, refillRate: 2, maxWaitMs: 5000 })
 * await bucket.consume(1) // OK
 * ```
 */
export class TokenBucket {
  private tokens: number
  private lastRefillTime: number
  private readonly config: TokenBucketConfig

  constructor(config: TokenBucketConfig) {
    this.config = TokenBucketConfigSchema.parse(config)
    this.tokens = this.config.capacity
    this.lastRefillTime = Date.now()
  }

  /**
   * Get current token count (after refill calculation).
   */
  getTokens(): number {
    this._refill()
    return this.tokens
  }

  /**
   * Consume `count` tokens. Waits asynchronously if insufficient tokens are available.
   * Throws RateLimitExceededError if maxWaitMs is exceeded.
   *
   * @param count - Number of tokens to consume (default: 1)
   * @param provider - Provider name for error reporting
   */
  async consume(count = 1, provider = 'unknown'): Promise<void> {
    const startTime = Date.now()

    while (true) {
      this._refill()

      if (this.tokens >= count) {
        this.tokens -= count
        logger.debug('token_bucket', {
          event: 'tokens_consumed',
          provider,
          consumed: count,
          remaining: this.tokens,
        })
        return
      }

      const elapsed = Date.now() - startTime
      if (elapsed >= this.config.maxWaitMs) {
        throw new RateLimitExceededError({
          provider,
          waitMs: this.config.maxWaitMs,
        })
      }

      // Calculate how long until we have enough tokens
      const needed = count - this.tokens
      const msUntilEnough = Math.ceil((needed / this.config.refillRate) * 1000)
      const waitMs = Math.min(msUntilEnough, this.config.maxWaitMs - elapsed)

      logger.debug('token_bucket', {
        event: 'waiting_for_tokens',
        provider,
        needed,
        waitMs,
      })

      await this._wait(waitMs)
    }
  }

  /**
   * Refill tokens based on elapsed time since last refill.
   */
  private _refill(): void {
    const now = Date.now()
    const elapsed = now - this.lastRefillTime

    if (elapsed > 0) {
      const refillAmount = (elapsed / 1000) * this.config.refillRate
      this.tokens = Math.min(this.config.capacity, this.tokens + refillAmount)
      this.lastRefillTime = now
    }
  }

  /**
   * Wait for a given number of milliseconds.
   * Uses setTimeout internally for vi.useFakeTimers() compatibility.
   */
  private _wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
