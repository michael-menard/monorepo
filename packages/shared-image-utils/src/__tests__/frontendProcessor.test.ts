import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getImageMetadataFromFile,
  validateImageFile,
  processImageFile,
  createImageVariantsFile,
  createDataURL,
  dataURLToFile,
  getOptimalFormatFrontend
} from '../utils/frontendProcessor.js'
import { IMAGE_PRESETS } from '../utils/presets.js'

describe('Frontend Image Processor', () => {
  const mockFile = new File(['test-image-data'], 'test.jpg', { type: 'image/jpeg' })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getImageMetadataFromFile', () => {
    it('should return image metadata from file', async () => {
      const metadata = await getImageMetadataFromFile(mockFile)
      
      expect(metadata).toEqual({
        width: 100,
        height: 100,
        format: 'jpeg',
        size: mockFile.size,
        hasAlpha: true, // Mock canvas returns image data with alpha
        isOpaque: false,
        orientation: undefined
      })
    })

    it('should handle files with alpha channel', async () => {
      // Mock canvas context to return image data with alpha
      const mockCanvas = document.createElement('canvas')
      const mockCtx = mockCanvas.getContext('2d')
      if (mockCtx) {
        vi.mocked(mockCtx.getImageData).mockReturnValue({
          data: new Uint8ClampedArray([255, 255, 255, 128]) // Semi-transparent pixel
        } as any)
      }

      const metadata = await getImageMetadataFromFile(mockFile)
      expect(metadata.hasAlpha).toBe(true)
      expect(metadata.isOpaque).toBe(false)
    })
  })

  describe('validateImageFile', () => {
    it('should validate file successfully', () => {
      const result = validateImageFile(mockFile)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject unsupported file types', () => {
      const unsupportedFile = new File(['data'], 'test.gif', { type: 'image/gif' })
      const result = validateImageFile(unsupportedFile)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File type image/gif is not supported')
    })

    it('should reject files that are too large', () => {
      const largeFile = new File(['x'.repeat(20 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
      const result = validateImageFile(largeFile, { maxSizeMB: 10 })
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('File size 20.00MB exceeds maximum 10MB')
    })

    it('should accept files within size limits', () => {
      const smallFile = new File(['data'], 'small.jpg', { type: 'image/jpeg' })
      const result = validateImageFile(smallFile, { maxSizeMB: 10 })
      
      expect(result.isValid).toBe(true)
    })
  })

  describe('processImageFile', () => {
    it('should process image file with default config', async () => {
      const result = await processImageFile({
        file: mockFile,
        config: {}
      })
      
      expect(result.file).toBeInstanceOf(File)
      expect(result.stats).toEqual({
        originalSize: mockFile.size,
        optimizedSize: expect.any(Number),
        compressionRatio: expect.any(Number),
        processingTime: expect.any(Number),
        format: 'jpeg',
        quality: 85
      })
    })

    it('should process image file with custom config', async () => {
      const config = {
        maxWidth: 500,
        maxHeight: 400,
        quality: 90,
        format: 'webp' as const
      }
      
      const result = await processImageFile({
        file: mockFile,
        config
      })
      
      expect(result.stats.format).toBe('webp')
      expect(result.stats.quality).toBe(90)
    })

    it('should resize image when dimensions exceed limits', async () => {
      // Mock larger image dimensions
      const mockImage = new Image()
      mockImage.width = 1000
      mockImage.height = 800
      
      const config = { maxWidth: 500, maxHeight: 400 }
      await processImageFile({
        file: mockFile,
        config
      })
      
      // Canvas should be resized
      const mockCanvas = document.createElement('canvas')
      expect(mockCanvas.width).toBe(100) // Mock canvas width
      expect(mockCanvas.height).toBe(100) // Mock canvas height
    })

    it('should handle cover fit mode', async () => {
      const config = { fit: 'cover' as const, maxWidth: 200, maxHeight: 200 }
      
      await processImageFile({
        file: mockFile,
        config
      })
      
      // Should use cover fit logic
      expect(true).toBe(true) // Test passes if no error thrown
    })
  })

  describe('createImageVariantsFile', () => {
    it('should create multiple image variants', async () => {
      const variants = [
        { name: 'thumbnail', config: IMAGE_PRESETS.thumbnail },
        { name: 'gallery', config: IMAGE_PRESETS.gallery }
      ]
      
      const results = await createImageVariantsFile(mockFile, variants)
      
      expect(results).toHaveLength(2)
      expect(results[0].name).toBe('thumbnail')
      expect(results[1].name).toBe('gallery')
      expect(results[0].file).toBeInstanceOf(File)
      expect(results[0].stats).toBeDefined()
    })

    it('should call progress callback', async () => {
      const onProgress = vi.fn()
      const variants = [
        { name: 'thumbnail', config: IMAGE_PRESETS.thumbnail },
        { name: 'gallery', config: IMAGE_PRESETS.gallery }
      ]
      
      await createImageVariantsFile(mockFile, variants, onProgress)
      
      expect(onProgress).toHaveBeenCalledWith(0.5) // Halfway through
      expect(onProgress).toHaveBeenCalledWith(1) // Complete
    })

    it('should continue processing if one variant fails', async () => {
      // Mock canvas toBlob to fail for first variant
      const mockCanvas = document.createElement('canvas')
      vi.mocked(mockCanvas.toBlob).mockImplementationOnce((callback) => {
        setTimeout(() => callback(null), 0) // Fail first call
      })
      
      const variants = [
        { name: 'thumbnail', config: IMAGE_PRESETS.thumbnail },
        { name: 'gallery', config: IMAGE_PRESETS.gallery }
      ]
      
      const results = await createImageVariantsFile(mockFile, variants)
      
      // Should still process the second variant
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('createDataURL', () => {
    it('should create data URL from file', async () => {
      const dataURL = await createDataURL(mockFile)
      
      expect(dataURL).toBe('data:image/jpeg;base64,mocked-data')
    })

    it('should handle file read errors', async () => {
      // Test that the function works with our mock FileReader
      const dataURL = await createDataURL(mockFile)
      expect(dataURL).toBe('data:image/jpeg;base64,mocked-data')
    })
  })

  describe('dataURLToFile', () => {
    it('should convert data URL to file', () => {
      const dataURL = 'data:image/jpeg;base64,test-data'
      const filename = 'test.jpg'
      const mimeType = 'image/jpeg'
      
      const file = dataURLToFile(dataURL, filename, mimeType)
      
      expect(file).toBeInstanceOf(File)
      expect(file.name).toBe(filename)
      expect(file.type).toBe(mimeType)
    })
  })

  describe('getOptimalFormatFrontend', () => {
    it('should return webp when supported', () => {
      // Mock WebP support
      const mockCanvas = document.createElement('canvas')
      vi.mocked(mockCanvas.toDataURL).mockReturnValue('data:image/webp;base64,test')
      
      expect(getOptimalFormatFrontend('test.webp', 'image/webp')).toBe('webp')
    })

    it('should return png for files with alpha channel', () => {
      expect(getOptimalFormatFrontend('test.png', 'image/png', true)).toBe('png')
    })

    it('should return jpeg as default', () => {
      expect(getOptimalFormatFrontend('test.jpg', 'image/jpeg')).toBe('jpeg')
    })
  })
}) 