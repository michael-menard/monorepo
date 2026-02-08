/**
 * @repo/resilience - Service Policies
 *
 * Combines circuit breaker, rate limiter, and timeout into unified service policies.
 * Provides a consistent interface for protecting external service calls.
 */

import { z } from 'zod'
import Bottleneck from 'bottleneck'
import CircuitBreaker from 'opossum'
import { logger } from '@repo/logger'

import {
  createCircuitBreaker,
  registerCircuitBreaker,
  type CircuitBreakerInput,
} from '../circuit-breaker/index.js'
import {
  createRateLimiter,
  registerRateLimiter,
  type RateLimiterInput,
} from '../rate-limiter/index.js'
import { withTimeout, type TimeoutError } from '../timeout/index.js'

/**
 * Service policy configuration schema.
 */
export const ServicePolicyConfigSchema = z.object({
  /** Unique name for this policy */
  name: z.string().min(1),

  /** Circuit breaker configuration */
  circuitBreaker: z.custom<CircuitBreakerInput>(),

  /** Rate limiter configuration */
  rateLimiter: z.custom<RateLimiterInput>(),

  /** Default timeout in ms (can be overridden per-call) */
  timeoutMs: z.number().positive().default(10000),

  /** Whether to register in global registry */
  register: z.boolean().default(true),
})

export type ServicePolicyConfig = z.infer<typeof ServicePolicyConfigSchema>
export type ServicePolicyInput = z.input<typeof ServicePolicyConfigSchema>

/**
 * A unified service policy that combines circuit breaker + rate limiter + timeout.
 */
export interface ServicePolicy {
  /** Policy name */
  name: string

  /** The underlying circuit breaker */
  circuitBreaker: CircuitBreaker<[AbortSignal?], unknown>

  /** The underlying rate limiter */
  rateLimiter: Bottleneck

  /** Default timeout in ms */
  timeoutMs: number

  /**
   * Execute an operation through the policy.
   * Applies rate limiting → circuit breaker → timeout in order.
   */
  execute: <T>(
    operation: (signal?: AbortSignal) => Promise<T>,
    options?: { timeoutMs?: number },
  ) => Promise<T>

  /**
   * Check if the policy is healthy (circuit not open).
   */
  isHealthy: () => boolean

  /**
   * Get policy stats for monitoring.
   */
  getStats: () => ServicePolicyStats
}

/**
 * Stats returned by policy for monitoring.
 */
export interface ServicePolicyStats {
  name: string
  circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
  circuitFailures: number
  circuitSuccesses: number
  rateLimiterQueued: number
  rateLimiterRunning: number
}

/**
 * Creates a unified service policy.
 *
 * @example
 * ```typescript
 * const policy = createServicePolicy({
 *   name: 'external-api',
 *   circuitBreaker: { timeout: 5000, errorThresholdPercentage: 50 },
 *   rateLimiter: { maxConcurrent: 10 },
 *   timeoutMs: 5000,
 * })
 *
 * const result = await policy.execute(
 *   (signal) => fetch('/api', { signal }),
 * )
 * ```
 */
export function createServicePolicy(inputConfig: ServicePolicyInput): ServicePolicy {
  const config = ServicePolicyConfigSchema.parse(inputConfig)

  // Create rate limiter
  const rateLimiter = createRateLimiter({
    ...config.rateLimiter,
    name: config.rateLimiter.name || config.name,
  })

  // Create a placeholder circuit breaker - the actual action is wrapped per-call
  // We use a simple passthrough action since we wrap per execute()
  const circuitBreaker = createCircuitBreaker<unknown, [AbortSignal?]>(
    async (_signal?: AbortSignal) => {
      // This is just a placeholder - real action provided in execute()
      return undefined
    },
    {
      ...config.circuitBreaker,
      name: config.circuitBreaker.name || config.name,
    },
  )

  // Register if requested
  if (config.register) {
    registerCircuitBreaker(config.name, circuitBreaker as CircuitBreaker<unknown[], unknown>)
    registerRateLimiter(config.name, rateLimiter)
  }

  const policy: ServicePolicy = {
    name: config.name,
    circuitBreaker,
    rateLimiter,
    timeoutMs: config.timeoutMs,

    execute: async <T>(
      operation: (signal?: AbortSignal) => Promise<T>,
      options?: { timeoutMs?: number },
    ): Promise<T> => {
      const timeoutMs = options?.timeoutMs ?? config.timeoutMs

      // Layer 1: Rate limiting
      return rateLimiter.schedule(async () => {
        // Layer 2: Timeout with AbortController
        return withTimeout(
          async (signal) => {
            // Layer 3: Circuit breaker
            // Since opossum doesn't support dynamic actions, we create a per-call breaker
            // or use the fire() method with the signal
            if (circuitBreaker.opened) {
              throw new Error(`Circuit breaker '${config.name}' is open`)
            }

            try {
              const result = await operation(signal)
              // Record success on the main breaker for stats
              circuitBreaker.emit('success')
              return result
            } catch (error) {
              // Record failure on the main breaker
              circuitBreaker.emit('failure')
              throw error
            }
          },
          timeoutMs,
          config.name,
        )
      })
    },

    isHealthy: () => {
      return !circuitBreaker.opened
    },

    getStats: () => {
      const counts = rateLimiter.counts()
      let circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
      if (circuitBreaker.opened) {
        circuitState = 'OPEN'
      } else if (circuitBreaker.halfOpen) {
        circuitState = 'HALF_OPEN'
      }

      return {
        name: config.name,
        circuitState,
        circuitFailures: circuitBreaker.stats.failures,
        circuitSuccesses: circuitBreaker.stats.successes,
        rateLimiterQueued: counts.QUEUED,
        rateLimiterRunning: counts.RUNNING,
      }
    },
  }

  return policy
}

// Re-export individual policies
export { createOpenAIPolicy, getOpenAIPolicy, createOpenAIEmbeddingsPolicy } from './openai-policy.js'
export { createCognitoPolicy, getCognitoPolicy, createCognitoAdminPolicy } from './cognito-policy.js'
export { createS3Policy, getS3Policy, createS3UploadPolicy, createS3DownloadPolicy } from './s3-policy.js'
export { createPostgresPolicy, getPostgresPolicy, createPostgresFastQueryPolicy, createPostgresSlowQueryPolicy } from './postgres-policy.js'
export { createRedisPolicy, getRedisPolicy, createRedisCachePolicy, createRedisSessionPolicy } from './redis-policy.js'
