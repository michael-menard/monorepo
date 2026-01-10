/**
 * Story 3.1.19: Finalize Client Service
 *
 * API client for finalizing upload sessions.
 * Handles 409 conflict (slug), 429 rate limit, and per-file validation errors.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'

/**
 * Finalize request schema
 */
export const FinalizeRequestSchema = z.object({
  uploadSessionId: z.string().uuid(),
  title: z.string().min(3).max(120),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  theme: z.string().optional(),
})

export type FinalizeRequest = z.infer<typeof FinalizeRequestSchema>

/**
 * Finalize success response schema
 */
export const FinalizeSuccessResponseSchema = z.object({
  id: z.string(), // Can be UUID or other format
  title: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  pdfKey: z.string(),
  imageKeys: z.array(z.string()),
  partsKeys: z.array(z.string()),
  tags: z.array(z.string()).nullable(),
  theme: z.string().nullable(),
  createdAt: z.string(),
  idempotent: z.boolean().optional(),
})

export type FinalizeSuccessResponse = z.infer<typeof FinalizeSuccessResponseSchema>

/**
 * 409 Conflict error details
 */
export const ConflictErrorDetailsSchema = z.object({
  title: z.string(),
  suggestedSlug: z.string(),
})

export type ConflictErrorDetails = z.infer<typeof ConflictErrorDetailsSchema>

/**
 * Per-file validation error
 */
export const FileValidationErrorSchema = z.object({
  fileId: z.string(),
  filename: z.string(),
  reason: z.enum(['magic-bytes', 'type', 'size', 'missing']),
  message: z.string(),
})

export type FileValidationError = z.infer<typeof FileValidationErrorSchema>

/**
 * API error response schema
 */
export const FinalizeErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    type: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  timestamp: z.string().optional(),
})

/**
 * Finalize error class
 */
export class FinalizeError extends Error {
  readonly httpStatus: number
  readonly code: string
  readonly suggestedSlug?: string
  readonly retryAfterSeconds?: number
  readonly fileErrors?: FileValidationError[]
  readonly requestId?: string

  constructor(
    message: string,
    httpStatus: number,
    code: string,
    options?: {
      suggestedSlug?: string
      retryAfterSeconds?: number
      fileErrors?: FileValidationError[]
      requestId?: string
    },
  ) {
    super(message)
    this.name = 'FinalizeError'
    this.httpStatus = httpStatus
    this.code = code
    this.suggestedSlug = options?.suggestedSlug
    this.retryAfterSeconds = options?.retryAfterSeconds
    this.fileErrors = options?.fileErrors
    this.requestId = options?.requestId
  }

  get isConflict(): boolean {
    return this.httpStatus === 409
  }

  get isRateLimit(): boolean {
    return this.httpStatus === 429
  }

  get hasFileErrors(): boolean {
    return !!this.fileErrors && this.fileErrors.length > 0
  }
}

/**
 * Finalize result type
 */
export type FinalizeResult =
  | { success: true; data: FinalizeSuccessResponse; idempotent?: boolean }
  | { success: false; error: FinalizeError }

/**
 * Options for finalize call
 */
export interface FinalizeOptions {
  /** Base API URL */
  baseUrl?: string
  /** CSRF token for unsafe methods */
  csrfToken?: string
  /** AbortSignal for cancellation */
  signal?: AbortSignal
}

/**
 * Get API base URL from environment
 */
const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE_URL || '/api'
}

/**
 * Finalize an upload session
 *
 * Calls POST /api/mocs/uploads/finalize with session data.
 * Handles 409 (conflict), 429 (rate limit), and per-file validation errors.
 */
export async function finalizeSession(
  request: FinalizeRequest,
  options: FinalizeOptions = {},
): Promise<FinalizeResult> {
  const { baseUrl = getApiBaseUrl(), csrfToken, signal } = options

  const url = `${baseUrl}/mocs/uploads/finalize`

  logger.info('Finalizing upload session', {
    uploadSessionId: request.uploadSessionId,
    title: request.title,
  })

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      credentials: 'include', // Cookie-based auth
      body: JSON.stringify(request),
      signal,
    })

    const requestId = response.headers.get('X-Request-Id') || undefined

    // Handle success (200 or 201)
    if (response.ok) {
      const json = await response.json()
      const parsed = FinalizeSuccessResponseSchema.safeParse(json.data || json)

      if (parsed.success) {
        logger.info('Finalize successful', {
          mocId: parsed.data.id,
          slug: parsed.data.slug,
          idempotent: parsed.data.idempotent,
        })

        return {
          success: true,
          data: parsed.data,
          idempotent: parsed.data.idempotent,
        }
      }

      // Response shape unexpected
      logger.warn('Finalize response parsing failed', { json })
      return {
        success: false,
        error: new FinalizeError('Unexpected response format', response.status, 'PARSE_ERROR', {
          requestId,
        }),
      }
    }

    // Handle 409 Conflict
    if (response.status === 409) {
      const json = await response.json()
      const details = json.details || json.error?.details

      const suggestedSlug = details?.suggestedSlug

      logger.info('Finalize conflict - slug exists', {
        title: request.title,
        suggestedSlug,
      })

      return {
        success: false,
        error: new FinalizeError(
          json.error?.message || 'A MOC with this title already exists',
          409,
          'CONFLICT',
          { suggestedSlug, requestId },
        ),
      }
    }

    // Handle 429 Rate Limit
    if (response.status === 429) {
      const retryAfterHeader = response.headers.get('Retry-After')
      const retryAfterSeconds = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60

      logger.info('Finalize rate limited', { retryAfterSeconds })

      return {
        success: false,
        error: new FinalizeError('Too many requests', 429, 'RATE_LIMIT', {
          retryAfterSeconds,
          requestId,
        }),
      }
    }

    // Handle 400 with file validation errors
    if (response.status === 400) {
      const json = await response.json()
      const details = json.error?.details

      // Check for file validation errors
      if (details?.files && Array.isArray(details.files)) {
        const fileErrors = details.files
          .map((f: unknown) => {
            const parsed = FileValidationErrorSchema.safeParse(f)
            return parsed.success ? parsed.data : null
          })
          .filter((f: unknown): f is FileValidationError => f !== null)

        if (fileErrors.length > 0) {
          logger.info('Finalize file validation errors', { fileErrors })

          return {
            success: false,
            error: new FinalizeError(
              json.error?.message || 'File validation failed',
              400,
              'FILE_VALIDATION_ERROR',
              { fileErrors, requestId },
            ),
          }
        }
      }

      return {
        success: false,
        error: new FinalizeError(
          json.error?.message || 'Invalid request',
          400,
          json.error?.type || 'BAD_REQUEST',
          { requestId },
        ),
      }
    }

    // Handle other errors
    let errorMessage = 'Finalize failed'
    let errorCode = 'UNKNOWN'

    try {
      const json = await response.json()
      if (json.error?.message) {
        errorMessage = json.error.message
      }
      if (json.error?.type) {
        errorCode = json.error.type
      }
    } catch {
      // Response may not be JSON
    }

    logger.warn('Finalize failed', {
      httpStatus: response.status,
      errorCode,
      errorMessage,
    })

    return {
      success: false,
      error: new FinalizeError(errorMessage, response.status, errorCode, { requestId }),
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return {
        success: false,
        error: new FinalizeError('Request canceled', 0, 'CANCELED'),
      }
    }

    logger.error('Finalize network error', { error: err })

    return {
      success: false,
      error: new FinalizeError('Network error', 0, 'NETWORK_ERROR'),
    }
  }
}
