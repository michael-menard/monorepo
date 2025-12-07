/**
 * Story 3.1.18: useUploadManager Hook Tests
 *
 * Tests for upload concurrency, error handling, retry, and 401/expiry flows.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useUploadManager, type FileWithUploadUrl } from '../useUploadManager'

// Mock dependencies
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock uploadClient
const mockUploadToPresignedUrl = vi.fn()
vi.mock('@/services/api/uploadClient', () => ({
  uploadToPresignedUrl: (options: unknown) => mockUploadToPresignedUrl(options),
  UploadError: class UploadError extends Error {
    httpStatus: number
    code: string
    constructor(message: string, httpStatus: number, code: string) {
      super(message)
      this.name = 'UploadError'
      this.httpStatus = httpStatus
      this.code = code
    }
  },
}))

import { UploadError } from '@/services/api/uploadClient'

describe('useUploadManager', () => {
  const createMockFile = (name: string): File =>
    new File(['test content'], name, { type: 'application/pdf' })

  const createFileWithUrl = (
    id: string,
    file: File,
    category: 'instruction' | 'parts-list' | 'image' | 'thumbnail' = 'instruction',
  ): FileWithUploadUrl => ({
    file,
    category,
    fileId: id,
    uploadUrl: `https://s3.example.com/upload/${id}`,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockUploadToPresignedUrl.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useUploadManager())

      expect(result.current.state.files).toHaveLength(0)
      expect(result.current.isUploading).toBe(false)
      expect(result.current.isComplete).toBe(false)
    })

    it('should accept custom concurrency option', () => {
      const { result } = renderHook(() => useUploadManager({ concurrency: 5 }))

      expect(result.current.state.files).toHaveLength(0)
    })
  })

  describe('addFiles', () => {
    it('should add files to the queue', () => {
      const { result } = renderHook(() => useUploadManager())

      const file = createMockFile('test.pdf')
      const fileWithUrl = createFileWithUrl('file-1', file)

      act(() => {
        result.current.addFiles([fileWithUrl])
      })

      expect(result.current.state.files).toHaveLength(1)
      expect(result.current.state.files[0].id).toBe('file-1')
      expect(result.current.state.files[0].status).toBe('queued')
      expect(result.current.state.queuedCount).toBe(1)
    })

    it('should add multiple files at once', () => {
      const { result } = renderHook(() => useUploadManager())

      const files = [
        createFileWithUrl('file-1', createMockFile('test1.pdf')),
        createFileWithUrl('file-2', createMockFile('test2.pdf')),
        createFileWithUrl('file-3', createMockFile('test3.pdf')),
      ]

      act(() => {
        result.current.addFiles(files)
      })

      expect(result.current.state.files).toHaveLength(3)
      expect(result.current.state.queuedCount).toBe(3)
    })
  })

  describe('startUploads with concurrency', () => {
    it('should start up to concurrency limit uploads', async () => {
      let uploadResolvers: Array<(value: unknown) => void> = []
      mockUploadToPresignedUrl.mockImplementation(
        () =>
          new Promise(resolve => {
            uploadResolvers.push(resolve)
          }),
      )

      const { result } = renderHook(() => useUploadManager({ concurrency: 3 }))

      const files = [
        createFileWithUrl('file-1', createMockFile('test1.pdf')),
        createFileWithUrl('file-2', createMockFile('test2.pdf')),
        createFileWithUrl('file-3', createMockFile('test3.pdf')),
        createFileWithUrl('file-4', createMockFile('test4.pdf')),
        createFileWithUrl('file-5', createMockFile('test5.pdf')),
      ]

      act(() => {
        result.current.addFiles(files)
      })

      act(() => {
        result.current.startUploads()
      })

      // Should start exactly 3 uploads (concurrency limit)
      await waitFor(() => {
        expect(mockUploadToPresignedUrl).toHaveBeenCalledTimes(3)
      })

      // Complete first upload
      act(() => {
        uploadResolvers[0]({ success: true, httpStatus: 200 })
      })

      // Should start 4th upload after first completes
      await waitFor(() => {
        expect(mockUploadToPresignedUrl).toHaveBeenCalledTimes(4)
      })
    })

    it('should track upload progress', async () => {
      let capturedOnProgress: ((loaded: number, total: number) => void) | undefined

      mockUploadToPresignedUrl.mockImplementation(options => {
        capturedOnProgress = options.onProgress
        return new Promise(() => {})
      })

      const { result } = renderHook(() => useUploadManager())

      const file = createMockFile('test.pdf')
      act(() => {
        result.current.addFiles([createFileWithUrl('file-1', file)])
        result.current.startUploads()
      })

      await waitFor(() => {
        expect(capturedOnProgress).toBeDefined()
      })

      // Simulate progress
      act(() => {
        capturedOnProgress?.(500, 1000)
      })

      expect(result.current.state.files[0].progress).toBe(50)
    })
  })

  describe('cancel', () => {
    it('should cancel a specific upload', async () => {
      let abortSignal: AbortSignal | undefined

      mockUploadToPresignedUrl.mockImplementation(options => {
        abortSignal = options.signal
        return new Promise((_, reject) => {
          options.signal?.addEventListener('abort', () => {
            reject(new UploadError('Upload canceled', 0, 'CANCELED'))
          })
        })
      })

      const { result } = renderHook(() => useUploadManager())

      act(() => {
        result.current.addFiles([createFileWithUrl('file-1', createMockFile('test.pdf'))])
        result.current.startUploads()
      })

      await waitFor(() => {
        expect(abortSignal).toBeDefined()
      })

      act(() => {
        result.current.cancel('file-1')
      })

      await waitFor(() => {
        expect(result.current.state.files[0].status).toBe('canceled')
      })
    })

    it('should cancel all uploads', async () => {
      mockUploadToPresignedUrl.mockImplementation(
        options =>
          new Promise((_, reject) => {
            options.signal?.addEventListener('abort', () => {
              reject(new UploadError('Upload canceled', 0, 'CANCELED'))
            })
          }),
      )

      const { result } = renderHook(() => useUploadManager({ concurrency: 3 }))

      const files = [
        createFileWithUrl('file-1', createMockFile('test1.pdf')),
        createFileWithUrl('file-2', createMockFile('test2.pdf')),
        createFileWithUrl('file-3', createMockFile('test3.pdf')),
      ]

      act(() => {
        result.current.addFiles(files)
        result.current.startUploads()
      })

      await waitFor(() => {
        expect(mockUploadToPresignedUrl).toHaveBeenCalledTimes(3)
      })

      act(() => {
        result.current.cancelAll()
      })

      await waitFor(() => {
        expect(result.current.state.files.every(f => f.status === 'canceled')).toBe(true)
      })
    })
  })

  describe('error handling', () => {
    it('should handle upload failure', async () => {
      mockUploadToPresignedUrl.mockRejectedValue(
        new UploadError('Server error', 500, 'SERVER_ERROR'),
      )

      const onError = vi.fn()
      const { result } = renderHook(() => useUploadManager({ onError }))

      act(() => {
        result.current.addFiles([createFileWithUrl('file-1', createMockFile('test.pdf'))])
        result.current.startUploads()
      })

      await waitFor(() => {
        expect(result.current.state.files[0].status).toBe('failed')
        expect(result.current.state.files[0].errorCode).toBe('SERVER_ERROR')
      })

      expect(onError).toHaveBeenCalledWith('file-1', 'SERVER_ERROR')
    })

    it('should handle 401 Unauthorized', async () => {
      mockUploadToPresignedUrl.mockRejectedValue(
        new UploadError('Unauthorized', 401, 'UNAUTHORIZED'),
      )

      const onError = vi.fn()
      const { result } = renderHook(() => useUploadManager({ onError }))

      act(() => {
        result.current.addFiles([createFileWithUrl('file-1', createMockFile('test.pdf'))])
        result.current.startUploads()
      })

      await waitFor(() => {
        expect(result.current.state.files[0].status).toBe('failed')
        expect(result.current.state.files[0].errorCode).toBe('UNAUTHORIZED')
      })
    })

    it('should handle EXPIRED_SESSION and call onSessionExpired', async () => {
      mockUploadToPresignedUrl.mockRejectedValue(
        new UploadError('Session expired', 400, 'EXPIRED_SESSION'),
      )

      const onSessionExpired = vi.fn()
      const { result } = renderHook(() => useUploadManager({ onSessionExpired }))

      act(() => {
        result.current.addFiles([createFileWithUrl('file-1', createMockFile('test.pdf'))])
        result.current.startUploads()
      })

      await waitFor(() => {
        expect(result.current.state.files[0].status).toBe('expired')
        expect(result.current.state.files[0].expired).toBe(true)
      })

      expect(onSessionExpired).toHaveBeenCalled()
    })

    it('should handle network errors', async () => {
      mockUploadToPresignedUrl.mockRejectedValue(
        new UploadError('Network error', 0, 'NETWORK_ERROR'),
      )

      const { result } = renderHook(() => useUploadManager())

      act(() => {
        result.current.addFiles([createFileWithUrl('file-1', createMockFile('test.pdf'))])
        result.current.startUploads()
      })

      await waitFor(() => {
        expect(result.current.state.files[0].status).toBe('failed')
        expect(result.current.state.files[0].errorCode).toBe('NETWORK_ERROR')
      })
    })
  })

  describe('retry', () => {
    it('should retry a failed upload', async () => {
      let callCount = 0
      mockUploadToPresignedUrl.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new UploadError('Server error', 500, 'SERVER_ERROR'))
        }
        return Promise.resolve({ success: true, httpStatus: 200 })
      })

      const { result } = renderHook(() => useUploadManager())

      act(() => {
        result.current.addFiles([createFileWithUrl('file-1', createMockFile('test.pdf'))])
        result.current.startUploads()
      })

      // Wait for first failure
      await waitFor(() => {
        expect(result.current.state.files[0].status).toBe('failed')
      })

      // Retry
      act(() => {
        result.current.retry('file-1')
      })

      // Wait for success
      await waitFor(() => {
        expect(result.current.state.files[0].status).toBe('success')
      })

      expect(mockUploadToPresignedUrl).toHaveBeenCalledTimes(2)
    })

    it('should retry all failed uploads', async () => {
      let callCount = 0
      mockUploadToPresignedUrl.mockImplementation(() => {
        callCount++
        if (callCount <= 2) {
          return Promise.reject(new UploadError('Server error', 500, 'SERVER_ERROR'))
        }
        return Promise.resolve({ success: true, httpStatus: 200 })
      })

      const { result } = renderHook(() => useUploadManager({ concurrency: 2 }))

      act(() => {
        result.current.addFiles([
          createFileWithUrl('file-1', createMockFile('test1.pdf')),
          createFileWithUrl('file-2', createMockFile('test2.pdf')),
        ])
        result.current.startUploads()
      })

      // Wait for failures
      await waitFor(() => {
        expect(result.current.state.files.every(f => f.status === 'failed')).toBe(true)
      })

      // Retry all
      act(() => {
        result.current.retryAll()
      })

      // Wait for success
      await waitFor(() => {
        expect(result.current.state.files.every(f => f.status === 'success')).toBe(true)
      })
    })

    it('should retry expired uploads', async () => {
      let callCount = 0
      mockUploadToPresignedUrl.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new UploadError('Session expired', 400, 'EXPIRED_SESSION'))
        }
        return Promise.resolve({ success: true, httpStatus: 200 })
      })

      const { result } = renderHook(() => useUploadManager())

      act(() => {
        result.current.addFiles([createFileWithUrl('file-1', createMockFile('test.pdf'))])
        result.current.startUploads()
      })

      // Wait for expiry
      await waitFor(() => {
        expect(result.current.state.files[0].status).toBe('expired')
      })

      // Retry (after refreshing session - simulated by successful second call)
      act(() => {
        result.current.retry('file-1')
      })

      await waitFor(() => {
        expect(result.current.state.files[0].status).toBe('success')
        expect(result.current.state.files[0].expired).toBe(false)
      })
    })
  })

  describe('clear and remove', () => {
    it('should clear all files', async () => {
      mockUploadToPresignedUrl.mockResolvedValue({ success: true, httpStatus: 200 })

      const { result } = renderHook(() => useUploadManager())

      act(() => {
        result.current.addFiles([
          createFileWithUrl('file-1', createMockFile('test1.pdf')),
          createFileWithUrl('file-2', createMockFile('test2.pdf')),
        ])
      })

      expect(result.current.state.files).toHaveLength(2)

      act(() => {
        result.current.clear()
      })

      expect(result.current.state.files).toHaveLength(0)
    })

    it('should remove a specific file', () => {
      const { result } = renderHook(() => useUploadManager())

      act(() => {
        result.current.addFiles([
          createFileWithUrl('file-1', createMockFile('test1.pdf')),
          createFileWithUrl('file-2', createMockFile('test2.pdf')),
        ])
      })

      act(() => {
        result.current.remove('file-1')
      })

      expect(result.current.state.files).toHaveLength(1)
      expect(result.current.state.files[0].id).toBe('file-2')
    })
  })

  describe('getFile', () => {
    it('should return file by ID', () => {
      const { result } = renderHook(() => useUploadManager())

      act(() => {
        result.current.addFiles([createFileWithUrl('file-1', createMockFile('test.pdf'))])
      })

      const file = result.current.getFile('file-1')
      expect(file).toBeDefined()
      expect(file?.id).toBe('file-1')
    })

    it('should return undefined for non-existent file', () => {
      const { result } = renderHook(() => useUploadManager())

      const file = result.current.getFile('non-existent')
      expect(file).toBeUndefined()
    })
  })

  describe('completion', () => {
    it('should call onComplete when all uploads finish', async () => {
      mockUploadToPresignedUrl.mockResolvedValue({ success: true, httpStatus: 200 })

      const onComplete = vi.fn()
      const { result } = renderHook(() => useUploadManager({ onComplete }))

      act(() => {
        result.current.addFiles([
          createFileWithUrl('file-1', createMockFile('test.pdf'), 'instruction'),
        ])
        result.current.startUploads()
      })

      await waitFor(() => {
        expect(result.current.state.files[0].status).toBe('success')
      })

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled()
      })
    })

    it('should report isComplete when instruction file succeeds', async () => {
      mockUploadToPresignedUrl.mockResolvedValue({ success: true, httpStatus: 200 })

      const { result } = renderHook(() => useUploadManager())

      act(() => {
        result.current.addFiles([
          createFileWithUrl('file-1', createMockFile('instructions.pdf'), 'instruction'),
          createFileWithUrl('file-2', createMockFile('image.jpg'), 'image'),
        ])
        result.current.startUploads()
      })

      await waitFor(() => {
        expect(result.current.state.files.every(f => f.status === 'success')).toBe(true)
      })

      expect(result.current.isComplete).toBe(true)
    })
  })
})
