/**
 * @repo/resilience - Circuit Breaker Types
 *
 * Zod schemas for circuit breaker configuration and state.
 */

import { z } from 'zod'

/**
 * Circuit breaker state enum
 */
export const CircuitStateSchema = z.enum(['CLOSED', 'OPEN', 'HALF_OPEN'])
export type CircuitState = z.infer<typeof CircuitStateSchema>

/**
 * Configuration for circuit breaker behavior
 */
export const CircuitBreakerConfigSchema = z.object({
  /** Unique name for this circuit breaker (used for logging/metrics) */
  name: z.string().min(1),

  /** Timeout in ms for the protected operation (default: 10000) */
  timeout: z.number().positive().default(10000),

  /** Error percentage threshold to open the circuit (default: 50) */
  errorThresholdPercentage: z.number().min(0).max(100).default(50),

  /** Time in ms to wait before attempting recovery (default: 30000) */
  resetTimeout: z.number().positive().default(30000),

  /** Minimum number of requests before error threshold applies (default: 5) */
  volumeThreshold: z.number().positive().default(5),

  /** Whether to enable circuit breaker (allows runtime disable) */
  enabled: z.boolean().default(true),

  /** Custom fallback value when circuit is open (optional) */
  fallbackValue: z.unknown().optional(),
})

export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>

/**
 * Input type for creating circuit breaker (before defaults applied)
 */
export type CircuitBreakerInput = z.input<typeof CircuitBreakerConfigSchema>

/**
 * Circuit breaker status for monitoring
 */
export const CircuitBreakerStatusSchema = z.object({
  name: z.string(),
  state: CircuitStateSchema,
  failures: z.number(),
  successes: z.number(),
  rejects: z.number(),
  fallbacks: z.number(),
  latencyMean: z.number(),
  latencyP95: z.number().optional(),
})

export type CircuitBreakerStatus = z.infer<typeof CircuitBreakerStatusSchema>

/**
 * Events emitted by circuit breaker
 */
export const CircuitBreakerEventSchema = z.enum([
  'success',
  'timeout',
  'reject',
  'open',
  'halfOpen',
  'close',
  'fallback',
  'failure',
])

export type CircuitBreakerEvent = z.infer<typeof CircuitBreakerEventSchema>
