/**
 * Response Type Definitions
 *
 * Story 3.1.21: Re-exports types from shared packages for Lambda functions.
 */

// Re-export everything from the shared packages
export {
  ApiErrorCodeSchema,
  type ApiErrorCode,
  ApiErrorSchema,
  type ApiError,
} from '@repo/api-types'

export {
  ApiErrorTypeSchema,
  type ApiErrorType,
  ApiSuccessResponseSchema,
  type ApiSuccessResponse,
  ApiErrorResponseSchema,
  type ApiErrorResponse,
  ApiResponseSchema,
  type ApiResponse,
} from '@repo/lambda-responses'
