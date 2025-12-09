/**
 * Standardized Response Builders for Lambda Functions
 *
 * Story 3.1.21: Re-exports response builders from @repo/lambda-responses
 * with backward-compatible overloads for the existing handlers.
 */

import {
  errorResponse as baseErrorResponse,
  errorResponseFromError as baseErrorResponseFromError,
  healthCheckResponse,
  noContentResponse,
  redirectResponse,
  corsResponse,
  type APIGatewayProxyResult,
  type HealthCheckData,
} from '@repo/lambda-responses'

import type { ApiSuccessResponse, ApiErrorType } from './response-types'

// Re-export utilities from the package
export {
  healthCheckResponse,
  noContentResponse,
  redirectResponse,
  corsResponse,
  type APIGatewayProxyResult,
  type HealthCheckData,
}

// Re-export types for convenience
export type { ApiSuccessResponse, ApiErrorResponse, ApiErrorType } from './response-types'

// Re-export error classes for convenience
export {
  ApiError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  RateLimitError,
  InternalServerError,
  ServiceUnavailableError,
  FileError,
  SearchError,
  DatabaseError,
  ExternalServiceError,
  ThrottlingError,
  AccessDeniedError,
  DuplicateSlugError,
  InvalidTypeError,
  SizeTooLargeError,
  ExpiredSessionError,
  PartsValidationError,
  isApiError,
  toApiError,
} from '@/core/utils/errors'

/**
 * Success Response Builder (Overloaded for backward compatibility)
 *
 * Supports multiple calling conventions:
 * - successResponse(data) -> defaults to 200
 * - successResponse(data, statusCode) -> reversed args (backward compat)
 * - successResponse(statusCode, data)
 * - successResponse(statusCode, data, message)
 */
export function successResponse<T>(data: T): APIGatewayProxyResult
export function successResponse<T>(data: T, statusCode: number): APIGatewayProxyResult
export function successResponse<T>(
  statusCode: number,
  data: T,
  message?: string,
): APIGatewayProxyResult
export function successResponse<T>(
  statusCodeOrData: number | T,
  dataOrStatusCode?: T | number,
  message?: string,
): APIGatewayProxyResult {
  let statusCode: number
  let responseData: T

  // Case 1: successResponse(data) - single argument
  if (dataOrStatusCode === undefined) {
    statusCode = 200
    responseData = statusCodeOrData as T
  }
  // Case 2: successResponse(statusCode, data, message?) - first arg is number
  else if (typeof statusCodeOrData === 'number') {
    statusCode = statusCodeOrData
    responseData = dataOrStatusCode as T
  }
  // Case 3: successResponse(data, statusCode) - second arg is number (backward compat)
  else if (typeof dataOrStatusCode === 'number') {
    statusCode = dataOrStatusCode
    responseData = statusCodeOrData as T
  }
  // Fallback
  else {
    statusCode = 200
    responseData = statusCodeOrData as T
  }

  const response: ApiSuccessResponse<T> = {
    success: true,
    data: responseData,
    message,
    timestamp: new Date().toISOString(),
  }

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(response),
  }
}

/**
 * Story 3.1.21: Error Response Builder (Overloaded for backward compatibility)
 *
 * Supports both old and new calling conventions:
 * - Old: errorResponse(statusCode, errorType, message, details?)
 * - New: errorResponse(statusCode, errorCode, message, correlationId?, details?)
 *
 * Auto-detects based on 4th argument type (object = old style, string = new style)
 */
export function errorResponse(
  statusCode: number,
  errorCode: ApiErrorType,
  message: string,
  correlationIdOrDetails?: string | Record<string, unknown>,
  details?: Record<string, unknown>,
): APIGatewayProxyResult {
  // Detect old vs new calling convention
  const isOldStyle =
    correlationIdOrDetails !== undefined && typeof correlationIdOrDetails !== 'string'

  if (isOldStyle) {
    // Old style: 4th arg is details object
    return baseErrorResponse(statusCode, errorCode, message, undefined, correlationIdOrDetails)
  }

  // New style: 4th arg is correlationId string
  return baseErrorResponse(statusCode, errorCode, message, correlationIdOrDetails, details)
}

/**
 * Story 3.1.21: Error Response from Error Object
 *
 * Converts any error to standardized error response with correlationId.
 */
export function errorResponseFromError(
  error: unknown,
  correlationId?: string,
): APIGatewayProxyResult {
  return baseErrorResponseFromError(error, correlationId)
}
