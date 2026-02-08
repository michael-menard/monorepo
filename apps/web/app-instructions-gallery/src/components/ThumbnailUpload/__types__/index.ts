/**
 * ThumbnailUpload Component Types
 * Story INST-1103: Upload Thumbnail
 */

import { z } from 'zod'

export const ThumbnailUploadPropsSchema = z.object({
  mocId: z.string().uuid(),
  existingThumbnailUrl: z.string().url().optional(),
  onSuccess: z.function(z.tuple([z.string()]), z.void()).optional(),
})

export type ThumbnailUploadProps = z.infer<typeof ThumbnailUploadPropsSchema>

// Client-side validation constants
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes
export const MIN_FILE_SIZE = 100 // 100 bytes

export type AllowedFileType = (typeof ALLOWED_FILE_TYPES)[number]

// Validation result type
export const FileValidationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
})

export type FileValidationResult = z.infer<typeof FileValidationResultSchema>
