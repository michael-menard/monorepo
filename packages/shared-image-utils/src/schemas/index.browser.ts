// Browser-specific schemas - excludes Node.js Buffer schemas
import { z } from 'zod'

// Image processing configuration schema
export const ImageProcessingConfigSchema = z.object({
  maxWidth: z.number().positive().optional(),
  maxHeight: z.number().positive().optional(),
  quality: z.number().min(1).max(100).default(80),
  format: z.enum(['jpeg', 'png', 'webp', 'avif']).default('jpeg'),
  fit: z.enum(['cover', 'contain', 'fill', 'inside', 'outside']).default('cover'),
  progressive: z.boolean().default(true),
  optimizeCoding: z.boolean().default(true),
  stripMetadata: z.boolean().default(true),
  rotate: z.boolean().default(true),
  sharpen: z.boolean().default(false),
  blur: z.number().min(0).max(100).optional(),
})

// Image validation schema
export const ImageValidationSchema = z.object({
  maxSizeMB: z.number().positive().default(10),
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'image/webp']),
  minWidth: z.number().positive().optional(),
  minHeight: z.number().positive().optional(),
  maxWidth: z.number().positive().optional(),
  maxHeight: z.number().positive().optional(),
})

// Frontend image processing options schema
export const FrontendImageProcessingOptionsSchema = z.object({
  file: z.instanceof(File),
  config: ImageProcessingConfigSchema.partial(),
  onProgress: z.function().args(z.number()).returns(z.void()).optional(),
})

// Image metadata schema
export const ImageMetadataSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  format: z.string(),
  size: z.number().positive(),
  hasAlpha: z.boolean(),
  isOpaque: z.boolean(),
  orientation: z.number().optional(),
})

// Image optimization stats schema
export const ImageOptimizationStatsSchema = z.object({
  originalSize: z.number().positive(),
  optimizedSize: z.number().positive(),
  compressionRatio: z.number(),
  processingTime: z.number().positive(),
  format: z.string(),
  quality: z.number().min(1).max(100),
})

// Validation result schema
export const ValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
})

// Frontend image result schema (no Buffer)
export const FrontendImageResultSchema = z.object({
  file: z.instanceof(File),
  stats: ImageOptimizationStatsSchema,
})

// Frontend image variants result schema (no Buffer)
export const FrontendImageVariantsResultSchema = z.object({
  name: z.string(),
  file: z.instanceof(File),
  stats: ImageOptimizationStatsSchema,
}) 