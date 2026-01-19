/**
 * Core upload config business logic
 * Platform-agnostic - no AWS, Vercel, or platform-specific dependencies
 */

import type { UploadConfig } from '@repo/upload-config'
import type { EnvVars, PublicUploadConfig } from './__types__/index.js'

/**
 * Load upload configuration from environment variables
 *
 * Parses environment variables into typed upload configuration.
 * Validates all required fields are present.
 *
 * @param env - Environment variables (key-value map)
 * @returns Parsed upload configuration
 * @throws Error if required environment variables are missing or invalid
 */
export function loadUploadConfigFromEnv(env: EnvVars): UploadConfig {
  const requiredVars = [
    'PDF_MAX_BYTES',
    'IMAGE_MAX_BYTES',
    'PARTS_LIST_MAX_BYTES',
    'THUMBNAIL_MAX_BYTES',
    'MAX_IMAGES_PER_MOC',
    'MAX_PARTS_LISTS_PER_MOC',
    'ALLOWED_PDF_MIME_TYPES',
    'ALLOWED_IMAGE_MIME_TYPES',
    'ALLOWED_PARTS_LIST_MIME_TYPES',
    'PRESIGN_TTL_MINUTES',
    'SESSION_TTL_MINUTES',
  ]

  // Validate all required variables are present
  const missing = requiredVars.filter(key => !env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  // Parse numeric values
  const parseInt = (key: string): number => {
    const value = env[key]
    if (!value) throw new Error(`Missing environment variable: ${key}`)
    const parsed = Number.parseInt(value, 10)
    if (Number.isNaN(parsed)) {
      throw new Error(`Invalid number for ${key}: ${value}`)
    }
    return parsed
  }

  // Parse comma-separated MIME types
  const parseMimeTypes = (key: string): string[] => {
    const value = env[key]
    if (!value) throw new Error(`Missing environment variable: ${key}`)
    return value.split(',').map(s => s.trim()).filter(Boolean)
  }

  return {
    pdfMaxBytes: parseInt('PDF_MAX_BYTES'),
    imageMaxBytes: parseInt('IMAGE_MAX_BYTES'),
    partsListMaxBytes: parseInt('PARTS_LIST_MAX_BYTES'),
    thumbnailMaxBytes: parseInt('THUMBNAIL_MAX_BYTES'),
    maxImagesPerMoc: parseInt('MAX_IMAGES_PER_MOC'),
    maxPartsListsPerMoc: parseInt('MAX_PARTS_LISTS_PER_MOC'),
    allowedPdfMimeTypes: parseMimeTypes('ALLOWED_PDF_MIME_TYPES'),
    allowedImageMimeTypes: parseMimeTypes('ALLOWED_IMAGE_MIME_TYPES'),
    allowedPartsListMimeTypes: parseMimeTypes('ALLOWED_PARTS_LIST_MIME_TYPES'),
    presignTtlMinutes: parseInt('PRESIGN_TTL_MINUTES'),
    sessionTtlMinutes: parseInt('SESSION_TTL_MINUTES'),
    // Use default values for fields not exposed via env vars
    rateLimitPerDay: 100,
    finalizeLockTtlMinutes: 5,
  }
}

/**
 * Get public-safe upload configuration
 *
 * Filters upload configuration to return only fields safe for public consumption.
 * Excludes internal fields like rate limiting and lock TTLs.
 *
 * @param config - Full upload configuration
 * @returns Public-safe upload configuration
 */
export function getPublicUploadConfig(config: UploadConfig): PublicUploadConfig {
  return {
    pdfMaxBytes: config.pdfMaxBytes,
    imageMaxBytes: config.imageMaxBytes,
    partsListMaxBytes: config.partsListMaxBytes,
    thumbnailMaxBytes: config.thumbnailMaxBytes,
    maxImagesPerMoc: config.maxImagesPerMoc,
    maxPartsListsPerMoc: config.maxPartsListsPerMoc,
    allowedPdfMimeTypes: config.allowedPdfMimeTypes,
    allowedImageMimeTypes: config.allowedImageMimeTypes,
    allowedPartsListMimeTypes: config.allowedPartsListMimeTypes,
    presignTtlMinutes: config.presignTtlMinutes,
    sessionTtlMinutes: config.sessionTtlMinutes,
  }
}
