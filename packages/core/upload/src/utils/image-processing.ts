// Node.js image processing using Sharp (server-side)
import type { ImageProcessingOptions } from '../types/index.js'

// This file includes Sharp for server-side processing
// It will be excluded from browser builds

export const processImageServer = async (
  buffer: Buffer,
  options: ImageProcessingOptions,
): Promise<Buffer> => {
  // Dynamic import to avoid bundling Sharp in browser builds
  const sharp = await import('sharp')

  let processor = sharp.default(buffer)

  // Resize if dimensions are specified
  if (options.width || options.height) {
    processor = processor.resize(options.width, options.height, {
      fit: options.fit || 'cover',
      position: options.position || 'center',
    })
  }

  // Set format and quality
  switch (options.format) {
    case 'jpeg':
      processor = processor.jpeg({ quality: options.quality || 85 })
      break
    case 'png':
      processor = processor.png({ quality: options.quality || 85 })
      break
    case 'webp':
      processor = processor.webp({ quality: options.quality || 85 })
      break
    case 'avif':
      processor = processor.avif({ quality: options.quality || 85 })
      break
    default:
      processor = processor.jpeg({ quality: options.quality || 85 })
  }

  return processor.toBuffer()
}

export const getImageMetadataServer = async (buffer: Buffer) => {
  const sharp = await import('sharp')
  return sharp.default(buffer).metadata()
}

// Re-export browser functions for unified API
export * from './image-processing.browser.js'
