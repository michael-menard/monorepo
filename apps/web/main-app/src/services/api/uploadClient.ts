/**
 * Story 3.1.10: Upload Client Service
 *
 * XHR-based upload client with progress events for file uploads.
 * Uses withCredentials for cookie-based auth (Story 3.1.4).
 */

/* eslint-disable no-undef */
// XMLHttpRequest is a browser global, not available in Node.js

import { logger } from '@repo/logger'
import { z } from 'zod'

/**
 * Upload progress callback
 */
export type UploadProgressCallback = (loaded: number, total: number) => void

/**
 * Upload error from API response
 */
export const UploadApiErrorSchema = z.object({
  success: z.literal(false),
  error: z.object({
    type: z.string(),
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
  timestamp: z.string().optional(),
})

export type UploadApiError = z.infer<typeof UploadApiErrorSchema>

/**
 * Upload error class with structured data
 */
export class UploadError extends Error {
  readonly httpStatus: number
  readonly code: string
  readonly details?: Record<string, unknown>
  readonly requestId?: string
  readonly retryAfter?: number

  constructor(
    message: string,
    httpStatus: number,
    code: string,
    options?: {
      details?: Record<string, unknown>
      requestId?: string
      retryAfter?: number
    },
  ) {
    super(message)
    this.name = 'UploadError'
    this.httpStatus = httpStatus
    this.code = code
    this.details = options?.details
    this.requestId = options?.requestId
    this.retryAfter = options?.retryAfter
  }
}

/**
 * Upload options
 */
export interface UploadOptions {
  /** URL to upload to */
  url: string
  /** File to upload */
  file: File
  /** Content type */
  contentType?: string
  /** AbortSignal for cancellation */
  signal?: AbortSignal
  /** Progress callback */
  onProgress?: UploadProgressCallback
  /** CSRF token for unsafe methods */
  csrfToken?: string
}

/**
 * Upload result
 */
export interface UploadResult {
  success: true
  httpStatus: number
  data?: unknown
}

/**
 * Upload a file using XHR with progress events
 *
 * Uses XHR instead of fetch because fetch doesn't support upload progress.
 * Sets withCredentials=true for cookie-based auth (Story 3.1.4).
 */
export function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const { url, file, contentType, signal, onProgress, csrfToken } = options

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Set up abort handling
    const abortHandler = () => {
      xhr.abort()
      reject(new UploadError('Upload canceled', 0, 'CANCELED'))
    }

    if (signal) {
      if (signal.aborted) {
        reject(new UploadError('Upload canceled', 0, 'CANCELED'))
        return
      }
      signal.addEventListener('abort', abortHandler)
    }

    // Progress handler
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded, event.total)
      }
    }

    // Success/error handler
    xhr.onload = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler)
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        logger.info('Upload complete', { url, fileName: file.name, size: file.size })

        let data: unknown
        try {
          if (xhr.responseText) {
            data = JSON.parse(xhr.responseText)
          }
        } catch {
          // Response may not be JSON
        }

        resolve({ success: true, httpStatus: xhr.status, data })
      } else {
        handleUploadError(xhr, file.name, reject)
      }
    }

    xhr.onerror = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler)
      }
      logger.warn('Upload network error', { url, fileName: file.name })
      reject(new UploadError('Network error', 0, 'NETWORK_ERROR'))
    }

    xhr.ontimeout = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler)
      }
      logger.warn('Upload timeout', { url, fileName: file.name })
      reject(new UploadError('Upload timeout', 408, 'TIMEOUT'))
    }

    // Open connection
    xhr.open('PUT', url, true)

    // Set headers
    xhr.withCredentials = true // Cookie-based auth (Story 3.1.4)
    xhr.setRequestHeader('Accept', 'application/json')

    if (contentType) {
      xhr.setRequestHeader('Content-Type', contentType)
    } else {
      xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    }

    // CSRF token for unsafe methods
    if (csrfToken) {
      xhr.setRequestHeader('X-CSRF-Token', csrfToken)
    }

    logger.info('Starting upload', { url, fileName: file.name, size: file.size })

    // Send file
    xhr.send(file)
  })
}

/**
 * Handle upload error response
 */
function handleUploadError(
  xhr: XMLHttpRequest,
  fileName: string,
  reject: (error: UploadError) => void,
): void {
  let errorCode = 'UNKNOWN'
  let errorMessage = 'Upload failed'
  let details: Record<string, unknown> | undefined
  let retryAfter: number | undefined

  // Try to parse error response
  try {
    if (xhr.responseText) {
      const parsed = JSON.parse(xhr.responseText)
      const apiError = UploadApiErrorSchema.safeParse(parsed)

      if (apiError.success) {
        errorCode = apiError.data.error.type
        errorMessage = apiError.data.error.message
        details = apiError.data.error.details
      }
    }
  } catch {
    // Response may not be JSON
  }

  // Get retry-after header for 429
  if (xhr.status === 429) {
    const retryAfterHeader = xhr.getResponseHeader('Retry-After')
    if (retryAfterHeader) {
      retryAfter = parseInt(retryAfterHeader, 10)
    }
  }

  // Get request ID from headers
  const requestId = xhr.getResponseHeader('X-Request-Id') || undefined

  logger.warn('Upload failed', {
    fileName,
    httpStatus: xhr.status,
    errorCode,
    errorMessage,
    requestId,
  })

  reject(
    new UploadError(errorMessage, xhr.status, errorCode, {
      details,
      requestId,
      retryAfter,
    }),
  )
}

/**
 * Upload to presigned S3 URL
 *
 * For S3 presigned URLs, we don't use withCredentials since
 * the URL contains the auth signature.
 */
export function uploadToPresignedUrl(options: UploadOptions): Promise<UploadResult> {
  const { url, file, contentType, signal, onProgress } = options

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    // Set up abort handling
    const abortHandler = () => {
      xhr.abort()
      reject(new UploadError('Upload canceled', 0, 'CANCELED'))
    }

    if (signal) {
      if (signal.aborted) {
        reject(new UploadError('Upload canceled', 0, 'CANCELED'))
        return
      }
      signal.addEventListener('abort', abortHandler)
    }

    // Progress handler
    xhr.upload.onprogress = event => {
      if (event.lengthComputable && onProgress) {
        onProgress(event.loaded, event.total)
      }
    }

    // Success/error handler
    xhr.onload = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler)
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        logger.info('S3 upload complete', { fileName: file.name, size: file.size })
        resolve({ success: true, httpStatus: xhr.status })
      } else {
        logger.warn('S3 upload failed', { fileName: file.name, httpStatus: xhr.status })
        reject(new UploadError('S3 upload failed', xhr.status, 'S3_ERROR'))
      }
    }

    xhr.onerror = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler)
      }
      logger.warn('S3 upload network error', { fileName: file.name })
      reject(new UploadError('Network error', 0, 'NETWORK_ERROR'))
    }

    xhr.ontimeout = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler)
      }
      logger.warn('S3 upload timeout', { fileName: file.name })
      reject(new UploadError('Upload timeout', 408, 'TIMEOUT'))
    }

    // Open connection - no credentials for S3 presigned URLs
    xhr.open('PUT', url, true)

    // Set content type
    if (contentType) {
      xhr.setRequestHeader('Content-Type', contentType)
    } else {
      xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    }

    logger.info('Starting S3 upload', { fileName: file.name, size: file.size })

    // Send file
    xhr.send(file)
  })
}
