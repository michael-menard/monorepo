/**
 * Upload API Schemas
 *
 * Zod schemas for presigned URL generation and file upload operations.
 * Story BUGF-032: Frontend Integration for Presigned URL Upload
 */

import { z } from 'zod'

/**
 * File category enum for upload types
 */
export const FileCategorySchema = z.enum(['instruction', 'parts-list', 'thumbnail', 'image'])

export type FileCategory = z.infer<typeof FileCategorySchema>

/**
 * Generate presigned URL request schema
 */
export const GeneratePresignedUrlRequestSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.number().int().positive(),
  category: FileCategorySchema,
})

export type GeneratePresignedUrlRequest = z.infer<typeof GeneratePresignedUrlRequestSchema>

/**
 * Generate presigned URL response schema
 */
export const GeneratePresignedUrlResponseSchema = z.object({
  presignedUrl: z.string().url(),
  key: z.string(),
  expiresIn: z.number().int().positive(),
  expiresAt: z.string().datetime(),
})

export type GeneratePresignedUrlResponse = z.infer<typeof GeneratePresignedUrlResponseSchema>
