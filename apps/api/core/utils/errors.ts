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

import type { ApiErrorType } from '@/core/utils/response-types'

/**
 * Base API Error - All custom errors extend this class
 */
export abstract class ApiError extends Error {
  abstract readonly statusCode: number
  abstract readonly errorType: ApiErrorType
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
      details: this.details,
    }
  }
}

/**
 * 400 Bad Request - Invalid client request
 * Use when request parameters, body, or query strings are malformed
 */
export class BadRequestError extends ApiError {
  readonly statusCode = 400
  readonly errorType: ApiErrorType = 'BAD_REQUEST'

  constructor(message = 'Bad request', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * 401 Unauthorized - Authentication required or failed
 * Use when JWT token is missing, invalid, or expired
 */
export class UnauthorizedError extends ApiError {
  readonly statusCode = 401
  readonly errorType: ApiErrorType = 'UNAUTHORIZED'

  constructor(message = 'Authentication required', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * 403 Forbidden - Authenticated but lacking permissions
 * Use when user is authenticated but not authorized for the resource
 */
export class ForbiddenError extends ApiError {
  readonly statusCode = 403
  readonly errorType: ApiErrorType = 'FORBIDDEN'

  constructor(message = 'Access forbidden', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * 404 Not Found - Resource does not exist
 * Use when requested resource (MOC, image, file) cannot be found
 */
export class NotFoundError extends ApiError {
  readonly statusCode = 404
  readonly errorType: ApiErrorType = 'NOT_FOUND'

  constructor(message = 'Resource not found', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * 409 Conflict - Resource conflict (duplicate, concurrent modification)
 * Use when attempting to create duplicate resources or conflicting operations
 */
export class ConflictError extends ApiError {
  readonly statusCode = 409
  readonly errorType: ApiErrorType = 'CONFLICT'

  constructor(message = 'Resource conflict', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * 422 Unprocessable Entity - Validation failed
 * Use when request is well-formed but semantically invalid (Zod validation failures)
 */
export class ValidationError extends ApiError {
  readonly statusCode = 422
  readonly errorType: ApiErrorType = 'VALIDATION_ERROR'

  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 * Use when client exceeds API rate limits
 */
export class RateLimitError extends ApiError {
  readonly statusCode = 429
  readonly errorType: ApiErrorType = 'TOO_MANY_REQUESTS'

  constructor(message = 'Rate limit exceeded', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 * Use for database errors, external service failures, unexpected exceptions
 */
export class InternalServerError extends ApiError {
  readonly statusCode = 500
  readonly errorType: ApiErrorType = 'INTERNAL_ERROR'

  constructor(message = 'Internal server error', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * 503 Service Unavailable - Temporary service outage
 * Use when Redis, OpenSearch, or other dependencies are unavailable
 */
export class ServiceUnavailableError extends ApiError {
  readonly statusCode = 503
  readonly errorType: ApiErrorType = 'SERVICE_UNAVAILABLE'

  constructor(message = 'Service temporarily unavailable', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * File-specific errors (400) - File upload/validation failures
 * Use for file size, type, or processing errors
 */
export class FileError extends ApiError {
  readonly statusCode = 400
  readonly errorType: ApiErrorType = 'FILE_ERROR'

  constructor(message = 'File operation failed', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * Search-specific errors (500) - OpenSearch failures
 * Use when search indexing or queries fail
 */
export class SearchError extends ApiError {
  readonly statusCode = 500
  readonly errorType: ApiErrorType = 'SEARCH_ERROR'

  constructor(message = 'Search operation failed', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * Database-specific errors (500) - PostgreSQL failures
 * Use when database queries or transactions fail
 */
export class DatabaseError extends ApiError {
  readonly statusCode = 500
  readonly errorType: ApiErrorType = 'DATABASE_ERROR'

  constructor(message = 'Database operation failed', details?: Record<string, unknown>) {
    super(message, details)
  }
}

/**
 * External Service errors (502) - Third-party service failures
 * Use when external APIs (S3, Cognito, etc.) fail
 */
export class ExternalServiceError extends ApiError {
  readonly statusCode = 502
  readonly errorType: ApiErrorType = 'EXTERNAL_SERVICE_ERROR'

  constructor(message = 'External service error', details?: Record<string, unknown>) {
    super(message, details)
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
