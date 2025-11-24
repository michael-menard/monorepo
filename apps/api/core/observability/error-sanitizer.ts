/**
 * Error Sanitization Utility
 *
 * Sanitizes errors before sending to clients to prevent:
 * - Exposure of internal implementation details
 * - Stack trace leakage
 * - Database query exposure
 * - AWS service internals exposure
 * - Sensitive data leakage
 *
 * Usage:
 * ```typescript
 * import { sanitizeError } from '@/core/observability/error-sanitizer'
 *
 * try {
 *   // ... operation
 * } catch (error) {
 *   const safe = sanitizeError(error)
 *   return errorResponse(safe.statusCode, safe.errorType, safe.message, safe.details)
 * }
 * ```
 */

import { isApiError } from '@/core/utils/responses'
import type { ApiErrorType } from '@/core/utils/responses'

/**
 * Sanitized error response
 */
export interface SanitizedError {
  statusCode: number
  errorType: ApiErrorType
  message: string
  details?: Record<string, unknown>
}

/**
 * Sanitize error for client response
 *
 * Rules:
 * - ApiError instances: Return as-is (already sanitized)
 * - AWS SDK errors: Remove internal details
 * - Database errors: Remove SQL and connection strings
 * - Generic errors: Wrap in generic message
 * - Stack traces: Never included in production
 * - Sensitive fields: Filtered from details
 *
 * @param error - The error to sanitize
 * @param includeDebugInfo - Include debug info (only in development)
 * @returns Sanitized error ready for client response
 */
export function sanitizeError(
  error: unknown,
  includeDebugInfo = process.env.NODE_ENV !== 'production',
): SanitizedError {
  // If already an ApiError, return its safe representation
  if (isApiError(error)) {
    return {
      statusCode: error.statusCode,
      errorType: error.errorType,
      message: error.message,
      details: includeDebugInfo ? sanitizeDetails(error.details) : undefined,
    }
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    // Check for specific error patterns
    if (isAWSError(error)) {
      return sanitizeAWSError(error, includeDebugInfo)
    }

    if (isDatabaseError(error)) {
      return sanitizeDatabaseError(error, includeDebugInfo)
    }

    // Generic error fallback
    return {
      statusCode: 500,
      errorType: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      details: includeDebugInfo
        ? {
            originalError: error.name,
            // Never include full stack traces
          }
        : undefined,
    }
  }

  // Non-Error objects
  return {
    statusCode: 500,
    errorType: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    details: includeDebugInfo
      ? {
          errorType: typeof error,
        }
      : undefined,
  }
}

/**
 * Sanitize AWS SDK errors
 * Removes internal AWS details that could expose infrastructure
 */
function sanitizeAWSError(error: Error, includeDebugInfo: boolean): SanitizedError {
  // Map AWS error names to user-friendly messages
  const awsErrorMessages: Record<string, string> = {
    ThrottlingException: 'Service is temporarily busy. Please try again.',
    RequestTimeout: 'Request timed out. Please try again.',
    ServiceUnavailable: 'Service is temporarily unavailable. Please try again later.',
    InternalError: 'An internal error occurred. Please try again later.',
  }

  const userMessage =
    awsErrorMessages[error.name] || 'An error occurred with external service. Please try again.'

  return {
    statusCode: 500,
    errorType: 'EXTERNAL_SERVICE_ERROR',
    message: userMessage,
    details: includeDebugInfo
      ? {
          service: 'AWS',
          errorName: error.name,
          // Don't include actual AWS error message (may contain sensitive info)
        }
      : undefined,
  }
}

/**
 * Sanitize database errors
 * Removes SQL queries, connection strings, and database internals
 */
function sanitizeDatabaseError(error: Error, includeDebugInfo: boolean): SanitizedError {
  return {
    statusCode: 500,
    errorType: 'DATABASE_ERROR',
    message: 'A database error occurred. Please try again later.',
    details: includeDebugInfo
      ? {
          // Include error code if available (doesn't expose sensitive info)
          errorCode:
            error && typeof error === 'object' && 'code' in error
              ? (error as { code: string }).code
              : undefined,
          // Never include:
          // - SQL queries
          // - Connection strings
          // - Database credentials
          // - Table/column names
        }
      : undefined,
  }
}

/**
 * Sanitize error details object
 * Removes sensitive fields from details
 */
function sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) return undefined

  const sanitized: Record<string, unknown> = {}

  // List of sensitive field names to filter
  const sensitiveFields = new Set([
    'password',
    'token',
    'secret',
    'apikey',
    'api_key',
    'auth',
    'authorization',
    'credential',
    'connectionstring',
    'connection_string',
    'stack',
    'stacktrace',
    'stack_trace',
  ])

  for (const [key, value] of Object.entries(details)) {
    const lowerKey = key.toLowerCase()

    // Skip sensitive fields
    if (sensitiveFields.has(lowerKey) || lowerKey.includes('password')) {
      continue
    }

    // Recursively sanitize nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeDetails(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}

/**
 * Check if error is from AWS SDK
 */
function isAWSError(error: Error): boolean {
  return (
    error.name.includes('AWS') ||
    error.name.includes('S3') ||
    error.name.includes('DynamoDB') ||
    error.name.includes('Cognito') ||
    error.name.includes('Lambda') ||
    error.name.includes('Throttling') ||
    error.name.includes('Exception') ||
    error.message.includes('AWS')
  )
}

/**
 * Check if error is database-related
 */
function isDatabaseError(error: Error): boolean {
  const name = error.name.toLowerCase()
  const message = error.message.toLowerCase()

  return (
    name.includes('postgres') ||
    name.includes('sql') ||
    name.includes('database') ||
    name.includes('sequelize') ||
    name.includes('drizzle') ||
    message.includes('sql') ||
    message.includes('database') ||
    message.includes('relation') ||
    message.includes('column') ||
    message.includes('table')
  )
}

/**
 * Sanitize error for logging purposes
 * Includes more details than client sanitization but still removes credentials
 *
 * @param error - The error to sanitize for logs
 * @returns Error with sensitive data removed but debug info intact
 */
export function sanitizeErrorForLogging(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      // Include any additional properties
      ...Object.fromEntries(
        Object.entries(error).filter(([key]) => {
          const lowerKey = key.toLowerCase()
          return !(
            lowerKey.includes('password') ||
            lowerKey.includes('secret') ||
            lowerKey.includes('token') ||
            lowerKey.includes('credential')
          )
        }),
      ),
    }
  }

  return {
    type: typeof error,
    value: String(error),
  }
}
