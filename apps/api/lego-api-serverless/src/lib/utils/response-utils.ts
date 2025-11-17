/**
 * Response utility wrappers for Lambda handlers
 * Wraps the core response builders from @/lib/responses
 */

import { successResponse, errorResponse, noContentResponse, type APIGatewayProxyResult } from '@monorepo/lambda-responses'
import type { ApiErrorType } from '@monorepo/lambda-responses'

/**
 * Create success response with data
 */
export function createSuccessResponse<T>(
  data: T,
  statusCode: number = 200,
  message?: string,
): APIGatewayProxyResult {
  return successResponse(statusCode, data, message)
}

/**
 * Create error response
 */
export function createErrorResponse(
  statusCode: number,
  errorType: ApiErrorType,
  message: string,
  details?: Record<string, unknown>,
): APIGatewayProxyResult {
  return errorResponse(statusCode, errorType, message, details)
}

/**
 * Create no content response (204)
 */
export function createNoContentResponse(): APIGatewayProxyResult {
  return noContentResponse()
}
