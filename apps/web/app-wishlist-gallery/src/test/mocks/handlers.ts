import { http, HttpResponse, delay } from 'msw'
import {
  createMockPresignResponse,
  mockPresign500Error,
  mockS3Forbidden,
  MOCK_ERROR_HEADER,
  MOCK_TIMEOUT_MARKER,
  getNextPresignCounter,
  resetPresignCounter,
} from '../fixtures/s3-mocks'
import {
  mockMimeTypeError,
  mockFileTooLargeError,
  mockFileTooSmallError,
  mockInvalidExtensionError,
  MOCK_SECURITY_ERROR_HEADER,
  SecurityErrorTypes,
} from '../fixtures/security-mocks'

const API_BASE_URL = 'http://localhost:3001'

// Re-export for test setup
export { resetPresignCounter }

export const handlers = [
  // Health check endpoint
  http.get(`${API_BASE_URL}/health`, () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'app-wishlist-gallery',
    })
  }),

  // Module-specific mock endpoints
  http.get(`${API_BASE_URL}/api/v2/app-wishlist-gallery/data`, () => {
    return HttpResponse.json({
      data: {
        message: 'Mock data for App Wishlist Gallery module',
        items: [
          { id: 1, name: 'Sample Item 1' },
          { id: 2, name: 'Sample Item 2' },
        ],
      },
      meta: {
        requestId: `req-${Date.now()}`,
        timestamp: new Date().toISOString(),
      },
    })
  }),

  // Error simulation endpoints
  http.get(`${API_BASE_URL}/api/error/500`, () => {
    return HttpResponse.json(
      {
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Simulated server error',
        },
      },
      { status: 500 },
    )
  }),

  http.get(`${API_BASE_URL}/api/error/timeout`, () => {
    return new Promise(() => {
      // Never resolve to simulate timeout
    })
  }),

  // ─────────────────────────────────────────────────────────────────────────────
  // S3 Upload Handlers (WISH-2011)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Presign URL endpoint handler.
   *
   * Returns a mock presigned URL for S3 uploads.
   * Supports error injection via x-mock-error header:
   * - '500': Returns 500 Internal Server Error
   * - '403': Returns 403 Forbidden
   * - 'timeout': Never resolves (simulates timeout)
   *
   * WISH-2013: Also supports x-mock-security-error header for security tests:
   * - 'invalid-mime-type': Returns 400 with MIME type error
   * - 'file-too-large': Returns 400 with file size error
   * - 'file-too-small': Returns 400 with empty file error
   * - 'invalid-extension': Returns 400 with extension error
   *
   * @example
   * // Normal usage - returns presigned URL
   * const response = await fetch('/api/wishlist/images/presign', {
   *   method: 'POST',
   *   body: JSON.stringify({ fileName: 'test.jpg', mimeType: 'image/jpeg' })
   * })
   *
   * @example
   * // Security error injection - returns 400
   * const response = await fetch('/api/wishlist/images/presign', {
   *   method: 'POST',
   *   headers: { 'x-mock-security-error': 'invalid-mime-type' },
   *   body: JSON.stringify({ fileName: 'test.exe', mimeType: 'application/x-executable' })
   * })
   */
  http.post(`${API_BASE_URL}/api/wishlist/images/presign`, async ({ request }) => {
    // Check for error injection
    const mockError = request.headers.get(MOCK_ERROR_HEADER)
    const securityError = request.headers.get(MOCK_SECURITY_ERROR_HEADER)

    // WISH-2013: Security error handling
    if (securityError === SecurityErrorTypes.INVALID_MIME_TYPE) {
      return HttpResponse.json(mockMimeTypeError, { status: 400 })
    }

    if (securityError === SecurityErrorTypes.FILE_TOO_LARGE) {
      return HttpResponse.json(mockFileTooLargeError, { status: 400 })
    }

    if (securityError === SecurityErrorTypes.FILE_TOO_SMALL) {
      return HttpResponse.json(mockFileTooSmallError, { status: 400 })
    }

    if (securityError === SecurityErrorTypes.INVALID_EXTENSION) {
      return HttpResponse.json(mockInvalidExtensionError, { status: 400 })
    }

    if (mockError === '500') {
      return HttpResponse.json(mockPresign500Error, { status: 500 })
    }

    if (mockError === '403') {
      return HttpResponse.json(mockS3Forbidden, { status: 403 })
    }

    if (mockError === MOCK_TIMEOUT_MARKER || mockError === 'timeout') {
      // Never resolve - simulates timeout
      return new Promise(() => {})
    }

    // Parse request body to get file name
    let fileName = 'test.jpg'
    try {
      const body = (await request.json()) as { fileName?: string; mimeType?: string }
      if (body.fileName) {
        fileName = body.fileName
      }
    } catch {
      // Use default fileName
    }

    // Add small delay to simulate network latency
    await delay(10)

    // Generate unique presign response (for concurrent upload support)
    const counter = getNextPresignCounter()
    const uniqueFileName = `${counter}-${fileName}`
    const response = createMockPresignResponse(uniqueFileName)

    return HttpResponse.json(response)
  }),

  /**
   * S3 PUT handler for presigned URL uploads.
   *
   * Intercepts all PUT requests to *.amazonaws.com and returns success.
   * Supports error injection via x-mock-error header:
   * - '403': Returns 403 Forbidden
   * - '500': Returns 500 Internal Server Error
   * - 'timeout': Never resolves (simulates timeout)
   *
   * Note: This handler uses a regex pattern to match all S3 bucket URLs.
   *
   * @example
   * // Normal upload - returns 200 OK
   * await fetch('https://bucket.s3.amazonaws.com/key?signature=xxx', {
   *   method: 'PUT',
   *   body: file
   * })
   *
   * @example
   * // Error injection - returns 403
   * await fetch('https://bucket.s3.amazonaws.com/key', {
   *   method: 'PUT',
   *   headers: { 'x-mock-error': '403' },
   *   body: file
   * })
   */
  http.put(/https:\/\/.*\.s3\.amazonaws\.com\/.*/, async ({ request }) => {
    // Check for error injection
    const mockError = request.headers.get(MOCK_ERROR_HEADER)

    if (mockError === '403') {
      return new HttpResponse('Forbidden', {
        status: 403,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    if (mockError === '500') {
      return new HttpResponse('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    if (mockError === MOCK_TIMEOUT_MARKER || mockError === 'timeout') {
      // Never resolve - simulates timeout
      return new Promise(() => {})
    }

    // Add small delay to simulate upload time
    await delay(10)

    // Return successful upload response
    return new HttpResponse(null, {
      status: 200,
      headers: {
        'x-amz-request-id': `mock-request-${Date.now()}`,
        etag: '"mock-etag-12345"',
      },
    })
  }),
]
