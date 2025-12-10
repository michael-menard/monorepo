/**
 * Upload Config Schema
 *
 * Zod schema for validating upload configuration objects.
 * This schema validates the config object itself, NOT environment variables.
 * Environment validation happens in the server-side loader.
 */

import { z } from 'zod'

/**
 * File category type - used to categorize different upload types
 */
export const FileCategorySchema = z.enum([
  'instruction',
  'parts-list',
  'thumbnail',
  'gallery-image',
])

export type FileCategory = z.infer<typeof FileCategorySchema>

/**
 * Allowed MIME types by file category
 */
export const AllowedMimeTypesSchema = z.object({
  instruction: z.array(z.string()),
  partsList: z.array(z.string()),
  image: z.array(z.string()),
})

export type AllowedMimeTypes = z.infer<typeof AllowedMimeTypesSchema>

/**
 * Upload configuration schema
 * Pure config object - no environment dependencies
 */
export const UploadConfigSchema = z.object({
  // Size limits in bytes
  pdfMaxBytes: z.number().int().positive(),
  imageMaxBytes: z.number().int().positive(),
  partsListMaxBytes: z.number().int().positive(),
  thumbnailMaxBytes: z.number().int().positive(),

  // Count limits
  maxImagesPerMoc: z.number().int().positive(),
  maxPartsListsPerMoc: z.number().int().positive(),

  // Allowed MIME types by category
  allowedPdfMimeTypes: z.array(z.string()),
  allowedImageMimeTypes: z.array(z.string()),
  allowedPartsListMimeTypes: z.array(z.string()),

  // TTL settings
  presignTtlMinutes: z.number().int().min(1).max(60),
  sessionTtlMinutes: z.number().int().min(1).max(60),

  // Rate limiting
  rateLimitPerDay: z.number().int().positive(),

  // Finalize lock TTL
  finalizeLockTtlMinutes: z.number().int().positive(),
})

export type UploadConfig = z.infer<typeof UploadConfigSchema>

/**
 * Default allowed MIME types by file category
 */
export const DEFAULT_ALLOWED_MIME_TYPES: AllowedMimeTypes = {
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
 * Default upload configuration
 * Used as fallback when no config is provided
 */
export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  pdfMaxBytes: 50 * 1024 * 1024, // 50 MB
  imageMaxBytes: 20 * 1024 * 1024, // 20 MB
  partsListMaxBytes: 10 * 1024 * 1024, // 10 MB
  thumbnailMaxBytes: 20 * 1024 * 1024, // 20 MB (same as image)

  maxImagesPerMoc: 10,
  maxPartsListsPerMoc: 5,

  allowedPdfMimeTypes: DEFAULT_ALLOWED_MIME_TYPES.instruction,
  allowedImageMimeTypes: DEFAULT_ALLOWED_MIME_TYPES.image,
  allowedPartsListMimeTypes: DEFAULT_ALLOWED_MIME_TYPES.partsList,

  presignTtlMinutes: 15,
  sessionTtlMinutes: 15,

  rateLimitPerDay: 100,
  finalizeLockTtlMinutes: 5,
}

/**
 * Valid image formats (file extensions, lowercase)
 */
export const VALID_IMAGE_FORMATS = ['jpeg', 'jpg', 'png', 'webp', 'heic', 'heif', 'gif'] as const

/**
 * Valid parts list formats (file extensions, lowercase)
 */
export const VALID_PARTS_FORMATS = ['txt', 'csv', 'json', 'xml', 'xlsx', 'xls'] as const

export type ValidImageFormat = (typeof VALID_IMAGE_FORMATS)[number]
export type ValidPartsFormat = (typeof VALID_PARTS_FORMATS)[number]
