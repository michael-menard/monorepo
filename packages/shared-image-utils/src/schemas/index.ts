import { z } from 'zod'

// Image format schema
export const ImageFormatSchema = z.enum(['jpeg', 'png', 'webp', 'avif'])

// Image fit mode schema
export const ImageFitSchema = z.enum(['cover', 'contain', 'fill', 'inside', 'outside'])

// Image processing configuration schema
export const ImageProcessingConfigSchema = z.object({
  maxWidth: z.number().positive().default(800),
  maxHeight: z.number().positive().default(800),
  quality: z.number().min(1).max(100).default(85),
  format: ImageFormatSchema.default('jpeg'),
  fit: ImageFitSchema.default('cover'),
  progressive: z.boolean().default(true),
  optimizeCoding: z.boolean().default(true),
  stripMetadata: z.boolean().default(true),
  blur: z.number().min(0).max(100).optional(),
  sharpen: z.boolean().default(false),
  rotate: z.boolean().default(true)
})

// Image validation schema
export const ImageValidationSchema = z.object({
  maxSizeMB: z.number().positive().default(10),
  allowedTypes: z.array(z.string()).default([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/avif'
  ]),
  minWidth: z.number().positive().optional(),
  minHeight: z.number().positive().optional(),
  maxWidth: z.number().positive().optional(),
  maxHeight: z.number().positive().optional()
})

// Image optimization result schema
export const ImageOptimizationResultSchema = z.object({
  originalSize: z.number().positive(),
  optimizedSize: z.number().positive(),
  compressionRatio: z.number().min(0).max(1),
  width: z.number().positive(),
  height: z.number().positive(),
  format: ImageFormatSchema,
  quality: z.number().min(1).max(100),
  processingTime: z.number().positive()
})

// Image variant configuration schema
export const ImageVariantConfigSchema = z.object({
  name: z.string(),
  config: ImageProcessingConfigSchema,
  suffix: z.string().optional()
})

// Multiple image variants schema
export const ImageVariantsSchema = z.object({
  original: z.instanceof(Buffer),
  variants: z.record(z.string(), z.instanceof(Buffer)).optional()
})

// File validation schema
export const FileValidationSchema = z.object({
  file: z.instanceof(File),
  validation: ImageValidationSchema
})

// Export types
export type ImageFormat = z.infer<typeof ImageFormatSchema>
export type ImageFit = z.infer<typeof ImageFitSchema>
export type ImageProcessingConfig = z.infer<typeof ImageProcessingConfigSchema>
export type ImageValidation = z.infer<typeof ImageValidationSchema>
export type ImageOptimizationResult = z.infer<typeof ImageOptimizationResultSchema>
export type ImageVariantConfig = z.infer<typeof ImageVariantConfigSchema>
export type ImageVariants = z.infer<typeof ImageVariantsSchema>
export type FileValidation = z.infer<typeof FileValidationSchema> 