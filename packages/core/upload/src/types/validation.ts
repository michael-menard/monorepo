/**
 * File Validation Types
 *
 * Client-side file validation result schema.
 * Used by upload components (InstructionsUpload, ThumbnailUpload) for
 * reporting validation outcomes to the UI.
 *
 * Note: The backend FileValidationResultSchema in moc-instructions-core
 * is intentionally different (richer structure with fileId, errors[], warnings[]).
 * Do NOT consolidate frontend and backend schemas.
 */

import { z } from 'zod'

/**
 * Schema for client-side file validation results.
 * Simple pass/fail with optional error message.
 */
export const FileValidationResultSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
})

export type FileValidationResult = z.infer<typeof FileValidationResultSchema>
