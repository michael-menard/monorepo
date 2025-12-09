/**
 * Standardized Response Builders for Lambda Functions
 *
 * Story 3.1.21: Unified error contract with correlationId.
 *
 * These functions create consistent API Gateway responses across all endpoints.
 * All responses follow the standard schema defined in types.ts
 *
 * Usage:
 * ```typescript
 * // Success response
 * return successResponse(200, { id: '123', title: 'My MOC' });
 *
 * // Error response (with correlationId)
 * return errorResponse(404, 'NOT_FOUND', 'MOC not found', correlationId);
 *
 * // From error object
 * return errorResponseFromError(error, correlationId);
 * ```
 */

import type { ApiSuccessResponse, ApiErrorType } from './types.js'
import { toApiError } from './errors.js'
import { randomUUID } from 'crypto'

/**
 * API Gateway Response Type
 */
export interface APIGatewayProxyResult {
  statusCode: number
  headers: Record<string, string | boolean>
  body: string
}

/**
 * Success Response Builder
 * - Returns standardized success response with data
 * - Automatically adds timestamp
 * - Sets appropriate CORS headers
 */
export function successResponse<T>(
  statusCode: number,
  data: T,
  message?: string,
): APIGatewayProxyResult {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
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
 * Story 3.1.21: Error Response Builder
 *
 * Returns standardized error response with correlationId for support tracking.
 *
 * Contract: { code, message, details?, correlationId }
 *
 * @param statusCode - HTTP status code
 * @param errorCode - One of ApiErrorType values (use 'code' field in response)
 * @param message - User-friendly error message
 * @param correlationId - Request tracking ID (generated if not provided)
 * @param details - Optional debugging info (stripped in production)
 */
export function errorResponse(
  statusCode: number,
  errorCode: ApiErrorType,
  message: string,
  correlationId?: string,
  details?: Record<string, unknown>,
): APIGatewayProxyResult {
  const isProduction = process.env.NODE_ENV === 'production'
  const corrId = correlationId || randomUUID()

  const response = {
    success: false,
    error: {
      code: errorCode,
      message,
      // Only include details in non-production environments
      details: isProduction ? undefined : details,
    },
    correlationId: corrId,
    timestamp: new Date().toISOString(),
  }

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'X-Correlation-Id': corrId,
    },
    body: JSON.stringify(response),
  }
}

/**
 * Story 3.1.21: Error Response from Error Object
 *
 * Converts any error to standardized error response with correlationId.
 * Handles ApiError instances with proper status codes.
 * Falls back to 500 for unknown errors.
 *
 * @param error - Any error object
 * @param correlationId - Request tracking ID (generated if not provided)
 */
export function errorResponseFromError(
  error: unknown,
  correlationId?: string,
): APIGatewayProxyResult {
  const apiError = toApiError(error)

  return errorResponse(
    apiError.statusCode,
    apiError.errorType,
    apiError.message,
    correlationId,
    apiError.details,
  )
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
