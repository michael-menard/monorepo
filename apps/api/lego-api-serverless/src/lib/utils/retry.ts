/**
 * Retry Utility with Exponential Backoff and Jitter
 *
 * Implements retry logic for transient failures with:
 * - Exponential backoff to prevent overwhelming failing services
 * - Jitter to prevent thundering herd problem
 * - Selective retry based on error type (isRetryable flag)
 *
 * Usage:
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => uploadToS3(file),
 *   { maxAttempts: 3, baseDelay: 500 }
 * )
 * ```
 */

import { logger } from './logger'
import { isApiError } from '@monorepo/lambda-responses'

/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts?: number
  /** Base delay in milliseconds before first retry (default: 100ms) */
  baseDelay?: number
  /** Maximum delay in milliseconds (default: 5000ms) */
  maxDelay?: number
  /** Exponential base multiplier (default: 2) */
  exponentialBase?: number
  /** Enable jitter to prevent thundering herd (default: true) */
  jitter?: boolean
  /** Optional context for logging */
  context?: string
}

/**
 * Default retry configuration
 */
const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'context'>> = {
  maxAttempts: 3,
  baseDelay: 100,
  maxDelay: 5000,
  exponentialBase: 2,
  jitter: true,
}

/**
 * Retry an async operation with exponential backoff
 *
 * @param operation - The async operation to retry
 * @param options - Retry configuration options
 * @returns The result of the operation
 * @throws The last error if all retries are exhausted
 *
 * @example
 * ```typescript
 * // Retry S3 upload with custom settings
 * const url = await retryWithBackoff(
 *   () => s3Client.upload(params),
 *   {
 *     maxAttempts: 3,
 *     baseDelay: 500,
 *     context: 'S3Upload'
 *   }
 * )
 * ```
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      // Attempt the operation
      const result = await operation()

      // Log success if this was a retry
      if (attempt > 1) {
        logger.info(`Operation succeeded on attempt ${attempt}`, {
          context: opts.context,
          attempt,
        })
      }

      return result
    } catch (error) {
      lastError = error as Error

      // Check if error is retryable
      const shouldRetry = isErrorRetryable(error)

      // Don't retry if error is not retryable
      if (!shouldRetry) {
        logger.warn('Non-retryable error encountered, failing immediately', {
          context: opts.context,
          error: error instanceof Error ? error.message : String(error),
          errorType: isApiError(error) ? error.errorType : 'unknown',
        })
        throw error
      }

      // Don't retry on last attempt
      if (attempt === opts.maxAttempts) {
        logger.error('Max retry attempts exhausted', {
          context: opts.context,
          attempts: attempt,
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }

      // Calculate delay with exponential backoff
      const exponentialDelay = opts.baseDelay * Math.pow(opts.exponentialBase, attempt - 1)
      let delay = Math.min(exponentialDelay, opts.maxDelay)

      // Add jitter to prevent thundering herd (50-100% of calculated delay)
      if (opts.jitter) {
        delay = delay * (0.5 + Math.random() * 0.5)
      }

      logger.warn(`Retrying operation after ${Math.round(delay)}ms`, {
        context: opts.context,
        attempt,
        maxAttempts: opts.maxAttempts,
        delay: Math.round(delay),
        error: error instanceof Error ? error.message : String(error),
        errorType: isApiError(error) ? error.errorType : 'unknown',
      })

      // Wait before retrying
      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript doesn't know that
  throw lastError!
}

/**
 * Check if an error should be retried
 *
 * @param error - The error to check
 * @returns true if the error is retryable
 */
function isErrorRetryable(error: unknown): boolean {
  // Check if it's an ApiError with isRetryable flag
  if (isApiError(error)) {
    return error.isRetryable
  }

  // For non-ApiError instances, check for common retryable patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    const name = error.name.toLowerCase()

    // Common retryable error patterns
    const retryablePatterns = [
      'timeout',
      'econnreset',
      'enotfound',
      'econnrefused',
      'etimedout',
      'network',
      'socket',
      'throttl',
      'rate limit',
      'too many requests',
      'service unavailable',
      'temporarily unavailable',
    ]

    return retryablePatterns.some((pattern) => message.includes(pattern) || name.includes(pattern))
  }

  // Unknown error types are not retried by default
  return false
}

/**
 * Sleep utility for waiting between retries
 *
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Create a retry wrapper for a specific operation type
 *
 * Useful for creating pre-configured retry functions for specific services
 *
 * @example
 * ```typescript
 * // Create S3-specific retry wrapper
 * const retryS3Operation = createRetryWrapper({
 *   maxAttempts: 3,
 *   baseDelay: 500,
 *   context: 'S3'
 * })
 *
 * // Use the wrapper
 * const result = await retryS3Operation(() => s3.upload(params))
 * ```
 */
export function createRetryWrapper(defaultOptions: RetryOptions) {
  return <T>(operation: () => Promise<T>, overrideOptions?: RetryOptions): Promise<T> => {
    return retryWithBackoff(operation, { ...defaultOptions, ...overrideOptions })
  }
}
