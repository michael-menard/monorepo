/**
 * Upload Rate Limit Service (Deprecated)
 *
 * @deprecated Use `@repo/rate-limit` with `createPostgresRateLimitStore` instead.
 *
 * This file is kept for backwards compatibility. New code should use:
 * ```typescript
 * import { createRateLimiter, generateDailyKey, RATE_LIMIT_WINDOWS } from '@repo/rate-limit'
 * import { createPostgresRateLimitStore } from '@/core/rate-limit/postgres-store'
 *
 * const store = createPostgresRateLimitStore()
 * const rateLimiter = createRateLimiter(store)
 * const key = generateDailyKey('moc-upload', userId)
 * const result = await rateLimiter.checkLimit(key, {
 *   maxRequests: 100,
 *   windowMs: RATE_LIMIT_WINDOWS.DAY,
 * })
 * ```
 *
 * Story 3.1.31: Extract Rate Limit Package
 */

import { createRateLimiter, generateDailyKey, RATE_LIMIT_WINDOWS } from '@repo/rate-limit'
import type { RateLimitResult } from '@repo/rate-limit'
import { createPostgresRateLimitStore } from './postgres-store'

// Re-export schema for backwards compatibility
export { RateLimitResultSchema } from '@repo/rate-limit'
export type { RateLimitResult }

// Create singleton store and limiter
let rateLimiter: ReturnType<typeof createRateLimiter> | null = null

const getRateLimiter = () => {
  if (!rateLimiter) {
    const store = createPostgresRateLimitStore()
    rateLimiter = createRateLimiter(store)
  }
  return rateLimiter
}

/**
 * Check and increment daily upload limit for a user.
 *
 * @deprecated Use `@repo/rate-limit` with `createPostgresRateLimitStore` instead.
 *
 * @param userId - The user's Cognito ID
 * @param maxPerDay - Maximum uploads allowed per day
 * @returns RateLimitResult with allowed status and retry info
 */
export const checkAndIncrementDailyLimit = async (
  userId: string,
  maxPerDay: number,
): Promise<RateLimitResult> => {
  const limiter = getRateLimiter()
  const key = generateDailyKey('moc-upload', userId)
  return limiter.checkLimit(key, {
    maxRequests: maxPerDay,
    windowMs: RATE_LIMIT_WINDOWS.DAY,
  })
}
