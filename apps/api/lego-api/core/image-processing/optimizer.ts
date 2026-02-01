/**
 * Image Optimizer Service
 *
 * Sharp-based image optimization with resizing, compression, and WebP conversion.
 * Implements hexagonal architecture port/adapter pattern.
 *
 * Story: WISH-2016 - Image Optimization
 */

import sharp from 'sharp'
import { logger } from '@repo/logger'
import type {
  ImageSize,
  ImageSizeConfig,
  ProcessedImage,
  ImageMetadata,
  WatermarkOptions,
} from './__types__/index.js'

// ─────────────────────────────────────────────────────────────────────────────
// Size Configurations (AC1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Image size configurations per AC1:
 * - Thumbnail: 200x200 (for gallery grid view)
 * - Medium: 800x800 (for gallery card hover preview)
 * - Large: 1600x1600 (for detail page view, with watermark)
 *
 * All sizes use 85% quality compression (AC2)
 */
export const SIZE_CONFIGS: Record<ImageSize, ImageSizeConfig> = {
  thumbnail: {
    name: 'thumbnail',
    maxWidth: 200,
    maxHeight: 200,
    quality: 85,
    applyWatermark: false,
  },
  medium: {
    name: 'medium',
    maxWidth: 800,
    maxHeight: 800,
    quality: 85,
    applyWatermark: false,
  },
  large: {
    name: 'large',
    maxWidth: 1600,
    maxHeight: 1600,
    quality: 85,
    applyWatermark: true, // AC4: Watermark on large only
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Port Interface
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Image Optimizer Port
 *
 * Interface for image optimization operations.
 * Implementations can use different libraries (Sharp, ImageMagick, etc.)
 */
export interface ImageOptimizerPort {
  /**
   * Resize and compress a single image to the specified configuration
   */
  resize(input: Buffer, config: ImageSizeConfig): Promise<ProcessedImage>

  /**
   * Get metadata from an image buffer
   */
  getImageMetadata(input: Buffer): Promise<ImageMetadata>

  /**
   * Process an image to all three sizes (thumbnail, medium, large)
   * Optionally applies watermark to large size
   */
  processAllSizes(
    input: Buffer,
    watermarkBuffer?: Buffer,
    watermarkOptions?: WatermarkOptions,
  ): Promise<ProcessedImage[]>
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate output dimensions while maintaining aspect ratio.
 * Does not upscale images smaller than the target size.
 */
export function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  // Don't upscale small images (AC: Small Image test case)
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { width: originalWidth, height: originalHeight }
  }

  // Calculate scale ratio while maintaining aspect ratio
  const widthRatio = maxWidth / originalWidth
  const heightRatio = maxHeight / originalHeight
  const ratio = Math.min(widthRatio, heightRatio)

  return {
    width: Math.round(originalWidth * ratio),
    height: Math.round(originalHeight * ratio),
  }
}

/**
 * Calculate watermark position based on image and watermark dimensions
 */
export function calculateWatermarkPosition(
  imageWidth: number,
  imageHeight: number,
  watermarkWidth: number,
  watermarkHeight: number,
  position: WatermarkOptions['position'],
  margin: number,
): { left: number; top: number } {
  switch (position) {
    case 'bottom-right':
      return {
        left: imageWidth - watermarkWidth - margin,
        top: imageHeight - watermarkHeight - margin,
      }
    case 'bottom-left':
      return {
        left: margin,
        top: imageHeight - watermarkHeight - margin,
      }
    case 'top-right':
      return {
        left: imageWidth - watermarkWidth - margin,
        top: margin,
      }
    case 'top-left':
      return {
        left: margin,
        top: margin,
      }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sharp Adapter Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a Sharp-based image optimizer
 *
 * Uses Sharp library (libvips) for fast, memory-efficient image processing.
 * - 5-10x faster than ImageMagick
 * - Streaming-based processing
 * - Lambda compatible with Node.js 18.x+
 */
export function createSharpImageOptimizer(): ImageOptimizerPort {
  return {
    async resize(input: Buffer, config: ImageSizeConfig): Promise<ProcessedImage> {
      const { maxWidth, maxHeight, quality, name } = config

      const image = sharp(input)
      const metadata = await image.metadata()

      const originalWidth = metadata.width || 0
      const originalHeight = metadata.height || 0

      // Calculate dimensions maintaining aspect ratio
      const { width, height } = calculateDimensions(
        originalWidth,
        originalHeight,
        maxWidth,
        maxHeight,
      )

      // Resize and convert to WebP (AC3)
      const resized = await image
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true, // Never upscale
        })
        .webp({ quality }) // AC2: 85% quality compression
        .toBuffer()

      logger.debug('Image resized', {
        size: name,
        originalDimensions: `${originalWidth}x${originalHeight}`,
        outputDimensions: `${width}x${height}`,
        originalBytes: input.length,
        outputBytes: resized.length,
        compressionRatio: Math.round((1 - resized.length / input.length) * 100),
      })

      return {
        size: name,
        buffer: resized,
        width,
        height,
        format: 'webp',
        sizeBytes: resized.length,
        watermarked: false,
      }
    },

    async getImageMetadata(input: Buffer): Promise<ImageMetadata> {
      const metadata = await sharp(input).metadata()
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        sizeBytes: input.length,
      }
    },

    async processAllSizes(
      input: Buffer,
      watermarkBuffer?: Buffer,
      watermarkOptions?: WatermarkOptions,
    ): Promise<ProcessedImage[]> {
      const results: ProcessedImage[] = []
      const sizes: ImageSize[] = ['thumbnail', 'medium', 'large']

      for (const size of sizes) {
        const config = SIZE_CONFIGS[size]
        let processed = await this.resize(input, config)

        // Apply watermark to large size only (AC4)
        if (config.applyWatermark && watermarkBuffer && watermarkOptions) {
          try {
            const watermarked = await applyWatermarkToImage(
              processed.buffer,
              watermarkBuffer,
              watermarkOptions,
            )
            processed = {
              ...processed,
              buffer: watermarked,
              sizeBytes: watermarked.length,
              watermarked: true,
            }

            logger.debug('Watermark applied', { size, watermarked: true })
          } catch (error) {
            // Graceful degradation - proceed without watermark (AC4 risk mitigation)
            logger.warn('Failed to apply watermark, proceeding without', {
              size,
              error: error instanceof Error ? error.message : String(error),
            })
          }
        }

        results.push(processed)
      }

      return results
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Watermark Application
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply watermark to an image with specified options.
 *
 * AC4 Requirements:
 * - Bottom-right corner position
 * - 10% opacity
 * - 100px width
 * - 20px margin from edge
 */
export async function applyWatermarkToImage(
  imageBuffer: Buffer,
  watermarkBuffer: Buffer,
  options: WatermarkOptions,
): Promise<Buffer> {
  const { position, opacity, margin, width: targetWidth } = options

  // Get image dimensions
  const imageMetadata = await sharp(imageBuffer).metadata()
  const imageWidth = imageMetadata.width || 0
  const imageHeight = imageMetadata.height || 0

  // Resize watermark to target width, maintaining aspect ratio
  const watermarkResized = await sharp(watermarkBuffer)
    .resize(targetWidth, null, { fit: 'inside' })
    .ensureAlpha()
    .toBuffer()

  const watermarkMetadata = await sharp(watermarkResized).metadata()
  const watermarkWidth = watermarkMetadata.width || 0
  const watermarkHeight = watermarkMetadata.height || 0

  // Calculate position
  const { left, top } = calculateWatermarkPosition(
    imageWidth,
    imageHeight,
    watermarkWidth,
    watermarkHeight,
    position,
    margin,
  )

  // Apply opacity to watermark (multiply alpha channel)
  const watermarkWithOpacity = await sharp(watermarkResized)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Manually adjust alpha channel for opacity
  const { data, info } = watermarkWithOpacity
  const pixelCount = info.width * info.height
  for (let i = 0; i < pixelCount; i++) {
    const alphaIndex = i * 4 + 3 // RGBA format, alpha is 4th byte
    data[alphaIndex] = Math.round(data[alphaIndex] * opacity)
  }

  const adjustedWatermark = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png()
    .toBuffer()

  // Composite watermark onto image
  const result = await sharp(imageBuffer)
    .composite([
      {
        input: adjustedWatermark,
        left: Math.max(0, left),
        top: Math.max(0, top),
        blend: 'over',
      },
    ])
    .webp({ quality: 85 })
    .toBuffer()

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Default Export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default watermark options per AC4:
 * - Position: bottom-right
 * - Opacity: 10% (0.1)
 * - Margin: 20px
 * - Width: 100px
 */
export const DEFAULT_WATERMARK_OPTIONS: WatermarkOptions = {
  position: 'bottom-right',
  opacity: 0.1,
  margin: 20,
  width: 100,
}
