/**
 * Error classification for retry logic.
 *
 * AC-16: isRetryableNodeError() utility that classifies errors as retryable or not.
 * - ZodError (validation) → NOT retryable
 * - TypeError, ReferenceError (programming) → NOT retryable
 * - NodeTimeoutError → retryable
 * - Network errors → retryable
 * - Rate limit errors → retryable
 * - Unknown errors → retryable (default)
 */

import { ZodError } from 'zod'
import { NodeCancellationError, NodeCircuitOpenError, NodeTimeoutError } from './errors.js'

/**
 * Error classification result with details.
 */
export interface ErrorClassification {
  /** Whether the error should trigger a retry */
  isRetryable: boolean
  /** Category of the error */
  category: ErrorCategory
  /** Recommended action */
  action: 'retry' | 'fail' | 'cancel'
  /** Human-readable reason for the classification */
  reason: string
}

/**
 * Error categories for classification.
 */
export type ErrorCategory =
  | 'validation'
  | 'programming'
  | 'timeout'
  | 'cancellation'
  | 'circuit_open'
  | 'network'
  | 'rate_limit'
  | 'unknown'

/**
 * Patterns indicating network-related errors.
 */
const NETWORK_ERROR_PATTERNS = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'fetch failed',
  'network error',
  'network request failed',
  'socket hang up',
  'connection refused',
] as const

/**
 * Patterns indicating rate limit errors.
 */
const RATE_LIMIT_PATTERNS = [
  'rate limit',
  'too many requests',
  '429',
  'quota exceeded',
  'throttled',
] as const

/**
 * Checks if an error message matches any of the patterns.
 */
function matchesPatterns(message: string, patterns: readonly string[]): boolean {
  const lowerMessage = message.toLowerCase()
  return patterns.some(pattern => lowerMessage.includes(pattern.toLowerCase()))
}

/**
 * Classifies an error to determine if it should be retried.
 * AC-16: Error classification for retry decisions.
 *
 * @param error - The error to classify
 * @returns Classification result with retryable flag and details
 */
export function classifyError(error: unknown): ErrorClassification {
  // Handle null/undefined - default to retryable
  if (error == null) {
    return {
      isRetryable: true,
      category: 'unknown',
      action: 'retry',
      reason: 'Null or undefined error - defaulting to retryable',
    }
  }

  // ZodError - validation failure, NOT retryable
  if (error instanceof ZodError) {
    return {
      isRetryable: false,
      category: 'validation',
      action: 'fail',
      reason: 'Validation error (ZodError) - retrying will not fix invalid data',
    }
  }

  // TypeError - programming error, NOT retryable
  if (error instanceof TypeError) {
    return {
      isRetryable: false,
      category: 'programming',
      action: 'fail',
      reason: 'TypeError indicates a programming error - retrying will not help',
    }
  }

  // ReferenceError - programming error, NOT retryable
  if (error instanceof ReferenceError) {
    return {
      isRetryable: false,
      category: 'programming',
      action: 'fail',
      reason: 'ReferenceError indicates a programming error - retrying will not help',
    }
  }

  // SyntaxError - programming error, NOT retryable
  if (error instanceof SyntaxError) {
    return {
      isRetryable: false,
      category: 'programming',
      action: 'fail',
      reason: 'SyntaxError indicates a programming error - retrying will not help',
    }
  }

  // NodeTimeoutError - transient, IS retryable
  if (error instanceof NodeTimeoutError) {
    return {
      isRetryable: true,
      category: 'timeout',
      action: 'retry',
      reason: 'Timeout error - operation may succeed on retry',
    }
  }

  // NodeCancellationError - intentional cancellation, NOT retryable
  if (error instanceof NodeCancellationError) {
    return {
      isRetryable: false,
      category: 'cancellation',
      action: 'cancel',
      reason: 'Operation was cancelled - should not retry',
    }
  }

  // NodeCircuitOpenError - circuit is open, NOT retryable (until recovery)
  if (error instanceof NodeCircuitOpenError) {
    return {
      isRetryable: false,
      category: 'circuit_open',
      action: 'fail',
      reason: 'Circuit breaker is open - should not retry until recovery',
    }
  }

  // Check error message for patterns
  if (error instanceof Error) {
    const message = error.message

    // Network errors - IS retryable
    if (matchesPatterns(message, NETWORK_ERROR_PATTERNS)) {
      return {
        isRetryable: true,
        category: 'network',
        action: 'retry',
        reason: 'Network error detected - may be transient',
      }
    }

    // Rate limit errors - IS retryable (with backoff)
    if (matchesPatterns(message, RATE_LIMIT_PATTERNS)) {
      return {
        isRetryable: true,
        category: 'rate_limit',
        action: 'retry',
        reason: 'Rate limit detected - should retry with backoff',
      }
    }
  }

  // Unknown errors - default to retryable for safety
  return {
    isRetryable: true,
    category: 'unknown',
    action: 'retry',
    reason: 'Unknown error type - defaulting to retryable for unexpected failures',
  }
}

/**
 * Simplified check for whether an error is retryable.
 * AC-16: isRetryableNodeError() utility function.
 *
 * @param error - The error to check
 * @returns true if the error should be retried
 */
export function isRetryableNodeError(error: unknown): boolean {
  return classifyError(error).isRetryable
}

/**
 * Gets the error category for an error.
 *
 * @param error - The error to categorize
 * @returns The error category
 */
export function getErrorCategory(error: unknown): ErrorCategory {
  return classifyError(error).category
}
