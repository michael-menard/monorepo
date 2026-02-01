/**
 * Image Processing Module
 *
 * Exports image optimization and watermarking functionality.
 *
 * Story: WISH-2016 - Image Optimization
 */

export {
  createSharpImageOptimizer,
  calculateDimensions,
  calculateWatermarkPosition,
  applyWatermarkToImage,
  SIZE_CONFIGS,
  DEFAULT_WATERMARK_OPTIONS,
  type ImageOptimizerPort,
} from './optimizer.js'

export type {
  ImageSize,
  ImageSizeConfig,
  ProcessedImage,
  ImageMetadata,
  ImageFormat,
  WatermarkOptions,
  WatermarkPosition,
  ImageVariants,
  ImageVariantMetadata,
  ProcessingStatus,
  ProcessingContext,
} from './__types__/index.js'

export {
  ImageSizeSchema,
  ImageSizeConfigSchema,
  ProcessedImageSchema,
  ImageMetadataSchema,
  ImageFormatSchema,
  WatermarkOptionsSchema,
  WatermarkPositionSchema,
  ImageVariantsSchema,
  ImageVariantMetadataSchema,
  ProcessingStatusSchema,
  ProcessingContextSchema,
} from './__types__/index.js'
