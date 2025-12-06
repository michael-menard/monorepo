/**
 * @repo/image-processing Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  processImage,
  generateThumbnail,
  validateImageBuffer,
  getImageMetadata,
} from '../index.js'

// Mock sharp
const mockSharpInstance = {
  resize: vi.fn().mockReturnThis(),
  webp: vi.fn().mockReturnThis(),
  jpeg: vi.fn().mockReturnThis(),
  png: vi.fn().mockReturnThis(),
  toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed')),
  metadata: vi.fn().mockResolvedValue({
    width: 800,
    height: 600,
    format: 'webp',
    hasAlpha: false,
  }),
}

vi.mock('sharp', () => ({
  default: vi.fn(() => mockSharpInstance),
}))

describe('Image Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSharpInstance.toBuffer.mockResolvedValue(Buffer.from('processed'))
    mockSharpInstance.metadata.mockResolvedValue({
      width: 800,
      height: 600,
      format: 'webp',
      hasAlpha: false,
    })
  })

  describe('processImage', () => {
    it('should process image with default options', async () => {
      const inputBuffer = Buffer.from('test-image')
      const result = await processImage(inputBuffer)

      expect(result).toHaveProperty('buffer')
      expect(result).toHaveProperty('width')
      expect(result).toHaveProperty('height')
      expect(result).toHaveProperty('format')
      expect(result).toHaveProperty('size')
    })

    it('should apply resize when maxWidth is specified', async () => {
      const inputBuffer = Buffer.from('test-image')
      await processImage(inputBuffer, { maxWidth: 1024 })

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(1024, undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    })

    it('should convert to webp format by default', async () => {
      const inputBuffer = Buffer.from('test-image')
      await processImage(inputBuffer)

      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 80 })
    })

    it('should convert to jpeg format when specified', async () => {
      const inputBuffer = Buffer.from('test-image')
      await processImage(inputBuffer, { format: 'jpeg', quality: 90 })

      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({ quality: 90 })
    })

    it('should convert to png format when specified', async () => {
      const inputBuffer = Buffer.from('test-image')
      await processImage(inputBuffer, { format: 'png' })

      expect(mockSharpInstance.png).toHaveBeenCalledWith({ quality: 80 })
    })

    it('should throw error when processing fails', async () => {
      mockSharpInstance.toBuffer.mockRejectedValueOnce(new Error('Sharp error'))

      const inputBuffer = Buffer.from('invalid')
      await expect(processImage(inputBuffer)).rejects.toThrow('Image processing failed')
    })
  })

  describe('generateThumbnail', () => {
    it('should generate thumbnail with default width of 400px', async () => {
      const inputBuffer = Buffer.from('test-image')
      await generateThumbnail(inputBuffer)

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(400, undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    })

    it('should generate thumbnail with custom width', async () => {
      const inputBuffer = Buffer.from('test-image')
      await generateThumbnail(inputBuffer, 200)

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(200, undefined, {
        fit: 'inside',
        withoutEnlargement: true,
      })
    })

    it('should use webp format for thumbnails', async () => {
      const inputBuffer = Buffer.from('test-image')
      await generateThumbnail(inputBuffer)

      expect(mockSharpInstance.webp).toHaveBeenCalledWith({ quality: 80 })
    })
  })

  describe('validateImageBuffer', () => {
    it('should return true for valid image buffer', async () => {
      const validBuffer = Buffer.from('valid-image')
      const result = await validateImageBuffer(validBuffer)

      expect(result).toBe(true)
    })

    it('should return false when metadata is missing format', async () => {
      mockSharpInstance.metadata.mockResolvedValueOnce({
        width: 800,
        height: 600,
        format: undefined,
      })

      const invalidBuffer = Buffer.from('invalid')
      const result = await validateImageBuffer(invalidBuffer)

      expect(result).toBe(false)
    })

    it('should return false when sharp throws error', async () => {
      mockSharpInstance.metadata.mockRejectedValueOnce(new Error('Invalid image'))

      const invalidBuffer = Buffer.from('not-an-image')
      const result = await validateImageBuffer(invalidBuffer)

      expect(result).toBe(false)
    })
  })

  describe('getImageMetadata', () => {
    it('should return image metadata', async () => {
      const buffer = Buffer.from('test-image')
      const metadata = await getImageMetadata(buffer)

      expect(metadata).toEqual({
        width: 800,
        height: 600,
        format: 'webp',
        size: buffer.length,
        hasAlpha: false,
      })
    })
  })
})

