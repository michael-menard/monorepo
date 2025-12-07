/**
 * Upload Session Schemas
 *
 * Story 3.1.11: Upload Session Endpoint — Validation, Owner Keys, TTL
 *
 * Zod schemas for upload session API endpoints.
 */

import { z } from 'zod'

/**
 * File category enum - allowed upload categories
 */
export const FileCategorySchema = z.enum(['instruction', 'parts-list', 'image', 'thumbnail'])
export type FileCategory = z.infer<typeof FileCategorySchema>

/**
 * File metadata for session creation (pre-validation)
 */
export const FileMetadataSchema = z.object({
  /** File category (instruction, parts-list, image, thumbnail) */
  category: FileCategorySchema,
  /** Original file name */
  name: z.string().min(1, 'File name is required').max(255, 'File name too long'),
  /** File size in bytes */
  size: z.number().int().positive('File size must be positive'),
  /** MIME type (hint only, will be re-validated at finalize) */
  type: z.string().min(1, 'MIME type is required'),
  /** File extension (without dot) */
  ext: z.string().min(1, 'File extension is required').max(10, 'Extension too long'),
})

export type FileMetadata = z.infer<typeof FileMetadataSchema>

/**
 * Create session request schema
 */
export const CreateSessionRequestSchema = z.object({
  /** Files to upload in this session */
  files: z.array(FileMetadataSchema).min(1, 'At least one file is required'),
})

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>

/**
 * Registered file response (after createMultipart)
 */
export const RegisteredFileSchema = z.object({
  /** Server-assigned file ID */
  fileId: z.string().uuid(),
  /** S3 multipart upload ID */
  uploadId: z.string(),
  /** Original file name */
  name: z.string(),
  /** File category */
  category: FileCategorySchema,
  /** S3 key for this file */
  s3Key: z.string(),
})

export type RegisteredFile = z.infer<typeof RegisteredFileSchema>

/**
 * Create session response schema
 */
export const CreateSessionResponseSchema = z.object({
  /** Upload session ID */
  sessionId: z.string().uuid(),
  /** Part size for multipart uploads (bytes) */
  partSizeBytes: z.number().int().positive(),
  /** Session expiration timestamp (ISO 8601) */
  expiresAt: z.string().datetime(),
})

export type CreateSessionResponse = z.infer<typeof CreateSessionResponseSchema>

/**
 * Register file request schema
 */
export const RegisterFileRequestSchema = z.object({
  /** File category */
  category: FileCategorySchema,
  /** Original file name */
  name: z.string().min(1).max(255),
  /** File size in bytes */
  size: z.number().int().positive(),
  /** MIME type */
  type: z.string().min(1),
  /** File extension */
  ext: z.string().min(1).max(10),
})

export type RegisterFileRequest = z.infer<typeof RegisterFileRequestSchema>

/**
 * Register file response schema
 */
export const RegisterFileResponseSchema = z.object({
  /** Server-assigned file ID */
  fileId: z.string().uuid(),
  /** S3 multipart upload ID */
  uploadId: z.string(),
})

export type RegisterFileResponse = z.infer<typeof RegisterFileResponseSchema>

/**
 * Upload part response schema
 */
export const UploadPartResponseSchema = z.object({
  /** Part number */
  partNumber: z.number().int().positive(),
  /** ETag from S3 (required for complete) */
  etag: z.string(),
})

export type UploadPartResponse = z.infer<typeof UploadPartResponseSchema>

/**
 * Complete file request schema
 */
export const CompleteFileRequestSchema = z.object({
  /** Array of parts with ETag */
  parts: z.array(
    z.object({
      partNumber: z.number().int().positive(),
      etag: z.string(),
    }),
  ),
})

export type CompleteFileRequest = z.infer<typeof CompleteFileRequestSchema>

/**
 * Complete file response schema
 */
export const CompleteFileResponseSchema = z.object({
  /** File URL after completion */
  fileUrl: z.string().url(),
  /** File ID */
  fileId: z.string().uuid(),
})

export type CompleteFileResponse = z.infer<typeof CompleteFileResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Finalize Endpoint Schemas (Story 3.1.12)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Finalize session request schema
 */
export const FinalizeSessionRequestSchema = z.object({
  /** Upload session ID */
  uploadSessionId: z.string().uuid('Invalid upload session ID'),
  /** MOC title */
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  /** MOC description (optional) */
  description: z.string().max(5000, 'Description too long').optional(),
  /** Tags (optional) */
  tags: z.array(z.string().max(50)).max(20, 'Maximum 20 tags allowed').optional(),
  /** Theme (optional) */
  theme: z.string().max(100).optional(),
})

export type FinalizeSessionRequest = z.infer<typeof FinalizeSessionRequestSchema>

/**
 * File verification result
 */
export const FileVerificationResultSchema = z.object({
  /** File ID */
  fileId: z.string().uuid(),
  /** File category */
  category: FileCategorySchema,
  /** Verification passed */
  verified: z.boolean(),
  /** Error message if verification failed */
  error: z.string().optional(),
})

export type FileVerificationResult = z.infer<typeof FileVerificationResultSchema>

/**
 * Finalize session response schema (success)
 */
export const FinalizeSessionResponseSchema = z.object({
  /** MOC instruction ID */
  id: z.string().uuid(),
  /** MOC title */
  title: z.string(),
  /** URL-friendly slug */
  slug: z.string(),
  /** MOC description */
  description: z.string().nullable(),
  /** Status (always 'private' on create) */
  status: z.string(),
  /** PDF key (S3 key for instruction file) */
  pdfKey: z.string(),
  /** Image keys (S3 keys for images) */
  imageKeys: z.array(z.string()),
  /** Parts list keys (S3 keys for parts lists) */
  partsKeys: z.array(z.string()),
  /** Tags */
  tags: z.array(z.string()).nullable(),
  /** Theme */
  theme: z.string().nullable(),
  /** Created timestamp */
  createdAt: z.string().datetime(),
  /** Was this response idempotent (already finalized) */
  idempotent: z.boolean().optional(),
})

export type FinalizeSessionResponse = z.infer<typeof FinalizeSessionResponseSchema>
