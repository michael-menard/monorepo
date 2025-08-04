// Browser-specific types - excludes Node.js Buffer types

export interface ImageMetadata {
  width: number
  height: number
  format: string
  size: number
  hasAlpha: boolean
  isOpaque: boolean
  orientation?: number
}

export interface ImageOptimizationStats {
  originalSize: number
  optimizedSize: number
  compressionRatio: number
  processingTime: number
  format: string
  quality: number
}

export interface ImageProcessingError {
  code: string
  message: string
  details?: unknown
}

export interface ImageProcessingConfig {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp' | 'avif'
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  progressive?: boolean
  optimizeCoding?: boolean
  stripMetadata?: boolean
  rotate?: boolean
  sharpen?: boolean
  blur?: number
}

export interface FrontendImageProcessingOptions {
  file: File
  config: Partial<ImageProcessingConfig>
  onProgress?: (progress: number) => void
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface ImageVariantResult {
  name: string
  file: File
  stats: ImageOptimizationStats
}

// Frontend-specific result types (no Buffer)
export interface FrontendImageResult {
  file: File
  stats: ImageOptimizationStats
}

export interface FrontendImageVariantsResult {
  name: string
  file: File
  stats: ImageOptimizationStats
} 