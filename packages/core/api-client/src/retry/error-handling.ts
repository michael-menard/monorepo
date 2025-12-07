/**
 * Serverless Error Handling
 * Standardized error handling for serverless API responses
 *
 * Story 3.1.4: Cookie-based auth error handling
 * - 401/403/404 are NEVER retryable
 * - Only transient errors (429, 5xx) should be retried
 */

import { z } from 'zod'

/**
 * Story 3.1.4: Non-retryable HTTP status codes
 * These errors should be surfaced directly to the UI for appropriate handling:
 * - 401 Unauthorized: prompt re-auth (login)
 * - 403 Forbidden: show permission error UI
 * - 404 Not Found: show not-found UI
 */
export const NON_RETRYABLE_STATUS_CODES = [401, 403, 404] as const

/**
 * Check if a status code should never be retried
 */
export function isNonRetryableStatus(status: number): boolean {
  return NON_RETRYABLE_STATUS_CODES.includes(status as 401 | 403 | 404)
}

/**
 * Standard serverless error response schema
 */
export const ServerlessErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
    requestId: z.string().optional(),
    timestamp: z.string().optional(),
  }),
})

export type ServerlessError = z.infer<typeof ServerlessErrorSchema>

/**
 * Enhanced error class for serverless API errors
 */
export class ServerlessApiError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: Record<string, any>
  public readonly requestId?: string
  public readonly timestamp?: string
  public readonly isColdStart: boolean
  public readonly isTimeout: boolean
  public readonly isRetryable: boolean

  constructor(
    message: string,
    statusCode: number,
    code: string,
    options: {
      details?: Record<string, any>
      requestId?: string
      timestamp?: string
      isColdStart?: boolean
      isTimeout?: boolean
      isRetryable?: boolean
    } = {},
  ) {
    super(message)
    this.name = 'ServerlessApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = options.details
    this.requestId = options.requestId
    this.timestamp = options.timestamp
    this.isColdStart = options.isColdStart || false
    this.isTimeout = options.isTimeout || false
    this.isRetryable = options.isRetryable || false
  }

  /**
   * Create error from fetch response
   */
  static async fromResponse(response: Response): Promise<ServerlessApiError> {
    let errorData: any = {}

    try {
      const text = await response.text()
      if (text) {
        errorData = JSON.parse(text)
      }
    } catch {
      // Ignore JSON parsing errors
    }

    // Try to parse as standard serverless error
    const parsedError = ServerlessErrorSchema.safeParse(errorData)

    // Story 3.1.4: 401/403/404 are NEVER retryable
    // Only transient errors (429, 5xx) should be retried
    const isRetryable =
      !isNonRetryableStatus(response.status) && [429, 500, 502, 503, 504].includes(response.status)

    if (parsedError.success) {
      const { error } = parsedError.data
      return new ServerlessApiError(error.message, response.status, error.code, {
        details: error.details,
        requestId: error.requestId,
        timestamp: error.timestamp,
        isColdStart: response.status === 502 || response.status === 503,
        isTimeout: response.status === 504 || response.status === 408,
        isRetryable,
      })
    }

    // Fallback for non-standard error responses
    return new ServerlessApiError(
      errorData.message || response.statusText || 'Unknown error',
      response.status,
      errorData.code || 'UNKNOWN_ERROR',
      {
        details: errorData,
        isColdStart: response.status === 502 || response.status === 503,
        isTimeout: response.status === 504 || response.status === 408,
        isRetryable,
      },
    )
  }

  /**
   * Story 3.1.4: Check if status code should never be retried
   * - 401 Unauthorized: user not signed in
   * - 403 Forbidden: resource exists but user not authorized
   * - 404 Not Found: resource does not exist
   */
  static isNonRetryableStatus(status: number): boolean {
    return isNonRetryableStatus(status)
  }

  /**
   * Convert to plain object for logging
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      code: this.code,
      details: this.details,
      requestId: this.requestId,
      timestamp: this.timestamp,
      isColdStart: this.isColdStart,
      isTimeout: this.isTimeout,
      isRetryable: this.isRetryable,
    }
  }
}

/**
 * Error handler for common serverless error patterns
 *
 * Story 3.1.4: Ensures 401/403/404 are never marked as retryable
 */
export function handleServerlessError(error: any): ServerlessApiError {
  if (error instanceof ServerlessApiError) {
    return error
  }

  // Handle fetch/network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new ServerlessApiError('Network error occurred', 0, 'NETWORK_ERROR', {
      details: { originalError: error.message },
      isRetryable: true,
    })
  }

  // Handle timeout errors
  if (error.name === 'AbortError' || error.message.includes('timeout')) {
    return new ServerlessApiError('Request timeout', 408, 'TIMEOUT_ERROR', {
      details: { originalError: error.message },
      isTimeout: true,
      isRetryable: true,
    })
  }

  // Story 3.1.4: Check if this is a non-retryable error
  const status = error.status || error.statusCode || 500
  const shouldRetry = !isNonRetryableStatus(status) && status >= 500

  // Generic error fallback
  return new ServerlessApiError(
    error.message || 'Unknown error occurred',
    status,
    error.code || 'UNKNOWN_ERROR',
    {
      details: { originalError: error },
      isRetryable: shouldRetry,
    },
  )
}
