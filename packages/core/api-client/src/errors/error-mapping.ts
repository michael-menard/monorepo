/**
 * Story 3.1.21: Client Error Mapping Module
 *
 * Maps API error codes to user-friendly messages and UI affordances.
 * Provides retry hints and logs correlationId for support.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'

// =============================================================================
// API Error Codes (matches @repo/api-types ApiErrorCodeSchema)
// =============================================================================

export const ApiErrorCodeSchema = z.enum([
  // Authentication & Authorization (4xx)
  'UNAUTHORIZED',
  'EXPIRED_SESSION',
  'ACCESS_DENIED',
  'FORBIDDEN',

  // Not Found (404)
  'NOT_FOUND',

  // Conflict (409)
  'CONFLICT',
  'DUPLICATE_SLUG',

  // Validation & Bad Request (400/422)
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'INVALID_TYPE',
  'SIZE_TOO_LARGE',
  'FILE_ERROR',
  'PARTS_VALIDATION_ERROR',

  // Rate Limiting (429)
  'RATE_LIMITED',
  'TOO_MANY_REQUESTS',

  // Server Errors (5xx)
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
  'DATABASE_ERROR',
  'SEARCH_ERROR',
  'EXTERNAL_SERVICE_ERROR',
  'THROTTLING_ERROR',
])

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>

// =============================================================================
// API Error Response Schema
// =============================================================================

export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(), // Allow any string for forward compatibility
    message: z.string(),
    details: z.record(z.any()).optional(),
  }),
  correlationId: z.string().optional(),
  timestamp: z.string().optional(),
})

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>

// =============================================================================
// Error Mapping Configuration
// =============================================================================

export interface ErrorMapping {
  /** User-friendly title */
  title: string
  /** User-friendly message */
  message: string
  /** Whether this error is retryable */
  isRetryable: boolean
  /** Suggested retry delay in seconds (if retryable) */
  retryDelay?: number
  /** UI affordance: what action the user should take */
  action: 'retry' | 'login' | 'contact-support' | 'fix-input' | 'wait' | 'navigate-away' | 'none'
  /** Icon suggestion for UI */
  icon?: 'error' | 'warning' | 'info' | 'lock' | 'clock' | 'file'
}

/**
 * Default error mappings for known error codes
 */
const ERROR_MAPPINGS: Record<ApiErrorCode, ErrorMapping> = {
  // Authentication & Authorization
  UNAUTHORIZED: {
    title: 'Sign In Required',
    message: 'Please sign in to continue.',
    isRetryable: false,
    action: 'login',
    icon: 'lock',
  },
  EXPIRED_SESSION: {
    title: 'Session Expired',
    message: 'Your session has expired. Please sign in again.',
    isRetryable: false,
    action: 'login',
    icon: 'lock',
  },
  ACCESS_DENIED: {
    title: 'Access Denied',
    message: "You don't have permission to perform this action.",
    isRetryable: false,
    action: 'navigate-away',
    icon: 'lock',
  },
  FORBIDDEN: {
    title: 'Access Forbidden',
    message: "You don't have permission to access this resource.",
    isRetryable: false,
    action: 'navigate-away',
    icon: 'lock',
  },

  // Not Found
  NOT_FOUND: {
    title: 'Not Found',
    message: 'The requested resource could not be found.',
    isRetryable: false,
    action: 'navigate-away',
    icon: 'warning',
  },

  // Conflict
  CONFLICT: {
    title: 'Conflict',
    message: 'This action conflicts with an existing resource.',
    isRetryable: false,
    action: 'fix-input',
    icon: 'warning',
  },
  DUPLICATE_SLUG: {
    title: 'Title Already Exists',
    message: 'An instruction set with this title already exists. Please choose a different title.',
    isRetryable: false,
    action: 'fix-input',
    icon: 'warning',
  },

  // Validation & Bad Request
  BAD_REQUEST: {
    title: 'Invalid Request',
    message: 'The request was invalid. Please check your input and try again.',
    isRetryable: false,
    action: 'fix-input',
    icon: 'error',
  },
  VALIDATION_ERROR: {
    title: 'Validation Error',
    message: 'Please correct the highlighted fields and try again.',
    isRetryable: false,
    action: 'fix-input',
    icon: 'error',
  },
  INVALID_TYPE: {
    title: 'Invalid File Type',
    message: 'This file type is not supported. Please upload a different file.',
    isRetryable: false,
    action: 'fix-input',
    icon: 'file',
  },
  SIZE_TOO_LARGE: {
    title: 'File Too Large',
    message: 'This file exceeds the maximum size limit. Please upload a smaller file.',
    isRetryable: false,
    action: 'fix-input',
    icon: 'file',
  },
  FILE_ERROR: {
    title: 'File Error',
    message: 'There was a problem with the file. Please try a different file.',
    isRetryable: false,
    action: 'fix-input',
    icon: 'file',
  },
  PARTS_VALIDATION_ERROR: {
    title: 'Parts List Error',
    message:
      'The parts list file has validation errors. Please check the file format and try again.',
    isRetryable: false,
    action: 'fix-input',
    icon: 'file',
  },

  // Rate Limiting
  RATE_LIMITED: {
    title: 'Too Many Requests',
    message: 'Please wait a moment before trying again.',
    isRetryable: true,
    retryDelay: 60,
    action: 'wait',
    icon: 'clock',
  },
  TOO_MANY_REQUESTS: {
    title: 'Too Many Requests',
    message: 'Please wait a moment before trying again.',
    isRetryable: true,
    retryDelay: 60,
    action: 'wait',
    icon: 'clock',
  },

  // Server Errors
  INTERNAL_ERROR: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again later.',
    isRetryable: true,
    retryDelay: 5,
    action: 'retry',
    icon: 'error',
  },
  SERVICE_UNAVAILABLE: {
    title: 'Service Unavailable',
    message: 'The service is temporarily unavailable. Please try again in a few minutes.',
    isRetryable: true,
    retryDelay: 30,
    action: 'retry',
    icon: 'clock',
  },
  DATABASE_ERROR: {
    title: 'Service Error',
    message: 'A temporary error occurred. Please try again.',
    isRetryable: true,
    retryDelay: 5,
    action: 'retry',
    icon: 'error',
  },
  SEARCH_ERROR: {
    title: 'Search Unavailable',
    message: 'Search is temporarily unavailable. Please try again.',
    isRetryable: true,
    retryDelay: 10,
    action: 'retry',
    icon: 'clock',
  },
  EXTERNAL_SERVICE_ERROR: {
    title: 'Service Error',
    message: 'A temporary error occurred. Please try again.',
    isRetryable: true,
    retryDelay: 10,
    action: 'retry',
    icon: 'error',
  },
  THROTTLING_ERROR: {
    title: 'Service Busy',
    message: 'The service is busy. Please try again in a moment.',
    isRetryable: true,
    retryDelay: 30,
    action: 'wait',
    icon: 'clock',
  },
}

/**
 * Default mapping for unknown error codes
 */
const UNKNOWN_ERROR_MAPPING: ErrorMapping = {
  title: 'Error',
  message: 'An unexpected error occurred.',
  isRetryable: false,
  action: 'contact-support',
  icon: 'error',
}

// =============================================================================
// Parsed API Error
// =============================================================================

export interface ParsedApiError {
  /** Original error code from API */
  code: string
  /** Original message from API */
  originalMessage: string
  /** User-friendly title */
  title: string
  /** User-friendly message */
  message: string
  /** Whether this error is retryable */
  isRetryable: boolean
  /** Suggested retry delay in seconds */
  retryDelay?: number
  /** UI affordance action */
  action: ErrorMapping['action']
  /** Icon suggestion */
  icon?: ErrorMapping['icon']
  /** Correlation ID for support */
  correlationId?: string
  /** Additional error details */
  details?: Record<string, unknown>
  /** HTTP status code */
  httpStatus?: number
}

// =============================================================================
// Error Parsing Functions
// =============================================================================

/**
 * Parse an API error response into a user-friendly format
 *
 * @param response - The API error response body
 * @param httpStatus - Optional HTTP status code
 * @returns Parsed error with user-friendly messages
 */
export function parseApiError(response: unknown, httpStatus?: number): ParsedApiError {
  // Try to parse as standard API error response
  const parsed = ApiErrorResponseSchema.safeParse(response)

  if (parsed.success) {
    const { error, correlationId } = parsed.data
    const code = error.code as ApiErrorCode
    const mapping = ERROR_MAPPINGS[code] || UNKNOWN_ERROR_MAPPING

    // Log the error with correlation ID for support
    logger.warn('API error occurred', {
      code,
      message: error.message,
      correlationId,
      httpStatus,
    })

    return {
      code,
      originalMessage: error.message,
      title: mapping.title,
      message: getContextualMessage(mapping, error),
      isRetryable: mapping.isRetryable,
      retryDelay: mapping.retryDelay,
      action: mapping.action,
      icon: mapping.icon,
      correlationId,
      details: error.details,
      httpStatus,
    }
  }

  // Handle legacy error format (with 'type' instead of 'code')
  if (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    typeof (response as { error: unknown }).error === 'object'
  ) {
    const legacyError = (response as { error: { type?: string; message?: string } }).error
    const code = (legacyError.type || 'INTERNAL_ERROR') as ApiErrorCode
    const message = legacyError.message || 'An unexpected error occurred'
    const mapping = ERROR_MAPPINGS[code] || UNKNOWN_ERROR_MAPPING

    logger.warn('Legacy API error format', { code, message, httpStatus })

    return {
      code,
      originalMessage: message,
      title: mapping.title,
      message: mapping.message,
      isRetryable: mapping.isRetryable,
      retryDelay: mapping.retryDelay,
      action: mapping.action,
      icon: mapping.icon,
      httpStatus,
    }
  }

  // Fallback for completely unknown format
  logger.warn('Unknown API error format', { response, httpStatus })

  return {
    code: 'INTERNAL_ERROR',
    originalMessage: 'An unexpected error occurred',
    ...UNKNOWN_ERROR_MAPPING,
    httpStatus,
  }
}

/**
 * Get contextual message with API-provided details when helpful
 */
function getContextualMessage(
  mapping: ErrorMapping,
  error: { message: string; details?: Record<string, unknown> },
): string {
  // For some error types, prefer the API message if it's more specific
  const apiMessage = error.message

  // Use API message for validation errors (they contain field-specific info)
  if (mapping.action === 'fix-input' && apiMessage && apiMessage.length < 200) {
    return apiMessage
  }

  // Use API message for rate limiting if it has retry info
  if (mapping.action === 'wait' && apiMessage && apiMessage.includes('retry')) {
    return apiMessage
  }

  // Use mapping message for everything else
  return mapping.message
}

/**
 * Parse a fetch Response into a ParsedApiError
 */
export async function parseApiErrorFromResponse(response: Response): Promise<ParsedApiError> {
  let body: unknown = null

  try {
    const text = await response.text()
    if (text) {
      body = JSON.parse(text)
    }
  } catch {
    // Response may not be JSON
  }

  // Get correlation ID from header if not in body
  const headerCorrelationId = response.headers.get('X-Correlation-Id')

  const parsed = parseApiError(body, response.status)

  // Use header correlation ID if body doesn't have one
  if (!parsed.correlationId && headerCorrelationId) {
    parsed.correlationId = headerCorrelationId
  }

  return parsed
}

// =============================================================================
// Retry Helpers
// =============================================================================

/**
 * Get retry delay from error or Retry-After header
 */
export function getRetryDelay(error: ParsedApiError, retryAfterHeader?: string | null): number {
  // Check Retry-After header first
  if (retryAfterHeader) {
    const headerValue = parseInt(retryAfterHeader, 10)
    if (!isNaN(headerValue) && headerValue > 0) {
      return headerValue
    }
  }

  // Fall back to error's retry delay
  return error.retryDelay || 5
}

/**
 * Check if an HTTP status code is retryable
 */
export function isRetryableStatus(status: number): boolean {
  // Never retry auth errors
  if (status === 401 || status === 403 || status === 404) {
    return false
  }

  // Retry rate limiting and server errors
  return status === 429 || (status >= 500 && status < 600)
}

// =============================================================================
// Support Helpers
// =============================================================================

/**
 * Format error for support reference
 *
 * Use this to display a reference code users can share with support.
 */
export function formatSupportReference(error: ParsedApiError): string {
  if (error.correlationId) {
    return `Reference: ${error.correlationId.slice(0, 8).toUpperCase()}`
  }
  return ''
}

/**
 * Log error with full details for debugging
 */
export function logErrorForSupport(error: ParsedApiError, context?: string): void {
  logger.error(context || 'API Error', {
    code: error.code,
    message: error.originalMessage,
    correlationId: error.correlationId,
    httpStatus: error.httpStatus,
    details: error.details,
  })
}
