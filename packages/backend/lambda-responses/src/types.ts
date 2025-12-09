/**
 * Response Type Definitions
 *
 * Story 3.1.21: Unified error contract types.
 * Re-exports shared types from @repo/api-types for Lambda functions.
 */

import { z } from 'zod'

// Re-export unified error codes from shared package
export { ApiErrorCodeSchema, type ApiErrorCode } from '@repo/api-types'

/**
 * @deprecated Use ApiErrorCodeSchema/ApiErrorCode from @repo/api-types instead
 * Kept for backward compatibility during migration.
 */
export const ApiErrorTypeSchema = z.enum([
  // Client errors (4xx)
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'ACCESS_DENIED',
  'NOT_FOUND',
  'CONFLICT',
  'DUPLICATE_SLUG',
  'VALIDATION_ERROR',
  'INVALID_TYPE',
  'SIZE_TOO_LARGE',
  'TOO_MANY_REQUESTS',
  'RATE_LIMITED',
  'EXPIRED_SESSION',
  'FILE_ERROR',
  'PARTS_VALIDATION_ERROR',
  // Server errors (5xx)
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
  'DATABASE_ERROR',
  'SEARCH_ERROR',
  'EXTERNAL_SERVICE_ERROR',
  'THROTTLING_ERROR',
])

export type ApiErrorType = z.infer<typeof ApiErrorTypeSchema>

/**
 * Generic API Response Schema (Success)
 * - Used for all successful API responses
 * - Data field is generic and validated per endpoint
 */
export const ApiSuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    message: z.string().optional(),
    timestamp: z.string().datetime(),
  })

export type ApiSuccessResponse<T> = {
  success: true
  data: T
  message?: string
  timestamp: string
}

/**
 * Story 3.1.21: API Error Response Schema
 *
 * Contract: { code, message, details?, correlationId }
 * - code: One of ApiErrorType values
 * - message: User-friendly error message
 * - details: Optional debugging info (stripped in production)
 * - correlationId: Request tracking ID for support
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: ApiErrorTypeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  correlationId: z.string(),
  timestamp: z.string().datetime(),
})

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>

/**
 * @deprecated Use ApiErrorResponseSchema instead
 * Legacy error response with 'type' field instead of 'code'
 */
export const ApiErrorResponseSchemaLegacy = z.object({
  success: z.literal(false),
  error: z.object({
    type: ApiErrorTypeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  timestamp: z.string().datetime(),
})

export type ApiErrorResponseLegacy = z.infer<typeof ApiErrorResponseSchemaLegacy>

/**
 * Union of success and error responses
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.discriminatedUnion('success', [ApiSuccessResponseSchema(dataSchema), ApiErrorResponseSchema])

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse
