/**
 * Compression Type Definitions
 *
 * Story WISH-2022: Client-side Image Compression
 */

import { z } from 'zod'

/**
 * Progress callback type
 */
export type CompressionProgressCallback = (progress: number) => void

/**
 * Result of compression operation
 */
export const CompressionResultSchema = z.object({
  compressed: z.boolean(),
  file: z.custom<File>(val => val instanceof File),
  originalSize: z.number(),
  finalSize: z.number(),
  ratio: z.number(),
  error: z.string().optional(),
})

export type CompressionResult = z.infer<typeof CompressionResultSchema>
