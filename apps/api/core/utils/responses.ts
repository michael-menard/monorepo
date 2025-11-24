/**
 * Standardized Response Builders for Lambda Functions
 *
 * These functions create consistent API Gateway responses across all endpoints.
 * All responses follow the standard schema defined in types.ts
 *
 * Usage:
 * ```typescript
 * // Success response
 * return successResponse(200, { id: '123', title: 'My MOC' });
 *
 * // Error response
 * return errorResponse(404, 'NOT_FOUND', 'MOC not found');
 *
 * // From error object
 * return errorResponseFromError(error);
 * ```
 */

import type { ApiSuccessResponse, ApiErrorResponse, ApiErrorType } from './response-types'
import { toApiError } from '@/core/utils/errors'

// Re-export commonly used types and classes for convenience
export type { ApiSuccessResponse, ApiErrorResponse, ApiErrorType } from './response-types'
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
  isApiError,
  toApiError,
} from '@/core/utils/errors'

/**
 * API Gateway Response Type
 */
export interface APIGatewayProxyResult {
  statusCode: number
  headers: Record<string, string | boolean>
  body: string
}

/**
 * Success Response Builder (Overloaded)
 * - Returns standardized success response with data
 * - Automatically adds timestamp
 * - Sets appropriate CORS headers
 *
 * Usage:
 * - successResponse(data) -> defaults to 200
 * - successResponse(data, statusCode) -> reversed args for backward compatibility
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
 * Error Response Builder
 * - Returns standardized error response
 * - Automatically adds timestamp
 * - Strips sensitive details in production
 */
export function errorResponse(
  statusCode: number,
  errorType: ApiErrorType,
  message: string,
  details?: Record<string, unknown>,
): APIGatewayProxyResult {
  const isProduction = process.env.NODE_ENV === 'production'

  const response: ApiErrorResponse = {
    success: false,
    error: {
      type: errorType,
      message,
      // Only include details in non-production environments
      details: isProduction ? undefined : details,
    },
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
 * Error Response from Error Object
 * - Converts any error to standardized error response
 * - Handles ApiError instances with proper status codes
 * - Falls back to 500 for unknown errors
 */
export function errorResponseFromError(error: unknown): APIGatewayProxyResult {
  const apiError = toApiError(error)

  return errorResponse(apiError.statusCode, apiError.errorType, apiError.message, apiError.details)
}

/**
 * Health Check Response
 * - Specialized response for health check endpoints
 * - Includes status for each service dependency
 */
export interface HealthCheckData {
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: {
    postgres: 'connected' | 'disconnected' | 'error'
    redis: 'connected' | 'disconnected' | 'error'
    opensearch: 'connected' | 'disconnected' | 'error'
  }
  timestamp: string
  version?: string
}

export function healthCheckResponse(data: HealthCheckData): APIGatewayProxyResult {
  const statusCode = data.status === 'healthy' ? 200 : data.status === 'degraded' ? 200 : 503

  return successResponse(statusCode, data, `System status: ${data.status}`)
}

/**
 * No Content Response (204)
 * - Used for successful DELETE operations
 * - No response body
 */
export function noContentResponse(): APIGatewayProxyResult {
  return {
    statusCode: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: '',
  }
}

/**
 * Redirect Response (302)
 * - Used for temporary redirects (e.g., presigned S3 URLs)
 */
export function redirectResponse(location: string): APIGatewayProxyResult {
  return {
    statusCode: 302,
    headers: {
      Location: location,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: '',
  }
}

/**
 * CORS Preflight Response (OPTIONS)
 * - Handles CORS preflight requests
 */
export function corsResponse(): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': true,
      'Access-Control-Max-Age': '86400', // 24 hours
    },
    body: '',
  }
}
