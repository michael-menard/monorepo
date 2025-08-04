import sharp from 'sharp'
import type {
  ImageProcessingConfig,
  ImageMetadata,
  ImageOptimizationStats,
  ImageVariantResult,
  ImageProcessingError
} from '../types/index.js'
import { ImageProcessingConfigSchema } from '../schemas/index.js'

/**
 * Get image metadata from buffer
 */
export async function getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
  try {
    const metadata = await sharp(buffer).metadata()
    
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image: missing dimensions')
    }

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format || 'unknown',
      size: buffer.length,
      hasAlpha: metadata.hasAlpha || false,
      isOpaque: !metadata.hasAlpha || false,
      orientation: metadata.orientation
    }
  } catch (error) {
    throw new Error(`Failed to get image metadata: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Process and optimize an image buffer
 */
export async function processImage(
  buffer: Buffer,
  config: Partial<ImageProcessingConfig> = {}
): Promise<{ buffer: Buffer; stats: ImageOptimizationStats }> {
  const startTime = Date.now()
  const originalSize = buffer.length
  
  try {
    // Validate and merge configuration
    const validatedConfig = ImageProcessingConfigSchema.parse(config)
    
    let sharpInstance = sharp(buffer)

    // Get original metadata
    const metadata = await getImageMetadata(buffer)
    
    // Check if resizing is needed
    const needsResize = metadata.width > validatedConfig.maxWidth || metadata.height > validatedConfig.maxHeight

    if (needsResize) {
      sharpInstance = sharpInstance.resize({
        width: validatedConfig.maxWidth,
        height: validatedConfig.maxHeight,
        fit: validatedConfig.fit,
        withoutEnlargement: true
      })
    }

    // Apply format-specific optimizations
    switch (validatedConfig.format) {
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({
          quality: validatedConfig.quality,
          progressive: validatedConfig.progressive,
          optimizeCoding: validatedConfig.optimizeCoding
        })
        break
      case 'png':
        sharpInstance = sharpInstance.png({
          quality: validatedConfig.quality,
          progressive: validatedConfig.progressive
        })
        break
      case 'webp':
        sharpInstance = sharpInstance.webp({
          quality: validatedConfig.quality,
          effort: 6 // Maximum compression effort
        })
        break
      case 'avif':
        sharpInstance = sharpInstance.avif({
          quality: validatedConfig.quality,
          effort: 9 // Maximum compression effort
        })
        break
    }

    // Apply additional optimizations
    if (validatedConfig.stripMetadata) {
      sharpInstance = sharpInstance.withMetadata()
    }

    if (validatedConfig.rotate) {
      sharpInstance = sharpInstance.rotate() // Auto-rotate based on EXIF
    }

    if (validatedConfig.sharpen) {
      sharpInstance = sharpInstance.sharpen()
    }

    if (validatedConfig.blur !== undefined) {
      sharpInstance = sharpInstance.blur(validatedConfig.blur)
    }

    const processedBuffer = await sharpInstance.toBuffer()
    const processingTime = Date.now() - startTime
    const optimizedSize = processedBuffer.length
    const compressionRatio = 1 - (optimizedSize / originalSize)

    const stats: ImageOptimizationStats = {
      originalSize,
      optimizedSize,
      compressionRatio,
      processingTime,
      format: validatedConfig.format,
      quality: validatedConfig.quality
    }

    return { buffer: processedBuffer, stats }
  } catch (error) {
    const processingError: ImageProcessingError = {
      code: 'PROCESSING_FAILED',
      message: error instanceof Error ? error.message : 'Unknown processing error',
      details: error
    }
    throw processingError
  }
}

/**
 * Create multiple image variants
 */
export async function createImageVariants(
  buffer: Buffer,
  variants: Array<{ name: string; config: Partial<ImageProcessingConfig> }>
): Promise<ImageVariantResult[]> {
  const results: ImageVariantResult[] = []

  for (const variant of variants) {
    try {
      const { buffer: processedBuffer, stats } = await processImage(buffer, variant.config)
      
      results.push({
        name: variant.name,
        buffer: processedBuffer,
        stats
      })
    } catch (error) {
      console.error(`Failed to create variant ${variant.name}:`, error)
      // Continue with other variants
    }
  }

  return results
}

/**
 * Get optimal image format based on content and requirements
 */
export function getOptimalFormat(
  filename: string,
  mimetype: string,
  hasAlpha: boolean = false
): 'jpeg' | 'png' | 'webp' | 'avif' {
  const ext = filename.toLowerCase().split('.').pop()
  
  // Prefer modern formats for better compression
  if (ext === 'avif' || mimetype === 'image/avif') {
    return 'avif'
  }
  
  if (ext === 'webp' || mimetype === 'image/webp') {
    return 'webp'
  }
  
  // Use PNG for images with transparency
  if (hasAlpha || ext === 'png' || mimetype === 'image/png') {
    return 'png'
  }
  
  // Default to JPEG for photos
  return 'jpeg'
}

/**
 * Validate if an image can be processed
 */
export function canProcessImage(mimetype: string): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/heic',
    'image/heif'
  ]
  
  return supportedTypes.includes(mimetype)
}

/**
 * Calculate optimal quality based on image type and size
 */
export function calculateOptimalQuality(
  originalSize: number,
  format: 'jpeg' | 'png' | 'webp' | 'avif'
): number {
  const sizeMB = originalSize / (1024 * 1024)
  
  // Base quality on image size and type
  if (format === 'jpeg') {
    if (sizeMB > 5) return 75
    if (sizeMB > 2) return 80
    if (sizeMB > 1) return 85
    return 90
  }
  
  if (format === 'webp' || format === 'avif') {
    if (sizeMB > 5) return 70
    if (sizeMB > 2) return 75
    if (sizeMB > 1) return 80
    return 85
  }
  
  // PNG quality is different (compression level)
  return 85
} 