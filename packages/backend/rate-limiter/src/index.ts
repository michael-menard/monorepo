/**
 * Rate Limiting Middleware
 *
 * Provides Redis-based rate limiting for Lambda functions to prevent abuse.
 * Implements sliding window algorithm for accurate rate limiting.
 */

import type { RedisClientType } from 'redis'

export interface RateLimitConfig {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number

  /**
   * Time window in seconds
   */
  windowSeconds: number

  /**
   * Key prefix for Redis (e.g., 'ratelimit:profile')
   */
  keyPrefix: string
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
  retryAfter?: number
}

/**
 * Logger interface - consumers can provide their own logger
 */
export interface RateLimiterLogger {
  debug(message: string, meta?: Record<string, unknown>): void
  warn(message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
}

/**
 * Default no-op logger
 */
const defaultLogger: RateLimiterLogger = {
  debug: () => {},
  warn: () => {},
  error: () => {},
}

/**
 * Check if request is within rate limit
 *
 * Uses Redis sorted sets to implement sliding window rate limiting.
 * Each request is added as a member with timestamp as score.
 *
 * @param redis - Redis client instance
 * @param identifier - Unique identifier for the user/IP (e.g., userId)
 * @param config - Rate limit configuration
 * @param logger - Optional logger instance
 * @returns Rate limit result with allowed status and metadata
 */
export async function checkRateLimit(
  redis: RedisClientType,
  identifier: string,
  config: RateLimitConfig,
  logger: RateLimiterLogger = defaultLogger,
): Promise<RateLimitResult> {
  const key = `${config.keyPrefix}:${identifier}`
  const now = Date.now()
  const windowStart = now - config.windowSeconds * 1000

  try {
    // Remove old entries outside the current window
    await redis.zRemRangeByScore(key, 0, windowStart)

    // Count requests in current window
    const requestCount = await redis.zCard(key)

    // Check if under limit
    if (requestCount < config.maxRequests) {
      // Add current request
      await redis.zAdd(key, { score: now, value: `${now}` })

      // Set expiry on key (cleanup)
      await redis.expire(key, config.windowSeconds)

      const remaining = config.maxRequests - requestCount - 1
      const resetAt = new Date(now + config.windowSeconds * 1000)

      logger.debug('Rate limit check passed', {
        identifier,
        requestCount: requestCount + 1,
        maxRequests: config.maxRequests,
        remaining,
      })

      return {
        allowed: true,
        remaining,
        resetAt,
      }
    }

    // Rate limit exceeded
    const oldestRequest = await redis.zRange(key, 0, 0, { REV: false })
    const oldestTimestamp = oldestRequest.length > 0 ? parseInt(oldestRequest[0] as string) : now
    const resetAt = new Date(oldestTimestamp + config.windowSeconds * 1000)
    const retryAfter = Math.ceil((resetAt.getTime() - now) / 1000)

    logger.warn('Rate limit exceeded', {
      identifier,
      requestCount,
      maxRequests: config.maxRequests,
      retryAfter,
    })

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter,
    }
  } catch (error) {
    logger.error('Rate limit check failed', { identifier, error })

    // Fail open - allow request if rate limiting system is down
    // This prevents blocking all requests if Redis is unavailable
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now + config.windowSeconds * 1000),
    }
  }
}

/**
 * Standard rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  /**
   * Profile endpoints: 60 requests per minute per user
   */
  profile: {
    maxRequests: 60,
    windowSeconds: 60,
    keyPrefix: 'ratelimit:profile',
  } as RateLimitConfig,

  /**
   * Strict limit for sensitive operations: 10 requests per minute
   */
  strict: {
    maxRequests: 10,
    windowSeconds: 60,
    keyPrefix: 'ratelimit:strict',
  } as RateLimitConfig,

  /**
   * Lenient limit for read-only operations: 120 requests per minute
   */
  lenient: {
    maxRequests: 120,
    windowSeconds: 60,
    keyPrefix: 'ratelimit:lenient',
  } as RateLimitConfig,
}
