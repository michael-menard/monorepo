/**
 * Image Processor Lambda Handler
 *
 * S3 event-triggered Lambda for automatic image optimization.
 * Processes uploaded images into thumbnail, medium, and large variants.
 *
 * Story: WISH-2016 - Image Optimization
 */

import type { S3Event, S3Handler, Context } from 'aws-lambda'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { logger } from '@repo/logger'
import {
  createSharpImageOptimizer,
  DEFAULT_WATERMARK_OPTIONS,
  type ProcessedImage,
  type ImageVariants,
} from '../../core/image-processing/index.js'

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const WATERMARK_S3_KEY = process.env.WATERMARK_S3_KEY || 'assets/watermark-logo.png'

// S3 client (reused across invocations)
const s3Client = new S3Client({})

// Image optimizer (reused across invocations)
const optimizer = createSharpImageOptimizer()

// ─────────────────────────────────────────────────────────────────────────────
// Lambda Handler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Main Lambda handler for S3 events
 *
 * AC6: S3 event trigger on uploads/wishlist/* prefix
 * AC7: Processing within 10 seconds for typical 10MB images
 */
export const handler: S3Handler = async (event: S3Event, context: Context) => {
  const startTime = Date.now()

  logger.info('Image processor invoked', {
    recordCount: event.Records.length,
    requestId: context.awsRequestId,
  })

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '))
    const size = record.s3.object.size

    // Skip if already processed (variant files)
    if (isVariantKey(key)) {
      logger.debug('Skipping already processed image variant', { key })
      continue
    }

    // Skip non-image files
    if (!isImageKey(key)) {
      logger.debug('Skipping non-image file', { key })
      continue
    }

    try {
      await processImage(bucket, key)

      const duration = Date.now() - startTime
      logger.info('Image processing completed', {
        bucket,
        key,
        originalSize: size,
        durationMs: duration,
      })
    } catch (error) {
      logger.error('Image processing failed', {
        bucket,
        key,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })

      // Re-throw to trigger Lambda retry (AC11)
      throw error
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Processing Logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Process a single image through the optimization pipeline
 */
async function processImage(bucket: string, key: string): Promise<void> {
  // 1. Download original image from S3
  const originalBuffer = await downloadFromS3(bucket, key)

  // 2. Get watermark (optional, graceful degradation if missing)
  let watermarkBuffer: Buffer | undefined
  try {
    watermarkBuffer = await downloadFromS3(bucket, WATERMARK_S3_KEY)
    logger.debug('Watermark loaded', { key: WATERMARK_S3_KEY })
  } catch {
    logger.warn('Watermark not found, proceeding without watermark', {
      watermarkKey: WATERMARK_S3_KEY,
    })
  }

  // 3. Process all sizes
  const processed = await optimizer.processAllSizes(
    originalBuffer,
    watermarkBuffer,
    DEFAULT_WATERMARK_OPTIONS,
  )

  // 4. Upload variants to S3
  const variants = await uploadVariants(bucket, key, processed)

  // 5. Get original metadata
  const originalMetadata = await optimizer.getImageMetadata(originalBuffer)

  // 6. Build complete variants object
  const imageVariants: ImageVariants = {
    original: {
      url: buildS3Url(bucket, key),
      width: originalMetadata.width,
      height: originalMetadata.height,
      sizeBytes: originalBuffer.length,
      format: originalMetadata.format as 'jpeg' | 'png' | 'webp',
    },
    thumbnail: variants.thumbnail,
    medium: variants.medium,
    large: variants.large,
    processingStatus: 'completed',
    processedAt: new Date().toISOString(),
  }

  // 7. Update database with variants
  const context = parseKeyContext(key)
  if (context) {
    await updateDatabaseWithVariants(context.userId, context.imageId, imageVariants)
  }

  // 8. Emit CloudWatch metrics (AC14)
  emitProcessingMetrics(originalBuffer.length, processed)
}

/**
 * Upload all processed variants to S3
 */
async function uploadVariants(
  bucket: string,
  originalKey: string,
  processed: ProcessedImage[],
): Promise<
  Record<
    string,
    {
      url: string
      width: number
      height: number
      sizeBytes: number
      format: 'webp' | 'jpeg' | 'png'
      watermarked?: boolean
    }
  >
> {
  const variants: Record<
    string,
    {
      url: string
      width: number
      height: number
      sizeBytes: number
      format: 'webp' | 'jpeg' | 'png'
      watermarked?: boolean
    }
  > = {}

  for (const image of processed) {
    const variantKey = generateVariantKey(originalKey, image.size)
    await uploadToS3(bucket, variantKey, image.buffer, 'image/webp')

    variants[image.size] = {
      url: buildS3Url(bucket, variantKey),
      width: image.width,
      height: image.height,
      sizeBytes: image.sizeBytes,
      format: image.format,
      watermarked: image.watermarked || undefined,
    }

    logger.debug('Variant uploaded', {
      size: image.size,
      key: variantKey,
      sizeBytes: image.sizeBytes,
    })
  }

  return variants
}

// ─────────────────────────────────────────────────────────────────────────────
// S3 Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Download a file from S3 as a Buffer
 */
async function downloadFromS3(bucket: string, key: string): Promise<Buffer> {
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  const response = await s3Client.send(command)

  if (!response.Body) {
    throw new Error(`Empty body for S3 object: ${bucket}/${key}`)
  }

  // Convert stream to buffer
  const stream = response.Body as NodeJS.ReadableStream
  const chunks: Buffer[] = []

  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk))
  }

  return Buffer.concat(chunks)
}

/**
 * Upload a buffer to S3
 */
async function uploadToS3(
  bucket: string,
  key: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000', // 1 year cache
  })

  await s3Client.send(command)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a key is for a variant file (already processed)
 */
function isVariantKey(key: string): boolean {
  return key.includes('-thumbnail.') || key.includes('-medium.') || key.includes('-large.')
}

/**
 * Check if a key is for an image file
 */
function isImageKey(key: string): boolean {
  const lowerKey = key.toLowerCase()
  return (
    lowerKey.endsWith('.jpg') ||
    lowerKey.endsWith('.jpeg') ||
    lowerKey.endsWith('.png') ||
    lowerKey.endsWith('.webp')
  )
}

/**
 * Generate the S3 key for a variant
 * Example: wishlist/user123/image456.jpg -> wishlist/user123/image456-thumbnail.webp
 */
function generateVariantKey(originalKey: string, size: string): string {
  const lastDot = originalKey.lastIndexOf('.')
  if (lastDot === -1) {
    return `${originalKey}-${size}.webp`
  }
  const basePath = originalKey.substring(0, lastDot)
  return `${basePath}-${size}.webp`
}

/**
 * Build the public S3 URL for a key
 */
function buildS3Url(bucket: string, key: string): string {
  return `https://${bucket}.s3.amazonaws.com/${key}`
}

/**
 * Parse userId and imageId from S3 key
 * Key format: wishlist/{userId}/{imageId}.{ext}
 */
function parseKeyContext(key: string): { userId: string; imageId: string } | null {
  const match = key.match(/wishlist\/([^/]+)\/([^.]+)/)
  if (match) {
    return {
      userId: match[1],
      imageId: match[2],
    }
  }
  return null
}

/**
 * Update database with image variants
 *
 * Note: In production, this would call the wishlist repository.
 * For Lambda isolation, this uses a separate database connection.
 */
async function updateDatabaseWithVariants(
  userId: string,
  imageId: string,
  variants: ImageVariants,
): Promise<void> {
  // TODO: Implement database update
  // This requires access to the wishlist repository from Lambda context
  // Options:
  // 1. Direct database connection in Lambda
  // 2. API call to backend service
  // 3. SQS message to async processor

  logger.info('Database update with variants', {
    userId,
    imageId,
    variantCount: Object.keys(variants).filter(k => variants[k as keyof ImageVariants]).length,
    processingStatus: variants.processingStatus,
  })
}

/**
 * Emit CloudWatch metrics for monitoring (AC14)
 */
function emitProcessingMetrics(originalSize: number, processed: ProcessedImage[]): void {
  const totalOptimizedSize = processed.reduce((sum, p) => sum + p.sizeBytes, 0)
  const compressionRatio = Math.round((1 - totalOptimizedSize / originalSize) * 100)

  logger.info('Image processing metrics', {
    metricType: 'ImageProcessing',
    originalSizeBytes: originalSize,
    totalOptimizedSizeBytes: totalOptimizedSize,
    compressionRatio,
    variants: processed.map(p => ({
      size: p.size,
      sizeBytes: p.sizeBytes,
      watermarked: p.watermarked,
    })),
  })

  // CloudWatch metrics would be emitted here in production
  // Using AWS SDK CloudWatch client or custom metrics
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports for Testing
// ─────────────────────────────────────────────────────────────────────────────

export {
  processImage,
  downloadFromS3,
  uploadToS3,
  isVariantKey,
  isImageKey,
  generateVariantKey,
  buildS3Url,
  parseKeyContext,
  updateDatabaseWithVariants,
}
