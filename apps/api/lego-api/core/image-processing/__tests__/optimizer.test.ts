/**
 * Image Optimizer Unit Tests
 *
 * Tests for Sharp-based image optimization including:
 * - Resizing to exact dimensions
 * - Aspect ratio preservation
 * - Compression quality
 * - WebP format output
 * - Watermark application
 *
 * Story: WISH-2016 - Image Optimization
 * AC12: 20+ unit tests for optimizer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createSharpImageOptimizer,
  calculateDimensions,
  calculateWatermarkPosition,
  SIZE_CONFIGS,
  DEFAULT_WATERMARK_OPTIONS,
} from '../optimizer.js'

// Mock Sharp module
vi.mock('sharp', () => {
  const mockSharp = vi.fn(() => ({
    metadata: vi.fn().mockResolvedValue({
      width: 4032,
      height: 3024,
      format: 'jpeg',
    }),
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-image-data')),
    ensureAlpha: vi.fn().mockReturnThis(),
    raw: vi.fn().mockReturnThis(),
    composite: vi.fn().mockReturnThis(),
    modulate: vi.fn().mockReturnThis(),
  }))
  return { default: mockSharp }
})

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Image Optimizer', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // calculateDimensions Tests (6 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('calculateDimensions', () => {
    it('should maintain aspect ratio for landscape images', () => {
      const result = calculateDimensions(4032, 3024, 200, 200)
      expect(result.width).toBe(200)
      expect(result.height).toBe(150)
      // Verify aspect ratio preserved
      const originalRatio = 4032 / 3024
      const newRatio = result.width / result.height
      expect(Math.abs(originalRatio - newRatio)).toBeLessThan(0.01)
    })

    it('should maintain aspect ratio for portrait images', () => {
      const result = calculateDimensions(3024, 4032, 200, 200)
      expect(result.width).toBe(150)
      expect(result.height).toBe(200)
    })

    it('should handle square images correctly', () => {
      const result = calculateDimensions(3024, 3024, 200, 200)
      expect(result.width).toBe(200)
      expect(result.height).toBe(200)
    })

    it('should not upscale small images', () => {
      const result = calculateDimensions(100, 100, 200, 200)
      expect(result.width).toBe(100)
      expect(result.height).toBe(100)
    })

    it('should not upscale partially small images', () => {
      const result = calculateDimensions(150, 100, 200, 200)
      expect(result.width).toBe(150)
      expect(result.height).toBe(100)
    })

    it('should round dimensions to integers', () => {
      const result = calculateDimensions(1000, 333, 200, 200)
      expect(Number.isInteger(result.width)).toBe(true)
      expect(Number.isInteger(result.height)).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // calculateWatermarkPosition Tests (4 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('calculateWatermarkPosition', () => {
    const imageWidth = 1600
    const imageHeight = 1200
    const watermarkWidth = 100
    const watermarkHeight = 50
    const margin = 20

    it('should calculate bottom-right position correctly', () => {
      const result = calculateWatermarkPosition(
        imageWidth,
        imageHeight,
        watermarkWidth,
        watermarkHeight,
        'bottom-right',
        margin,
      )
      expect(result.left).toBe(1480) // 1600 - 100 - 20
      expect(result.top).toBe(1130) // 1200 - 50 - 20
    })

    it('should calculate bottom-left position correctly', () => {
      const result = calculateWatermarkPosition(
        imageWidth,
        imageHeight,
        watermarkWidth,
        watermarkHeight,
        'bottom-left',
        margin,
      )
      expect(result.left).toBe(20)
      expect(result.top).toBe(1130)
    })

    it('should calculate top-right position correctly', () => {
      const result = calculateWatermarkPosition(
        imageWidth,
        imageHeight,
        watermarkWidth,
        watermarkHeight,
        'top-right',
        margin,
      )
      expect(result.left).toBe(1480)
      expect(result.top).toBe(20)
    })

    it('should calculate top-left position correctly', () => {
      const result = calculateWatermarkPosition(
        imageWidth,
        imageHeight,
        watermarkWidth,
        watermarkHeight,
        'top-left',
        margin,
      )
      expect(result.left).toBe(20)
      expect(result.top).toBe(20)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // SIZE_CONFIGS Tests (3 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('SIZE_CONFIGS', () => {
    it('should have correct thumbnail configuration', () => {
      expect(SIZE_CONFIGS.thumbnail).toEqual({
        name: 'thumbnail',
        maxWidth: 200,
        maxHeight: 200,
        quality: 85,
        applyWatermark: false,
      })
    })

    it('should have correct medium configuration', () => {
      expect(SIZE_CONFIGS.medium).toEqual({
        name: 'medium',
        maxWidth: 800,
        maxHeight: 800,
        quality: 85,
        applyWatermark: false,
      })
    })

    it('should have correct large configuration with watermark', () => {
      expect(SIZE_CONFIGS.large).toEqual({
        name: 'large',
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 85,
        applyWatermark: true,
      })
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // DEFAULT_WATERMARK_OPTIONS Tests (1 test)
  // ─────────────────────────────────────────────────────────────────────────

  describe('DEFAULT_WATERMARK_OPTIONS', () => {
    it('should have correct default watermark options per AC4', () => {
      expect(DEFAULT_WATERMARK_OPTIONS).toEqual({
        position: 'bottom-right',
        opacity: 0.1,
        margin: 20,
        width: 100,
      })
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // createSharpImageOptimizer Tests (8 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('createSharpImageOptimizer', () => {
    let optimizer: ReturnType<typeof createSharpImageOptimizer>

    beforeEach(() => {
      optimizer = createSharpImageOptimizer()
      vi.clearAllMocks()
    })

    it('should create an optimizer with required methods', () => {
      expect(optimizer).toHaveProperty('resize')
      expect(optimizer).toHaveProperty('getImageMetadata')
      expect(optimizer).toHaveProperty('processAllSizes')
      expect(typeof optimizer.resize).toBe('function')
      expect(typeof optimizer.getImageMetadata).toBe('function')
      expect(typeof optimizer.processAllSizes).toBe('function')
    })

    it('should resize image to thumbnail size', async () => {
      const input = Buffer.from('test-image')
      const result = await optimizer.resize(input, SIZE_CONFIGS.thumbnail)

      expect(result.size).toBe('thumbnail')
      expect(result.format).toBe('webp')
      expect(result.watermarked).toBe(false)
      expect(result.buffer).toBeInstanceOf(Buffer)
    })

    it('should resize image to medium size', async () => {
      const input = Buffer.from('test-image')
      const result = await optimizer.resize(input, SIZE_CONFIGS.medium)

      expect(result.size).toBe('medium')
      expect(result.format).toBe('webp')
    })

    it('should resize image to large size', async () => {
      const input = Buffer.from('test-image')
      const result = await optimizer.resize(input, SIZE_CONFIGS.large)

      expect(result.size).toBe('large')
      expect(result.format).toBe('webp')
    })

    it('should get image metadata correctly', async () => {
      const input = Buffer.from('test-image')
      const result = await optimizer.getImageMetadata(input)

      expect(result.width).toBe(4032)
      expect(result.height).toBe(3024)
      expect(result.format).toBe('jpeg')
    })

    it('should process all three sizes', async () => {
      const input = Buffer.from('test-image')
      const results = await optimizer.processAllSizes(input)

      expect(results).toHaveLength(3)
      expect(results.map(r => r.size)).toEqual(['thumbnail', 'medium', 'large'])
    })

    it('should output WebP format for all sizes', async () => {
      const input = Buffer.from('test-image')
      const results = await optimizer.processAllSizes(input)

      results.forEach(result => {
        expect(result.format).toBe('webp')
      })
    })

    it('should include sizeBytes in processed results', async () => {
      const input = Buffer.from('test-image')
      const results = await optimizer.processAllSizes(input)

      results.forEach(result => {
        expect(result.sizeBytes).toBeGreaterThan(0)
      })
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Edge Cases (4 tests)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should handle very small images (1x1)', () => {
      const result = calculateDimensions(1, 1, 200, 200)
      expect(result.width).toBe(1)
      expect(result.height).toBe(1)
    })

    it('should handle very wide images (panoramic)', () => {
      const result = calculateDimensions(10000, 500, 800, 800)
      expect(result.width).toBe(800)
      expect(result.height).toBe(40) // Maintains 20:1 ratio
    })

    it('should handle very tall images (portrait)', () => {
      const result = calculateDimensions(500, 10000, 800, 800)
      expect(result.width).toBe(40)
      expect(result.height).toBe(800)
    })

    it('should handle exact size match', () => {
      const result = calculateDimensions(200, 200, 200, 200)
      expect(result.width).toBe(200)
      expect(result.height).toBe(200)
    })
  })
})

// Total: 26 tests
