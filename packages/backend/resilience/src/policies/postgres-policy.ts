/**
 * @repo/resilience - PostgreSQL Policy
 *
 * Pre-configured resilience policy for PostgreSQL database calls.
 * Handles connection pooling and query timeouts.
 */

import { createServicePolicy, type ServicePolicy } from './index.js'

/**
 * PostgreSQL-specific circuit breaker configuration.
 * Conservative settings to prevent connection pool exhaustion.
 */
const POSTGRES_CIRCUIT_BREAKER_CONFIG = {
  name: 'postgres',
  timeout: 30000, // 30s - some queries can be slow
  errorThresholdPercentage: 50,
  resetTimeout: 10000, // 10s - quick recovery for database
  volumeThreshold: 3, // Open quickly on database issues
  enabled: true,
}

/**
 * PostgreSQL rate limiter configuration.
 * Matches typical connection pool size.
 */
const POSTGRES_RATE_LIMITER_CONFIG = {
  name: 'postgres',
  maxConcurrent: 50, // Match pool size
  highWater: 100, // Queue up to 100 waiting queries
  strategy: 'block' as const,
  enabled: true,
}

/**
 * Pre-built PostgreSQL service policy.
 */
export function createPostgresPolicy(): ServicePolicy {
  return createServicePolicy({
    name: 'postgres',
    circuitBreaker: POSTGRES_CIRCUIT_BREAKER_CONFIG,
    rateLimiter: POSTGRES_RATE_LIMITER_CONFIG,
    timeoutMs: 30000,
  })
}

/**
 * Singleton instance of PostgreSQL policy.
 */
let postgresPolicyInstance: ServicePolicy | null = null

export function getPostgresPolicy(): ServicePolicy {
  if (!postgresPolicyInstance) {
    postgresPolicyInstance = createPostgresPolicy()
  }
  return postgresPolicyInstance
}

/**
 * Fast query policy (for simple lookups).
 */
export function createPostgresFastQueryPolicy(): ServicePolicy {
  return createServicePolicy({
    name: 'postgres-fast',
    circuitBreaker: {
      ...POSTGRES_CIRCUIT_BREAKER_CONFIG,
      name: 'postgres-fast',
      timeout: 5000, // 5s for fast queries
    },
    rateLimiter: {
      ...POSTGRES_RATE_LIMITER_CONFIG,
      name: 'postgres-fast',
    },
    timeoutMs: 5000,
  })
}

/**
 * Slow query policy (for reports/aggregations).
 */
export function createPostgresSlowQueryPolicy(): ServicePolicy {
  return createServicePolicy({
    name: 'postgres-slow',
    circuitBreaker: {
      ...POSTGRES_CIRCUIT_BREAKER_CONFIG,
      name: 'postgres-slow',
      timeout: 120000, // 2 minutes for slow queries
    },
    rateLimiter: {
      ...POSTGRES_RATE_LIMITER_CONFIG,
      name: 'postgres-slow',
      maxConcurrent: 10, // Limit slow queries
    },
    timeoutMs: 120000,
  })
}
