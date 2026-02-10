/**
 * Hook Type Definitions
 *
 * Zod schemas for hooks state and configuration.
 * Story WISH-2049: Background Compression Hook
 */

import { z } from 'zod'

/**
 * Background compression status enum
 * WISH-2049: Tracks lifecycle of background compression operation
 */
export const BackgroundCompressionStatusSchema = z.enum([
  'idle',
  'compressing',
  'complete',
  'failed',
])

export type BackgroundCompressionStatus = z.infer<typeof BackgroundCompressionStatusSchema>

/**
 * Background compression state schema
 * WISH-2049: Complete state for background compression hook
 */
export const BackgroundCompressionStateSchema = z.object({
  /** Current compression status */
  status: BackgroundCompressionStatusSchema,
  /** Original file before compression */
  originalFile: z.custom<File>(val => val instanceof File).nullable(),
  /** Compressed file (if compression succeeded) */
  compressedFile: z.custom<File>(val => val instanceof File).nullable(),
  /** Compression result metadata */
  compressionResult: z
    .object({
      compressed: z.boolean(),
      file: z.custom<File>(val => val instanceof File),
      originalSize: z.number(),
      finalSize: z.number(),
      ratio: z.number(),
      error: z.string().optional(),
    })
    .nullable(),
  /** Compression progress (0-100) */
  progress: z.number().min(0).max(100),
  /** Error message (if compression failed) */
  error: z.string().nullable(),
  /** Unique request ID for stale result detection */
  requestId: z.string().nullable(),
})

export type BackgroundCompressionState = z.infer<typeof BackgroundCompressionStateSchema>
