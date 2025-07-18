import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';

// Image processing configuration
export interface ImageProcessingConfig {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  format: 'jpeg' | 'png' | 'webp';
  fit: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

// Default configuration for avatar images
export const DEFAULT_AVATAR_CONFIG: ImageProcessingConfig = {
  maxWidth: 800,
  maxHeight: 800,
  quality: 85,
  format: 'jpeg',
  fit: 'cover'
};

// High-quality configuration for profile images
export const HIGH_QUALITY_CONFIG: ImageProcessingConfig = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 90,
  format: 'jpeg',
  fit: 'inside'
};

// Thumbnail configuration for previews
export const THUMBNAIL_CONFIG: ImageProcessingConfig = {
  maxWidth: 200,
  maxHeight: 200,
  quality: 80,
  format: 'jpeg',
  fit: 'cover'
};

/**
 * Process and resize an image buffer
 */
export async function processImage(
  buffer: Buffer,
  config: ImageProcessingConfig = DEFAULT_AVATAR_CONFIG
): Promise<Buffer> {
  try {
    let sharpInstance = sharp(buffer);

    // Get image metadata
    const metadata = await sharpInstance.metadata();
    
    // Check if resizing is needed
    const needsResize = metadata.width && metadata.height && 
      (metadata.width > config.maxWidth || metadata.height > config.maxHeight);

    if (needsResize) {
      sharpInstance = sharpInstance.resize({
        width: config.maxWidth,
        height: config.maxHeight,
        fit: config.fit,
        withoutEnlargement: true
      });
    }

    // Convert to specified format with quality settings
    switch (config.format) {
      case 'jpeg':
        sharpInstance = sharpInstance.jpeg({ quality: config.quality });
        break;
      case 'png':
        sharpInstance = sharpInstance.png({ quality: config.quality });
        break;
      case 'webp':
        sharpInstance = sharpInstance.webp({ quality: config.quality });
        break;
    }

    // Optimize the image
    sharpInstance = sharpInstance.rotate(); // Auto-rotate based on EXIF
    sharpInstance = sharpInstance.sharpen(); // Slight sharpening for better quality

    return await sharpInstance.toBuffer();
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
  baseConfig: ImageProcessingConfig = DEFAULT_AVATAR_CONFIG
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
    original: buffer
  };

  try {
    // Create medium size if original is larger than medium config
    const mediumConfig = { ...baseConfig, ...HIGH_QUALITY_CONFIG };
    const metadata = await sharp(buffer).metadata();
    
    if (metadata.width && metadata.height && 
        (metadata.width > mediumConfig.maxWidth || metadata.height > mediumConfig.maxHeight)) {
      result.medium = await processImage(buffer, mediumConfig);
    }

    // Create thumbnail
    result.thumbnail = await processImage(buffer, THUMBNAIL_CONFIG);

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
export function getOptimalFormat(filename: string, mimetype: string): 'jpeg' | 'png' | 'webp' {
  const ext = filename.toLowerCase().split('.').pop();
  
  // Prefer WebP for better compression if supported
  if (ext === 'webp' || mimetype === 'image/webp') {
    return 'webp';
  }
  
  // Use PNG for images with transparency
  if (ext === 'png' || mimetype === 'image/png') {
    return 'png';
  }
  
  // Default to JPEG for photos
  return 'jpeg';
}

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
        format: getOptimalFormat(req.file.originalname, req.file.mimetype)
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
        error: 'Failed to process uploaded image' 
      });
    }
  };
}

/**
 * Validate if an image can be processed
 */
export function canProcessImage(mimetype: string): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/heic'
  ];
  
  return supportedTypes.includes(mimetype);
}

/**
 * Get image dimensions from buffer
 */
export async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number } | null> {
  try {
    const metadata = await sharp(buffer).metadata();
    if (metadata.width && metadata.height) {
      return { width: metadata.width, height: metadata.height };
    }
    return null;
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    return null;
  }
} 