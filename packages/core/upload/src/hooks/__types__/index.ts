/**
 * Upload Hook Type Definitions
 *
 * Story REPA-004: Migrate Image Processing to Shared Package
 */

import { z } from 'zod'

/**
 * Presigned URL response from backend
 */
export const PresignedUrlResponseSchema = z.object({
  presignedUrl: z.string().url(),
  key: z.string(),
  expiresIn: z.number().optional(),
})

export type PresignedUrlResponse = z.infer<typeof PresignedUrlResponseSchema>

/**
 * Upload state including compression and conversion phases
 */
export const UploadStateSchema = z.enum([
  'idle',
  'converting',
  'compressing',
  'preparing',
  'uploading',
  'complete',
  'error',
])

export type UploadState = z.infer<typeof UploadStateSchema>

/**
 * Options for the upload function
 */
export const ImageUploadOptionsSchema = z.object({
  preset: z.enum(['low-bandwidth', 'balanced', 'high-quality']).optional(),
  skipCompression: z.boolean().optional(),
  compressedFile: z.custom<File>(val => val instanceof File).optional(),
})

export type ImageUploadOptions = z.infer<typeof ImageUploadOptionsSchema>
