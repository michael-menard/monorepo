import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useImageProcessing } from '../hooks/useImageProcessing.js'
import {
  generateFileId,
  createFilePreviewUrl,
  getImageDimensions,
  compressImage,
} from '../utils/file-utils.js'
import { fileFixtures, imageProcessingFixtures } from './fixtures.js'
import { mockImageProcessing } from './mocks.js'

describe('image processing integration', () => {
  let mockImageAPI: any
  let originalURL: any
  let originalImage: any
  let originalDocument: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Store originals
    originalURL = global.URL
    originalImage = global.Image
    originalDocument = global.document

    // Set up mocks
    mockImageAPI = mockImageProcessing()

    global.URL = {
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    } as any
  })

  afterEach(() => {
    // Restore originals
    global.URL = originalURL
    global.Image = originalImage
    global.document = originalDocument
  })

  describe('file preview integration', () => {
    it('should create preview URLs for image files', () => {
      const previewUrl = createFilePreviewUrl(fileFixtures.jpegImage)

      expect(previewUrl).toBe('blob:mock-url')
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(fileFixtures.jpegImage)
    })

    it('should create different preview URLs for different files', () => {
      let counter = 0
      global.URL.createObjectURL = vi.fn(() => `blob:mock-url-${++counter}`)

      const preview1 = createFilePreviewUrl(fileFixtures.jpegImage)
      const preview2 = createFilePreviewUrl(fileFixtures.pngImage)

      expect(preview1).toBe('blob:mock-url-1')
      expect(preview2).toBe('blob:mock-url-2')
    })

    it('should handle preview creation errors gracefully', () => {
      global.URL.createObjectURL = vi.fn(() => {
        throw new Error('Failed to create object URL')
      })

      expect(() => {
        createFilePreviewUrl(fileFixtures.jpegImage)
      }).toThrow('Failed to create object URL')
    })
  })

  describe('image dimensions integration', () => {
    it('should get dimensions from valid image files', async () => {
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
        naturalWidth: 1920,
        naturalHeight: 1080,
      }

      global.Image = vi.fn(() => mockImage) as any

      const dimensionsPromise = getImageDimensions(fileFixtures.jpegImage)

      // Simulate image load
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload()
        }
      }, 10)

      const dimensions = await dimensionsPromise

      expect(dimensions).toEqual({
        width: 1920,
        height: 1080,
      })
    })

    it('should reject non-image files', async () => {
      await expect(getImageDimensions(fileFixtures.pdfDocument)).rejects.toThrow(
        'File is not an image',
      )
    })

    it('should handle image load errors', async () => {
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
      }

      global.Image = vi.fn(() => mockImage) as any

      const dimensionsPromise = getImageDimensions(fileFixtures.jpegImage)

      // Simulate image error
      setTimeout(() => {
        if (mockImage.onerror) {
          mockImage.onerror(new Error('Failed to load image'))
        }
      }, 10)

      await expect(dimensionsPromise).rejects.toThrow('Failed to load image')
    })
  })

  describe('image compression integration', () => {
    it('should compress images with default settings', async () => {
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          drawImage: vi.fn(),
        })),
        toBlob: vi.fn(callback => {
          callback(new Blob(['compressed'], { type: 'image/jpeg' }))
        }),
      }

      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
        naturalWidth: 1920,
        naturalHeight: 1080,
      }

      global.document = {
        createElement: vi.fn(() => mockCanvas),
      } as any
      global.Image = vi.fn(() => mockImage) as any

      const compressPromise = compressImage(fileFixtures.jpegImage)

      // Simulate image load
      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload()
        }
      }, 10)

      const result = await compressPromise

      expect(result).toBeInstanceOf(Blob)
      expect(result.type).toBe('image/jpeg')
      expect(mockCanvas.toBlob).toHaveBeenCalled()
    })

    it('should handle compression with custom quality', async () => {
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ({
          drawImage: vi.fn(),
        })),
        toBlob: vi.fn((callback, type, quality) => {
          callback(new Blob(['compressed'], { type }))
        }),
      }

      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
        naturalWidth: 1920,
        naturalHeight: 1080,
      }

      global.document = {
        createElement: vi.fn(() => mockCanvas),
      } as any
      global.Image = vi.fn(() => mockImage) as any

      const compressPromise = compressImage(fileFixtures.jpegImage, {
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 600,
      })

      setTimeout(() => {
        if (mockImage.onload) {
          mockImage.onload()
        }
      }, 10)

      await compressPromise

      expect(mockCanvas.toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.8)
    })

    it('should handle compression errors', async () => {
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
      }

      global.Image = vi.fn(() => mockImage) as any

      const compressPromise = compressImage(fileFixtures.jpegImage)

      // Simulate image error
      setTimeout(() => {
        if (mockImage.onerror) {
          mockImage.onerror(new Error('Failed to load image'))
        }
      }, 10)

      await expect(compressPromise).rejects.toThrow('Failed to load image')
    })
  })

  describe('useImageProcessing hook integration', () => {
    it('should initialize hook correctly', () => {
      const onProcessingComplete = vi.fn()
      const { result } = renderHook(() => useImageProcessing({ onProcessingComplete }))

      expect(result.current.isProcessing).toBe(false)
      expect(result.current.error).toBeNull()
      expect(typeof result.current.processImage).toBe('function')
    })

    it('should handle processing start correctly', () => {
      const { result } = renderHook(() => useImageProcessing())

      act(() => {
        result.current.processImage(fileFixtures.jpegImage, imageProcessingFixtures.resize)
      })

      expect(result.current.isProcessing).toBe(true)
    })

    it('should provide processing function', () => {
      const { result } = renderHook(() => useImageProcessing())

      expect(typeof result.current.processImage).toBe('function')
      expect(result.current.isProcessing).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('end-to-end image processing workflow', () => {
    it('should handle complete image upload workflow', async () => {
      // 1. Create file ID
      const fileId = generateFileId()
      expect(fileId).toBeDefined()
      expect(typeof fileId).toBe('string')

      // 2. Create preview URL
      const previewUrl = createFilePreviewUrl(fileFixtures.jpegImage)
      expect(previewUrl).toBe('blob:mock-url')

      // 3. Get image dimensions
      const mockImage = {
        onload: null as any,
        onerror: null as any,
        src: '',
        naturalWidth: 1920,
        naturalHeight: 1080,
      }
      global.Image = vi.fn(() => mockImage) as any

      const dimensionsPromise = getImageDimensions(fileFixtures.jpegImage)
      setTimeout(() => mockImage.onload?.(), 10)
      const dimensions = await dimensionsPromise

      expect(dimensions).toEqual({ width: 1920, height: 1080 })

      // 4. Initialize processing hook
      const { result } = renderHook(() => useImageProcessing())
      expect(result.current.isProcessing).toBe(false)
    })

    it('should handle workflow errors gracefully', async () => {
      // Test error in dimensions step
      await expect(getImageDimensions(fileFixtures.pdfDocument)).rejects.toThrow(
        'File is not an image',
      )

      // Test hook initialization
      const { result } = renderHook(() => useImageProcessing())
      expect(result.current.error).toBeNull()
    })
  })

  describe('performance and memory management', () => {
    it('should handle large images efficiently', async () => {
      const largeImageFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      })

      const startTime = performance.now()
      const previewUrl = createFilePreviewUrl(largeImageFile)
      const endTime = performance.now()

      expect(endTime - startTime).toBeLessThan(50) // Should be very fast
      expect(previewUrl).toBe('blob:mock-url')
    })

    it('should clean up resources properly', async () => {
      const { result, unmount } = renderHook(() => useImageProcessing())

      act(() => {
        result.current.processImage(fileFixtures.jpegImage, imageProcessingFixtures.resize)
      })

      // Unmount should not cause errors
      unmount()

      expect(true).toBe(true) // Test passes if no errors thrown
    })

    it('should handle multiple processing requests', () => {
      const { result } = renderHook(() => useImageProcessing())

      const files = Array.from(
        { length: 5 },
        (_, i) => new File([`image-${i}`], `image-${i}.jpg`, { type: 'image/jpeg' }),
      )

      // Start multiple processing operations
      act(() => {
        files.forEach(file => {
          result.current.processImage(file, imageProcessingFixtures.thumbnail)
        })
      })

      expect(result.current.isProcessing).toBe(true)
    })
  })
})
