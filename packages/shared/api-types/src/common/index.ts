/**
 * Common API Types
 *
 * Shared schemas for API responses, pagination, and error handling.
 */

import { z } from 'zod'

// ============================================================================
// API Response Wrapper
// ============================================================================

/**
 * Standard API response wrapper schema
 */
export const ApiResponseSchema = z.object({
  data: z.any(),
  meta: z.object({
    requestId: z.string(),
    timestamp: z.string(),
    version: z.string().optional(),
  }),
  pagination: z
    .object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
    })
    .optional(),
})

export type ApiResponse<T = unknown> = {
  data: T
  meta: {
    requestId: string
    timestamp: string
    version?: string
  }
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// ============================================================================
// Pagination
// ============================================================================

/**
 * Common pagination query schema
 */
export const PaginationQuerySchema = z.object({
  /** Page number for pagination (1-based) */
  page: z.coerce.number().int().min(1).default(1),

  /** Number of results per page (max 100) */
  limit: z.coerce.number().int().min(1).max(100).default(20),

  /** Field to sort by */
  sortBy: z.string().optional(),

  /** Sort direction */
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>

// ============================================================================
// Error Response
// ============================================================================

/**
 * Story 3.1.21: Standard API Error Codes
 *
 * Unified error codes for consistent API error handling across all endpoints.
 * Clients use these codes to map to user-friendly messages and UI affordances.
 */
export const ApiErrorCodeSchema = z.enum([
  // Authentication & Authorization (4xx)
  'UNAUTHORIZED', // 401: Authentication required or failed
  'EXPIRED_SESSION', // 401: Session/token expired
  'ACCESS_DENIED', // 403: Authenticated but no permission
  'FORBIDDEN', // 403: Resource access forbidden

  // Not Found (404)
  'NOT_FOUND', // 404: Resource does not exist

  // Conflict (409)
  'CONFLICT', // 409: Generic resource conflict
  'DUPLICATE_SLUG', // 409: Resource with same slug exists

  // Validation & Bad Request (400/422)
  'BAD_REQUEST', // 400: Malformed request
  'VALIDATION_ERROR', // 422: Semantic validation failed
  'INVALID_TYPE', // 400: File type not allowed
  'SIZE_TOO_LARGE', // 400: File exceeds size limit
  'FILE_ERROR', // 400: Generic file operation failed
  'PARTS_VALIDATION_ERROR', // 422: Parts list validation failed

  // Rate Limiting (429)
  'RATE_LIMITED', // 429: Too many requests
  'TOO_MANY_REQUESTS', // 429: Alias for RATE_LIMITED

  // Server Errors (5xx)
  'INTERNAL_ERROR', // 500: Unexpected server error
  'SERVICE_UNAVAILABLE', // 503: Dependency unavailable
  'DATABASE_ERROR', // 500: Database operation failed
  'SEARCH_ERROR', // 500: Search operation failed
  'EXTERNAL_SERVICE_ERROR', // 502: External service failed
  'THROTTLING_ERROR', // 429: AWS throttling
])

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>

/**
 * Story 3.1.21: Standard API error response schema
 *
 * Contract: { code, message, details?, correlationId }
 * - code: One of ApiErrorCode values
 * - message: User-friendly error message
 * - details: Optional debugging info (stripped in production)
 * - correlationId: Request tracking ID for support
 */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    details: z.record(z.any()).optional(),
  }),
  meta: z.object({
    correlationId: z.string(),
    timestamp: z.string(),
  }),
})

export type ApiError = z.infer<typeof ApiErrorSchema>

/**
 * Legacy error schema for backward compatibility
 * (Some endpoints still use requestId instead of correlationId)
 */
export const ApiErrorSchemaLegacy = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  }),
  meta: z.object({
    requestId: z.string(),
    timestamp: z.string(),
  }),
})

// ============================================================================
// File Upload
// ============================================================================

/**
 * File upload validation schema
 */
export const FileUploadSchema = z.object({
  /** Type of file being uploaded */
  fileType: z.enum(['instruction', 'parts-list', 'thumbnail', 'gallery-image']),
})

export type FileUpload = z.infer<typeof FileUploadSchema>

/**
 * Successfully uploaded file record
 */
export const UploadedFileSchema = z.object({
  /** New file record ID */
  id: z.string().uuid(),

  /** Original filename */
  filename: z.string(),

  /** CDN URL to uploaded file */
  fileUrl: z.string(),

  /** File size in bytes */
  fileSize: z.number().int(),

  /** Type of file uploaded */
  fileType: z.enum(['instruction', 'parts-list', 'thumbnail', 'gallery-image']),
})

export type UploadedFile = z.infer<typeof UploadedFileSchema>

/**
 * Failed file upload record
 */
export const FailedFileSchema = z.object({
  /** Original filename that failed */
  filename: z.string(),

  /** Error message describing failure */
  error: z.string(),
})

export type FailedFile = z.infer<typeof FailedFileSchema>

/**
 * Multi-file upload response
 */
export const MultiFileUploadResponseSchema = z.object({
  /** Successfully uploaded files */
  uploaded: z.array(UploadedFileSchema),

  /** Files that failed to upload */
  failed: z.array(FailedFileSchema),

  /** Upload summary counts */
  summary: z.object({
    /** Total files attempted */
    total: z.number().int(),

    /** Number successfully uploaded */
    succeeded: z.number().int(),

    /** Number that failed */
    failed: z.number().int(),
  }),
})

export type MultiFileUploadResponse = z.infer<typeof MultiFileUploadResponseSchema>
