/**
 * Environment Configuration Loader
 *
 * Reads environment variables and returns typed configuration objects.
 * This is the bridge between process.env and the @repo/upload-config package.
 */

import { z } from 'zod'
import type { UploadConfig } from '@repo/upload-config'
import { mbToBytes, DEFAULT_UPLOAD_CONFIG } from '@repo/upload-config'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('env-loader')

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
const UploadEnvSchema = z.object({
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
 * Default allowed MIME types by file category
 */
const DEFAULT_ALLOWED_MIME_TYPES = {
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
 * Extended config with API-specific fields not in the shared package
 */
export interface ExtendedEnvConfig extends UploadConfig {
  /** Allowed image file extensions (from env) */
  allowedImageFormats: string[]
  /** Allowed parts list file extensions (from env) */
  allowedPartsFormats: string[]
}

// Cached config singleton
let _uploadConfig: ExtendedEnvConfig | null = null

/**
 * Load upload configuration from environment variables.
 * Validates env vars with Zod and returns a typed UploadConfig.
 *
 * @throws Error with structured Zod issues on validation failure
 */
export const loadEnvConfig = (): ExtendedEnvConfig => {
  // Return cached config if available
  if (_uploadConfig) {
    return _uploadConfig
  }

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

  const env = result.data

  const config: ExtendedEnvConfig = {
    pdfMaxBytes: mbToBytes(env.UPLOAD_PDF_MAX_MB),
    imageMaxBytes: mbToBytes(env.UPLOAD_IMAGE_MAX_MB),
    partsListMaxBytes: mbToBytes(env.UPLOAD_PARTSLIST_MAX_MB),
    thumbnailMaxBytes: mbToBytes(env.UPLOAD_IMAGE_MAX_MB), // Same as image

    maxImagesPerMoc: env.UPLOAD_IMAGE_MAX_COUNT,
    maxPartsListsPerMoc: env.UPLOAD_PARTSLIST_MAX_COUNT,

    allowedPdfMimeTypes: DEFAULT_ALLOWED_MIME_TYPES.instruction,
    allowedImageMimeTypes: DEFAULT_ALLOWED_MIME_TYPES.image,
    allowedPartsListMimeTypes: DEFAULT_ALLOWED_MIME_TYPES.partsList,

    presignTtlMinutes: env.PRESIGN_TTL_MINUTES,
    sessionTtlMinutes: env.PRESIGN_TTL_MINUTES,

    rateLimitPerDay: env.UPLOAD_RATE_LIMIT_PER_DAY,
    finalizeLockTtlMinutes: env.FINALIZE_LOCK_TTL_MINUTES,

    // API-specific: allowed file extensions from env
    allowedImageFormats: env.UPLOAD_ALLOWED_IMAGE_FORMATS,
    allowedPartsFormats: env.UPLOAD_ALLOWED_PARTS_FORMATS,
  }

  logger.info('Upload config loaded from environment', {
    pdfMaxMb: env.UPLOAD_PDF_MAX_MB,
    imageMaxMb: env.UPLOAD_IMAGE_MAX_MB,
    partsListMaxMb: env.UPLOAD_PARTSLIST_MAX_MB,
    maxImagesPerMoc: config.maxImagesPerMoc,
    maxPartsListsPerMoc: config.maxPartsListsPerMoc,
    presignTtlMinutes: config.presignTtlMinutes,
    rateLimitPerDay: config.rateLimitPerDay,
    allowedImageFormats: config.allowedImageFormats,
    allowedPartsFormats: config.allowedPartsFormats,
  })

  // Cache the config
  _uploadConfig = config

  return config
}

/**
 * Reset cached config (for testing)
 */
export const resetEnvConfig = (): void => {
  _uploadConfig = null
}

/**
 * Get default upload config (no env validation)
 * Useful for tests and browser environments
 */
export const getDefaultConfig = (): UploadConfig => {
  return DEFAULT_UPLOAD_CONFIG
}
