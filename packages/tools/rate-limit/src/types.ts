/**
 * Rate Limit Types
 *
 * Story 3.1.31: Extract Rate Limit Package
 *
 * Framework-agnostic types for rate limiting with store abstraction.
 */

import { z } from 'zod'

/**
 * Result of a rate limit check
 */
export const RateLimitResultSchema = z.object({
  /** Whether the request is allowed */
  allowed: z.boolean(),
  /** Number of requests remaining in the current window */
  remaining: z.number().int().nonnegative(),
  /** Current request count in the window */
  currentCount: z.number().int().nonnegative(),
  /** When the rate limit window resets */
  resetAt: z.date(),
  /** Seconds until the limit resets (0 if allowed) */
  retryAfterSeconds: z.number().int().nonnegative(),
  /**
   * Alias for resetAt (backwards compatibility)
   * @deprecated Use resetAt instead
   */
  nextAllowedAt: z.date(),
})

export type RateLimitResult = z.infer<typeof RateLimitResultSchema>

/**
 * Configuration for rate limiting
 */
export const RateLimitConfigSchema = z.object({
  /** Maximum number of requests allowed in the window */
  maxRequests: z.number().int().positive(),
  /** Window duration in milliseconds (e.g., 24 * 60 * 60 * 1000 for daily) */
  windowMs: z.number().int().positive(),
})

export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>

/**
 * Store abstraction for rate limit persistence
 *
 * Implementations can use PostgreSQL, Redis, in-memory, etc.
 * This abstraction allows the core logic to remain database-agnostic.
 */
export interface RateLimitStore {
  /**
   * Check if a request is allowed and increment the counter atomically
   *
   * @param key - Unique key for rate limiting (e.g., "moc-upload:userId:2024-01-15")
   * @param limit - Maximum requests allowed
   * @returns Rate limit result with allowed status and metadata
   */
  checkAndIncrement(key: string, limit: number): Promise<RateLimitResult>

  /**
   * Reset the counter for a given key
   *
   * @param key - The rate limit key to reset
   */
  reset(key: string): Promise<void>

  /**
   * Get current count without incrementing
   *
   * @param key - The rate limit key to check
   * @returns Current count or 0 if not found
   */
  getCount(key: string): Promise<number>
}

/**
 * Rate limiter interface returned by createRateLimiter
 */
export interface RateLimiter {
  /**
   * Check if a request is allowed and increment the counter
   *
   * @param key - Unique key for rate limiting
   * @param config - Rate limit configuration
   * @returns Rate limit result
   */
  checkLimit(key: string, config: RateLimitConfig): Promise<RateLimitResult>

  /**
   * Reset the rate limit for a key
   *
   * @param key - The rate limit key to reset
   */
  reset(key: string): Promise<void>

  /**
   * Get current count without incrementing
   *
   * @param key - The rate limit key to check
   * @returns Current count
   */
  getCount(key: string): Promise<number>
}
