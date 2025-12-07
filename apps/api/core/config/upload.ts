/**
 * Upload Configuration Module
 *
 * Story 3.1.5: Config and Validation Foundations
 *
 * Validates upload-related environment variables at startup using Zod.
 * Provides a typed config module for presign/finalize handlers and file validators.
 *
 * Environment Variables:
 * - UPLOAD_PDF_MAX_MB: Max PDF file size in MB (default: 50)
 * - UPLOAD_IMAGE_MAX_MB: Max image file size in MB (default: 20)
 * - UPLOAD_IMAGE_MAX_COUNT: Max images per upload (default: 10)
 * - UPLOAD_PARTSLIST_MAX_MB: Max parts list file size in MB (default: 10)
 * - UPLOAD_PARTSLIST_MAX_COUNT: Max parts lists per upload (default: 5)
 * - UPLOAD_ALLOWED_IMAGE_FORMATS: CSV of allowed image formats (default: jpeg,png,webp,heic)
 * - UPLOAD_ALLOWED_PARTS_FORMATS: CSV of allowed parts list formats (default: txt,csv,json,xml)
 * - UPLOAD_RATE_LIMIT_PER_DAY: Max uploads per user per day (default: 100)
 * - PRESIGN_TTL_MINUTES: Presigned URL TTL in minutes (default: 15, range: 1-60)
 */

import { z } from 'zod'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('upload-config')

// Valid image formats (lowercase, no dots)
const VALID_IMAGE_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'heic', 'heif', 'gif'] as const
// Valid parts list formats (lowercase, no dots)
const VALID_PARTS_FORMATS = ['txt', 'csv', 'json', 'xml', 'xlsx', 'xls'] as const

/**
 * Parse CSV string into normalized array (lowercase, trimmed, deduped, validated)
 */
const csvToFormats = <T extends readonly string[]>(
  validFormats: T,
  formatType: string,
  defaultValue: string,
) =>
  z
    .string()
    .default(defaultValue)
    .transform((val, ctx) => {
      const raw = val
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0)

      // Deduplicate
      const unique = [...new Set(raw)]

      // Validate each format
      const invalid = unique.filter(f => !validFormats.includes(f as T[number]))
      if (invalid.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid ${formatType} format(s): ${invalid.join(', ')}. Valid options: ${validFormats.join(', ')}`,
        })
        return z.NEVER
      }

      return unique as T[number][]
    })

/**
 * Positive integer schema with custom error message
 */
const positiveInt = (field: string, defaultValue: string) =>
  z
    .string()
    .default(defaultValue)
    .transform((val, ctx) => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${field} must be a positive integer, got: "${val}"`,
        })
        return z.NEVER
      }
      return num
    })

/**
 * Upload environment schema with defaults
 */
export const UploadEnvSchema = z.object({
  // File size limits (in MB)
  UPLOAD_PDF_MAX_MB: positiveInt('UPLOAD_PDF_MAX_MB', '50'),
  UPLOAD_IMAGE_MAX_MB: positiveInt('UPLOAD_IMAGE_MAX_MB', '20'),
  UPLOAD_PARTSLIST_MAX_MB: positiveInt('UPLOAD_PARTSLIST_MAX_MB', '10'),

  // File count limits
  UPLOAD_IMAGE_MAX_COUNT: positiveInt('UPLOAD_IMAGE_MAX_COUNT', '10'),
  UPLOAD_PARTSLIST_MAX_COUNT: positiveInt('UPLOAD_PARTSLIST_MAX_COUNT', '5'),

  // Allowed formats (CSV)
  UPLOAD_ALLOWED_IMAGE_FORMATS: csvToFormats(VALID_IMAGE_FORMATS, 'image', 'jpeg,png,webp,heic'),
  UPLOAD_ALLOWED_PARTS_FORMATS: csvToFormats(VALID_PARTS_FORMATS, 'parts list', 'txt,csv,json,xml'),

  // Rate limiting
  UPLOAD_RATE_LIMIT_PER_DAY: positiveInt('UPLOAD_RATE_LIMIT_PER_DAY', '100'),

  // Presigned URL TTL (minutes, 1-60)
  PRESIGN_TTL_MINUTES: z
    .string()
    .default('15')
    .transform((val, ctx) => {
      const num = parseInt(val, 10)
      if (isNaN(num) || num < 1 || num > 60 || !Number.isInteger(num)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `PRESIGN_TTL_MINUTES must be an integer between 1 and 60, got: "${val}"`,
        })
        return z.NEVER
      }
      return num
    }),

  // Finalize lock TTL (minutes, default 5) - Story 3.1.7
  FINALIZE_LOCK_TTL_MINUTES: positiveInt('FINALIZE_LOCK_TTL_MINUTES', '5'),
})

/**
 * Parsed upload environment type
 */
type UploadEnv = z.infer<typeof UploadEnvSchema>

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
 */
export interface UploadConfig {
  // Size limits in bytes
  pdfMaxBytes: number
  imageMaxBytes: number
  partsListMaxBytes: number

  // Size limits in MB (for display/logging)
  pdfMaxMb: number
  imageMaxMb: number
  partsListMaxMb: number

  // Count limits
  imageMaxCount: number
  partsListMaxCount: number

  // Allowed formats (normalized lowercase arrays - file extensions)
  allowedImageFormats: string[]
  allowedPartsFormats: string[]

  // Allowed MIME types by file category (Story 3.1.8)
  allowedMimeTypes: AllowedMimeTypes

  // Rate limiting
  rateLimitPerDay: number

  // Presigned URL TTL (also used as session TTL)
  presignTtlMinutes: number
  presignTtlSeconds: number

  // Alias for clarity (Story 3.1.8)
  sessionTtlMinutes: number
  sessionTtlSeconds: number

  // Finalize lock TTL (Story 3.1.7)
  finalizeLockTtlMinutes: number
}

/**
 * Convert MB to bytes
 */
const mbToBytes = (mb: number): number => mb * 1024 * 1024

/**
 * Default allowed MIME types by file category
 * Story 3.1.8: File type allowlists
 */
const DEFAULT_ALLOWED_MIME_TYPES: AllowedMimeTypes = {
  instruction: ['application/pdf'],
  partsList: [
    'text/csv',
    'application/csv',
    'text/plain',
    'application/json',
    'text/json',
    'application/xml',
    'text/xml',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
    'application/vnd.ms-excel', // xls
  ],
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
}

/**
 * Transform parsed env into UploadConfig
 */
const buildConfig = (env: UploadEnv): UploadConfig => ({
  pdfMaxBytes: mbToBytes(env.UPLOAD_PDF_MAX_MB),
  imageMaxBytes: mbToBytes(env.UPLOAD_IMAGE_MAX_MB),
  partsListMaxBytes: mbToBytes(env.UPLOAD_PARTSLIST_MAX_MB),

  pdfMaxMb: env.UPLOAD_PDF_MAX_MB,
  imageMaxMb: env.UPLOAD_IMAGE_MAX_MB,
  partsListMaxMb: env.UPLOAD_PARTSLIST_MAX_MB,

  imageMaxCount: env.UPLOAD_IMAGE_MAX_COUNT,
  partsListMaxCount: env.UPLOAD_PARTSLIST_MAX_COUNT,

  allowedImageFormats: env.UPLOAD_ALLOWED_IMAGE_FORMATS,
  allowedPartsFormats: env.UPLOAD_ALLOWED_PARTS_FORMATS,

  // Story 3.1.8: Allowed MIME types by file category
  allowedMimeTypes: DEFAULT_ALLOWED_MIME_TYPES,

  rateLimitPerDay: env.UPLOAD_RATE_LIMIT_PER_DAY,

  presignTtlMinutes: env.PRESIGN_TTL_MINUTES,
  presignTtlSeconds: env.PRESIGN_TTL_MINUTES * 60,

  // Story 3.1.8: Session TTL aliases (same as presign TTL)
  sessionTtlMinutes: env.PRESIGN_TTL_MINUTES,
  sessionTtlSeconds: env.PRESIGN_TTL_MINUTES * 60,

  finalizeLockTtlMinutes: env.FINALIZE_LOCK_TTL_MINUTES,
})

// Cached config singleton
let _uploadConfig: UploadConfig | null = null

/**
 * Validate upload environment variables and build config.
 * Call this at startup to fail fast on invalid config.
 *
 * @throws Error with structured Zod issues on validation failure
 */
export const validateUploadConfig = (): UploadConfig => {
  const result = UploadEnvSchema.safeParse(process.env)

  if (!result.success) {
    const issues = result.error.issues.map(issue => ({
      key: issue.path.join('.') || 'unknown',
      message: issue.message,
      code: issue.code,
    }))

    logger.error('Upload config validation failed', { issues })

    throw new Error(
      `Upload config validation failed:\n${issues.map(i => `  - ${i.key}: ${i.message}`).join('\n')}`,
    )
  }

  const config = buildConfig(result.data)

  logger.info('Upload config validated successfully', {
    pdfMaxMb: config.pdfMaxMb,
    imageMaxMb: config.imageMaxMb,
    partsListMaxMb: config.partsListMaxMb,
    imageMaxCount: config.imageMaxCount,
    partsListMaxCount: config.partsListMaxCount,
    allowedImageFormats: config.allowedImageFormats,
    allowedPartsFormats: config.allowedPartsFormats,
    rateLimitPerDay: config.rateLimitPerDay,
    presignTtlMinutes: config.presignTtlMinutes,
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
  if (!_uploadConfig) {
    _uploadConfig = validateUploadConfig()
  }
  return _uploadConfig
}

/**
 * Reset cached config (for testing)
 */
export const resetUploadConfig = (): void => {
  _uploadConfig = null
}

/**
 * Get file size limit by file type (in bytes)
 */
export const getFileSizeLimit = (
  fileType: 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image',
): number => {
  const config = getUploadConfig()

  switch (fileType) {
    case 'instruction':
      return config.pdfMaxBytes
    case 'parts-list':
      return config.partsListMaxBytes
    case 'thumbnail':
    case 'gallery-image':
      return config.imageMaxBytes
    default:
      throw new Error(`Unknown file type: ${fileType}`)
  }
}

/**
 * Get max file count by file type
 */
export const getFileCountLimit = (
  fileType: 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image',
): number => {
  const config = getUploadConfig()

  switch (fileType) {
    case 'instruction':
      return 1 // Only one instruction PDF per MOC
    case 'parts-list':
      return config.partsListMaxCount
    case 'thumbnail':
      return 1 // Only one thumbnail per MOC
    case 'gallery-image':
      return config.imageMaxCount
    default:
      throw new Error(`Unknown file type: ${fileType}`)
  }
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
  const config = getUploadConfig()
  const normalizedMime = mimeType.toLowerCase()

  switch (fileType) {
    case 'instruction':
      return config.allowedMimeTypes.instruction.includes(normalizedMime)
    case 'parts-list':
      return config.allowedMimeTypes.partsList.includes(normalizedMime)
    case 'thumbnail':
    case 'gallery-image':
      return config.allowedMimeTypes.image.includes(normalizedMime)
    default:
      return false
  }
}

/**
 * Get allowed MIME types for a file type
 * Story 3.1.8: For error messages
 */
export const getAllowedMimeTypes = (
  fileType: 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image',
): string[] => {
  const config = getUploadConfig()

  switch (fileType) {
    case 'instruction':
      return config.allowedMimeTypes.instruction
    case 'parts-list':
      return config.allowedMimeTypes.partsList
    case 'thumbnail':
    case 'gallery-image':
      return config.allowedMimeTypes.image
    default:
      return []
  }
}

// Re-export valid formats for external use
export { VALID_IMAGE_FORMATS, VALID_PARTS_FORMATS }
