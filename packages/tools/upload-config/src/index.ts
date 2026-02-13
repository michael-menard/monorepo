/**
 * @repo/upload-config
 *
 * Shared upload configuration package for file size limits, MIME types, and count limits.
 *
 * This package provides pure functions that accept a config object.
 * It does NOT read process.env directly - config is injected by the caller.
 *
 * Server Usage:
 * ```typescript
 * import { getFileSizeLimit, UploadConfig } from '@repo/upload-config'
 * import { loadEnvConfig } from '@/core/config/env-loader'
 *
 * const config = loadEnvConfig()
 * const maxSize = getFileSizeLimit(config, 'instruction')
 * ```
 *
 * Browser Usage:
 * ```typescript
 * import { getFileSizeLimit, UploadConfig } from '@repo/upload-config'
 *
 * const config = await fetchUploadConfig() // from API
 * const maxSize = getFileSizeLimit(config, 'instruction')
 * ```
 */

// Schema and types
export {
  UploadConfigSchema,
  FileCategorySchema,
  AllowedMimeTypesSchema,
  DEFAULT_UPLOAD_CONFIG,
  DEFAULT_ALLOWED_MIME_TYPES,
  VALID_IMAGE_FORMATS,
  VALID_PARTS_FORMATS,
  // INST-1105: Presigned upload threshold
  PDF_MIN_BYTES_FOR_PRESIGNED,
} from './schema.js'

export type {
  UploadConfig,
  FileCategory,
  AllowedMimeTypes,
  ValidImageFormat,
  ValidPartsFormat,
} from './schema.js'

// Config functions
export {
  getFileSizeLimit,
  getFileCountLimit,
  isMimeTypeAllowed,
  getAllowedMimeTypes,
  getPresignTtlSeconds,
  getSessionTtlSeconds,
  mbToBytes,
  bytesToMb,
  formatBytes,
  // INST-1105: Presigned upload utilities
  shouldUsePresignedUpload,
  validateFileSizeForPresigned,
} from './limits.js'

// Types
export type { PresignedUploadValidation } from './limits.js'
