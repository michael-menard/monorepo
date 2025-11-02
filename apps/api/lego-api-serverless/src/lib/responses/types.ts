/**
 * Response Type Definitions
 *
 * Shared types for API responses used across all Lambda functions.
 */

import { z } from 'zod'

/**
 * Standard API Error Types
 * - Consistent error codes across all endpoints
 * - Used for client-side error handling and logging
 */
export const ApiErrorTypeSchema = z.enum([
  'BAD_REQUEST',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'VALIDATION_ERROR',
  'TOO_MANY_REQUESTS',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
  'FILE_ERROR',
  'SEARCH_ERROR',
  'DATABASE_ERROR',
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
 * API Error Response Schema
 * - Used for all error responses
 * - Details field provides debugging information (never exposed in production)
 */
export const ApiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    type: ApiErrorTypeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  timestamp: z.string().datetime(),
})

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>

/**
 * Union of success and error responses
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.discriminatedUnion('success', [ApiSuccessResponseSchema(dataSchema), ApiErrorResponseSchema])

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse
