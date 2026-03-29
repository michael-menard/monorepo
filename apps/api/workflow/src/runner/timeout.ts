/**
 * Timeout wrapper for node execution.
 *
 * AC-15: Optional timeoutMs configuration with NodeTimeoutError.
 * AC-17: Cancellation via AbortSignal.
 * AC-19: onTimeout cleanup callback.
 */

import { NodeCancellationError, NodeTimeoutError } from './errors.js'
import type { NodeExecutionContext, OnTimeoutCallback } from './types.js'

/**
 * Options for the timeout wrapper.
 */
export interface TimeoutOptions {
  /** Timeout in milliseconds */
  timeoutMs: number
  /** Node name for error messages */
  nodeName: string
  /** Optional AbortSignal for cancellation */
  signal?: AbortSignal
  /** Optional cleanup callback on timeout */
  onTimeout?: OnTimeoutCallback
  /** Execution context for callback */
  context?: NodeExecutionContext
}

/**
 * Result of timeout wrapper execution.
 */
export type TimeoutResult<T> =
  | { success: true; value: T }
  | { success: false; error: NodeTimeoutError | NodeCancellationError }

/**
 * Wraps an async operation with a timeout.
 * AC-15: Timeout handling with NodeTimeoutError.
 * AC-17: AbortSignal support for cancellation.
 * AC-19: onTimeout cleanup callback.
 *
 * @param operation - The async operation to wrap
 * @param options - Timeout configuration
 * @returns The operation result or throws NodeTimeoutError/NodeCancellationError
 */
export async function withTimeout<T>(
  operation: () => Promise<T>,
  options: TimeoutOptions,
): Promise<T> {
  const { timeoutMs, nodeName, signal, onTimeout, context } = options

  // Check if already aborted
  if (signal?.aborted) {
    throw new NodeCancellationError(nodeName)
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    // Cleanup function
    const cleanup = () => {
      settled = true
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutId = undefined
      }
      signal?.removeEventListener('abort', onAbort)
    }

    // Abort handler
    const onAbort = () => {
      if (settled) return
      cleanup()
      reject(new NodeCancellationError(nodeName))
    }

    // Setup abort listener
    if (signal) {
      signal.addEventListener('abort', onAbort)
    }

    // Setup timeout
    timeoutId = setTimeout(() => {
      if (settled) return
      cleanup()

      // Call cleanup callback if provided
      if (onTimeout && context) {
        try {
          onTimeout(nodeName, context)
        } catch {
          // Ignore errors in cleanup callback
        }
      }

      reject(new NodeTimeoutError(nodeName, timeoutMs))
    }, timeoutMs)

    // Execute the operation
    operation()
      .then(value => {
        if (settled) return
        cleanup()
        resolve(value)
      })
      .catch(error => {
        if (settled) return
        cleanup()
        reject(error)
      })
  })
}

/**
 * Wraps an async operation with a timeout, returning a result object instead of throwing.
 * Useful when you want to handle timeout errors explicitly.
 *
 * @param operation - The async operation to wrap
 * @param options - Timeout configuration
 * @returns Result object with success flag and value or error
 */
export async function withTimeoutResult<T>(
  operation: () => Promise<T>,
  options: TimeoutOptions,
): Promise<TimeoutResult<T>> {
  try {
    const value = await withTimeout(operation, options)
    return { success: true, value }
  } catch (error) {
    if (error instanceof NodeTimeoutError || error instanceof NodeCancellationError) {
      return { success: false, error }
    }
    throw error
  }
}

/**
 * Creates a timeout controller for manual timeout management.
 * Useful when you need to extend or cancel timeout manually.
 */
export function createTimeoutController(timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  let onTimeoutCallback: (() => void) | undefined

  const start = (callback: () => void) => {
    onTimeoutCallback = callback
    timeoutId = setTimeout(() => {
      if (onTimeoutCallback) {
        onTimeoutCallback()
      }
    }, timeoutMs)
  }

  const clear = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = undefined
    }
    onTimeoutCallback = undefined
  }

  const extend = (additionalMs: number) => {
    if (!timeoutId || !onTimeoutCallback) return

    const callback = onTimeoutCallback
    clearTimeout(timeoutId)
    timeoutId = setTimeout(callback, additionalMs)
  }

  return {
    start,
    clear,
    extend,
  }
}
