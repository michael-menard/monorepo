/**
 * Image Compression Utility
 *
 * Client-side image compression before S3 upload.
 * Uses browser-image-compression library.
 *
 * Story WISH-2022: Client-side Image Compression
 * Story WISH-2058: Core WebP Conversion
 */

import imageCompression, { type Options } from 'browser-image-compression'
import { logger } from '@repo/logger'
import { DEFAULT_COMPRESSION_CONFIG } from '../presets'
import type { CompressionConfig } from '../presets/__types__'
import type { CompressionProgressCallback, CompressionResult } from './__types__'

/**
 * Threshold for skipping compression (500KB)
 */
export const SKIP_COMPRESSION_SIZE_THRESHOLD = 500 * 1024

/**
 * WISH-2058: Transform filename to WebP extension
 * Replaces common image extensions with .webp
 * Example: photo.jpg -> photo.webp, image.png -> image.webp
 */
export function transformFilenameToWebP(filename: string): string {
  return filename.replace(/\.(jpe?g|png|gif|bmp|tiff?)$/i, '.webp')
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Get image dimensions from a File
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image for dimension check'))
    }

    img.src = url
  })
}

/**
 * Determine if compression should be skipped
 */
export async function shouldSkipCompression(
  file: File,
  config: CompressionConfig = DEFAULT_COMPRESSION_CONFIG,
): Promise<boolean> {
  // Skip if file is already small enough
  if (file.size < SKIP_COMPRESSION_SIZE_THRESHOLD) {
    try {
      const dimensions = await getImageDimensions(file)
      // Only skip if dimensions are also within limits
      if (
        dimensions.width <= config.maxWidthOrHeight &&
        dimensions.height <= config.maxWidthOrHeight
      ) {
        return true
      }
    } catch {
      // If we can't check dimensions, don't skip
      return false
    }
  }

  return false
}

/**
 * Compress an image file
 */
export async function compressImage(
  file: File,
  options: {
    config?: CompressionConfig
    onProgress?: CompressionProgressCallback
    skipCompressionCheck?: boolean
  } = {},
): Promise<CompressionResult> {
  const { config = DEFAULT_COMPRESSION_CONFIG, onProgress, skipCompressionCheck = false } = options

  const originalSize = file.size

  // Check if we should skip compression
  if (!skipCompressionCheck && (await shouldSkipCompression(file, config))) {
    return {
      compressed: false,
      file,
      originalSize,
      finalSize: originalSize,
      ratio: 1,
    }
  }

  try {
    // Build compression options
    const compressionOptions: Options = {
      maxSizeMB: config.maxSizeMB,
      maxWidthOrHeight: config.maxWidthOrHeight,
      useWebWorker: config.useWebWorker,
      fileType: config.fileType as Options['fileType'],
      initialQuality: config.initialQuality,
      onProgress: onProgress ? (progress: number) => onProgress(progress) : undefined,
    }

    const compressedFile = await imageCompression(file, compressionOptions)

    // Check if compression actually helped
    if (compressedFile.size >= originalSize) {
      // Compression made file larger, use original
      return {
        compressed: false,
        file,
        originalSize,
        finalSize: originalSize,
        ratio: 1,
      }
    }

    // WISH-2058: Create new File with WebP extension when compressing to WebP
    const outputFilename =
      config.fileType === 'image/webp' ? transformFilenameToWebP(file.name) : file.name
    const resultFile = new File([compressedFile], outputFilename, {
      type: config.fileType,
      lastModified: Date.now(),
    })

    return {
      compressed: true,
      file: resultFile,
      originalSize,
      finalSize: resultFile.size,
      ratio: resultFile.size / originalSize,
    }
  } catch (error) {
    // Compression failed, return original file
    const errorMessage = error instanceof Error ? error.message : 'Unknown compression error'
    logger.error('Image compression failed', { error: errorMessage, fileName: file.name })

    return {
      compressed: false,
      file,
      originalSize,
      finalSize: originalSize,
      ratio: 1,
      error: errorMessage,
    }
  }
}
