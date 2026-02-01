/**
 * Image Compression Utility
 *
 * Client-side image compression before S3 upload.
 * Uses browser-image-compression library.
 *
 * Story WISH-2022: Client-side Image Compression
 * Story WISH-2046: Client-side Image Compression Quality Presets
 */

import imageCompression, { type Options } from 'browser-image-compression'
import { z } from 'zod'

// Compression configuration schema
export const CompressionConfigSchema = z.object({
  maxSizeMB: z.number().default(1),
  maxWidthOrHeight: z.number().default(1920),
  useWebWorker: z.boolean().default(true),
  fileType: z.string().default('image/jpeg'),
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
 * - Low bandwidth: Smallest file size, fastest upload (0.6 quality, 1200px max, ~300KB)
 * - Balanced: Good quality, reasonable file size - recommended (0.8 quality, 1920px max, ~800KB)
 * - High quality: Best quality, larger file size (0.9 quality, 2400px max, ~1.5MB)
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
      fileType: 'image/jpeg',
    },
    estimatedSize: '~300KB',
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
      fileType: 'image/jpeg',
    },
    estimatedSize: '~800KB',
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
      fileType: 'image/jpeg',
    },
    estimatedSize: '~1.5MB',
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

    // Create new File with original name to preserve filename
    const resultFile = new File([compressedFile], file.name, {
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
