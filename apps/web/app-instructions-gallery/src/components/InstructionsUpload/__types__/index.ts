/**
 * InstructionsUpload Component Types
 * Story INST-1104: Upload Instructions (Direct ≤10MB)
 */

import { z } from 'zod'

export const InstructionsUploadPropsSchema = z.object({
  mocId: z.string().uuid(),
  onSuccess: z.function(z.tuple([]), z.void()).optional(),
})

export type InstructionsUploadProps = z.infer<typeof InstructionsUploadPropsSchema>

// Client-side validation constants (AC7, AC72-73)
export const ALLOWED_PDF_MIME_TYPES = ['application/pdf'] as const
export const ALLOWED_PDF_EXTENSIONS = ['.pdf'] as const
export const MAX_DIRECT_UPLOAD_SIZE = 10 * 1024 * 1024 // 10MB - direct upload limit (INST-1104)
export const MAX_PRESIGNED_UPLOAD_SIZE = 50 * 1024 * 1024 // 50MB - presigned upload limit (INST-1105)
export const MIN_FILE_SIZE = 100 // 100 bytes

// Legacy alias for backwards compatibility
export const MAX_FILE_SIZE = MAX_DIRECT_UPLOAD_SIZE

export type AllowedPdfMimeType = (typeof ALLOWED_PDF_MIME_TYPES)[number]
export type AllowedPdfExtension = (typeof ALLOWED_PDF_EXTENSIONS)[number]

/**
 * Upload flow type
 * - direct: For files <=10MB, uploaded via RTK Query mutation
 * - presigned: For files >10MB and <=50MB, uses presigned S3 URL
 */
export const UploadFlowSchema = z.enum(['direct', 'presigned'])
export type UploadFlow = z.infer<typeof UploadFlowSchema>

// File item in upload queue
export const FileItemSchema = z.object({
  id: z.string(),
  file: z.instanceof(File),
  status: z.enum(['pending', 'uploading', 'success', 'error', 'canceled', 'expired']),
  progress: z.number().min(0).max(100).default(0),
  error: z.string().optional(),
  /** Upload flow type based on file size (INST-1105) */
  uploadFlow: UploadFlowSchema.optional(),
})

export type FileItem = z.infer<typeof FileItemSchema>

// Validation result type
export const FileValidationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
})

export type FileValidationResult = z.infer<typeof FileValidationResultSchema>
