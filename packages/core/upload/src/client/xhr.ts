/**
 * @repo/upload - XHR Upload Functions
 *
 * Story REPA-002: Migrate upload client code to @repo/upload
 *
 * XHR-based upload functions with progress events.
 * Uses XHR instead of fetch because fetch doesn't support upload progress.
 */

/* eslint-disable no-undef */
// XMLHttpRequest is a browser global, not available in Node.js

import type { UploadOptions, UploadResult, UploadProgress } from './types'
import { UploadError, UploadApiErrorSchema } from './types'

/**
 * Upload a file to an API endpoint using XHR
 *
 * Uses withCredentials=true by default for cookie-based auth.
 *
 * @param options - Upload options including file, URL, and callbacks
 * @returns Promise resolving to upload result
 * @throws UploadError on failure
 */
export function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const {
    url,
    file,
    contentType,
    signal,
    onProgress,
    headers,
    withCredentials = true,
    csrfToken,
  } = options

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
        const progress: UploadProgress = {
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded / event.total) * 100),
        }
        onProgress(progress)
      }
    }

    // Success/error handler
    xhr.onload = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler)
      }

      if (xhr.status >= 200 && xhr.status < 300) {
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
        handleUploadError(xhr, reject)
      }
    }

    xhr.onerror = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler)
      }
      reject(new UploadError('Network error', 0, 'NETWORK_ERROR'))
    }

    xhr.ontimeout = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler)
      }
      reject(new UploadError('Upload timeout', 408, 'TIMEOUT'))
    }

    // Open connection
    xhr.open('PUT', url, true)

    // Set credentials
    xhr.withCredentials = withCredentials

    // Set headers
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.setRequestHeader('Content-Type', contentType || file.type || 'application/octet-stream')

    // CSRF token for unsafe methods
    if (csrfToken) {
      xhr.setRequestHeader('X-CSRF-Token', csrfToken)
    }

    // Additional custom headers
    if (headers) {
      Object.entries(headers).forEach(([key, value]) => {
        xhr.setRequestHeader(key, value)
      })
    }

    // Send file
    xhr.send(file)
  })
}

/**
 * Upload a file to a presigned S3 URL
 *
 * For S3 presigned URLs, we don't use withCredentials since
 * the URL contains the auth signature.
 *
 * @param options - Upload options including file, URL, and callbacks
 * @returns Promise resolving to upload result
 * @throws UploadError on failure
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
        const progress: UploadProgress = {
          loaded: event.loaded,
          total: event.total,
          percent: Math.round((event.loaded / event.total) * 100),
        }
        onProgress(progress)
      }
    }

    // Success/error handler
    xhr.onload = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler)
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        const etag = xhr.getResponseHeader('ETag') ?? undefined
        resolve({ success: true, httpStatus: xhr.status, etag })
      } else {
        reject(new UploadError('S3 upload failed', xhr.status, 'S3_ERROR'))
      }
    }

    xhr.onerror = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler)
      }
      reject(new UploadError('Network error', 0, 'NETWORK_ERROR'))
    }

    xhr.ontimeout = () => {
      if (signal) {
        signal.removeEventListener('abort', abortHandler)
      }
      reject(new UploadError('Upload timeout', 408, 'TIMEOUT'))
    }

    // Open connection - no credentials for S3 presigned URLs
    xhr.open('PUT', url, true)

    // Set content type (use || to handle empty string file.type)
    xhr.setRequestHeader('Content-Type', contentType || file.type || 'application/octet-stream')

    // Send file
    xhr.send(file)
  })
}

/**
 * Handle upload error response
 */
function handleUploadError(xhr: XMLHttpRequest, reject: (error: UploadError) => void): void {
  let errorCode: UploadError['code'] = 'UNKNOWN'
  let errorMessage = 'Upload failed'
  let details: Record<string, unknown> | undefined
  let retryAfter: number | undefined

  // Try to parse error response
  try {
    if (xhr.responseText) {
      const parsed = JSON.parse(xhr.responseText)
      const apiError = UploadApiErrorSchema.safeParse(parsed)

      if (apiError.success) {
        errorMessage = apiError.data.error.message
        details = apiError.data.error.details

        // Map API error type to error code
        const apiType = apiError.data.error.type
        if (apiType === 'EXPIRED_SESSION') {
          errorCode = 'EXPIRED_SESSION'
        } else if (apiType === 'VALIDATION_ERROR') {
          errorCode = 'VALIDATION_ERROR'
        }
      }
    }
  } catch {
    // Response may not be JSON
  }

  // Map HTTP status to error code if not already set from API
  if (errorCode === 'UNKNOWN') {
    errorCode = mapHttpStatusToErrorCode(xhr.status)
  }

  // Get retry-after header for 429
  if (xhr.status === 429) {
    const retryAfterHeader = xhr.getResponseHeader('Retry-After')
    if (retryAfterHeader) {
      retryAfter = parseInt(retryAfterHeader, 10)
    }
  }

  // Get request ID from headers
  const requestId = xhr.getResponseHeader('X-Request-Id') ?? undefined

  reject(
    new UploadError(errorMessage, xhr.status, errorCode, {
      details,
      requestId,
      retryAfter,
    }),
  )
}

/**
 * Map HTTP status code to upload error code
 */
function mapHttpStatusToErrorCode(status: number): UploadError['code'] {
  switch (status) {
    case 401:
      return 'UNAUTHORIZED'
    case 403:
      return 'FORBIDDEN'
    case 408:
      return 'TIMEOUT'
    case 413:
      return 'PAYLOAD_TOO_LARGE'
    case 415:
    case 400:
      return 'UNSUPPORTED_TYPE'
    case 0:
      return 'NETWORK_ERROR'
    default:
      if (status >= 500) {
        return 'SERVER_ERROR'
      }
      return 'UNKNOWN'
  }
}
