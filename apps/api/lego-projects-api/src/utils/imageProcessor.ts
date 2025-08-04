import { Request, Response, NextFunction } from 'express';
import {
  processImage as processImageShared,
  createImageVariants as createImageVariantsShared,
  getImageMetadata,
  getOptimalFormat,
  canProcessImage,
  calculateOptimalQuality,
  getPreset,
  type ImageProcessingConfig,
  type ImageOptimizationStats,
} from '@repo/shared-image-utils';

// Re-export types for backward compatibility
export type { ImageProcessingConfig } from '@repo/shared-image-utils';

// Default configuration for avatar images (using shared preset)
export const DEFAULT_AVATAR_CONFIG: ImageProcessingConfig = getPreset('avatar');

// High-quality configuration for profile images
export const HIGH_QUALITY_CONFIG: ImageProcessingConfig = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 90,
  format: 'jpeg',
  fit: 'inside',
  progressive: true,
  optimizeCoding: true,
  stripMetadata: true,
  sharpen: true,
  rotate: true,
};

// Thumbnail configuration for previews (using shared preset)
export const THUMBNAIL_CONFIG: ImageProcessingConfig = getPreset('thumbnail');

/**
 * Process and resize an image buffer
 */
export async function processImage(
  buffer: Buffer,
  config: ImageProcessingConfig = DEFAULT_AVATAR_CONFIG,
): Promise<Buffer> {
  try {
    const { buffer: processedBuffer } = await processImageShared(buffer, config);
    return processedBuffer;
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error('Failed to process image');
  }
}

/**
 * Create multiple sizes of an image (original, medium, thumbnail)
 */
export async function createImageVariants(
  buffer: Buffer,
  baseConfig: ImageProcessingConfig = DEFAULT_AVATAR_CONFIG,
): Promise<{
  original: Buffer;
  medium?: Buffer;
  thumbnail?: Buffer;
}> {
  const result: {
    original: Buffer;
    medium?: Buffer;
    thumbnail?: Buffer;
  } = {
    original: buffer,
  };

  try {
    // Create medium size if original is larger than medium config
    const mediumConfig = { ...baseConfig, ...HIGH_QUALITY_CONFIG };
    const metadata = await getImageMetadata(buffer);

    if (metadata.width > mediumConfig.maxWidth || metadata.height > mediumConfig.maxHeight) {
      const { buffer: mediumBuffer } = await processImageShared(buffer, mediumConfig);
      result.medium = mediumBuffer;
    }

    // Create thumbnail
    const { buffer: thumbnailBuffer } = await processImageShared(buffer, THUMBNAIL_CONFIG);
    result.thumbnail = thumbnailBuffer;

    return result;
  } catch (error) {
    console.error('Error creating image variants:', error);
    // Return original if processing fails
    return { original: buffer };
  }
}

/**
 * Get optimal image format based on file extension and content
 */
export { getOptimalFormat } from '@repo/shared-image-utils';

/**
 * Middleware to process uploaded images
 */
export function imageProcessingMiddleware(config?: Partial<ImageProcessingConfig>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      return next();
    }

    try {
      const processingConfig: ImageProcessingConfig = {
        ...DEFAULT_AVATAR_CONFIG,
        ...config,
        format: getOptimalFormat(req.file.originalname, req.file.mimetype),
      };

      // Process the image
      const processedBuffer = await processImage(req.file.buffer, processingConfig);

      // Update the file buffer with processed image
      req.file.buffer = processedBuffer;
      req.file.size = processedBuffer.length;

      // Update filename to reflect new format
      const ext = processingConfig.format;
      const baseName = req.file.originalname.split('.')[0];
      req.file.originalname = `${baseName}.${ext}`;
      req.file.mimetype = `image/${ext}`;

      next();
    } catch (error) {
      console.error('Image processing middleware error:', error);
      return res.status(500).json({
        error: 'Failed to process uploaded image',
      });
    }
  };
}

/**
 * Validate if an image can be processed
 */
export { canProcessImage } from '@repo/shared-image-utils';

/**
 * Get image dimensions from buffer
 */
export async function getImageDimensions(
  buffer: Buffer,
): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await getImageMetadata(buffer);
    return { width: metadata.width, height: metadata.height };
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    return null;
  }
}
