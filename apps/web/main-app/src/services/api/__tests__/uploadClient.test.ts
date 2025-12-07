/**
 * Story 3.1.18: Upload Client Service Tests
 *
 * Tests for XHR-based upload with progress, cancellation, and error handling.
 * Uses a mock XMLHttpRequest class that simulates browser behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { uploadFile, uploadToPresignedUrl, UploadError } from '../uploadClient'

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

/**
 * Mock XMLHttpRequest class that simulates browser XHR behavior
 */
class MockXMLHttpRequest {
  static instances: MockXMLHttpRequest[] = []

  status = 200
  responseText = ''
  withCredentials = false
  readyState = 0

  upload = {
    onprogress: null as ((e: ProgressEvent) => void) | null,
  }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  ontimeout: (() => void) | null = null

  _method = ''
  _url = ''
  _headers: Record<string, string> = {}
  _abortListeners: (() => void)[] = []

  constructor() {
    MockXMLHttpRequest.instances.push(this)
  }

  open(method: string, url: string, _async?: boolean) {
    this._method = method
    this._url = url
  }

  setRequestHeader(name: string, value: string) {
    this._headers[name] = value
  }

  send(_body?: unknown) {
    // Upload starts - XHR is ready for response simulation
  }

  abort() {
    this._abortListeners.forEach(fn => fn())
  }

  getResponseHeader(name: string): string | null {
    if (name === 'Retry-After') return '60'
    if (name === 'X-Request-Id') return 'req-123'
    return null
  }

  // Helper to add abort listener (simulates signal.addEventListener)
  _addAbortListener(fn: () => void) {
    this._abortListeners.push(fn)
  }

  // Simulate successful response
  _simulateSuccess(status = 200, responseText = '') {
    this.status = status
    this.responseText = responseText
    this.onload?.()
  }

  // Simulate error response
  _simulateError() {
    this.onerror?.()
  }

  // Simulate timeout
  _simulateTimeout() {
    this.ontimeout?.()
  }

  // Simulate progress
  _simulateProgress(loaded: number, total: number) {
    const event = { lengthComputable: true, loaded, total } as ProgressEvent
    this.upload.onprogress?.(event)
  }

  // Clear all instances
  static clear() {
    MockXMLHttpRequest.instances = []
  }

  // Get most recent instance
  static last(): MockXMLHttpRequest | undefined {
    return MockXMLHttpRequest.instances[MockXMLHttpRequest.instances.length - 1]
  }
}

describe('uploadClient', () => {
  let originalXhr: typeof XMLHttpRequest

  beforeEach(() => {
    // Store original and replace with mock
    originalXhr = globalThis.XMLHttpRequest
    globalThis.XMLHttpRequest = MockXMLHttpRequest as unknown as typeof XMLHttpRequest
    MockXMLHttpRequest.clear()
  })

  afterEach(() => {
    // Restore original
    globalThis.XMLHttpRequest = originalXhr
    vi.restoreAllMocks()
  })

  describe('uploadFile', () => {
    it('should upload file with correct headers', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const url = 'https://api.example.com/upload'

      const uploadPromise = uploadFile({
        url,
        file,
        contentType: 'application/pdf',
      })

      const xhr = MockXMLHttpRequest.last()!
      expect(xhr._method).toBe('PUT')
      expect(xhr._url).toBe(url)
      expect(xhr.withCredentials).toBe(true)
      expect(xhr._headers['Accept']).toBe('application/json')
      expect(xhr._headers['Content-Type']).toBe('application/pdf')

      xhr._simulateSuccess(200)
      const result = await uploadPromise

      expect(result.success).toBe(true)
      expect(result.httpStatus).toBe(200)
    })

    it('should set CSRF token header when provided', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      const uploadPromise = uploadFile({
        url: 'https://api.example.com/upload',
        file,
        csrfToken: 'test-csrf-token',
      })

      const xhr = MockXMLHttpRequest.last()!
      expect(xhr._headers['X-CSRF-Token']).toBe('test-csrf-token')

      xhr._simulateSuccess(200)
      await uploadPromise
    })

    it('should report upload progress', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const onProgress = vi.fn()

      const uploadPromise = uploadFile({
        url: 'https://api.example.com/upload',
        file,
        onProgress,
      })

      const xhr = MockXMLHttpRequest.last()!

      // Simulate progress
      xhr._simulateProgress(500, 1000)
      expect(onProgress).toHaveBeenCalledWith(500, 1000)

      xhr._simulateProgress(1000, 1000)
      expect(onProgress).toHaveBeenCalledWith(1000, 1000)

      xhr._simulateSuccess(200)
      await uploadPromise
    })

    it('should handle successful response with JSON data', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      const uploadPromise = uploadFile({
        url: 'https://api.example.com/upload',
        file,
      })

      const xhr = MockXMLHttpRequest.last()!
      xhr._simulateSuccess(200, JSON.stringify({ id: 'file-123' }))

      const result = await uploadPromise

      expect(result.success).toBe(true)
      expect(result.httpStatus).toBe(200)
      expect(result.data).toEqual({ id: 'file-123' })
    })

    it('should handle 401 Unauthorized error', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      const uploadPromise = uploadFile({
        url: 'https://api.example.com/upload',
        file,
      })

      const xhr = MockXMLHttpRequest.last()!
      xhr._simulateSuccess(
        401,
        JSON.stringify({
          success: false,
          error: { type: 'UNAUTHORIZED', message: 'Session expired' },
        }),
      )

      await expect(uploadPromise).rejects.toThrow(UploadError)
      await expect(uploadPromise).rejects.toMatchObject({
        httpStatus: 401,
        code: 'UNAUTHORIZED',
      })
    })

    it('should handle 413 Payload Too Large error', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      const uploadPromise = uploadFile({
        url: 'https://api.example.com/upload',
        file,
      })

      const xhr = MockXMLHttpRequest.last()!
      xhr._simulateSuccess(
        413,
        JSON.stringify({
          success: false,
          error: { type: 'PAYLOAD_TOO_LARGE', message: 'File too large' },
        }),
      )

      await expect(uploadPromise).rejects.toMatchObject({
        httpStatus: 413,
        code: 'PAYLOAD_TOO_LARGE',
      })
    })

    it('should handle 429 with Retry-After header', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      const uploadPromise = uploadFile({
        url: 'https://api.example.com/upload',
        file,
      })

      const xhr = MockXMLHttpRequest.last()!
      xhr._simulateSuccess(
        429,
        JSON.stringify({
          success: false,
          error: { type: 'TOO_MANY_REQUESTS', message: 'Rate limited' },
        }),
      )

      await expect(uploadPromise).rejects.toMatchObject({
        httpStatus: 429,
        retryAfter: 60,
      })
    })

    it('should handle network error', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      const uploadPromise = uploadFile({
        url: 'https://api.example.com/upload',
        file,
      })

      const xhr = MockXMLHttpRequest.last()!
      xhr._simulateError()

      await expect(uploadPromise).rejects.toThrow(UploadError)
      await expect(uploadPromise).rejects.toMatchObject({
        httpStatus: 0,
        code: 'NETWORK_ERROR',
      })
    })

    it('should handle timeout', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      const uploadPromise = uploadFile({
        url: 'https://api.example.com/upload',
        file,
      })

      const xhr = MockXMLHttpRequest.last()!
      xhr._simulateTimeout()

      await expect(uploadPromise).rejects.toMatchObject({
        httpStatus: 408,
        code: 'TIMEOUT',
      })
    })

    it('should reject immediately if signal already aborted', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const abortController = new AbortController()
      abortController.abort()

      const uploadPromise = uploadFile({
        url: 'https://api.example.com/upload',
        file,
        signal: abortController.signal,
      })

      await expect(uploadPromise).rejects.toMatchObject({
        code: 'CANCELED',
      })
    })
  })

  describe('uploadToPresignedUrl', () => {
    it('should upload without withCredentials for S3 presigned URLs', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const url = 'https://s3.amazonaws.com/bucket/key?X-Amz-Signature=...'

      const uploadPromise = uploadToPresignedUrl({
        url,
        file,
        contentType: 'application/pdf',
      })

      const xhr = MockXMLHttpRequest.last()!
      expect(xhr._method).toBe('PUT')
      expect(xhr._url).toBe(url)
      // For presigned URLs, withCredentials should NOT be set (remains default false)
      expect(xhr.withCredentials).toBe(false)
      expect(xhr._headers['Content-Type']).toBe('application/pdf')

      xhr._simulateSuccess(200)
      await uploadPromise
    })

    it('should report progress on S3 upload', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const onProgress = vi.fn()

      const uploadPromise = uploadToPresignedUrl({
        url: 'https://s3.amazonaws.com/bucket/key',
        file,
        onProgress,
      })

      const xhr = MockXMLHttpRequest.last()!
      xhr._simulateProgress(750, 1000)

      expect(onProgress).toHaveBeenCalledWith(750, 1000)

      xhr._simulateSuccess(200)
      await uploadPromise
    })

    it('should handle S3 upload error', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      const uploadPromise = uploadToPresignedUrl({
        url: 'https://s3.amazonaws.com/bucket/key',
        file,
      })

      const xhr = MockXMLHttpRequest.last()!
      xhr._simulateSuccess(403)

      await expect(uploadPromise).rejects.toMatchObject({
        httpStatus: 403,
        code: 'S3_ERROR',
      })
    })

    it('should use application/octet-stream as default content type', async () => {
      const file = new File(['test'], 'test.bin')

      const uploadPromise = uploadToPresignedUrl({
        url: 'https://s3.amazonaws.com/bucket/key',
        file,
      })

      const xhr = MockXMLHttpRequest.last()!
      expect(xhr._headers['Content-Type']).toBe('application/octet-stream')

      xhr._simulateSuccess(200)
      await uploadPromise
    })

    it('should reject immediately if signal already aborted', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const abortController = new AbortController()
      abortController.abort()

      const uploadPromise = uploadToPresignedUrl({
        url: 'https://s3.amazonaws.com/bucket/key',
        file,
        signal: abortController.signal,
      })

      await expect(uploadPromise).rejects.toMatchObject({
        code: 'CANCELED',
      })
    })
  })

  describe('UploadError', () => {
    it('should create error with all properties', () => {
      const error = new UploadError('Upload failed', 500, 'SERVER_ERROR', {
        details: { reason: 'disk full' },
        requestId: 'req-123',
        retryAfter: 30,
      })

      expect(error.message).toBe('Upload failed')
      expect(error.httpStatus).toBe(500)
      expect(error.code).toBe('SERVER_ERROR')
      expect(error.details).toEqual({ reason: 'disk full' })
      expect(error.requestId).toBe('req-123')
      expect(error.retryAfter).toBe(30)
      expect(error.name).toBe('UploadError')
    })

    it('should be instanceof Error', () => {
      const error = new UploadError('Test', 400, 'TEST')
      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(UploadError)
    })
  })
})
