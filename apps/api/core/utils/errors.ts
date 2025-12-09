/**
 * Standardized Error Classes for Lambda Functions
 *
 * Story 3.1.21: Re-exports error classes from @repo/lambda-responses.
 */

import { ApiError as BaseApiError, type ApiErrorType } from '@repo/lambda-responses'

// Re-export everything from the lambda-responses package
export {
  // Base class
  ApiError,
  isApiError,
  toApiError,

  // Standard error classes
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
  ThrottlingError,

  // Story 3.1.21: New error classes
  AccessDeniedError,
  DuplicateSlugError,
  InvalidTypeError,
  SizeTooLargeError,
  ExpiredSessionError,

  // Story 3.1.23: Parts validation error
  PartsValidationError,
} from '@repo/lambda-responses'

/**
 * External Service errors (502) - Third-party service failures
 *
 * Backward-compatible wrapper that supports both old and new signatures:
 * - Old: ExternalServiceError(message, details?)
 * - New: ExternalServiceError(service, message, details?, isRetryable?)
 */
export class ExternalServiceError extends BaseApiError {
  readonly statusCode = 502
  readonly errorType: ApiErrorType = 'EXTERNAL_SERVICE_ERROR'
  readonly isRetryable: boolean
  readonly service?: string

  constructor(
    messageOrService: string,
    detailsOrMessage?: Record<string, unknown> | string,
    detailsOrIsRetryable?: Record<string, unknown> | boolean,
    isRetryableArg?: boolean,
  ) {
    // Detect calling convention based on second argument type
    const isNewStyle = typeof detailsOrMessage === 'string'

    if (isNewStyle) {
      // New style: (service, message, details?, isRetryable?)
      const service = messageOrService
      const message = detailsOrMessage as string
      const details = detailsOrIsRetryable as Record<string, unknown> | undefined
      const isRetryable = isRetryableArg ?? true

      super(message, details)
      this.service = service
      this.isRetryable = isRetryable
    } else {
      // Old style: (message, details?)
      const message = messageOrService
      const details = detailsOrMessage as Record<string, unknown> | undefined

      super(message, details)
      this.service = (details?.service as string) || undefined
      this.isRetryable = true
    }
  }
}
