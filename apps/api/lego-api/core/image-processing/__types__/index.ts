/**
 * Image Processing Types
 *
 * Zod schemas and types for image optimization operations.
 *
 * Story: WISH-2016 - Image Optimization
 */

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Image Size Configuration
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Available image sizes for optimization
 */
export const ImageSizeSchema = z.enum(['thumbnail', 'medium', 'large'])
export type ImageSize = z.infer<typeof ImageSizeSchema>

/**
 * Configuration for each image size
 */
export const ImageSizeConfigSchema = z.object({
  name: ImageSizeSchema,
  maxWidth: z.number().int().positive(),
  maxHeight: z.number().int().positive(),
  quality: z.number().int().min(1).max(100),
  applyWatermark: z.boolean(),
})

export type ImageSizeConfig = z.infer<typeof ImageSizeConfigSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Processed Image Output
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Supported output formats
 */
export const ImageFormatSchema = z.enum(['webp', 'jpeg', 'png'])
export type ImageFormat = z.infer<typeof ImageFormatSchema>

/**
 * Result of processing a single image size
 */
export const ProcessedImageSchema = z.object({
  size: ImageSizeSchema,
  buffer: z.instanceof(Buffer),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  format: ImageFormatSchema,
  sizeBytes: z.number().int().positive(),
  watermarked: z.boolean(),
})

export type ProcessedImage = z.infer<typeof ProcessedImageSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Watermark Options
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Watermark position options
 */
export const WatermarkPositionSchema = z.enum([
  'bottom-right',
  'bottom-left',
  'top-right',
  'top-left',
])
export type WatermarkPosition = z.infer<typeof WatermarkPositionSchema>

/**
 * Configuration for watermark overlay
 */
export const WatermarkOptionsSchema = z.object({
  position: WatermarkPositionSchema,
  opacity: z.number().min(0).max(1),
  margin: z.number().int().nonnegative(),
  width: z.number().int().positive(),
})

export type WatermarkOptions = z.infer<typeof WatermarkOptionsSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Image Metadata
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Metadata extracted from an image
 */
export const ImageMetadataSchema = z.object({
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  format: z.string(),
  sizeBytes: z.number().int().nonnegative().optional(),
})

export type ImageMetadata = z.infer<typeof ImageMetadataSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Image Variant Metadata (for database storage)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Metadata for a single image variant (stored in database)
 */
export const ImageVariantMetadataSchema = z.object({
  url: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  sizeBytes: z.number().int().positive(),
  format: ImageFormatSchema,
  watermarked: z.boolean().optional(),
})

export type ImageVariantMetadata = z.infer<typeof ImageVariantMetadataSchema>

/**
 * Processing status for image optimization
 */
export const ProcessingStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed'])
export type ProcessingStatus = z.infer<typeof ProcessingStatusSchema>

/**
 * Complete image variants structure (stored in database JSONB)
 */
export const ImageVariantsSchema = z.object({
  original: ImageVariantMetadataSchema.optional(),
  thumbnail: ImageVariantMetadataSchema.optional(),
  medium: ImageVariantMetadataSchema.optional(),
  large: ImageVariantMetadataSchema.optional(),
  processingStatus: ProcessingStatusSchema.optional(),
  processedAt: z.string().datetime().optional(),
  error: z.string().optional(),
})

export type ImageVariants = z.infer<typeof ImageVariantsSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Processing Context
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context for image processing operation
 */
export const ProcessingContextSchema = z.object({
  userId: z.string(),
  imageId: z.string(),
  s3Bucket: z.string(),
  s3Key: z.string(),
  originalSizeBytes: z.number().int().positive(),
})

export type ProcessingContext = z.infer<typeof ProcessingContextSchema>
