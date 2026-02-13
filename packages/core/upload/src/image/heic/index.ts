/**
 * HEIC/HEIF Conversion Utility
 *
 * Story WISH-2045: HEIC/HEIF Image Format Support
 */

import heic2any from 'heic2any'
import { logger } from '@repo/logger'
import type { HEICConversionResult, HEICConversionProgressCallback } from './__types__'

/**
 * WISH-2045: HEIC MIME types
 */
export const HEIC_MIME_TYPES = ['image/heic', 'image/heif'] as const

/**
 * WISH-2045: HEIC file extensions
 */
export const HEIC_EXTENSIONS = ['.heic', '.heif'] as const

/**
 * WISH-2045: Check if a file is HEIC/HEIF format
 * Checks both MIME type and file extension for robustness.
 * Some apps may report HEIC files as 'application/octet-stream',
 * so extension-based detection is important.
 */
export function isHEIC(file: File): boolean {
  const mimeTypeMatch = HEIC_MIME_TYPES.includes(
    file.type.toLowerCase() as (typeof HEIC_MIME_TYPES)[number],
  )
  const extensionMatch = HEIC_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))
  return mimeTypeMatch || extensionMatch
}

/**
 * WISH-2045: Transform HEIC filename to JPEG
 * Example: IMG_1234.heic -> IMG_1234.jpg
 * Example: IMG_1234.HEIF -> IMG_1234.jpg
 */
export function transformHEICFilename(filename: string): string {
  return filename.replace(/\.(heic|heif)$/i, '.jpg')
}

/**
 * WISH-2045: Convert HEIC file to JPEG
 * Uses heic2any library for client-side conversion.
 *
 * Note: heic2any returns Blob or Blob[] depending on whether the HEIC
 * contains single or multiple images (burst photos). We always take
 * the first image for simplicity.
 *
 * @param file - The HEIC file to convert
 * @param options - Optional configuration
 * @param options.quality - JPEG quality (0-1), defaults to 0.9
 * @param options.onProgress - Progress callback (0-100)
 * @returns Conversion result with converted file or original on failure
 */
export async function convertHEICToJPEG(
  file: File,
  options: {
    quality?: number
    onProgress?: HEICConversionProgressCallback
  } = {},
): Promise<HEICConversionResult> {
  const { quality = 0.9, onProgress } = options
  const originalSize = file.size

  try {
    // Signal start of conversion
    onProgress?.(0)

    // Convert HEIC to JPEG using heic2any
    // heic2any uses WebAssembly internally
    const result = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality,
    })

    // heic2any returns Blob or Blob[] - handle both cases
    // Multi-image HEIC (burst photos) returns array; we take first image
    const convertedBlob = Array.isArray(result) ? result[0] : result

    // Create new File with transformed filename
    const newFilename = transformHEICFilename(file.name)
    const convertedFile = new File([convertedBlob], newFilename, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    })

    // Signal completion
    onProgress?.(100)

    return {
      converted: true,
      file: convertedFile,
      originalSize,
      convertedSize: convertedFile.size,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown HEIC conversion error'
    logger.error('HEIC conversion failed', { error: errorMessage, fileName: file.name })

    return {
      converted: false,
      file,
      originalSize,
      convertedSize: originalSize,
      error: errorMessage,
    }
  }
}
