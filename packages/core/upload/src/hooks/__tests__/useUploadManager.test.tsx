/**
 * Story 3.1.18: useUploadManager Hook Tests
 * Story 3.1.24: Expiry & Interrupted Uploads Tests
 * Story REPA-003: Migrate Upload Hooks to @repo/upload
 *
 * Tests for upload concurrency, error handling, retry, 401/expiry flows,
 * session expiry detection, auto-refresh, and resume with file handle detection.
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

// Mock upload client
const mockUploadToPresignedUrl = vi.fn()
vi.mock('../../client', () => ({
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

import { UploadError } from '../../client'

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
      const uploadResolvers: Array<(value: unknown) => void> = []
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
        uploadResolvers[0]?.({})
      })

      // Should start 4th upload
      await waitFor(() => {
        expect(mockUploadToPresignedUrl).toHaveBeenCalledTimes(4)
      })
    })

    it('should track upload progress', async () => {
      let progressCallback: ((progress: { percent: number }) => void) | null = null
      mockUploadToPresignedUrl.mockImplementation(({ onProgress }: any) => {
        progressCallback = onProgress
        return new Promise(() => {}) // Never resolves
      })

      const { result } = renderHook(() => useUploadManager())

      const file = createFileWithUrl('file-1', createMockFile('test.pdf'))

      act(() => {
        result.current.addFiles([file])
      })

      act(() => {
        result.current.startUploads()
      })

      await waitFor(() => {
        expect(mockUploadToPresignedUrl).toHaveBeenCalled()
      })

      // Simulate progress
      act(() => {
        progressCallback?.({ percent: 50 })
      })

      await waitFor(() => {
        expect(result.current.state.files[0].progress).toBe(50)
      })
    })
  })

  describe('cancel operations', () => {
    it('should cancel a specific upload', async () => {
      const abortCallback = vi.fn()
      mockUploadToPresignedUrl.mockImplementation(({ signal }: any) => {
        signal.addEventListener('abort', abortCallback)
        return new Promise(() => {}) // Never resolves
      })

      const { result } = renderHook(() => useUploadManager())

      const file = createFileWithUrl('file-1', createMockFile('test.pdf'))

      act(() => {
        result.current.addFiles([file])
      })

      act(() => {
        result.current.startUploads()
      })

      await waitFor(() => {
        expect(mockUploadToPresignedUrl).toHaveBeenCalled()
      })

      act(() => {
        result.current.cancel('file-1')
      })

      expect(abortCallback).toHaveBeenCalled()
    })

    it('should cancel all uploads', async () => {
      const abortCallbacks: Array<() => void> = []
      mockUploadToPresignedUrl.mockImplementation(({ signal }: any) => {
        const callback = vi.fn()
        abortCallbacks.push(callback)
        signal.addEventListener('abort', callback)
        return new Promise(() => {}) // Never resolves
      })

      const { result } = renderHook(() => useUploadManager({ concurrency: 2 }))

      const files = [
        createFileWithUrl('file-1', createMockFile('test1.pdf')),
        createFileWithUrl('file-2', createMockFile('test2.pdf')),
      ]

      act(() => {
        result.current.addFiles(files)
      })

      act(() => {
        result.current.startUploads()
      })

      await waitFor(() => {
        expect(mockUploadToPresignedUrl).toHaveBeenCalledTimes(2)
      })

      act(() => {
        result.current.cancelAll()
      })

      expect(abortCallbacks[0]).toHaveBeenCalled()
      expect(abortCallbacks[1]).toHaveBeenCalled()
    })
  })

  describe('retry operations', () => {
    it('should retry a failed upload', async () => {
      mockUploadToPresignedUrl
        .mockRejectedValueOnce(new UploadError('Network error', 500, 'NETWORK_ERROR'))
        .mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useUploadManager())

      const file = createFileWithUrl('file-1', createMockFile('test.pdf'))

      act(() => {
        result.current.addFiles([file])
      })

      act(() => {
        result.current.startUploads()
      })

      // Wait for failure
      await waitFor(() => {
        expect(result.current.state.files[0].status).toBe('failed')
      })

      // Retry
      act(() => {
        result.current.retry('file-1')
      })

      // Should succeed
      await waitFor(() => {
        expect(result.current.state.files[0].status).toBe('success')
      })
    })
  })

  describe('session expiry handling', () => {
    it('should detect expired session and mark files as expired', async () => {
      const onSessionExpired = vi.fn()
      const { result } = renderHook(() =>
        useUploadManager({ onSessionExpired }),
      )

      const file = createFileWithUrl('file-1', createMockFile('test.pdf'))

      act(() => {
        result.current.addFiles([file])
      })

      // Set session with past expiry
      act(() => {
        result.current.setSession('session-1', Date.now() - 1000)
      })

      // Try to start uploads
      act(() => {
        result.current.startUploads()
      })

      await waitFor(() => {
        expect(result.current.state.files[0].status).toBe('expired')
        expect(onSessionExpired).toHaveBeenCalled()
      })
    })

    it('should handle 401 upload error as expired session', async () => {
      const onSessionExpired = vi.fn()
      mockUploadToPresignedUrl.mockRejectedValueOnce(
        new UploadError('Unauthorized', 401, 'UNAUTHORIZED'),
      )

      const { result } = renderHook(() =>
        useUploadManager({ onSessionExpired }),
      )

      const file = createFileWithUrl('file-1', createMockFile('test.pdf'))

      act(() => {
        result.current.addFiles([file])
      })

      act(() => {
        result.current.startUploads()
      })

      await waitFor(() => {
        expect(result.current.state.files[0].status).toBe('expired')
        expect(onSessionExpired).toHaveBeenCalled()
      })
    })
  })

  describe('clear and remove', () => {
    it('should clear all files', () => {
      const { result } = renderHook(() => useUploadManager())

      const files = [
        createFileWithUrl('file-1', createMockFile('test1.pdf')),
        createFileWithUrl('file-2', createMockFile('test2.pdf')),
      ]

      act(() => {
        result.current.addFiles(files)
      })

      expect(result.current.state.files).toHaveLength(2)

      act(() => {
        result.current.clear()
      })

      expect(result.current.state.files).toHaveLength(0)
    })

    it('should remove a specific file', () => {
      const { result } = renderHook(() => useUploadManager())

      const files = [
        createFileWithUrl('file-1', createMockFile('test1.pdf')),
        createFileWithUrl('file-2', createMockFile('test2.pdf')),
      ]

      act(() => {
        result.current.addFiles(files)
      })

      act(() => {
        result.current.remove('file-1')
      })

      expect(result.current.state.files).toHaveLength(1)
      expect(result.current.state.files[0].id).toBe('file-2')
    })
  })
})
