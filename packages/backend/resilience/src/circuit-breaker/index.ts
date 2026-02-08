/**
 * @repo/resilience - Circuit Breaker
 *
 * Opossum-based circuit breaker with integrated logging and metrics.
 * Prevents cascade failures by failing fast when a service is unhealthy.
 */

import CircuitBreaker from 'opossum'
import { logger } from '@repo/logger'

import {
  CircuitBreakerConfigSchema,
  type CircuitBreakerConfig,
  type CircuitBreakerInput,
  type CircuitBreakerStatus,
  type CircuitState,
} from './__types__/index.js'

export * from './__types__/index.js'

/**
 * Creates a circuit breaker around an async operation.
 *
 * @param action - The async operation to protect
 * @param config - Circuit breaker configuration
 * @returns Opossum CircuitBreaker instance
 *
 * @example
 * ```typescript
 * const breaker = createCircuitBreaker(
 *   async (signal?: AbortSignal) => fetch('/api/data', { signal }),
 *   { name: 'api-fetch', timeout: 5000 }
 * )
 *
 * const result = await breaker.fire()
 * ```
 */
export function createCircuitBreaker<T, TArgs extends unknown[] = []>(
  action: (...args: TArgs) => Promise<T>,
  inputConfig: CircuitBreakerInput,
): CircuitBreaker<TArgs, T> {
  const config = CircuitBreakerConfigSchema.parse(inputConfig)

  if (!config.enabled) {
    // Return a passthrough breaker that just executes the action
    const passthrough = new CircuitBreaker(action, {
      enabled: false,
    })
    return passthrough
  }

  const breaker = new CircuitBreaker(action, {
    timeout: config.timeout,
    errorThresholdPercentage: config.errorThresholdPercentage,
    resetTimeout: config.resetTimeout,
    volumeThreshold: config.volumeThreshold,
    name: config.name,
  })

  // Integrate with logger for observability
  breaker.on('open', () => {
    logger.warn('Circuit breaker opened', {
      circuitBreaker: config.name,
      event: 'open',
    })
  })

  breaker.on('close', () => {
    logger.info('Circuit breaker closed', {
      circuitBreaker: config.name,
      event: 'close',
    })
  })

  breaker.on('halfOpen', () => {
    logger.info('Circuit breaker half-open (testing)', {
      circuitBreaker: config.name,
      event: 'halfOpen',
    })
  })

  breaker.on('timeout', () => {
    logger.warn('Circuit breaker timeout', {
      circuitBreaker: config.name,
      event: 'timeout',
      timeoutMs: config.timeout,
    })
  })

  breaker.on('reject', () => {
    logger.warn('Circuit breaker rejected request', {
      circuitBreaker: config.name,
      event: 'reject',
    })
  })

  breaker.on('fallback', (result) => {
    logger.info('Circuit breaker fallback executed', {
      circuitBreaker: config.name,
      event: 'fallback',
      hasFallbackValue: result !== undefined,
    })
  })

  // Set up fallback if provided
  if (config.fallbackValue !== undefined) {
    breaker.fallback(() => config.fallbackValue as T)
  }

  return breaker
}

/**
 * Gets the current status of a circuit breaker for monitoring.
 */
export function getCircuitBreakerStatus(
  breaker: CircuitBreaker<unknown[], unknown>,
): CircuitBreakerStatus {
  const stats = breaker.stats

  // Map opossum internal state to our state enum
  let state: CircuitState = 'CLOSED'
  if (breaker.opened) {
    state = 'OPEN'
  } else if (breaker.halfOpen) {
    state = 'HALF_OPEN'
  }

  return {
    name: breaker.name || 'unnamed',
    state,
    failures: stats.failures,
    successes: stats.successes,
    rejects: stats.rejects,
    fallbacks: stats.fallbacks,
    latencyMean: stats.latencyMean,
    latencyP95: stats.percentiles?.['95'],
  }
}

/**
 * Registry to track all circuit breakers for monitoring/health checks.
 */
const circuitBreakerRegistry = new Map<string, CircuitBreaker<unknown[], unknown>>()

/**
 * Registers a circuit breaker in the global registry.
 */
export function registerCircuitBreaker(
  name: string,
  breaker: CircuitBreaker<unknown[], unknown>,
): void {
  circuitBreakerRegistry.set(name, breaker)
}

/**
 * Gets all registered circuit breakers.
 */
export function getRegisteredCircuitBreakers(): Map<string, CircuitBreaker<unknown[], unknown>> {
  return new Map(circuitBreakerRegistry)
}

/**
 * Gets status of all registered circuit breakers.
 */
export function getAllCircuitBreakerStatuses(): CircuitBreakerStatus[] {
  return Array.from(circuitBreakerRegistry.values()).map(getCircuitBreakerStatus)
}

/**
 * Resets all registered circuit breakers (useful for testing).
 */
export function resetAllCircuitBreakers(): void {
  for (const breaker of circuitBreakerRegistry.values()) {
    breaker.close()
  }
}
