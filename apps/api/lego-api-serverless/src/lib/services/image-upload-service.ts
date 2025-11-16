/**
 * Unified Image Upload Service
 *
 * Provides a consistent interface for image uploads across all features:
 * - Gallery images (with thumbnails)
 * - Wishlist images (no thumbnails, with cleanup)
 * - MOC cover images (future use)
 *
 * Handles:
 * - Image validation
 * - Sharp processing (resize, optimize, convert to WebP)
 * - S3 upload
 * - Optional thumbnail generation
 * - Optional cleanup of previous images
 * - Database updates
 * - Cache invalidation
 */

import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { z } from 'zod'
import { validateFile, createImageValidationConfig } from '@monorepo/file-validator'
import { processImage, generateThumbnail } from './image-processing'
import { getS3Client, uploadToS3, uploadToS3Multipart } from '@/lib/storage/s3-client'
import { getEnv } from '@/lib/utils/env'
import {
  recordUploadSuccess,
  recordUploadFailure,
  recordFileSize,
  recordImageDimensions,
  measureProcessingTime,
} from '@/lib/utils/cloudwatch-metrics'

/**
 * Zod schema for uploaded file from multipart form data
 */
export const UploadedFileSchema = z.object({
  fieldname: z.string(),
  filename: z.string(),
  encoding: z.string(),
  mimetype: z.string(),
  buffer: z.instanceof(Buffer),
})

export type UploadedFile = z.infer<typeof UploadedFileSchema>

/**
 * Zod schema for image upload configuration options
 */
export const ImageUploadOptionsSchema = z.object({
  /** Maximum file size in bytes (e.g., 5 * 1024 * 1024 for 5MB) */
  maxFileSize: z.number().positive(),

  /** Maximum width for the processed image in pixels */
  maxWidth: z.number().positive().optional().default(2048),

  /** Image quality (0-100) */
  quality: z.number().min(0).max(100).optional().default(80),

  /** Whether to generate a thumbnail */
  generateThumbnail: z.boolean().optional().default(false),

  /** Thumbnail width in pixels (only if generateThumbnail is true) */
  thumbnailWidth: z.number().positive().optional().default(400),

  /** S3 key prefix (e.g., 'images', 'wishlist', 'mocs') */
  s3KeyPrefix: z.string().min(1),

  /** Previous image URL to delete (for updates/replacements) */
  previousImageUrl: z.string().url().nullable().optional(),

  /** Upload type for CloudWatch metrics tracking */
  uploadType: z.enum(['gallery', 'wishlist', 'moc']),

  /** Use S3 multipart upload for large files (>5MB) */
  useMultipartUpload: z.boolean().optional().default(false),
})

export type ImageUploadOptions = z.infer<typeof ImageUploadOptionsSchema>

/**
 * Zod schema for image upload result
 */
export const ImageUploadResultSchema = z.object({
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  width: z.number().positive(),
  height: z.number().positive(),
  size: z.number().positive(),
})

export type ImageUploadResult = z.infer<typeof ImageUploadResultSchema>

/**
 * Upload image with processing and optional thumbnail generation
 *
 * @param file - The uploaded file from multipart form data
 * @param userId - The authenticated user's ID
 * @param itemId - The ID of the item (for unique filename)
 * @param options - Upload configuration options
 * @returns Upload result with URLs and metadata
 */
export async function uploadImage(
  file: UploadedFile,
  userId: string,
  itemId: string,
  options: ImageUploadOptions,
): Promise<ImageUploadResult> {
  const {
    maxFileSize,
    maxWidth = 2048,
    quality = 80,
    generateThumbnail: shouldGenerateThumbnail = false,
    thumbnailWidth = 400,
    s3KeyPrefix,
    previousImageUrl,
    uploadType,
    useMultipartUpload = false,
  } = options

  try {
    // Record original file size
    await recordFileSize(file.buffer.length, uploadType)

    // Validate file
    const validationResult = validateFile(
      {
        fieldname: file.fieldname,
        originalname: file.filename,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.buffer.length,
      },
      createImageValidationConfig(maxFileSize),
    )

    if (!validationResult.isValid) {
      await recordUploadFailure(uploadType, 'validation')
      throw new Error(validationResult.errors?.join(', ') || 'Invalid file')
    }

    // Process main image with Sharp (with timing)
    const processedImage = await measureProcessingTime(
      () =>
        processImage(file.buffer, {
          maxWidth,
          quality,
          format: 'webp',
        }),
      uploadType,
    )

    // Record processed image dimensions
    await recordImageDimensions(processedImage.width, processedImage.height, uploadType)

    // Upload main image to S3
    const imageKey = `${s3KeyPrefix}/${userId}/${itemId}.webp`
    let imageUrl: string

    try {
      if (useMultipartUpload && processedImage.buffer.length > 5 * 1024 * 1024) {
        // Use multipart upload for large files
        imageUrl = await uploadToS3Multipart({
          key: imageKey,
          body: processedImage.buffer,
          contentType: 'image/webp',
        })
      } else {
        // Standard upload for smaller files
        imageUrl = await uploadToS3({
          key: imageKey,
          body: processedImage.buffer,
          contentType: 'image/webp',
        })
      }
    } catch (error) {
      await recordUploadFailure(uploadType, 's3')
      throw error
    }

    // Generate and upload thumbnail if requested
    let thumbnailUrl: string | undefined

    if (shouldGenerateThumbnail) {
      const thumbnail = await generateThumbnail(processedImage.buffer, thumbnailWidth)

      const thumbnailKey = `${s3KeyPrefix}/${userId}/thumbnails/${itemId}.webp`
      thumbnailUrl = await uploadToS3({
        key: thumbnailKey,
        body: thumbnail.buffer,
        contentType: 'image/webp',
      })
    }

    // Delete previous image if exists (for updates/replacements)
    if (previousImageUrl) {
      await deletePreviousImage(previousImageUrl, shouldGenerateThumbnail)
    }

    // Record successful upload
    await recordUploadSuccess(uploadType)

    return {
      imageUrl,
      thumbnailUrl,
      width: processedImage.width,
      height: processedImage.height,
      size: processedImage.size,
    }
  } catch (error) {
    // Record failure if not already recorded
    if (error instanceof Error && !error.message.includes('Invalid file')) {
      await recordUploadFailure(uploadType, 'database')
    }
    throw error
  }
}

/**
 * Delete previous image and its thumbnail from S3
 *
 * @param imageUrl - The S3 URL of the image to delete
 * @param hasThumbnail - Whether the image has an associated thumbnail
 */
async function deletePreviousImage(imageUrl: string, hasThumbnail: boolean): Promise<void> {
  try {
    const s3 = await getS3Client()
    const env = getEnv()

    // Extract key from URL
    const imageKey = extractKeyFromUrl(imageUrl)

    // Delete main image
    await s3.send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET!,
        Key: imageKey,
      }),
    )

    // Delete thumbnail if exists
    if (hasThumbnail) {
      const thumbnailKey = convertToThumbnailKey(imageKey)
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: env.S3_BUCKET!,
            Key: thumbnailKey,
          }),
        )
      } catch (error) {
        console.warn('Thumbnail deletion failed (may not exist):', error)
      }
    }
  } catch (error) {
    console.error('Failed to delete previous image (non-fatal):', error)
    // Don't throw - continue with upload even if deletion fails
  }
}

/**
 * Extract S3 key from full URL
 *
 * @param url - S3 URL (https://bucket.s3.region.amazonaws.com/key)
 * @returns The S3 key
 */
function extractKeyFromUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname
  } catch {
    throw new Error(`Invalid S3 URL: ${url}`)
  }
}

/**
 * Convert main image key to thumbnail key
 *
 * @param imageKey - Main image S3 key (e.g., 'images/userId/itemId.webp')
 * @returns Thumbnail key (e.g., 'images/userId/thumbnails/itemId.webp')
 */
function convertToThumbnailKey(imageKey: string): string {
  // Split the key by '/' to insert 'thumbnails' directory
  const parts = imageKey.split('/')
  // Insert 'thumbnails' before the filename
  // E.g., 'images/userId/itemId.webp' -> 'images/userId/thumbnails/itemId.webp'
  parts.splice(parts.length - 1, 0, 'thumbnails')
  return parts.join('/')
}
