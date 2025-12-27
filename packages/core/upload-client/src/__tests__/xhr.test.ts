/**
 * XHR Upload Functions Tests
 *
 * Tests for uploadFile and uploadToPresignedUrl functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { uploadFile, uploadToPresignedUrl } from '../xhr'
import { UploadError } from '../types'

// Mock XMLHttpRequest
const createMockXHR = () => {
  const mockXHR = {
    open: vi.fn(),
    send: vi.fn(),
    abort: vi.fn(),
    setRequestHeader: vi.fn(),
    getResponseHeader: vi.fn(),
    upload: {
      onprogress: null as ((event: ProgressEvent) => void) | null,
    },
    onload: null as (() => void) | null,
    onerror: null as (() => void) | null,
    ontimeout: null as (() => void) | null,
    status: 200,
    responseText: '',
    withCredentials: false,
  }
  return mockXHR
}

let mockXHR: ReturnType<typeof createMockXHR>

beforeEach(() => {
  mockXHR = createMockXHR()
  vi.stubGlobal('XMLHttpRequest', vi.fn(() => mockXHR))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('uploadFile', () => {
  const createTestFile = () => new File(['test content'], 'test.pdf', { type: 'application/pdf' })

  it('should upload file successfully', async () => {
    const file = createTestFile()
    const url = 'https://api.example.com/upload'

    const uploadPromise = uploadFile({ url, file })

    // Simulate successful upload
    mockXHR.status = 200
    mockXHR.responseText = JSON.stringify({ id: '123' })
    mockXHR.onload?.()

    const result = await uploadPromise

    expect(result.success).toBe(true)
    expect(result.httpStatus).toBe(200)
    expect(result.data).toEqual({ id: '123' })
    expect(mockXHR.open).toHaveBeenCalledWith('PUT', url, true)
    expect(mockXHR.withCredentials).toBe(true)
  })

  it('should call onProgress callback', async () => {
    const file = createTestFile()
    const onProgress = vi.fn()

    const uploadPromise = uploadFile({
      url: 'https://api.example.com/upload',
      file,
      onProgress,
    })

    // Simulate progress event
    mockXHR.upload.onprogress?.({
      lengthComputable: true,
      loaded: 50,
      total: 100,
    } as ProgressEvent)

    mockXHR.status = 200
    mockXHR.onload?.()

    await uploadPromise

    expect(onProgress).toHaveBeenCalledWith({
      loaded: 50,
      total: 100,
      percent: 50,
    })
  })

  it('should set custom content type', async () => {
    const file = createTestFile()

    const uploadPromise = uploadFile({
      url: 'https://api.example.com/upload',
      file,
      contentType: 'application/octet-stream',
    })

    mockXHR.status = 200
    mockXHR.onload?.()

    await uploadPromise

    expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream')
  })

  it('should set CSRF token header', async () => {
    const file = createTestFile()

    const uploadPromise = uploadFile({
      url: 'https://api.example.com/upload',
      file,
      csrfToken: 'my-csrf-token',
    })

    mockXHR.status = 200
    mockXHR.onload?.()

    await uploadPromise

    expect(mockXHR.setRequestHeader).toHaveBeenCalledWith('X-CSRF-Token', 'my-csrf-token')
  })

  it('should handle network error', async () => {
    const file = createTestFile()

    const uploadPromise = uploadFile({
      url: 'https://api.example.com/upload',
      file,
    })

    mockXHR.onerror?.()

    await expect(uploadPromise).rejects.toThrow(UploadError)
    await expect(uploadPromise).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      httpStatus: 0,
    })
  })

  it('should handle timeout', async () => {
    const file = createTestFile()

    const uploadPromise = uploadFile({
      url: 'https://api.example.com/upload',
      file,
    })

    mockXHR.ontimeout?.()

    await expect(uploadPromise).rejects.toThrow(UploadError)
    await expect(uploadPromise).rejects.toMatchObject({
      code: 'TIMEOUT',
      httpStatus: 408,
    })
  })

  it('should handle abort via signal', async () => {
    const file = createTestFile()
    const abortController = new AbortController()

    const uploadPromise = uploadFile({
      url: 'https://api.example.com/upload',
      file,
      signal: abortController.signal,
    })

    abortController.abort()

    await expect(uploadPromise).rejects.toThrow(UploadError)
    await expect(uploadPromise).rejects.toMatchObject({
      code: 'CANCELED',
    })
  })

  it('should reject immediately if signal already aborted', async () => {
    const file = createTestFile()
    const abortController = new AbortController()
    abortController.abort()

    const uploadPromise = uploadFile({
      url: 'https://api.example.com/upload',
      file,
      signal: abortController.signal,
    })

    await expect(uploadPromise).rejects.toThrow(UploadError)
    await expect(uploadPromise).rejects.toMatchObject({
      code: 'CANCELED',
    })
  })

  it('should handle 401 unauthorized error', async () => {
    const file = createTestFile()

    const uploadPromise = uploadFile({
      url: 'https://api.example.com/upload',
      file,
    })

    mockXHR.status = 401
    mockXHR.responseText = ''
    mockXHR.onload?.()

    await expect(uploadPromise).rejects.toThrow(UploadError)
    await expect(uploadPromise).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      httpStatus: 401,
    })
  })

  it('should handle 413 payload too large error', async () => {
    const file = createTestFile()

    const uploadPromise = uploadFile({
      url: 'https://api.example.com/upload',
      file,
    })

    mockXHR.status = 413
    mockXHR.responseText = ''
    mockXHR.onload?.()

    await expect(uploadPromise).rejects.toThrow(UploadError)
    await expect(uploadPromise).rejects.toMatchObject({
      code: 'PAYLOAD_TOO_LARGE',
      httpStatus: 413,
    })
  })

  it('should parse API error response', async () => {
    const file = createTestFile()

    const uploadPromise = uploadFile({
      url: 'https://api.example.com/upload',
      file,
    })

    mockXHR.status = 400
    mockXHR.responseText = JSON.stringify({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'File size exceeds limit',
        details: { maxSize: 10000000 },
      },
    })
    mockXHR.onload?.()

    await expect(uploadPromise).rejects.toThrow(UploadError)
    await expect(uploadPromise).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'File size exceeds limit',
    })
  })
})

describe('uploadToPresignedUrl', () => {
  const createTestFile = () => new File(['test content'], 'test.pdf', { type: 'application/pdf' })

  it('should upload to presigned URL successfully', async () => {
    const file = createTestFile()
    const url = 'https://s3.amazonaws.com/bucket/key?signature=...'

    const uploadPromise = uploadToPresignedUrl({ url, file })

    mockXHR.status = 200
    mockXHR.getResponseHeader.mockReturnValue('"abc123"')
    mockXHR.onload?.()

    const result = await uploadPromise

    expect(result.success).toBe(true)
    expect(result.httpStatus).toBe(200)
    expect(result.etag).toBe('"abc123"')
    expect(mockXHR.withCredentials).toBe(false) // No credentials for S3
  })

  it('should call onProgress callback', async () => {
    const file = createTestFile()
    const onProgress = vi.fn()

    const uploadPromise = uploadToPresignedUrl({
      url: 'https://s3.amazonaws.com/bucket/key',
      file,
      onProgress,
    })

    // Simulate progress events
    mockXHR.upload.onprogress?.({
      lengthComputable: true,
      loaded: 25,
      total: 100,
    } as ProgressEvent)

    mockXHR.upload.onprogress?.({
      lengthComputable: true,
      loaded: 100,
      total: 100,
    } as ProgressEvent)

    mockXHR.status = 200
    mockXHR.onload?.()

    await uploadPromise

    expect(onProgress).toHaveBeenCalledTimes(2)
    expect(onProgress).toHaveBeenNthCalledWith(1, {
      loaded: 25,
      total: 100,
      percent: 25,
    })
    expect(onProgress).toHaveBeenNthCalledWith(2, {
      loaded: 100,
      total: 100,
      percent: 100,
    })
  })

  it('should handle S3 error', async () => {
    const file = createTestFile()

    const uploadPromise = uploadToPresignedUrl({
      url: 'https://s3.amazonaws.com/bucket/key',
      file,
    })

    mockXHR.status = 403
    mockXHR.onload?.()

    await expect(uploadPromise).rejects.toThrow(UploadError)
    await expect(uploadPromise).rejects.toMatchObject({
      code: 'S3_ERROR',
      httpStatus: 403,
    })
  })

  it('should handle network error', async () => {
    const file = createTestFile()

    const uploadPromise = uploadToPresignedUrl({
      url: 'https://s3.amazonaws.com/bucket/key',
      file,
    })

    mockXHR.onerror?.()

    await expect(uploadPromise).rejects.toThrow(UploadError)
    await expect(uploadPromise).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    })
  })

  it('should handle abort via signal', async () => {
    const file = createTestFile()
    const abortController = new AbortController()

    const uploadPromise = uploadToPresignedUrl({
      url: 'https://s3.amazonaws.com/bucket/key',
      file,
      signal: abortController.signal,
    })

    abortController.abort()

    await expect(uploadPromise).rejects.toThrow(UploadError)
    await expect(uploadPromise).rejects.toMatchObject({
      code: 'CANCELED',
    })
    expect(mockXHR.abort).toHaveBeenCalled()
  })
})
