/**
 * HEIC Conversion Type Definitions
 *
 * Story WISH-2045: HEIC/HEIF Image Format Support
 */

import { z } from 'zod'

/**
 * WISH-2045: HEIC conversion result schema
 */
export const HEICConversionResultSchema = z.object({
  converted: z.boolean(),
  file: z.custom<File>(val => val instanceof File),
  originalSize: z.number(),
  convertedSize: z.number(),
  error: z.string().optional(),
})

export type HEICConversionResult = z.infer<typeof HEICConversionResultSchema>

/**
 * WISH-2045: Progress callback type for HEIC conversion
 */
export type HEICConversionProgressCallback = (progress: number) => void
