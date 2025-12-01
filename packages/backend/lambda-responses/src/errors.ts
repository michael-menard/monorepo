/**
 * Standardized Error Classes for Lambda Functions
 *
 * These error classes provide consistent error handling across all Lambda endpoints.
 * Each error class includes:
 * - HTTP status code
 * - Error type code
 * - User-friendly message
 * - Optional details for debugging
 *
 * Usage:
 * ```typescript
 * if (!project) {
 *   throw new NotFoundError('MOC project not found', { projectId });
 * }
 * ```
 */

import type { ApiErrorType } from './types.js'

/**
 * Base API Error - All custom errors extend this class
 */
export abstract class ApiError extends Error {
  abstract readonly statusCode: number
  abstract readonly errorType: ApiErrorType
  abstract readonly isRetryable: boolean
  readonly details?: Record<string, unknown>

  constructor(message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = this.constructor.name
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON() {
    return {
      name: this.name,
      errorType: this.errorType,
      message: this.message,
      statusCode: this.statusCode,
      isRetryable: this.isRetryable,
      details: this.details,
    }
  }
}

/**
 * 400 Bad Request - Invalid client request
 * Use when request parameters, body, or query strings are malformed
 * NOT retryable - client must fix the request
 */
export class BadRequestError extends ApiError {
  readonly statusCode = 400
  readonly errorType: ApiErrorType = 'BAD_REQUEST'
  readonly isRetryable = false

  constructor(message = 'Bad request', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * 401 Unauthorized - Authentication required or failed
 * Use when JWT token is missing, invalid, or expired
 * NOT retryable - client must provide valid credentials
 */
export class UnauthorizedError extends ApiError {
  readonly statusCode = 401
  readonly errorType: ApiErrorType = 'UNAUTHORIZED'
  readonly isRetryable = false

  constructor(message = 'Authentication required', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * 403 Forbidden - Authenticated but lacking permissions
 * Use when user is authenticated but not authorized for the resource
 * NOT retryable - client lacks permission
 */
export class ForbiddenError extends ApiError {
  readonly statusCode = 403
  readonly errorType: ApiErrorType = 'FORBIDDEN'
  readonly isRetryable = false

  constructor(message = 'Access forbidden', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * 404 Not Found - Resource does not exist
 * Use when requested resource (MOC, image, file) cannot be found
 * NOT retryable - resource does not exist
 */
export class NotFoundError extends ApiError {
  readonly statusCode = 404
  readonly errorType: ApiErrorType = 'NOT_FOUND'
  readonly isRetryable = false

  constructor(message = 'Resource not found', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * 409 Conflict - Resource conflict (duplicate, concurrent modification)
 * Use when attempting to create duplicate resources or conflicting operations
 * NOT retryable - client must resolve conflict
 */
export class ConflictError extends ApiError {
  readonly statusCode = 409
  readonly errorType: ApiErrorType = 'CONFLICT'
  readonly isRetryable = false

  constructor(message = 'Resource conflict', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * 422 Unprocessable Entity - Validation failed
 * Use when request is well-formed but semantically invalid (Zod validation failures)
 * NOT retryable - client must fix validation errors
 */
export class ValidationError extends ApiError {
  readonly statusCode = 422
  readonly errorType: ApiErrorType = 'VALIDATION_ERROR'
  readonly isRetryable = false

  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 * Use when client exceeds API rate limits
 * RETRYABLE - client should retry with exponential backoff
 */
export class RateLimitError extends ApiError {
  readonly statusCode = 429
  readonly errorType: ApiErrorType = 'TOO_MANY_REQUESTS'
  readonly isRetryable = true

  constructor(message = 'Rate limit exceeded', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 * Use for database errors, external service failures, unexpected exceptions
 * NOT retryable by default - depends on underlying cause
 */
export class InternalServerError extends ApiError {
  readonly statusCode = 500
  readonly errorType: ApiErrorType = 'INTERNAL_ERROR'
  readonly isRetryable = false

  constructor(message = 'Internal server error', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * 503 Service Unavailable - Temporary service outage
 * Use when Redis, OpenSearch, or other dependencies are unavailable
 * RETRYABLE - service may recover
 */
export class ServiceUnavailableError extends ApiError {
  readonly statusCode = 503
  readonly errorType: ApiErrorType = 'SERVICE_UNAVAILABLE'
  readonly isRetryable = true

  constructor(message = 'Service temporarily unavailable', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * File-specific errors (400) - File upload/validation failures
 * Use for file size, type, or processing errors
 * NOT retryable - client must fix file
 */
export class FileError extends ApiError {
  readonly statusCode = 400
  readonly errorType: ApiErrorType = 'FILE_ERROR'
  readonly isRetryable = false

  constructor(message = 'File operation failed', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * Search-specific errors (500) - OpenSearch failures
 * Use when search indexing or queries fail
 * RETRYABLE - transient search service issues
 */
export class SearchError extends ApiError {
  readonly statusCode = 500
  readonly errorType: ApiErrorType = 'SEARCH_ERROR'
  readonly isRetryable = true

  constructor(message = 'Search operation failed', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * Database-specific errors (500) - PostgreSQL failures
 * Use when database queries or transactions fail
 * Can be retryable depending on error type (use constructor parameter)
 */
export class DatabaseError extends ApiError {
  readonly statusCode = 500
  readonly errorType: ApiErrorType = 'DATABASE_ERROR'
  readonly isRetryable: boolean

  constructor(
    message = 'Database operation failed',
    details?: Record<string, unknown>,
    isRetryable = true,
  ) {
    super(message, details)
    this.isRetryable = isRetryable
  }
}

/**
 * External Service Error - AWS service failures (S3, Cognito, etc.)
 * Use when calls to external services fail
 * RETRYABLE - external services may have transient issues
 */
export class ExternalServiceError extends ApiError {
  readonly statusCode = 500
  readonly errorType: ApiErrorType = 'EXTERNAL_SERVICE_ERROR'
  readonly isRetryable: boolean
  readonly service: string

  constructor(
    service: string,
    message = 'External service error',
    details?: Record<string, unknown>,
    isRetryable = true,
  ) {
    super(message, details)
    this.service = service
    this.isRetryable = isRetryable
  }
}

/**
 * Throttling Error - AWS throttling exceptions
 * Use when AWS services return throttling errors
 * RETRYABLE - should retry with exponential backoff
 */
export class ThrottlingError extends ApiError {
  readonly statusCode = 429
  readonly errorType: ApiErrorType = 'THROTTLING_ERROR'
  readonly isRetryable = true
  readonly service: string

  constructor(service: string, message = 'Request throttled', details?: Record<string, unknown>) {
    super(message, details)
    this.service = service
  }
}

/**
 * Check if error is an instance of ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * Convert any error to ApiError
 * - If already ApiError, return as-is
 * - Otherwise, wrap in InternalServerError
 */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new InternalServerError(error.message, {
      originalError: error.name,
      stack: error.stack,
    })
  }

  return new InternalServerError('An unexpected error occurred', {
    error: String(error),
  })
}
