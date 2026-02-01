/**
 * Image Compression Utility Tests
 *
 * Story WISH-2022: Client-side Image Compression
 * Story WISH-2046: Client-side Image Compression Quality Presets
 * Story WISH-2045: HEIC/HEIF Image Format Support
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  compressImage,
  shouldSkipCompression,
  formatFileSize,
  getImageDimensions,
  SKIP_COMPRESSION_SIZE_THRESHOLD,
  DEFAULT_COMPRESSION_CONFIG,
  // WISH-2046: Preset exports
  COMPRESSION_PRESETS,
  getPresetByName,
  isValidPresetName,
  type CompressionPresetName,
  // WISH-2045: HEIC exports
  isHEIC,
  transformHEICFilename,
  convertHEICToJPEG,
  HEIC_MIME_TYPES,
  HEIC_EXTENSIONS,
} from '../imageCompression'

// Mock browser-image-compression
vi.mock('browser-image-compression', () => ({
  default: vi.fn(),
}))

// Mock heic2any
vi.mock('heic2any', () => ({
  default: vi.fn(),
}))

import imageCompression from 'browser-image-compression'
import heic2any from 'heic2any'
const mockImageCompression = vi.mocked(imageCompression)
const mockHeic2any = vi.mocked(heic2any)

// Mock Image for getImageDimensions
const mockImage = {
  onload: vi.fn(),
  onerror: vi.fn(),
  src: '',
  naturalWidth: 0,
  naturalHeight: 0,
}

// Store original Image
const originalImage = global.Image

beforeEach(() => {
  vi.clearAllMocks()

  // Reset mock image
  mockImage.onload = vi.fn()
  mockImage.onerror = vi.fn()
  mockImage.src = ''
  mockImage.naturalWidth = 0
  mockImage.naturalHeight = 0

  // Mock Image constructor
  global.Image = vi.fn(() => mockImage) as unknown as typeof Image

  // Mock URL.createObjectURL and revokeObjectURL
  global.URL.createObjectURL = vi.fn(() => 'blob:test-url')
  global.URL.revokeObjectURL = vi.fn()
})

afterAll(() => {
  global.Image = originalImage
})

// Helper to create a mock File
function createMockFile(size: number, name = 'test.jpg', type = 'image/jpeg'): File {
  const content = new Uint8Array(size).fill(0)
  return new File([content], name, { type })
}

// Helper to trigger image load
function triggerImageLoad(width: number, height: number) {
  mockImage.naturalWidth = width
  mockImage.naturalHeight = height
  if (mockImage.onload) {
    ;(mockImage.onload as () => void)()
  }
}

// Helper to trigger image error
function triggerImageError() {
  if (mockImage.onerror) {
    ;(mockImage.onerror as () => void)()
  }
}

describe('formatFileSize', () => {
  it('formats bytes correctly', () => {
    expect(formatFileSize(500)).toBe('500 B')
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(1023)).toBe('1023 B')
  })

  it('formats kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(512 * 1024)).toBe('512.0 KB')
  })

  it('formats megabytes correctly', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1.00 MB')
    expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.50 MB')
    expect(formatFileSize(5.25 * 1024 * 1024)).toBe('5.25 MB')
  })
})

describe('getImageDimensions', () => {
  it('returns image dimensions on success', async () => {
    const file = createMockFile(1000)

    const dimensionsPromise = getImageDimensions(file)

    // Trigger load after promise is created
    setTimeout(() => triggerImageLoad(1920, 1080), 0)

    const result = await dimensionsPromise
    expect(result).toEqual({ width: 1920, height: 1080 })
  })

  it('rejects on image load error', async () => {
    const file = createMockFile(1000)

    const dimensionsPromise = getImageDimensions(file)

    // Trigger error after promise is created
    setTimeout(() => triggerImageError(), 0)

    await expect(dimensionsPromise).rejects.toThrow('Failed to load image for dimension check')
  })

  it('cleans up object URL', async () => {
    const file = createMockFile(1000)

    const dimensionsPromise = getImageDimensions(file)
    setTimeout(() => triggerImageLoad(100, 100), 0)

    await dimensionsPromise

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(file)
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url')
  })
})

describe('shouldSkipCompression', () => {
  it('skips compression for small files with small dimensions', async () => {
    const smallFile = createMockFile(100 * 1024) // 100KB

    const skipPromise = shouldSkipCompression(smallFile)
    setTimeout(() => triggerImageLoad(800, 600), 0)

    const result = await skipPromise
    expect(result).toBe(true)
  })

  it('does not skip compression for small files with large dimensions', async () => {
    const smallFile = createMockFile(100 * 1024) // 100KB

    const skipPromise = shouldSkipCompression(smallFile)
    setTimeout(() => triggerImageLoad(4000, 3000), 0) // Large dimensions

    const result = await skipPromise
    expect(result).toBe(false)
  })

  it('does not skip compression for large files', async () => {
    const largeFile = createMockFile(SKIP_COMPRESSION_SIZE_THRESHOLD + 1) // Just over threshold

    const result = await shouldSkipCompression(largeFile)
    expect(result).toBe(false)
  })

  it('does not skip if dimension check fails', async () => {
    const smallFile = createMockFile(100 * 1024)

    const skipPromise = shouldSkipCompression(smallFile)
    setTimeout(() => triggerImageError(), 0)

    const result = await skipPromise
    expect(result).toBe(false)
  })

  it('uses custom config for dimension threshold', async () => {
    const smallFile = createMockFile(100 * 1024)
    const customConfig = { ...DEFAULT_COMPRESSION_CONFIG, maxWidthOrHeight: 500 }

    const skipPromise = shouldSkipCompression(smallFile, customConfig)
    setTimeout(() => triggerImageLoad(600, 400), 0) // Larger than custom threshold

    const result = await skipPromise
    expect(result).toBe(false)
  })
})

describe('compressImage', () => {
  it('compresses image successfully', async () => {
    const originalFile = createMockFile(2 * 1024 * 1024) // 2MB
    const compressedBlob = new Blob([new Uint8Array(500 * 1024)], { type: 'image/jpeg' })

    mockImageCompression.mockResolvedValue(compressedBlob as File)

    const result = await compressImage(originalFile, { skipCompressionCheck: true })

    expect(result.compressed).toBe(true)
    expect(result.originalSize).toBe(2 * 1024 * 1024)
    expect(result.finalSize).toBeLessThan(result.originalSize)
    expect(result.ratio).toBeLessThan(1)
    expect(result.error).toBeUndefined()
  })

  it('preserves original filename', async () => {
    const originalFile = createMockFile(2 * 1024 * 1024, 'my-photo.jpg')
    const compressedBlob = new Blob([new Uint8Array(500 * 1024)], { type: 'image/jpeg' })

    mockImageCompression.mockResolvedValue(compressedBlob as File)

    const result = await compressImage(originalFile, { skipCompressionCheck: true })

    expect(result.file.name).toBe('my-photo.jpg')
  })

  it('returns original if compression makes file larger', async () => {
    const originalFile = createMockFile(500 * 1024) // 500KB
    const largerBlob = new Blob([new Uint8Array(600 * 1024)], { type: 'image/jpeg' }) // 600KB

    mockImageCompression.mockResolvedValue(largerBlob as File)

    const result = await compressImage(originalFile, { skipCompressionCheck: true })

    expect(result.compressed).toBe(false)
    expect(result.file).toBe(originalFile)
    expect(result.ratio).toBe(1)
  })

  it('skips compression for small files', async () => {
    const smallFile = createMockFile(100 * 1024) // 100KB

    // Set up dimension check to pass
    setTimeout(() => triggerImageLoad(800, 600), 0)

    const result = await compressImage(smallFile)

    expect(result.compressed).toBe(false)
    expect(result.file).toBe(smallFile)
    expect(mockImageCompression).not.toHaveBeenCalled()
  })

  it('handles compression errors gracefully', async () => {
    const originalFile = createMockFile(2 * 1024 * 1024)

    mockImageCompression.mockRejectedValue(new Error('Compression failed'))

    const result = await compressImage(originalFile, { skipCompressionCheck: true })

    expect(result.compressed).toBe(false)
    expect(result.file).toBe(originalFile)
    expect(result.error).toBe('Compression failed')
  })

  it('handles non-Error rejection gracefully', async () => {
    const originalFile = createMockFile(2 * 1024 * 1024)

    mockImageCompression.mockRejectedValue('Unknown error')

    const result = await compressImage(originalFile, { skipCompressionCheck: true })

    expect(result.compressed).toBe(false)
    expect(result.error).toBe('Unknown compression error')
  })

  it('calls progress callback', async () => {
    const originalFile = createMockFile(2 * 1024 * 1024)
    const compressedBlob = new Blob([new Uint8Array(500 * 1024)], { type: 'image/jpeg' })
    const onProgress = vi.fn()

    mockImageCompression.mockImplementation(async (_file, options) => {
      // Simulate progress callbacks
      options?.onProgress?.(25)
      options?.onProgress?.(50)
      options?.onProgress?.(100)
      return compressedBlob as File
    })

    await compressImage(originalFile, { onProgress, skipCompressionCheck: true })

    expect(onProgress).toHaveBeenCalledWith(25)
    expect(onProgress).toHaveBeenCalledWith(50)
    expect(onProgress).toHaveBeenCalledWith(100)
  })

  it('uses custom compression config', async () => {
    const originalFile = createMockFile(2 * 1024 * 1024)
    const compressedBlob = new Blob([new Uint8Array(500 * 1024)], { type: 'image/webp' })
    const customConfig = {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1024,
      useWebWorker: false,
      fileType: 'image/webp',
      initialQuality: 0.7,
    }

    mockImageCompression.mockResolvedValue(compressedBlob as File)

    await compressImage(originalFile, {
      config: customConfig,
      skipCompressionCheck: true,
    })

    expect(mockImageCompression).toHaveBeenCalledWith(
      originalFile,
      expect.objectContaining({
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: false,
        fileType: 'image/webp',
        initialQuality: 0.7,
      }),
    )
  })

  it('sets correct MIME type on compressed file', async () => {
    const originalFile = createMockFile(2 * 1024 * 1024, 'test.png', 'image/png')
    const compressedBlob = new Blob([new Uint8Array(500 * 1024)], { type: 'image/jpeg' })

    mockImageCompression.mockResolvedValue(compressedBlob as File)

    const result = await compressImage(originalFile, { skipCompressionCheck: true })

    expect(result.file.type).toBe('image/jpeg') // Converted to JPEG
  })
})

describe('DEFAULT_COMPRESSION_CONFIG', () => {
  it('has correct default values', () => {
    expect(DEFAULT_COMPRESSION_CONFIG).toEqual({
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.8,
    })
  })
})

describe('SKIP_COMPRESSION_SIZE_THRESHOLD', () => {
  it('is 500KB', () => {
    expect(SKIP_COMPRESSION_SIZE_THRESHOLD).toBe(500 * 1024)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// WISH-2046: Compression Quality Presets Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('COMPRESSION_PRESETS (WISH-2046)', () => {
  it('has exactly 3 presets', () => {
    expect(COMPRESSION_PRESETS).toHaveLength(3)
  })

  it('contains low-bandwidth, balanced, and high-quality presets', () => {
    const presetNames = COMPRESSION_PRESETS.map(p => p.name)
    expect(presetNames).toContain('low-bandwidth')
    expect(presetNames).toContain('balanced')
    expect(presetNames).toContain('high-quality')
  })

  describe('low-bandwidth preset', () => {
    const preset = COMPRESSION_PRESETS.find(p => p.name === 'low-bandwidth')!

    it('has correct name and label', () => {
      expect(preset.name).toBe('low-bandwidth')
      expect(preset.label).toBe('Low bandwidth')
    })

    it('has correct settings for aggressive compression', () => {
      expect(preset.settings.initialQuality).toBe(0.6)
      expect(preset.settings.maxWidthOrHeight).toBe(1200)
      expect(preset.settings.maxSizeMB).toBe(0.5)
    })

    it('has estimated size indicator', () => {
      expect(preset.estimatedSize).toBe('~300KB')
    })
  })

  describe('balanced preset', () => {
    const preset = COMPRESSION_PRESETS.find(p => p.name === 'balanced')!

    it('has correct name and label', () => {
      expect(preset.name).toBe('balanced')
      expect(preset.label).toBe('Balanced')
    })

    it('has correct settings matching WISH-2022 defaults', () => {
      expect(preset.settings.initialQuality).toBe(0.8)
      expect(preset.settings.maxWidthOrHeight).toBe(1920)
      expect(preset.settings.maxSizeMB).toBe(1)
    })

    it('has estimated size indicator', () => {
      expect(preset.estimatedSize).toBe('~800KB')
    })

    it('matches DEFAULT_COMPRESSION_CONFIG', () => {
      expect(preset.settings).toEqual(DEFAULT_COMPRESSION_CONFIG)
    })
  })

  describe('high-quality preset', () => {
    const preset = COMPRESSION_PRESETS.find(p => p.name === 'high-quality')!

    it('has correct name and label', () => {
      expect(preset.name).toBe('high-quality')
      expect(preset.label).toBe('High quality')
    })

    it('has correct settings for minimal compression', () => {
      expect(preset.settings.initialQuality).toBe(0.9)
      expect(preset.settings.maxWidthOrHeight).toBe(2400)
      expect(preset.settings.maxSizeMB).toBe(2)
    })

    it('has estimated size indicator', () => {
      expect(preset.estimatedSize).toBe('~1.5MB')
    })
  })
})

describe('getPresetByName (WISH-2046)', () => {
  it('returns correct preset for valid names', () => {
    expect(getPresetByName('low-bandwidth').name).toBe('low-bandwidth')
    expect(getPresetByName('balanced').name).toBe('balanced')
    expect(getPresetByName('high-quality').name).toBe('high-quality')
  })

  it('returns balanced preset for invalid name', () => {
    expect(getPresetByName('invalid' as CompressionPresetName).name).toBe('balanced')
    expect(getPresetByName('' as CompressionPresetName).name).toBe('balanced')
  })

  it('returns preset with correct settings', () => {
    const lowBandwidth = getPresetByName('low-bandwidth')
    expect(lowBandwidth.settings.initialQuality).toBe(0.6)

    const highQuality = getPresetByName('high-quality')
    expect(highQuality.settings.initialQuality).toBe(0.9)
  })
})

describe('isValidPresetName (WISH-2046)', () => {
  it('returns true for valid preset names', () => {
    expect(isValidPresetName('low-bandwidth')).toBe(true)
    expect(isValidPresetName('balanced')).toBe(true)
    expect(isValidPresetName('high-quality')).toBe(true)
  })

  it('returns false for invalid preset names', () => {
    expect(isValidPresetName('invalid')).toBe(false)
    expect(isValidPresetName('')).toBe(false)
    expect(isValidPresetName('BALANCED')).toBe(false) // Case sensitive
    expect(isValidPresetName('low_bandwidth')).toBe(false) // Wrong separator
  })
})

describe('compressImage with presets (WISH-2046)', () => {
  it('uses low-bandwidth preset settings when provided', async () => {
    const originalFile = createMockFile(2 * 1024 * 1024)
    const compressedBlob = new Blob([new Uint8Array(200 * 1024)], { type: 'image/jpeg' })
    const preset = getPresetByName('low-bandwidth')

    mockImageCompression.mockResolvedValue(compressedBlob as File)

    await compressImage(originalFile, {
      config: preset.settings,
      skipCompressionCheck: true,
    })

    expect(mockImageCompression).toHaveBeenCalledWith(
      originalFile,
      expect.objectContaining({
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1200,
        initialQuality: 0.6,
      }),
    )
  })

  it('uses high-quality preset settings when provided', async () => {
    const originalFile = createMockFile(2 * 1024 * 1024)
    const compressedBlob = new Blob([new Uint8Array(1.5 * 1024 * 1024)], { type: 'image/jpeg' })
    const preset = getPresetByName('high-quality')

    mockImageCompression.mockResolvedValue(compressedBlob as File)

    await compressImage(originalFile, {
      config: preset.settings,
      skipCompressionCheck: true,
    })

    expect(mockImageCompression).toHaveBeenCalledWith(
      originalFile,
      expect.objectContaining({
        maxSizeMB: 2,
        maxWidthOrHeight: 2400,
        initialQuality: 0.9,
      }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// WISH-2045: HEIC/HEIF Image Format Support Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('HEIC Constants (WISH-2045)', () => {
  it('has correct HEIC MIME types', () => {
    expect(HEIC_MIME_TYPES).toContain('image/heic')
    expect(HEIC_MIME_TYPES).toContain('image/heif')
    expect(HEIC_MIME_TYPES).toHaveLength(2)
  })

  it('has correct HEIC extensions', () => {
    expect(HEIC_EXTENSIONS).toContain('.heic')
    expect(HEIC_EXTENSIONS).toContain('.heif')
    expect(HEIC_EXTENSIONS).toHaveLength(2)
  })
})

describe('isHEIC (WISH-2045)', () => {
  it('returns true for image/heic MIME type', () => {
    const file = createMockFile(1000, 'test.heic', 'image/heic')
    expect(isHEIC(file)).toBe(true)
  })

  it('returns true for image/heif MIME type', () => {
    const file = createMockFile(1000, 'test.heif', 'image/heif')
    expect(isHEIC(file)).toBe(true)
  })

  it('returns true for .heic extension with unknown MIME type', () => {
    // Some apps report HEIC files as application/octet-stream
    const file = createMockFile(1000, 'IMG_1234.heic', 'application/octet-stream')
    expect(isHEIC(file)).toBe(true)
  })

  it('returns true for .heif extension with unknown MIME type', () => {
    const file = createMockFile(1000, 'IMG_1234.heif', 'application/octet-stream')
    expect(isHEIC(file)).toBe(true)
  })

  it('is case-insensitive for extension', () => {
    const upperHeic = createMockFile(1000, 'IMG_1234.HEIC', 'application/octet-stream')
    const upperHeif = createMockFile(1000, 'IMG_1234.HEIF', 'application/octet-stream')
    const mixedCase = createMockFile(1000, 'IMG_1234.HeIc', 'application/octet-stream')

    expect(isHEIC(upperHeic)).toBe(true)
    expect(isHEIC(upperHeif)).toBe(true)
    expect(isHEIC(mixedCase)).toBe(true)
  })

  it('returns false for JPEG files', () => {
    const file = createMockFile(1000, 'test.jpg', 'image/jpeg')
    expect(isHEIC(file)).toBe(false)
  })

  it('returns false for PNG files', () => {
    const file = createMockFile(1000, 'test.png', 'image/png')
    expect(isHEIC(file)).toBe(false)
  })

  it('returns false for WebP files', () => {
    const file = createMockFile(1000, 'test.webp', 'image/webp')
    expect(isHEIC(file)).toBe(false)
  })
})

describe('transformHEICFilename (WISH-2045)', () => {
  it('transforms .heic to .jpg', () => {
    expect(transformHEICFilename('IMG_1234.heic')).toBe('IMG_1234.jpg')
  })

  it('transforms .heif to .jpg', () => {
    expect(transformHEICFilename('photo.heif')).toBe('photo.jpg')
  })

  it('handles uppercase extension', () => {
    expect(transformHEICFilename('IMG_1234.HEIC')).toBe('IMG_1234.jpg')
    expect(transformHEICFilename('IMG_1234.HEIF')).toBe('IMG_1234.jpg')
  })

  it('handles mixed case extension', () => {
    expect(transformHEICFilename('IMG_1234.HeIc')).toBe('IMG_1234.jpg')
  })

  it('preserves filename with dots', () => {
    expect(transformHEICFilename('my.photo.2024.heic')).toBe('my.photo.2024.jpg')
  })

  it('does not modify non-HEIC filenames', () => {
    expect(transformHEICFilename('test.jpg')).toBe('test.jpg')
    expect(transformHEICFilename('test.png')).toBe('test.png')
  })
})

describe('convertHEICToJPEG (WISH-2045)', () => {
  beforeEach(() => {
    mockHeic2any.mockReset()
  })

  it('converts HEIC to JPEG successfully', async () => {
    const heicFile = createMockFile(3 * 1024 * 1024, 'IMG_1234.heic', 'image/heic')
    const convertedBlob = new Blob([new Uint8Array(5 * 1024 * 1024)], { type: 'image/jpeg' })

    mockHeic2any.mockResolvedValue(convertedBlob)

    const result = await convertHEICToJPEG(heicFile)

    expect(result.converted).toBe(true)
    expect(result.file.name).toBe('IMG_1234.jpg')
    expect(result.file.type).toBe('image/jpeg')
    expect(result.originalSize).toBe(heicFile.size)
    expect(result.error).toBeUndefined()
  })

  it('handles heic2any returning Blob array (multi-image HEIC)', async () => {
    const heicFile = createMockFile(3 * 1024 * 1024, 'burst_photo.heic', 'image/heic')
    const blob1 = new Blob([new Uint8Array(2 * 1024 * 1024)], { type: 'image/jpeg' })
    const blob2 = new Blob([new Uint8Array(2 * 1024 * 1024)], { type: 'image/jpeg' })

    // Multi-image HEIC returns array of blobs
    mockHeic2any.mockResolvedValue([blob1, blob2])

    const result = await convertHEICToJPEG(heicFile)

    // Should take first image
    expect(result.converted).toBe(true)
    expect(result.file.name).toBe('burst_photo.jpg')
    expect(result.convertedSize).toBe(blob1.size)
  })

  it('calls heic2any with correct options', async () => {
    const heicFile = createMockFile(1000, 'test.heic', 'image/heic')
    const convertedBlob = new Blob([new Uint8Array(2000)], { type: 'image/jpeg' })

    mockHeic2any.mockResolvedValue(convertedBlob)

    await convertHEICToJPEG(heicFile, { quality: 0.85 })

    expect(mockHeic2any).toHaveBeenCalledWith({
      blob: heicFile,
      toType: 'image/jpeg',
      quality: 0.85,
    })
  })

  it('uses default quality of 0.9', async () => {
    const heicFile = createMockFile(1000, 'test.heic', 'image/heic')
    const convertedBlob = new Blob([new Uint8Array(2000)], { type: 'image/jpeg' })

    mockHeic2any.mockResolvedValue(convertedBlob)

    await convertHEICToJPEG(heicFile)

    expect(mockHeic2any).toHaveBeenCalledWith({
      blob: heicFile,
      toType: 'image/jpeg',
      quality: 0.9,
    })
  })

  it('calls progress callback on start and completion', async () => {
    const heicFile = createMockFile(1000, 'test.heic', 'image/heic')
    const convertedBlob = new Blob([new Uint8Array(2000)], { type: 'image/jpeg' })
    const onProgress = vi.fn()

    mockHeic2any.mockResolvedValue(convertedBlob)

    await convertHEICToJPEG(heicFile, { onProgress })

    expect(onProgress).toHaveBeenCalledWith(0)
    expect(onProgress).toHaveBeenCalledWith(100)
  })

  it('returns original file on conversion error', async () => {
    const heicFile = createMockFile(1000, 'test.heic', 'image/heic')

    mockHeic2any.mockRejectedValue(new Error('HEIC decode failed'))

    const result = await convertHEICToJPEG(heicFile)

    expect(result.converted).toBe(false)
    expect(result.file).toBe(heicFile)
    expect(result.error).toBe('HEIC decode failed')
  })

  it('handles non-Error rejection gracefully', async () => {
    const heicFile = createMockFile(1000, 'test.heic', 'image/heic')

    mockHeic2any.mockRejectedValue('Unknown error string')

    const result = await convertHEICToJPEG(heicFile)

    expect(result.converted).toBe(false)
    expect(result.error).toBe('Unknown HEIC conversion error')
  })

  it('preserves original size in result on failure', async () => {
    const heicFile = createMockFile(3 * 1024 * 1024, 'test.heic', 'image/heic')

    mockHeic2any.mockRejectedValue(new Error('Failed'))

    const result = await convertHEICToJPEG(heicFile)

    expect(result.originalSize).toBe(heicFile.size)
    expect(result.convertedSize).toBe(heicFile.size)
  })
})
