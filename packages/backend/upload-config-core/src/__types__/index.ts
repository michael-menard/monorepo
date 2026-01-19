/**
 * Type definitions for upload config core logic
 * Using Zod schemas per CLAUDE.md requirements
 */

import { z } from 'zod'
import { UploadConfigSchema } from '@repo/upload-config'

/**
 * Environment variables for upload configuration
 * Platform-agnostic - just a key-value map
 */
export const EnvVarsSchema = z.record(z.string(), z.string().optional())
export type EnvVars = z.infer<typeof EnvVarsSchema>

/**
 * Public upload config response type
 * Excludes any internal/sensitive fields
 */
export const PublicUploadConfigSchema = UploadConfigSchema.pick({
  pdfMaxBytes: true,
  imageMaxBytes: true,
  partsListMaxBytes: true,
  thumbnailMaxBytes: true,
  maxImagesPerMoc: true,
  maxPartsListsPerMoc: true,
  allowedPdfMimeTypes: true,
  allowedImageMimeTypes: true,
  allowedPartsListMimeTypes: true,
  presignTtlMinutes: true,
  sessionTtlMinutes: true,
})
export type PublicUploadConfig = z.infer<typeof PublicUploadConfigSchema>
