import type { ImageProcessingConfig, ImagePresets } from '../types/index.js'

/**
 * Predefined image processing configurations for common use cases
 */
export const IMAGE_PRESETS: ImagePresets = {
  // Avatar images - small, square, high quality
  avatar: {
    maxWidth: 200,
    maxHeight: 200,
    quality: 90,
    format: 'jpeg',
    fit: 'cover',
    progressive: true,
    optimizeCoding: true,
    stripMetadata: true,
    sharpen: true,
    rotate: true
  },

  // Thumbnail images - small previews
  thumbnail: {
    maxWidth: 150,
    maxHeight: 150,
    quality: 80,
    format: 'jpeg',
    fit: 'cover',
    progressive: true,
    optimizeCoding: true,
    stripMetadata: true,
    sharpen: false,
    rotate: true
  },

  // Gallery images - medium size, good quality
  gallery: {
    maxWidth: 800,
    maxHeight: 800,
    quality: 85,
    format: 'jpeg',
    fit: 'inside',
    progressive: true,
    optimizeCoding: true,
    stripMetadata: true,
    sharpen: true,
    rotate: true
  },

  // Hero images - large, high quality
  hero: {
    maxWidth: 1200,
    maxHeight: 800,
    quality: 90,
    format: 'jpeg',
    fit: 'cover',
    progressive: true,
    optimizeCoding: true,
    stripMetadata: true,
    sharpen: true,
    rotate: true
  },

  // Background images - large, optimized for web
  background: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 80,
    format: 'jpeg',
    fit: 'cover',
    progressive: true,
    optimizeCoding: true,
    stripMetadata: true,
    sharpen: false,
    rotate: true
  }
}

/**
 * Get a preset configuration by name
 */
export function getPreset(presetName: keyof ImagePresets): ImageProcessingConfig {
  return IMAGE_PRESETS[presetName]
}

/**
 * Create a custom preset based on an existing one
 */
export function createCustomPreset(
  basePreset: keyof ImagePresets,
  overrides: Partial<ImageProcessingConfig>
): ImageProcessingConfig {
  return {
    ...IMAGE_PRESETS[basePreset],
    ...overrides
  }
}

/**
 * Get optimal preset based on image metadata and use case
 */
export function getOptimalPreset(
  width: number,
  height: number,
  useCase: 'avatar' | 'thumbnail' | 'gallery' | 'hero' | 'background' = 'gallery'
): ImageProcessingConfig {
  const preset = getPreset(useCase)
  
  // Adjust quality based on image size
  const imageSize = width * height
  let quality = preset.quality
  
  if (imageSize > 4000000) { // > 2MP
    quality = Math.max(quality - 10, 70)
  } else if (imageSize < 100000) { // < 100KP
    quality = Math.min(quality + 5, 95)
  }
  
  return {
    ...preset,
    quality
  }
}

/**
 * Create responsive image variants
 */
export function createResponsiveVariants(
  baseConfig: ImageProcessingConfig,
  breakpoints: { name: string; width: number; height?: number }[]
): Array<{ name: string; config: ImageProcessingConfig }> {
  return breakpoints.map(breakpoint => ({
    name: breakpoint.name,
    config: {
      ...baseConfig,
      maxWidth: breakpoint.width,
      maxHeight: breakpoint.height || breakpoint.width
    }
  }))
}

/**
 * Common responsive breakpoints
 */
export const RESPONSIVE_BREAKPOINTS = {
  mobile: { name: 'mobile', width: 480 },
  tablet: { name: 'tablet', width: 768 },
  desktop: { name: 'desktop', width: 1024 },
  large: { name: 'large', width: 1440 },
  xlarge: { name: 'xlarge', width: 1920 }
} as const

/**
 * Create standard responsive variants
 */
export function createStandardResponsiveVariants(
  baseConfig: ImageProcessingConfig
): Array<{ name: string; config: ImageProcessingConfig }> {
  return createResponsiveVariants(baseConfig, Object.values(RESPONSIVE_BREAKPOINTS))
} 