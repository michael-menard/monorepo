/**
 * Image Processing Service using Sharp
 *
 * Handles image resize, optimization, and format conversion for gallery uploads.
 */

import sharp from 'sharp'

export interface ProcessedImage {
  buffer: Buffer
  width: number
  height: number
  format: string
  size: number
}

export interface ImageProcessingOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
}

/**
 * Process image: resize, optimize, and convert format
 *
 * @param buffer - Original image buffer
 * @param options - Processing options
 * @returns Processed image data
 */
export async function processImage(
  buffer: Buffer,
  options: ImageProcessingOptions = {},
): Promise<ProcessedImage> {
  const { maxWidth = 2048, maxHeight, quality = 80, format = 'webp' } = options

  try {
    // Create Sharp instance
    const image = sharp(buffer)

    // Resize if needed (maintain aspect ratio)
    if (maxWidth || maxHeight) {
      image.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true, // Don't upscale small images
      })
    }

    // Convert to specified format with quality optimization
    let processedBuffer: Buffer

    switch (format) {
      case 'webp':
        processedBuffer = await image.webp({ quality }).toBuffer()
        break
      case 'jpeg':
        processedBuffer = await image.jpeg({ quality }).toBuffer()
        break
      case 'png':
        processedBuffer = await image.png({ quality }).toBuffer()
        break
      default:
        processedBuffer = await image.webp({ quality }).toBuffer()
    }

    // Get processed image metadata
    const processedMetadata = await sharp(processedBuffer).metadata()

    return {
      buffer: processedBuffer,
      width: processedMetadata.width || 0,
      height: processedMetadata.height || 0,
      format: processedMetadata.format || format,
      size: processedBuffer.length,
    }
  } catch (error) {
    throw new Error(`Image processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate thumbnail from image
 *
 * @param buffer - Original or processed image buffer
 * @param width - Thumbnail width (default 400px)
 * @returns Thumbnail image data
 */
export async function generateThumbnail(buffer: Buffer, width: number = 400): Promise<ProcessedImage> {
  return processImage(buffer, {
    maxWidth: width,
    quality: 80,
    format: 'webp',
  })
}

/**
 * Validate image buffer
 *
 * @param buffer - Image buffer to validate
 * @returns True if valid image
 */
export async function validateImageBuffer(buffer: Buffer): Promise<boolean> {
  try {
    const metadata = await sharp(buffer).metadata()
    return !!metadata.format && metadata.width !== undefined && metadata.height !== undefined
  } catch {
    return false
  }
}

/**
 * Get image metadata without processing
 *
 * @param buffer - Image buffer
 * @returns Image metadata
 */
export async function getImageMetadata(buffer: Buffer): Promise<{
  width: number
  height: number
  format: string
  size: number
  hasAlpha: boolean
}> {
  const metadata = await sharp(buffer).metadata()

  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || 'unknown',
    size: buffer.length,
    hasAlpha: metadata.hasAlpha || false,
  }
}
