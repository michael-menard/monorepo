/**
 * Image Compression Utility
 *
 * Client-side image compression before S3 upload.
 * Uses browser-image-compression library.
 *
 * Story WISH-2022: Client-side Image Compression
 * Story WISH-2046: Client-side Image Compression Quality Presets
 * Story WISH-2045: HEIC/HEIF Image Format Support
 * Story WISH-2058: Core WebP Conversion
 */

import imageCompression, { type Options } from 'browser-image-compression'
import heic2any from 'heic2any'
import { z } from 'zod'

// Compression configuration schema
// WISH-2058: Changed default fileType from 'image/jpeg' to 'image/webp'
export const CompressionConfigSchema = z.object({
  maxSizeMB: z.number().default(1),
  maxWidthOrHeight: z.number().default(1920),
  useWebWorker: z.boolean().default(true),
  fileType: z.string().default('image/webp'),
  initialQuality: z.number().min(0).max(1).default(0.8),
})

export type CompressionConfig = z.infer<typeof CompressionConfigSchema>

// WISH-2046: Compression preset name type
export const CompressionPresetNameSchema = z.enum(['low-bandwidth', 'balanced', 'high-quality'])
export type CompressionPresetName = z.infer<typeof CompressionPresetNameSchema>

// WISH-2046: Compression preset schema
export const CompressionPresetSchema = z.object({
  name: CompressionPresetNameSchema,
  label: z.string(),
  description: z.string(),
  settings: CompressionConfigSchema,
  estimatedSize: z.string(),
})

export type CompressionPreset = z.infer<typeof CompressionPresetSchema>

/**
 * WISH-2046: Compression quality presets
 * WISH-2058: Updated to WebP format for 25-35% additional size savings
 * - Low bandwidth: Smallest file size, fastest upload (0.6 quality, 1200px max, ~200KB)
 * - Balanced: Good quality, reasonable file size - recommended (0.8 quality, 1920px max, ~550KB)
 * - High quality: Best quality, larger file size (0.9 quality, 2400px max, ~1.0MB)
 */
export const COMPRESSION_PRESETS: CompressionPreset[] = [
  {
    name: 'low-bandwidth',
    label: 'Low bandwidth',
    description: 'Smallest file size, fastest upload',
    settings: {
      maxSizeMB: 0.5,
      maxWidthOrHeight: 1200,
      initialQuality: 0.6,
      useWebWorker: true,
      fileType: 'image/webp',
    },
    estimatedSize: '~200KB',
  },
  {
    name: 'balanced',
    label: 'Balanced',
    description: 'Good quality, reasonable file size',
    settings: {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      initialQuality: 0.8,
      useWebWorker: true,
      fileType: 'image/webp',
    },
    estimatedSize: '~550KB',
  },
  {
    name: 'high-quality',
    label: 'High quality',
    description: 'Best quality, larger file size',
    settings: {
      maxSizeMB: 2,
      maxWidthOrHeight: 2400,
      initialQuality: 0.9,
      useWebWorker: true,
      fileType: 'image/webp',
    },
    estimatedSize: '~1.0MB',
  },
]

/**
 * WISH-2046: Get a compression preset by name
 * Falls back to 'balanced' if name is invalid
 */
export function getPresetByName(name: CompressionPresetName | string): CompressionPreset {
  const preset = COMPRESSION_PRESETS.find(p => p.name === name)
  return preset ?? COMPRESSION_PRESETS[1] // Default to balanced (index 1)
}

/**
 * WISH-2046: Validate if a string is a valid preset name
 */
export function isValidPresetName(name: string): name is CompressionPresetName {
  return CompressionPresetNameSchema.safeParse(name).success
}

// Default compression settings per story AC (uses balanced preset)
export const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = COMPRESSION_PRESETS[1].settings

// Threshold for skipping compression (500KB)
export const SKIP_COMPRESSION_SIZE_THRESHOLD = 500 * 1024

// Progress callback type
export type CompressionProgressCallback = (progress: number) => void

/**
 * WISH-2058: Transform filename to WebP extension
 * Replaces common image extensions with .webp
 * Example: photo.jpg -> photo.webp, image.png -> image.webp
 */
export function transformFilenameToWebP(filename: string): string {
  return filename.replace(/\.(jpe?g|png|gif|bmp|tiff?)$/i, '.webp')
}

/**
 * Result of compression operation
 */
export interface CompressionResult {
  /** Whether compression was performed */
  compressed: boolean
  /** The resulting file (compressed or original) */
  file: File
  /** Original file size in bytes */
  originalSize: number
  /** Final file size in bytes */
  finalSize: number
  /** Compression ratio (0-1, where lower is better) */
  ratio: number
  /** Error message if compression failed */
  error?: string
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

// ─────────────────────────────────────────────────────────────────────────────
// WISH-2045: HEIC/HEIF Image Format Support
// ─────────────────────────────────────────────────────────────────────────────

/**
 * WISH-2045: HEIC MIME types
 */
export const HEIC_MIME_TYPES = ['image/heic', 'image/heif'] as const

/**
 * WISH-2045: HEIC file extensions
 */
export const HEIC_EXTENSIONS = ['.heic', '.heif'] as const

/**
 * WISH-2045: HEIC conversion result schema
 */
export const HEICConversionResultSchema = z.object({
  converted: z.boolean(),
  file: z.custom<File>(val => val instanceof File),
  originalSize: z.number(),
  convertedSize: z.number(),
  error: z.string().optional(),
})

export type HEICConversionResult = z.infer<typeof HEICConversionResultSchema>

/**
 * WISH-2045: Progress callback type for HEIC conversion
 */
export type HEICConversionProgressCallback = (progress: number) => void

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

    return {
      converted: false,
      file,
      originalSize,
      convertedSize: originalSize,
      error: errorMessage,
    }
  }
}
