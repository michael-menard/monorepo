/**
 * Compression Presets Type Definitions
 *
 * Story WISH-2046: Client-side Image Compression Quality Presets
 * Story WISH-2058: Core WebP Conversion
 */

import { z } from 'zod'

/**
 * Compression configuration schema
 * WISH-2058: Changed default fileType from 'image/jpeg' to 'image/webp'
 */
export const CompressionConfigSchema = z.object({
  maxSizeMB: z.number().default(1),
  maxWidthOrHeight: z.number().default(1920),
  useWebWorker: z.boolean().default(true),
  fileType: z.string().default('image/webp'),
  initialQuality: z.number().min(0).max(1).default(0.8),
})

export type CompressionConfig = z.infer<typeof CompressionConfigSchema>

/**
 * WISH-2046: Compression preset name type
 */
export const CompressionPresetNameSchema = z.enum(['low-bandwidth', 'balanced', 'high-quality'])
export type CompressionPresetName = z.infer<typeof CompressionPresetNameSchema>

/**
 * WISH-2046: Compression preset schema
 */
export const CompressionPresetSchema = z.object({
  name: CompressionPresetNameSchema,
  label: z.string(),
  description: z.string(),
  settings: CompressionConfigSchema,
  estimatedSize: z.string(),
})

export type CompressionPreset = z.infer<typeof CompressionPresetSchema>
