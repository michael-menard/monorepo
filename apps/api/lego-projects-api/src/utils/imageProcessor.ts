import { Request, Response, NextFunction } from 'express';

// TEMPORARILY DISABLED - Upload package needs to be fixed
// import {
//   processImage as processImageShared,
//   createImageVariants as createImageVariantsShared,
//   getImageMetadata,
//   getOptimalFormat,
//   canProcessImage,
//   calculateOptimalQuality,
//   getPreset,
//   type ImageProcessingConfig,
//   type ImageOptimizationStats,
// } from '@repo/upload';

// Temporary stub types and functions
export interface ImageProcessingConfig {
  width?: number;
  height?: number;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: string;
  fit?: string;
  progressive?: boolean;
  optimizeCoding?: boolean;
  stripMetadata?: boolean;
  sharpen?: boolean;
  rotate?: boolean;
}

export interface ImageOptimizationStats {
  originalSize: number;
  processedSize: number;
  compressionRatio: number;
}

// Stub functions
const getPreset = (preset: string): ImageProcessingConfig => ({ width: 200, height: 200, quality: 80 });
export const canProcessImage = (file: any): boolean => true;
export const getOptimalFormat = (filename: string, mimetype?: string): string => 'jpeg';

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
    // TEMPORARILY DISABLED - Upload package needs to be fixed
    // const { buffer: processedBuffer } = await processImageShared(buffer, config);
    // return processedBuffer;
    return buffer; // Return original buffer as stub
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
    // TEMPORARILY DISABLED - Upload package needs to be fixed
    // Create medium size if original is larger than medium config
    // const mediumConfig = { ...baseConfig, ...HIGH_QUALITY_CONFIG };
    // const metadata = await getImageMetadata(buffer);

    // if (metadata.width > mediumConfig.maxWidth || metadata.height > mediumConfig.maxHeight) {
    //   const { buffer: mediumBuffer } = await processImageShared(buffer, mediumConfig);
    //   result.medium = mediumBuffer;
    // }

    // Create thumbnail
    // const { buffer: thumbnailBuffer } = await processImageShared(buffer, THUMBNAIL_CONFIG);
    // result.thumbnail = thumbnailBuffer;

    // Stub implementation - return original buffer
    result.medium = buffer;
    result.thumbnail = buffer;

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
// TEMPORARILY DISABLED - Upload package needs to be fixed
// export { getOptimalFormat } from '@repo/upload';
// Stub function already declared above

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
// TEMPORARILY DISABLED - Upload package needs to be fixed
// export { canProcessImage } from '@repo/upload';

/**
 * Get image dimensions from buffer
 */
export async function getImageDimensions(
  buffer: Buffer,
): Promise<{ width: number; height: number } | null> {
  try {
    // TEMPORARILY DISABLED - Upload package needs to be fixed
    // const metadata = await getImageMetadata(buffer);
    // return { width: metadata.width, height: metadata.height };
    return { width: 800, height: 600 }; // Stub return
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    return null;
  }
}
