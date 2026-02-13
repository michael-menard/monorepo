/**
 * HEIC Conversion Tests
 *
 * Story WISH-2045: HEIC/HEIF Image Format Support
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isHEIC,
  transformHEICFilename,
  convertHEICToJPEG,
  HEIC_MIME_TYPES,
  HEIC_EXTENSIONS,
} from '../index'

// Mock heic2any
vi.mock('heic2any', () => ({
  default: vi.fn(async () => {
    // Mock conversion - return a JPEG blob
    const blob = new Blob(['converted jpeg'], { type: 'image/jpeg' })
    return blob
  }),
}))

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('HEIC_MIME_TYPES', () => {
  it('should include image/heic and image/heif', () => {
    expect(HEIC_MIME_TYPES).toEqual(['image/heic', 'image/heif'])
  })
})

describe('HEIC_EXTENSIONS', () => {
  it('should include .heic and .heif', () => {
    expect(HEIC_EXTENSIONS).toEqual(['.heic', '.heif'])
  })
})

describe('isHEIC', () => {
  it('should return true for image/heic MIME type', () => {
    const file = new File(['content'], 'test.heic', { type: 'image/heic' })
    expect(isHEIC(file)).toBe(true)
  })

  it('should return true for image/heif MIME type', () => {
    const file = new File(['content'], 'test.heif', { type: 'image/heif' })
    expect(isHEIC(file)).toBe(true)
  })

  it('should return true for .heic extension even with wrong MIME type', () => {
    const file = new File(['content'], 'test.heic', { type: 'application/octet-stream' })
    expect(isHEIC(file)).toBe(true)
  })

  it('should return true for .heif extension even with wrong MIME type', () => {
    const file = new File(['content'], 'test.heif', { type: 'application/octet-stream' })
    expect(isHEIC(file)).toBe(true)
  })

  it('should be case insensitive for extensions', () => {
    const file1 = new File(['content'], 'test.HEIC', { type: 'application/octet-stream' })
    const file2 = new File(['content'], 'test.HEIF', { type: 'application/octet-stream' })
    expect(isHEIC(file1)).toBe(true)
    expect(isHEIC(file2)).toBe(true)
  })

  it('should be case insensitive for MIME types', () => {
    const file = new File(['content'], 'test.jpg', { type: 'IMAGE/HEIC' })
    expect(isHEIC(file)).toBe(true)
  })

  it('should return false for non-HEIC files', () => {
    const file = new File(['content'], 'test.jpg', { type: 'image/jpeg' })
    expect(isHEIC(file)).toBe(false)
  })

  it('should return false for PNG files', () => {
    const file = new File(['content'], 'test.png', { type: 'image/png' })
    expect(isHEIC(file)).toBe(false)
  })
})

describe('transformHEICFilename', () => {
  it('should transform .heic to .jpg', () => {
    expect(transformHEICFilename('IMG_1234.heic')).toBe('IMG_1234.jpg')
  })

  it('should transform .heif to .jpg', () => {
    expect(transformHEICFilename('IMG_1234.heif')).toBe('IMG_1234.jpg')
  })

  it('should be case insensitive', () => {
    expect(transformHEICFilename('IMG_1234.HEIC')).toBe('IMG_1234.jpg')
    expect(transformHEICFilename('IMG_1234.HEIF')).toBe('IMG_1234.jpg')
    expect(transformHEICFilename('IMG_1234.Heic')).toBe('IMG_1234.jpg')
  })

  it('should not transform non-HEIC extensions', () => {
    expect(transformHEICFilename('photo.jpg')).toBe('photo.jpg')
    expect(transformHEICFilename('photo.png')).toBe('photo.png')
  })
})

describe('convertHEICToJPEG', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should convert HEIC file to JPEG', async () => {
    const file = new File(['heic content'], 'test.heic', { type: 'image/heic' })
    const result = await convertHEICToJPEG(file)

    expect(result.converted).toBe(true)
    expect(result.file.name).toBe('test.jpg')
    expect(result.file.type).toBe('image/jpeg')
    expect(result.originalSize).toBe(file.size)
  })

  it('should call onProgress callback', async () => {
    const file = new File(['heic content'], 'test.heic', { type: 'image/heic' })
    const onProgress = vi.fn()

    await convertHEICToJPEG(file, { onProgress })

    expect(onProgress).toHaveBeenCalledWith(0)
    expect(onProgress).toHaveBeenCalledWith(100)
  })

  it('should use custom quality setting', async () => {
    const heic2any = await import('heic2any')
    const file = new File(['heic content'], 'test.heic', { type: 'image/heic' })

    await convertHEICToJPEG(file, { quality: 0.7 })

    expect(heic2any.default).toHaveBeenCalledWith({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.7,
    })
  })

  it('should use default quality of 0.9', async () => {
    const heic2any = await import('heic2any')
    const file = new File(['heic content'], 'test.heic', { type: 'image/heic' })

    await convertHEICToJPEG(file)

    expect(heic2any.default).toHaveBeenCalledWith({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    })
  })

  it('should handle conversion errors gracefully', async () => {
    const heic2any = await import('heic2any')
    vi.mocked(heic2any.default).mockRejectedValueOnce(new Error('Conversion failed'))

    const file = new File(['heic content'], 'test.heic', { type: 'image/heic' })
    const result = await convertHEICToJPEG(file)

    expect(result.converted).toBe(false)
    expect(result.file).toBe(file)
    expect(result.error).toBe('Conversion failed')
  })

  it('should handle array result from heic2any (burst photos)', async () => {
    const heic2any = await import('heic2any')
    const blob1 = new Blob(['photo1'], { type: 'image/jpeg' })
    const blob2 = new Blob(['photo2'], { type: 'image/jpeg' })
    vi.mocked(heic2any.default).mockResolvedValueOnce([blob1, blob2])

    const file = new File(['heic content'], 'burst.heic', { type: 'image/heic' })
    const result = await convertHEICToJPEG(file)

    expect(result.converted).toBe(true)
    expect(result.file.name).toBe('burst.jpg')
    // Should use first image from array
    expect(result.file.size).toBe(blob1.size)
  })
})
