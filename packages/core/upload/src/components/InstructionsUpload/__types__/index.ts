/**
 * InstructionsUpload Component Types
 * Story INST-1104: Upload Instructions (Direct ≤10MB)
 */
import { z } from 'zod'
// TODO(REPA-005): Remove re-export when component migrates to @repo/upload
import { FileValidationResultSchema, type FileValidationResult } from '@repo/upload/types'

export const InstructionsUploadPropsSchema = z.object({
  mocId: z.string().uuid(),
  onSuccess: z.any().optional(),
})

export type InstructionsUploadProps = z.infer<typeof InstructionsUploadPropsSchema>

// Client-side validation constants (AC7, AC72-73)
export const ALLOWED_PDF_MIME_TYPES = ['application/pdf'] as const
export const ALLOWED_PDF_EXTENSIONS = ['.pdf'] as const
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes (AC7, AC73)
export const MIN_FILE_SIZE = 100 // 100 bytes

export type AllowedPdfMimeType = (typeof ALLOWED_PDF_MIME_TYPES)[number]
export type AllowedPdfExtension = (typeof ALLOWED_PDF_EXTENSIONS)[number]

// File item in upload queue
export const FileItemSchema = z.object({
  id: z.string(),
  file: z.instanceof(File),
  status: z.enum(['pending', 'uploading', 'success', 'error']),
  progress: z.number().min(0).max(100).default(0),
  error: z.string().optional(),
})

export type FileItem = z.infer<typeof FileItemSchema>

export { FileValidationResultSchema, type FileValidationResult }
