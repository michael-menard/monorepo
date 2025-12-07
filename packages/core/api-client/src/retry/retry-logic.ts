/**
 * Enhanced Serverless Retry Logic
 * Handles cold starts, timeouts, transient failures, and circuit breaker patterns
 */

import { createLogger } from '@repo/logger'

const logger = createLogger('api-client:retry-logic')

export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  jitter: boolean
  // Enhanced serverless features
  adaptiveRetry: boolean
  circuitBreakerEnabled: boolean
  coldStartMultiplier: number
  timeoutMultiplier: number
  priorityLevels: boolean
}

export interface CircuitBreakerConfig {
  failureThreshold: number
  recoveryTimeout: number
  monitoringWindow: number
}

export interface RetryMetrics {
  totalAttempts: number
  successfulAttempts: number
  failedAttempts: number
  coldStartRetries: number
  timeoutRetries: number
  averageRetryDelay: number
  circuitBreakerTrips: number
}

export interface RetryableError {
  isRetryable: boolean
  isColdStart: boolean
  isTimeout: boolean
  statusCode?: number
  message: string
}

/**
 * Default retry configuration optimized for serverless
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true,
  // Enhanced serverless features
  adaptiveRetry: true,
  circuitBreakerEnabled: true,
  coldStartMultiplier: 1.5,
  timeoutMultiplier: 2.0,
  priorityLevels: true,
}

/**
 * Default circuit breaker configuration
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeout: 30000, // 30 seconds
  monitoringWindow: 60000, // 1 minute
}

/**
 * Story 3.1.4: Non-retryable HTTP status codes
 * These errors should be surfaced directly to the UI:
 * - 401 Unauthorized: prompt re-auth (login)
 * - 403 Forbidden: show permission error UI
 * - 404 Not Found: show not-found UI
 */
const NON_RETRYABLE_STATUS_CODES = [401, 403, 404]

/**
 * Determine if an error is retryable based on serverless patterns
 *
 * Story 3.1.4: 401/403/404 are NEVER retryable
 */
export function isRetryableError(error: any): RetryableError {
  const statusCode = error?.status || error?.response?.status
  const message = error?.message || error?.response?.statusText || 'Unknown error'

  // Story 3.1.4: Never retry 401/403/404
  if (NON_RETRYABLE_STATUS_CODES.includes(statusCode)) {
    return {
      isRetryable: false,
      isColdStart: false,
      isTimeout: false,
      statusCode,
      message,
    }
  }

  // Cold start indicators
  const isColdStart =
    statusCode === 502 || // Bad Gateway (common during cold starts)
    statusCode === 503 || // Service Unavailable
    statusCode === 504 || // Gateway Timeout
    message.includes('timeout') ||
    message.includes('cold start') ||
    message.includes('function not ready')

  // Timeout indicators
  const isTimeout =
    statusCode === 408 || // Request Timeout
    statusCode === 504 || // Gateway Timeout
    message.includes('timeout') ||
    error?.code === 'TIMEOUT'

  // General retryable conditions (only transient errors)
  const isRetryable =
    isColdStart ||
    isTimeout ||
    statusCode === 429 || // Rate Limited
    statusCode === 500 || // Internal Server Error
    statusCode === 502 || // Bad Gateway
    statusCode === 503 || // Service Unavailable
    statusCode === 504 || // Gateway Timeout
    error?.code === 'NETWORK_ERROR' ||
    error?.code === 'ECONNRESET' ||
    error?.code === 'ENOTFOUND'

  return {
    isRetryable,
    isColdStart,
    isTimeout,
    statusCode,
    message,
  }
}

/**
 * Circuit Breaker implementation for serverless APIs
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  private config: CircuitBreakerConfig

  constructor(config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG) {
    this.config = config
  }

  /**
   * Check if circuit breaker allows the request
   */
  canExecute(): boolean {
    const now = Date.now()

    switch (this.state) {
      case 'CLOSED':
        return true

      case 'OPEN':
        if (now - this.lastFailureTime >= this.config.recoveryTimeout) {
          this.state = 'HALF_OPEN'
          return true
        }
        return false

      case 'HALF_OPEN':
        return true

      default:
        return true
    }
  }

  /**
   * Record successful execution
   */
  recordSuccess(): void {
    this.failures = 0
    this.state = 'CLOSED'
  }

  /**
   * Record failed execution
   */
  recordFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN'
    }
  }

  /**
   * Get current circuit breaker state
   */
  getState(): { state: string; failures: number; lastFailureTime: number } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    }
  }
}

/**
 * Enhanced retry delay calculation with serverless optimizations
 */
export function calculateRetryDelay(
  attempt: number,
  errorInfo: RetryableError,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): number {
  let baseDelay = config.baseDelay

  // Apply serverless-specific multipliers
  if (config.adaptiveRetry) {
    if (errorInfo.isColdStart) {
      baseDelay *= config.coldStartMultiplier
    }
    if (errorInfo.isTimeout) {
      baseDelay *= config.timeoutMultiplier
    }
  }

  const exponentialDelay = baseDelay * Math.pow(config.backoffMultiplier, attempt - 1)
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay)

  if (!config.jitter) {
    return cappedDelay
  }

  // Add jitter to prevent thundering herd
  const jitterRange = cappedDelay * 0.1
  const jitter = (Math.random() - 0.5) * 2 * jitterRange

  return Math.max(0, cappedDelay + jitter)
}

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Global circuit breakers for different endpoints
 */
const circuitBreakers = new Map<string, CircuitBreaker>()

/**
 * Global retry metrics
 */
let globalMetrics: RetryMetrics = {
  totalAttempts: 0,
  successfulAttempts: 0,
  failedAttempts: 0,
  coldStartRetries: 0,
  timeoutRetries: 0,
  averageRetryDelay: 0,
  circuitBreakerTrips: 0,
}

/**
 * Get or create circuit breaker for endpoint
 */
function getCircuitBreaker(endpoint: string): CircuitBreaker {
  if (!circuitBreakers.has(endpoint)) {
    circuitBreakers.set(endpoint, new CircuitBreaker())
  }
  return circuitBreakers.get(endpoint)!
}

/**
 * Enhanced retry wrapper with circuit breaker and metrics
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  endpoint = 'default',
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  const circuitBreaker = retryConfig.circuitBreakerEnabled ? getCircuitBreaker(endpoint) : null
  let lastError: any
  let totalDelay = 0

  // Check circuit breaker before attempting
  if (circuitBreaker && !circuitBreaker.canExecute()) {
    globalMetrics.circuitBreakerTrips++
    throw new Error(`Circuit breaker is OPEN for endpoint: ${endpoint}`)
  }

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    try {
      globalMetrics.totalAttempts++
      const result = await operation()

      // Record success
      globalMetrics.successfulAttempts++
      if (circuitBreaker) {
        circuitBreaker.recordSuccess()
      }

      return result
    } catch (error) {
      lastError = error
      const errorInfo = isRetryableError(error)

      // Update metrics
      globalMetrics.failedAttempts++
      if (errorInfo.isColdStart) globalMetrics.coldStartRetries++
      if (errorInfo.isTimeout) globalMetrics.timeoutRetries++

      // Record failure in circuit breaker
      if (circuitBreaker) {
        circuitBreaker.recordFailure()
      }

      // Don't retry if error is not retryable
      if (!errorInfo.isRetryable) {
        throw error
      }

      // Don't retry on last attempt
      if (attempt === retryConfig.maxAttempts) {
        break
      }

      const delay = calculateRetryDelay(attempt, errorInfo, retryConfig)
      totalDelay += delay

      logger.warn(
        `Retry attempt ${attempt}/${retryConfig.maxAttempts} after ${delay}ms`,
        undefined,
        {
          endpoint,
          error: errorInfo.message,
          isColdStart: errorInfo.isColdStart,
          isTimeout: errorInfo.isTimeout,
          statusCode: errorInfo.statusCode,
          circuitBreakerState: circuitBreaker?.getState(),
        },
      )

      await sleep(delay)
    }
  }

  // Update average delay metric
  if (globalMetrics.totalAttempts > 0) {
    globalMetrics.averageRetryDelay =
      (globalMetrics.averageRetryDelay * (globalMetrics.totalAttempts - 1) + totalDelay) /
      globalMetrics.totalAttempts
  }

  throw lastError
}

/**
 * Priority-based retry for high-priority operations
 */
export async function withPriorityRetry<T>(
  operation: () => Promise<T>,
  priority: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  config: Partial<RetryConfig> = {},
  endpoint = 'default',
): Promise<T> {
  // Adjust retry config based on priority
  const priorityConfigs: Record<string, Partial<RetryConfig>> = {
    low: { maxAttempts: 2, baseDelay: 2000 },
    medium: { maxAttempts: 3, baseDelay: 1000 },
    high: { maxAttempts: 4, baseDelay: 500 },
    critical: { maxAttempts: 5, baseDelay: 250, maxDelay: 5000 },
  }

  const enhancedConfig = {
    ...config,
    ...priorityConfigs[priority],
  }

  return withRetry(operation, enhancedConfig, `${endpoint}:${priority}`)
}

/**
 * Batch retry for multiple operations with concurrency control
 */
export async function withBatchRetry<T>(
  operations: Array<() => Promise<T>>,
  config: Partial<RetryConfig> = {},
  maxConcurrency = 3,
): Promise<Array<T | Error>> {
  const results: Array<T | Error> = []
  const batches: Array<Array<() => Promise<T>>> = []

  // Split operations into batches
  for (let i = 0; i < operations.length; i += maxConcurrency) {
    batches.push(operations.slice(i, i + maxConcurrency))
  }

  // Process batches sequentially, operations within batch concurrently
  for (const batch of batches) {
    const batchPromises = batch.map(async (operation, index) => {
      try {
        return await withRetry(operation, config, `batch-${index}`)
      } catch (error) {
        return error instanceof Error ? error : new Error(String(error))
      }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
  }

  return results
}

/**
 * Get current retry metrics
 */
export function getRetryMetrics(): RetryMetrics {
  return { ...globalMetrics }
}

/**
 * Reset retry metrics
 */
export function resetRetryMetrics(): void {
  globalMetrics = {
    totalAttempts: 0,
    successfulAttempts: 0,
    failedAttempts: 0,
    coldStartRetries: 0,
    timeoutRetries: 0,
    averageRetryDelay: 0,
    circuitBreakerTrips: 0,
  }
}

/**
 * Get circuit breaker states for all endpoints
 */
export function getCircuitBreakerStates(): Record<string, any> {
  const states: Record<string, any> = {}

  for (const [endpoint, breaker] of circuitBreakers.entries()) {
    states[endpoint] = breaker.getState()
  }

  return states
}

/**
 * Reset circuit breaker for specific endpoint
 */
export function resetCircuitBreaker(endpoint: string): void {
  circuitBreakers.delete(endpoint)
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuitBreakers(): void {
  circuitBreakers.clear()
}

/**
 * Health check for retry system
 */
export function getRetrySystemHealth(): {
  status: 'healthy' | 'degraded' | 'unhealthy'
  metrics: RetryMetrics
  circuitBreakers: Record<string, any>
  recommendations: string[]
} {
  const metrics = getRetryMetrics()
  const circuitBreakerStates = getCircuitBreakerStates()
  const recommendations: string[] = []

  // Calculate success rate
  const successRate =
    metrics.totalAttempts > 0 ? metrics.successfulAttempts / metrics.totalAttempts : 1

  // Determine health status
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

  if (successRate < 0.5) {
    status = 'unhealthy'
    recommendations.push('Success rate is critically low (<50%)')
  } else if (successRate < 0.8) {
    status = 'degraded'
    recommendations.push('Success rate is below optimal (80%)')
  }

  if (metrics.circuitBreakerTrips > 0) {
    status = status === 'healthy' ? 'degraded' : status
    recommendations.push('Circuit breakers have been triggered')
  }

  if (metrics.averageRetryDelay > 5000) {
    recommendations.push('Average retry delay is high (>5s)')
  }

  if (metrics.coldStartRetries > metrics.totalAttempts * 0.3) {
    recommendations.push('High cold start retry rate detected')
  }

  return {
    status,
    metrics,
    circuitBreakers: circuitBreakerStates,
    recommendations,
  }
}
