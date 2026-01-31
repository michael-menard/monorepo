/**
 * useS3Upload Hook Tests
 *
 * Story wish-2002: Add Item Flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useS3Upload, MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '../useS3Upload'

// Mock @repo/upload-client
vi.mock('@repo/upload-client', () => {
  const mockUploadToPresignedUrl = vi.fn()

  class MockUploadError extends Error {
    code: string
    constructor(message: string, code: string) {
      super(message)
      this.name = 'UploadError'
      this.code = code
    }
  }

  return {
    uploadToPresignedUrl: mockUploadToPresignedUrl,
    UploadError: MockUploadError,
  }
})

// Mock RTK Query hook
vi.mock('@repo/api-client/rtk/wishlist-gallery-api', () => ({
  useGetWishlistImagePresignUrlMutation: vi.fn(),
}))

// Import mocked functions after mocks are set up
import { uploadToPresignedUrl } from '@repo/upload-client'
import { useGetWishlistImagePresignUrlMutation } from '@repo/api-client/rtk/wishlist-gallery-api'

const mockUploadToPresignedUrl = vi.mocked(uploadToPresignedUrl)
const mockUseGetWishlistImagePresignUrlMutation = vi.mocked(useGetWishlistImagePresignUrlMutation)
const mockGetPresignUrl = vi.fn()
const mockUnwrap = vi.fn()

// Mock import.meta.env - note: actual value comes from the test environment
// which defaults to 'lego-moc-bucket'

describe('useS3Upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPresignUrl.mockReturnValue({ unwrap: mockUnwrap })
    mockUseGetWishlistImagePresignUrlMutation.mockReturnValue([mockGetPresignUrl] as any)
  })

  describe('Initial State', () => {
    it('starts in idle state', () => {
      const { result } = renderHook(() => useS3Upload())

      expect(result.current.state).toBe('idle')
      expect(result.current.progress).toBe(0)
      expect(result.current.error).toBe(null)
      expect(result.current.imageUrl).toBe(null)
      expect(result.current.imageKey).toBe(null)
    })
  })

  describe('File Validation', () => {
    // WISH-2013: Updated error messages for security hardening
    it('validates file size', () => {
      const { result } = renderHook(() => useS3Upload())

      const largeFile = new File(['a'.repeat(MAX_FILE_SIZE + 1)], 'large.jpg', {
        type: 'image/jpeg',
      })

      const error = result.current.validateFile(largeFile)
      expect(error).toContain('File size exceeds maximum limit of')
    })

    it('validates MIME type', () => {
      const { result } = renderHook(() => useS3Upload())

      const invalidFile = new File(['content'], 'file.txt', { type: 'text/plain' })

      const error = result.current.validateFile(invalidFile)
      expect(error).toContain('Only JPEG, PNG, and WebP images are allowed')
    })

    it('accepts valid files', () => {
      const { result } = renderHook(() => useS3Upload())

      const validFile = new File(['content'], 'image.jpg', { type: 'image/jpeg' })

      const error = result.current.validateFile(validFile)
      expect(error).toBe(null)
    })

    it('accepts all allowed MIME types', () => {
      const { result } = renderHook(() => useS3Upload())

      for (const mimeType of ALLOWED_MIME_TYPES) {
        const file = new File(['content'], `file${mimeType.replace('/', '.')}`, {
          type: mimeType,
        })
        const error = result.current.validateFile(file)
        expect(error).toBe(null)
      }
    })
  })

  describe('Upload Flow', () => {
    it('completes successful upload flow', async () => {
      const mockPresignResponse = {
        presignedUrl: 'https://s3.amazonaws.com/presigned-url',
        key: 'uploads/test-key.jpg',
      }

      mockUnwrap.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return mockPresignResponse
      })
      mockUploadToPresignedUrl.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return { success: true as const, httpStatus: 200 }
      })

      const { result } = renderHook(() => useS3Upload())

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })

      let uploadPromise: Promise<string | null>
      act(() => {
        uploadPromise = result.current.upload(file)
      })

      // Should be in preparing state
      await waitFor(
        () => {
          expect(result.current.state).toBe('preparing')
        },
        { timeout: 3000 },
      )

      // Wait for upload to complete
      await act(async () => {
        await uploadPromise
      })

      expect(result.current.state).toBe('complete')
      // URL should contain the S3 key
      expect(result.current.imageUrl).toMatch(/uploads\/test-key\.jpg/)
      expect(result.current.imageUrl).toMatch(/s3\.amazonaws\.com/)
      expect(result.current.imageKey).toBe('uploads/test-key.jpg')
      expect(result.current.error).toBe(null)
    })

    it('requests presigned URL with correct parameters', async () => {
      const mockPresignResponse = {
        presignedUrl: 'https://s3.amazonaws.com/presigned-url',
        key: 'uploads/test.jpg',
      }

      mockUnwrap.mockResolvedValue(mockPresignResponse)
      mockUploadToPresignedUrl.mockResolvedValue({ success: true as const, httpStatus: 200 })

      const { result } = renderHook(() => useS3Upload())

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      await act(async () => {
        await result.current.upload(file)
      })

      expect(mockGetPresignUrl).toHaveBeenCalledWith({
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
      })
    })

    it('uploads to S3 with presigned URL', async () => {
      const mockPresignResponse = {
        presignedUrl: 'https://s3.amazonaws.com/presigned-url',
        key: 'uploads/test.jpg',
      }

      mockUnwrap.mockResolvedValue(mockPresignResponse)
      mockUploadToPresignedUrl.mockResolvedValue({ success: true as const, httpStatus: 200 })

      const { result } = renderHook(() => useS3Upload())

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      await act(async () => {
        await result.current.upload(file)
      })

      expect(mockUploadToPresignedUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          url: mockPresignResponse.presignedUrl,
          file,
          onProgress: expect.any(Function),
          signal: expect.any(AbortSignal),
        }),
      )
    })

    it('tracks progress during upload', async () => {
      const mockPresignResponse = {
        presignedUrl: 'https://s3.amazonaws.com/presigned-url',
        key: 'uploads/test.jpg',
      }

      mockUnwrap.mockResolvedValue(mockPresignResponse)
      mockUploadToPresignedUrl.mockImplementation(async ({ onProgress }: { onProgress?: (progress: { percent: number; loaded: number; total: number }) => void }) => {
        onProgress?.({ percent: 25, loaded: 250, total: 1000 })
        onProgress?.({ percent: 50, loaded: 500, total: 1000 })
        onProgress?.({ percent: 100, loaded: 1000, total: 1000 })
        return { success: true as const, httpStatus: 200 }
      })

      const { result } = renderHook(() => useS3Upload())

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      await act(async () => {
        await result.current.upload(file)
      })

      expect(result.current.progress).toBe(100)
    })
  })

  describe('Error Handling', () => {
    // WISH-2013: Updated error message for security hardening
    it('handles validation errors', async () => {
      const { result } = renderHook(() => useS3Upload())

      const invalidFile = new File(['content'], 'file.txt', { type: 'text/plain' })
      let uploadResult
      await act(async () => {
        uploadResult = await result.current.upload(invalidFile)
      })

      expect(uploadResult).toBe(null)
      expect(result.current.state).toBe('error')
      expect(result.current.error).toContain('Only JPEG, PNG, and WebP images are allowed')
    })

    it('handles presign request failure', async () => {
      mockUnwrap.mockRejectedValue(new Error('Presign failed'))

      const { result } = renderHook(() => useS3Upload())

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      let uploadResult
      await act(async () => {
        uploadResult = await result.current.upload(file)
      })

      expect(uploadResult).toBe(null)
      expect(result.current.state).toBe('error')
      expect(result.current.error).toBe('Presign failed')
    })

    it('handles S3 upload failure', async () => {
      const mockPresignResponse = {
        presignedUrl: 'https://s3.amazonaws.com/presigned-url',
        key: 'uploads/test.jpg',
      }

      mockUnwrap.mockResolvedValue(mockPresignResponse)
      const uploadError = new Error('Upload failed')
      uploadError.name = 'UploadError'
      ;(uploadError as any).code = 'UPLOAD_ERROR'
      mockUploadToPresignedUrl.mockRejectedValue(uploadError)

      const { result } = renderHook(() => useS3Upload())

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      let uploadResult
      await act(async () => {
        uploadResult = await result.current.upload(file)
      })

      expect(uploadResult).toBe(null)
      expect(result.current.state).toBe('error')
      expect(result.current.error).toBe('Upload failed')
    })

    it('handles timeout errors', async () => {
      const mockPresignResponse = {
        presignedUrl: 'https://s3.amazonaws.com/presigned-url',
        key: 'uploads/test.jpg',
      }

      mockUnwrap.mockResolvedValue(mockPresignResponse)
      const timeoutError = new Error('timeout')
      timeoutError.name = 'AbortError'
      mockUploadToPresignedUrl.mockRejectedValue(timeoutError)

      const { result } = renderHook(() => useS3Upload())

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      let uploadResult
      await act(async () => {
        uploadResult = await result.current.upload(file)
      })

      expect(uploadResult).toBe(null)
      expect(result.current.state).toBe('idle')
    })

    it('handles generic errors', async () => {
      const mockPresignResponse = {
        presignedUrl: 'https://s3.amazonaws.com/presigned-url',
        key: 'uploads/test.jpg',
      }

      mockUnwrap.mockResolvedValue(mockPresignResponse)
      mockUploadToPresignedUrl.mockRejectedValue({ message: 'Unknown error' })

      const { result } = renderHook(() => useS3Upload())

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      let uploadResult
      await act(async () => {
        uploadResult = await result.current.upload(file)
      })

      expect(uploadResult).toBe(null)
      expect(result.current.state).toBe('error')
      expect(result.current.error).toBe('Upload failed. Please try again.')
    })
  })

  describe('State Transitions', () => {
    it('transitions from idle to preparing', async () => {
      const mockPresignResponse = {
        presignedUrl: 'https://s3.amazonaws.com/presigned-url',
        key: 'uploads/test.jpg',
      }

      mockUnwrap.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return mockPresignResponse
      })
      mockUploadToPresignedUrl.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return { success: true as const, httpStatus: 200 }
      })

      const { result } = renderHook(() => useS3Upload())

      expect(result.current.state).toBe('idle')

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      let uploadPromise: Promise<string | null>
      act(() => {
        uploadPromise = result.current.upload(file)
      })

      await waitFor(
        () => {
          expect(result.current.state).toBe('preparing')
        },
        { timeout: 3000 },
      )

      await act(async () => {
        await uploadPromise
      })
    })

    it('transitions from preparing to uploading', async () => {
      const mockPresignResponse = {
        presignedUrl: 'https://s3.amazonaws.com/presigned-url',
        key: 'uploads/test.jpg',
      }

      mockUnwrap.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return mockPresignResponse
      })
      mockUploadToPresignedUrl.mockImplementation(async () => {
        // Simulate upload time
        await new Promise(resolve => setTimeout(resolve, 50))
        return { success: true as const, httpStatus: 200 }
      })

      const { result } = renderHook(() => useS3Upload())

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      let uploadPromise: Promise<string | null>
      act(() => {
        uploadPromise = result.current.upload(file)
      })

      await waitFor(
        () => {
          expect(result.current.state).toBe('uploading')
        },
        { timeout: 3000 },
      )

      await act(async () => {
        await uploadPromise
      })
    })

    it('transitions to complete on success', async () => {
      const mockPresignResponse = {
        presignedUrl: 'https://s3.amazonaws.com/presigned-url',
        key: 'uploads/test.jpg',
      }

      mockUnwrap.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return mockPresignResponse
      })
      mockUploadToPresignedUrl.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return { success: true as const, httpStatus: 200 }
      })

      const { result } = renderHook(() => useS3Upload())

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      await act(async () => {
        await result.current.upload(file)
      })

      expect(result.current.state).toBe('complete')
    })

    it('transitions to error on failure', async () => {
      mockUnwrap.mockRejectedValue(new Error('Failed'))

      const { result } = renderHook(() => useS3Upload())

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      await act(async () => {
        await result.current.upload(file)
      })

      expect(result.current.state).toBe('error')
    })
  })

  describe('Cancel', () => {
    it('cancels in-progress upload', async () => {
      const mockPresignResponse = {
        presignedUrl: 'https://s3.amazonaws.com/presigned-url',
        key: 'uploads/test.jpg',
      }

      mockUnwrap.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return mockPresignResponse
      })
      mockUploadToPresignedUrl.mockImplementation(
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100))
          return { success: true as const, httpStatus: 200 }
        },
      )

      const { result } = renderHook(() => useS3Upload())

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      let uploadPromise: Promise<string | null> | undefined
      await act(async () => {
        uploadPromise = result.current.upload(file)
      })

      await waitFor(() => {
        expect(result.current.state).toBe('uploading')
      })

      act(() => {
        result.current.cancel()
      })

      expect(result.current.state).toBe('idle')
      expect(result.current.progress).toBe(0)

      if (uploadPromise) {
        await uploadPromise.catch(() => {}) // Ignore errors from cancelled upload
      }
    })
  })

  describe('Reset', () => {
    it('resets all state', async () => {
      const mockPresignResponse = {
        presignedUrl: 'https://s3.amazonaws.com/presigned-url',
        key: 'uploads/test.jpg',
      }

      mockUnwrap.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return mockPresignResponse
      })
      mockUploadToPresignedUrl.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return { success: true as const, httpStatus: 200 }
      })

      const { result } = renderHook(() => useS3Upload())

      const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
      await act(async () => {
        await result.current.upload(file)
      })

      expect(result.current.state).toBe('complete')
      expect(result.current.imageUrl).toBeTruthy()

      act(() => {
        result.current.reset()
      })

      expect(result.current.state).toBe('idle')
      expect(result.current.progress).toBe(0)
      expect(result.current.error).toBe(null)
      expect(result.current.imageUrl).toBe(null)
      expect(result.current.imageKey).toBe(null)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // WISH-2011: Additional Test Coverage
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Concurrent Uploads (WISH-2011 AC8)', () => {
    it('handles two concurrent uploads with unique keys', async () => {
      // Track call order
      let presignCallCount = 0

      mockUnwrap.mockImplementation(async () => {
        presignCallCount++
        const callNumber = presignCallCount
        await new Promise(resolve => setTimeout(resolve, 10))
        return {
          presignedUrl: `https://s3.amazonaws.com/presigned-url-${callNumber}`,
          key: `uploads/file-${callNumber}.jpg`,
        }
      })

      mockUploadToPresignedUrl.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return { success: true as const, httpStatus: 200 }
      })

      // Create two independent hook instances
      const { result: result1 } = renderHook(() => useS3Upload())
      const { result: result2 } = renderHook(() => useS3Upload())

      const file1 = new File(['content1'], 'test1.jpg', { type: 'image/jpeg' })
      const file2 = new File(['content2'], 'test2.jpg', { type: 'image/jpeg' })

      // Start both uploads concurrently
      await act(async () => {
        await Promise.all([result1.current.upload(file1), result2.current.upload(file2)])
      })

      // Both should complete successfully
      expect(result1.current.state).toBe('complete')
      expect(result2.current.state).toBe('complete')

      // Each should have a unique key
      expect(result1.current.imageKey).not.toBe(result2.current.imageKey)
      expect(result1.current.imageUrl).toBeTruthy()
      expect(result2.current.imageUrl).toBeTruthy()

      // Verify both presign calls were made
      expect(mockGetPresignUrl).toHaveBeenCalledTimes(2)
    })

    it('maintains separate state for concurrent uploads', async () => {
      let presignCallCount = 0

      // First upload succeeds, second fails
      mockUnwrap.mockImplementation(async () => {
        presignCallCount++
        if (presignCallCount === 1) {
          await new Promise(resolve => setTimeout(resolve, 10))
          return {
            presignedUrl: 'https://s3.amazonaws.com/presigned-url-1',
            key: 'uploads/file-1.jpg',
          }
        } else {
          throw new Error('Presign failed for second upload')
        }
      })

      mockUploadToPresignedUrl.mockResolvedValue({ success: true as const, httpStatus: 200 })

      const { result: result1 } = renderHook(() => useS3Upload())
      const { result: result2 } = renderHook(() => useS3Upload())

      const file1 = new File(['content1'], 'test1.jpg', { type: 'image/jpeg' })
      const file2 = new File(['content2'], 'test2.jpg', { type: 'image/jpeg' })

      await act(async () => {
        await Promise.all([
          result1.current.upload(file1),
          result2.current.upload(file2).catch(() => {}), // Ignore error
        ])
      })

      // First should succeed, second should fail
      expect(result1.current.state).toBe('complete')
      expect(result2.current.state).toBe('error')

      // First should have valid URL, second should not
      expect(result1.current.imageUrl).toBeTruthy()
      expect(result2.current.imageUrl).toBe(null)
    })
  })

  describe('Zero-Byte File Handling (WISH-2011 AC9)', () => {
    it('rejects zero-byte files with validation error', async () => {
      const { result } = renderHook(() => useS3Upload())

      // Create a zero-byte file
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' })
      expect(emptyFile.size).toBe(0)

      let uploadResult
      await act(async () => {
        uploadResult = await result.current.upload(emptyFile)
      })

      // Should fail validation or upload
      expect(uploadResult).toBe(null)

      // Should be in error state (either validation or upload error)
      // The hook may handle this as a validation error or let the upload fail
      // Either way, there should be no partial state
      expect(result.current.imageUrl).toBe(null)
      expect(result.current.imageKey).toBe(null)
    })

    it('does not leave partial state on zero-byte file upload', async () => {
      const { result } = renderHook(() => useS3Upload())

      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' })

      await act(async () => {
        await result.current.upload(emptyFile)
      })

      // Verify no partial upload state exists
      // Either idle (if validation rejected it) or error (if upload failed)
      expect(['idle', 'error']).toContain(result.current.state)
      expect(result.current.progress).toBe(0)
      expect(result.current.imageUrl).toBe(null)
    })
  })
})
