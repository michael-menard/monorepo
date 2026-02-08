/**
 * @repo/resilience - Timeout Utilities
 *
 * AbortController-based timeout utilities for cancellable operations.
 * Enables graceful cancellation of slow or hung requests.
 */

import { logger } from '@repo/logger'

/**
 * Creates an AbortSignal that automatically aborts after the specified timeout.
 *
 * @param ms - Timeout in milliseconds
 * @returns AbortSignal that will abort after timeout
 *
 * @example
 * ```typescript
 * const signal = createTimeoutSignal(5000)
 * await fetch('/api/data', { signal })
 * ```
 */
export function createTimeoutSignal(ms: number): AbortSignal {
  return AbortSignal.timeout(ms)
}

/**
 * Creates an AbortController with automatic timeout.
 * Returns both the controller (for manual abort) and signal.
 *
 * @param ms - Timeout in milliseconds
 * @returns Object with controller and signal
 *
 * @example
 * ```typescript
 * const { controller, signal } = createTimeoutController(5000)
 *
 * // Can abort early if needed
 * if (shouldCancel) controller.abort()
 *
 * await fetch('/api/data', { signal })
 * ```
 */
export function createTimeoutController(ms: number): {
  controller: AbortController
  signal: AbortSignal
  cleanup: () => void
} {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort(new Error(`Operation timed out after ${ms}ms`))
  }, ms)

  return {
    controller,
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  }
}

/**
 * Wraps an async operation with a timeout.
 * Automatically cancels via AbortSignal when timeout is reached.
 *
 * @param operation - Async operation that accepts an AbortSignal
 * @param timeoutMs - Timeout in milliseconds
 * @param name - Optional name for logging
 * @returns Promise that rejects on timeout
 *
 * @example
 * ```typescript
 * const result = await withTimeout(
 *   (signal) => fetch('/api/data', { signal }),
 *   5000,
 *   'api-fetch'
 * )
 * ```
 */
export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  name?: string,
): Promise<T> {
  const { controller, signal, cleanup } = createTimeoutController(timeoutMs)

  try {
    const result = await operation(signal)
    cleanup()
    return result
  } catch (error) {
    cleanup()

    // Check if this was a timeout abort
    if (signal.aborted) {
      const timeoutError = new TimeoutError(
        `Operation${name ? ` '${name}'` : ''} timed out after ${timeoutMs}ms`,
        timeoutMs,
        name,
      )

      logger.warn('Operation timed out', {
        operation: name,
        timeoutMs,
      })

      throw timeoutError
    }

    // Re-throw original error if not timeout
    throw error
  }
}

/**
 * Combines multiple abort signals into one.
 * Aborts when ANY of the provided signals abort.
 *
 * @param signals - Array of AbortSignals to combine
 * @returns Combined AbortSignal
 *
 * @example
 * ```typescript
 * const userSignal = userController.signal
 * const timeoutSignal = createTimeoutSignal(5000)
 * const combined = combineSignals([userSignal, timeoutSignal])
 *
 * await fetch('/api/data', { signal: combined })
 * ```
 */
export function combineSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      break
    }

    signal.addEventListener(
      'abort',
      () => {
        controller.abort(signal.reason)
      },
      { once: true },
    )
  }

  return controller.signal
}

/**
 * Custom error class for timeout failures.
 */
export class TimeoutError extends Error {
  readonly timeoutMs: number
  readonly operationName?: string

  constructor(message: string, timeoutMs: number, operationName?: string) {
    super(message)
    this.name = 'TimeoutError'
    this.timeoutMs = timeoutMs
    this.operationName = operationName

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace?.(this, TimeoutError)
  }
}

/**
 * Type guard to check if an error is a TimeoutError.
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError
}

/**
 * Type guard to check if an error is an abort error.
 */
export function isAbortError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === 'AbortError'
}

/**
 * Creates a deadline signal that aborts at a specific time.
 *
 * @param deadline - Date/time when to abort
 * @returns AbortSignal that aborts at deadline
 *
 * @example
 * ```typescript
 * const deadline = new Date(Date.now() + 5000)
 * const signal = createDeadlineSignal(deadline)
 * await fetch('/api/data', { signal })
 * ```
 */
export function createDeadlineSignal(deadline: Date): AbortSignal {
  const now = Date.now()
  const deadlineMs = deadline.getTime()
  const remainingMs = Math.max(0, deadlineMs - now)

  return createTimeoutSignal(remainingMs)
}
