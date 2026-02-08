/**
 * @repo/resilience - Redis Policy
 *
 * Pre-configured resilience policy for Redis cache operations.
 * Fast timeouts appropriate for in-memory cache.
 */

import { createServicePolicy, type ServicePolicy } from './index.js'

/**
 * Redis-specific circuit breaker configuration.
 * Fast timeouts - Redis should be quick or it's down.
 */
const REDIS_CIRCUIT_BREAKER_CONFIG = {
  name: 'redis',
  timeout: 1000, // 1s - Redis should be fast
  errorThresholdPercentage: 50,
  resetTimeout: 5000, // 5s - quick recovery
  volumeThreshold: 5,
  enabled: true,
}

/**
 * Redis rate limiter configuration.
 * Redis can handle very high throughput.
 */
const REDIS_RATE_LIMITER_CONFIG = {
  name: 'redis',
  maxConcurrent: 200, // Redis handles high concurrency
  enabled: true,
}

/**
 * Pre-built Redis service policy.
 */
export function createRedisPolicy(): ServicePolicy {
  return createServicePolicy({
    name: 'redis',
    circuitBreaker: REDIS_CIRCUIT_BREAKER_CONFIG,
    rateLimiter: REDIS_RATE_LIMITER_CONFIG,
    timeoutMs: 1000,
  })
}

/**
 * Singleton instance of Redis policy.
 */
let redisPolicyInstance: ServicePolicy | null = null

export function getRedisPolicy(): ServicePolicy {
  if (!redisPolicyInstance) {
    redisPolicyInstance = createRedisPolicy()
  }
  return redisPolicyInstance
}

/**
 * Redis cache-aside pattern: fail gracefully (return undefined instead of error).
 * Circuit breaker still protects, but fallback returns undefined.
 */
export function createRedisCachePolicy(): ServicePolicy {
  return createServicePolicy({
    name: 'redis-cache',
    circuitBreaker: {
      ...REDIS_CIRCUIT_BREAKER_CONFIG,
      name: 'redis-cache',
      fallbackValue: undefined, // Cache miss on failure
    },
    rateLimiter: {
      ...REDIS_RATE_LIMITER_CONFIG,
      name: 'redis-cache',
    },
    timeoutMs: 500, // Even faster for cache
  })
}

/**
 * Redis session store policy.
 */
export function createRedisSessionPolicy(): ServicePolicy {
  return createServicePolicy({
    name: 'redis-session',
    circuitBreaker: {
      ...REDIS_CIRCUIT_BREAKER_CONFIG,
      name: 'redis-session',
      timeout: 2000, // Slightly longer for sessions
    },
    rateLimiter: {
      ...REDIS_RATE_LIMITER_CONFIG,
      name: 'redis-session',
    },
    timeoutMs: 2000,
  })
}
