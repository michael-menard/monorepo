/**
 * Rate Limiter Factory
 *
 * Story 3.1.31: Extract Rate Limit Package
 *
 * Creates a rate limiter instance with the provided store implementation.
 * The core logic is database-agnostic - all persistence is delegated to the store.
 */

import type { RateLimitStore, RateLimiter, RateLimitConfig, RateLimitResult } from './types'

/**
 * Create a rate limiter with the given store implementation
 *
 * @param store - The storage backend for rate limit counters
 * @returns A rate limiter instance
 *
 * @example
 * ```typescript
 * import { createRateLimiter } from '@repo/rate-limit'
 * import { PostgresRateLimitStore } from './postgres-store'
 *
 * const rateLimiter = createRateLimiter(new PostgresRateLimitStore(db))
 *
 * const result = await rateLimiter.checkLimit(
 *   `moc-upload:${userId}:${todayDate}`,
 *   { maxRequests: 100, windowMs: 24 * 60 * 60 * 1000 }
 * )
 *
 * if (!result.allowed) {
 *   // Return 429 with retryAfterSeconds
 * }
 * ```
 */
export const createRateLimiter = (store: RateLimitStore): RateLimiter => ({
  checkLimit: async (key: string, config: RateLimitConfig): Promise<RateLimitResult> => {
    return store.checkAndIncrement(key, config.maxRequests)
  },

  reset: async (key: string): Promise<void> => {
    return store.reset(key)
  },

  getCount: async (key: string): Promise<number> => {
    return store.getCount(key)
  },
})

/**
 * Common window durations in milliseconds
 */
export const RATE_LIMIT_WINDOWS = {
  /** One minute */
  MINUTE: 60 * 1000,
  /** One hour */
  HOUR: 60 * 60 * 1000,
  /** One day (24 hours) */
  DAY: 24 * 60 * 60 * 1000,
  /** One week */
  WEEK: 7 * 24 * 60 * 60 * 1000,
} as const

/**
 * Generate a rate limit key for daily limits
 *
 * @param feature - The feature being rate limited (e.g., "moc-upload", "api-call")
 * @param userId - The user's identifier
 * @param date - Optional date, defaults to current UTC date
 * @returns A key in format "feature:userId:YYYY-MM-DD"
 */
export const generateDailyKey = (feature: string, userId: string, date?: Date): string => {
  const d = date ?? new Date()
  const dateStr = d.toISOString().split('T')[0]
  return `${feature}:${userId}:${dateStr}`
}
