/**
 * Retry logic for node execution.
 *
 * AC-5: Configurable retry strategies with maxAttempts and backoffMs.
 * AC-6: Retry exhaustion handling with blocked routing flag.
 * AC-16: Error classification for retry decisions.
 * AC-18: Retry jitter (0-25% variance).
 * AC-23: onRetryAttempt callback.
 *
 * Adapted from @repo/api-client retry patterns.
 */

import { isRetryableNodeError } from './error-classification.js'
import { NodeRetryExhaustedError } from './errors.js'
import type { NodeRetryConfig, OnRetryAttemptCallback } from './types.js'
import { DEFAULT_RETRY_CONFIG } from './types.js'

/**
 * Options for retry wrapper.
 */
export interface RetryOptions {
  /** Retry configuration */
  config: NodeRetryConfig
  /** Node name for error reporting */
  nodeName: string
  /** Optional callback for retry attempts */
  onRetryAttempt?: OnRetryAttemptCallback
}

/**
 * Result of a retry operation.
 */
export interface RetryResult<T> {
  /** The successful result value */
  value: T
  /** Total number of attempts made */
  attempts: number
  /** Array of errors from failed attempts */
  errors: Error[]
  /** Total time spent in delays (ms) */
  totalDelayMs: number
}

/**
 * Calculates retry delay with exponential backoff and jitter.
 * AC-18: Jitter (0-25% variance) to prevent thundering herd.
 *
 * @param attempt - Current attempt number (1-indexed)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateRetryDelay(attempt: number, config: NodeRetryConfig): number {
  // Calculate base exponential delay
  const exponentialDelay = config.backoffMs * Math.pow(config.backoffMultiplier, attempt - 1)

  // Cap at maxBackoffMs
  const cappedDelay = Math.min(exponentialDelay, config.maxBackoffMs)

  // Apply jitter (0 to jitterFactor * delay)
  if (config.jitterFactor > 0) {
    const jitter = Math.random() * config.jitterFactor * cappedDelay
    return Math.floor(cappedDelay + jitter)
  }

  return Math.floor(cappedDelay)
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Wraps an async operation with retry logic.
 * AC-5: Configurable retry with maxAttempts and backoff.
 * AC-6: Returns NodeRetryExhaustedError when all attempts fail.
 * AC-16: Uses error classification to determine retryability.
 * AC-18: Applies jitter to prevent thundering herd.
 * AC-23: Calls onRetryAttempt callback before each retry.
 *
 * @param operation - The async operation to retry
 * @param options - Retry options
 * @returns The operation result with retry metadata
 * @throws NodeRetryExhaustedError when all retry attempts fail
 */
export async function withNodeRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions,
): Promise<RetryResult<T>> {
  const { config, nodeName, onRetryAttempt } = options
  const errors: Error[] = []
  let totalDelayMs = 0

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      const value = await operation()
      return {
        value,
        attempts: attempt,
        errors,
        totalDelayMs,
      }
    } catch (error) {
      const normalizedError = error instanceof Error ? error : new Error(String(error))
      errors.push(normalizedError)

      // Check if this is the last attempt
      if (attempt >= config.maxAttempts) {
        throw new NodeRetryExhaustedError(nodeName, attempt, normalizedError)
      }

      // Check if error is retryable
      if (!isRetryableNodeError(error)) {
        // Non-retryable error, fail immediately
        throw new NodeRetryExhaustedError(nodeName, attempt, normalizedError)
      }

      // Calculate delay for next attempt
      const delayMs = calculateRetryDelay(attempt, config)
      totalDelayMs += delayMs

      // Call retry callback if provided
      if (onRetryAttempt) {
        try {
          onRetryAttempt(attempt, normalizedError, delayMs)
        } catch {
          // Ignore errors in callback
        }
      }

      // Wait before next attempt
      await sleep(delayMs)
    }
  }

  // Should not reach here, but TypeScript needs this
  throw new NodeRetryExhaustedError(
    nodeName,
    config.maxAttempts,
    errors[errors.length - 1] || new Error('Unknown error'),
  )
}

/**
 * Creates a retry wrapper with pre-configured options.
 * Useful for creating reusable retry functions.
 *
 * @param options - Default retry options
 * @returns A configured retry function
 */
export function createRetryWrapper(options: Partial<RetryOptions>) {
  return async function <T>(
    operation: () => Promise<T>,
    overrides?: Partial<RetryOptions>,
  ): Promise<RetryResult<T>> {
    const mergedConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...options.config,
      ...overrides?.config,
    }

    return withNodeRetry(operation, {
      config: mergedConfig,
      nodeName: overrides?.nodeName ?? options.nodeName ?? 'unknown-node',
      onRetryAttempt: overrides?.onRetryAttempt ?? options.onRetryAttempt,
    })
  }
}

/**
 * Checks if an operation would be retried based on error type.
 * Useful for testing retry behavior without actually retrying.
 *
 * @param error - The error to check
 * @returns Whether the error would trigger a retry
 */
export function wouldRetry(error: unknown): boolean {
  return isRetryableNodeError(error)
}
