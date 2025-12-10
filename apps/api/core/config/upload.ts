/**
 * Upload Configuration Module
 *
 * Story 3.1.5: Config and Validation Foundations
 * Story 3.1.30: Extracted to @repo/upload-config, this file now uses the shared package
 *
 * This module provides a compatibility layer over @repo/upload-config,
 * maintaining backward compatibility with existing consumers while
 * delegating to the shared package for actual config values.
 */

import { createLogger } from '@/core/observability/logger'
import {
  loadEnvConfig,
  resetEnvConfig as resetEnv,
  type ExtendedEnvConfig,
} from '@/core/config/env-loader'
import {
  getFileSizeLimit as packageGetFileSizeLimit,
  getFileCountLimit as packageGetFileCountLimit,
  isMimeTypeAllowed as packageIsMimeTypeAllowed,
  getAllowedMimeTypes as packageGetAllowedMimeTypes,
  bytesToMb,
  type FileCategory,
} from '@repo/upload-config'

const logger = createLogger('upload-config')

/**
 * Allowed MIME types by file type category
 * Story 3.1.8: File type allowlists
 */
export interface AllowedMimeTypes {
  instruction: string[]
  partsList: string[]
  image: string[]
}

/**
 * Derived upload config with bytes and convenience fields
 * Extended from ExtendedEnvConfig with additional computed fields
 */
export interface UploadConfig extends ExtendedEnvConfig {
  // Size limits in MB (for display/logging)
  pdfMaxMb: number
  imageMaxMb: number
  partsListMaxMb: number

  // Count limits (aliased from package)
  imageMaxCount: number
  partsListMaxCount: number

  // Allowed MIME types by file category (Story 3.1.8)
  allowedMimeTypes: AllowedMimeTypes

  // TTL in seconds (computed from minutes)
  presignTtlSeconds: number
  sessionTtlSeconds: number
}

// Valid formats for backward compatibility
export const VALID_IMAGE_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'heic', 'heif', 'gif'] as const
export const VALID_PARTS_FORMATS = ['txt', 'csv', 'json', 'xml', 'xlsx', 'xls'] as const

// Cached extended config
let _extendedConfig: UploadConfig | null = null

/**
 * Extend package config with additional computed fields for backward compatibility
 */
function extendConfig(envConfig: ExtendedEnvConfig): UploadConfig {
  return {
    ...envConfig,
    // MB values for display/error messages
    pdfMaxMb: bytesToMb(envConfig.pdfMaxBytes),
    imageMaxMb: bytesToMb(envConfig.imageMaxBytes),
    partsListMaxMb: bytesToMb(envConfig.partsListMaxBytes),

    // Aliased count limits
    imageMaxCount: envConfig.maxImagesPerMoc,
    partsListMaxCount: envConfig.maxPartsListsPerMoc,

    // Structured MIME types
    allowedMimeTypes: {
      instruction: envConfig.allowedPdfMimeTypes,
      partsList: envConfig.allowedPartsListMimeTypes,
      image: envConfig.allowedImageMimeTypes,
    },

    // TTL in seconds
    presignTtlSeconds: envConfig.presignTtlMinutes * 60,
    sessionTtlSeconds: envConfig.sessionTtlMinutes * 60,
  }
}

/**
 * Validate upload environment variables and build config.
 * Call this at startup to fail fast on invalid config.
 *
 * @throws Error with structured Zod issues on validation failure
 */
export const validateUploadConfig = (): UploadConfig => {
  const packageConfig = loadEnvConfig()
  const config = extendConfig(packageConfig)

  logger.info('Upload config validated successfully', {
    pdfMaxMb: config.pdfMaxMb,
    imageMaxMb: config.imageMaxMb,
    partsListMaxMb: config.partsListMaxMb,
    imageMaxCount: config.imageMaxCount,
    partsListMaxCount: config.partsListMaxCount,
    presignTtlMinutes: config.presignTtlMinutes,
    rateLimitPerDay: config.rateLimitPerDay,
  })

  return config
}

/**
 * Get validated upload config (cached).
 * Lazily validates on first access.
 *
 * @returns UploadConfig with validated values
 * @throws Error if validation fails
 */
export const getUploadConfig = (): UploadConfig => {
  if (!_extendedConfig) {
    const packageConfig = loadEnvConfig()
    _extendedConfig = extendConfig(packageConfig)
  }
  return _extendedConfig
}

/**
 * Reset cached config (for testing)
 */
export const resetUploadConfig = (): void => {
  _extendedConfig = null
  resetEnv()
}

/**
 * Map local file type to package FileCategory
 */
function toFileCategory(
  fileType: 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image',
): FileCategory {
  switch (fileType) {
    case 'instruction':
      return 'instruction'
    case 'parts-list':
      return 'parts-list'
    case 'thumbnail':
      return 'thumbnail'
    case 'gallery-image':
      return 'gallery-image'
    default:
      throw new Error(`Unknown file type: ${fileType}`)
  }
}

/**
 * Get file size limit by file type (in bytes)
 */
export const getFileSizeLimit = (
  fileType: 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image',
): number => {
  const config = loadEnvConfig()
  return packageGetFileSizeLimit(config, toFileCategory(fileType))
}

/**
 * Get max file count by file type
 */
export const getFileCountLimit = (
  fileType: 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image',
): number => {
  const config = loadEnvConfig()
  return packageGetFileCountLimit(config, toFileCategory(fileType))
}

/**
 * Check if image format is allowed
 */
export const isImageFormatAllowed = (format: string): boolean => {
  const config = getUploadConfig()
  return config.allowedImageFormats.includes(format.toLowerCase())
}

/**
 * Check if parts list format is allowed
 */
export const isPartsFormatAllowed = (format: string): boolean => {
  const config = getUploadConfig()
  return config.allowedPartsFormats.includes(format.toLowerCase())
}

/**
 * Check if MIME type is allowed for a given file type
 * Story 3.1.8: MIME type validation
 *
 * @param fileType - The file type category
 * @param mimeType - The MIME type to check
 * @returns true if allowed, false otherwise
 */
export const isMimeTypeAllowed = (
  fileType: 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image',
  mimeType: string,
): boolean => {
  const config = loadEnvConfig()
  return packageIsMimeTypeAllowed(config, toFileCategory(fileType), mimeType)
}

/**
 * Get allowed MIME types for a file type
 * Story 3.1.8: For error messages
 */
export const getAllowedMimeTypes = (
  fileType: 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image',
): string[] => {
  const config = loadEnvConfig()
  return packageGetAllowedMimeTypes(config, toFileCategory(fileType))
}
