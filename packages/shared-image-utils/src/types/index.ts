// Re-export types from schemas
export type {
  ImageFormat,
  ImageFit,
  ImageProcessingConfig,
  ImageValidation,
  ImageOptimizationResult,
  ImageVariantConfig,
  ImageVariants,
  FileValidation
} from '../schemas/index.js'

// Import types for use in this file
import type {
  ImageFormat,
  ImageProcessingConfig
} from '../schemas/index.js'

// Additional utility types
export interface ImageMetadata {
  width: number
  height: number
  format: string
  size: number
  hasAlpha: boolean
  isOpaque: boolean
  orientation?: number
}

export interface ImageProcessingOptions {
  buffer: Buffer
  config: ImageProcessingConfig
  metadata?: ImageMetadata
}

export interface FrontendImageProcessingOptions {
  file: File
  config: ImageProcessingConfig
  onProgress?: (progress: number) => void
}

export interface ImageProcessingError {
  code: 'INVALID_FORMAT' | 'FILE_TOO_LARGE' | 'PROCESSING_FAILED' | 'VALIDATION_FAILED'
  message: string
  details?: unknown
}

export interface ImageOptimizationStats {
  originalSize: number
  optimizedSize: number
  compressionRatio: number
  processingTime: number
  format: ImageFormat
  quality: number
}

export interface ImageVariantResult {
  name: string
  buffer: Buffer
  stats: ImageOptimizationStats
  url?: string
}

export interface ImageProcessingResult {
  original: Buffer
  variants: ImageVariantResult[]
  metadata: ImageMetadata
  stats: ImageOptimizationStats
}

export interface FrontendImageProcessingResult {
  original: File
  variants: {
    name: string
    file: File
    stats: ImageOptimizationStats
    url: string
  }[]
  metadata: ImageMetadata
  stats: ImageOptimizationStats
}

// Configuration presets
export interface ImagePresets {
  avatar: ImageProcessingConfig
  thumbnail: ImageProcessingConfig
  gallery: ImageProcessingConfig
  hero: ImageProcessingConfig
  background: ImageProcessingConfig
}

// Validation result
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
} 