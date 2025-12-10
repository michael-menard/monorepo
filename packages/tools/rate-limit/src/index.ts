/**
 * @repo/rate-limit
 *
 * Story 3.1.31: Extract Rate Limit Package
 *
 * Framework-agnostic rate limiting with store abstraction.
 *
 * @example
 * ```typescript
 * import { createRateLimiter, generateDailyKey, RATE_LIMIT_WINDOWS } from '@repo/rate-limit'
 * import type { RateLimitStore, RateLimitResult, RateLimitConfig } from '@repo/rate-limit'
 *
 * // Create limiter with your store implementation
 * const rateLimiter = createRateLimiter(myStore)
 *
 * // Check rate limit
 * const key = generateDailyKey('moc-upload', userId)
 * const result = await rateLimiter.checkLimit(key, {
 *   maxRequests: 100,
 *   windowMs: RATE_LIMIT_WINDOWS.DAY,
 * })
 *
 * if (!result.allowed) {
 *   // Return 429 with result.retryAfterSeconds
 * }
 * ```
 */

// Types
export type { RateLimitResult, RateLimitConfig, RateLimitStore, RateLimiter } from './types'

export { RateLimitResultSchema, RateLimitConfigSchema } from './types'

// Core
export { createRateLimiter, generateDailyKey, RATE_LIMIT_WINDOWS } from './limiter'

// Stores
export { createInMemoryStore } from './memory-store'
