/**
 * Upload Config Functions
 *
 * Pure functions that accept a config object and return limits/validations.
 * No process.env access - config is injected by the caller.
 */

import type { FileCategory, UploadConfig } from './schema'

/**
 * Get file size limit in bytes for a given file category
 *
 * @param config - Upload configuration object
 * @param category - File category (instruction, parts-list, thumbnail, gallery-image)
 * @returns Size limit in bytes
 */
export const getFileSizeLimit = (config: UploadConfig, category: FileCategory): number => {
  switch (category) {
    case 'instruction':
      return config.pdfMaxBytes
    case 'parts-list':
      return config.partsListMaxBytes
    case 'thumbnail':
      return config.thumbnailMaxBytes
    case 'gallery-image':
      return config.imageMaxBytes
  }
}

/**
 * Get max file count for a given file category
 *
 * @param config - Upload configuration object
 * @param category - File category (instruction, parts-list, thumbnail, gallery-image)
 * @returns Max file count
 */
export const getFileCountLimit = (config: UploadConfig, category: FileCategory): number => {
  switch (category) {
    case 'instruction':
      return 1 // Only one instruction PDF per MOC
    case 'parts-list':
      return config.maxPartsListsPerMoc
    case 'thumbnail':
      return 1 // Only one thumbnail per MOC
    case 'gallery-image':
      return config.maxImagesPerMoc
  }
}

/**
 * Check if a MIME type is allowed for a given file category
 *
 * @param config - Upload configuration object
 * @param category - File category (instruction, parts-list, thumbnail, gallery-image)
 * @param mimeType - MIME type to check
 * @returns true if allowed, false otherwise
 */
export const isMimeTypeAllowed = (
  config: UploadConfig,
  category: FileCategory,
  mimeType: string,
): boolean => {
  const normalizedMime = mimeType.toLowerCase()
  const allowedTypes = getAllowedMimeTypes(config, category)
  return allowedTypes.includes(normalizedMime)
}

/**
 * Get allowed MIME types for a given file category
 *
 * @param config - Upload configuration object
 * @param category - File category (instruction, parts-list, thumbnail, gallery-image)
 * @returns Array of allowed MIME types
 */
export const getAllowedMimeTypes = (config: UploadConfig, category: FileCategory): string[] => {
  switch (category) {
    case 'instruction':
      return config.allowedPdfMimeTypes
    case 'parts-list':
      return config.allowedPartsListMimeTypes
    case 'thumbnail':
    case 'gallery-image':
      return config.allowedImageMimeTypes
  }
}

/**
 * Get presign URL TTL in seconds
 *
 * @param config - Upload configuration object
 * @returns TTL in seconds
 */
export const getPresignTtlSeconds = (config: UploadConfig): number => {
  return config.presignTtlMinutes * 60
}

/**
 * Get session TTL in seconds
 *
 * @param config - Upload configuration object
 * @returns TTL in seconds
 */
export const getSessionTtlSeconds = (config: UploadConfig): number => {
  return config.sessionTtlMinutes * 60
}

/**
 * Convert megabytes to bytes
 *
 * @param mb - Size in megabytes
 * @returns Size in bytes
 */
export const mbToBytes = (mb: number): number => mb * 1024 * 1024

/**
 * Convert bytes to megabytes
 *
 * @param bytes - Size in bytes
 * @returns Size in megabytes
 */
export const bytesToMb = (bytes: number): number => bytes / (1024 * 1024)

/**
 * Format bytes as human-readable string
 *
 * @param bytes - Size in bytes
 * @returns Human-readable string (e.g., "50 MB", "1.5 GB")
 */
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
