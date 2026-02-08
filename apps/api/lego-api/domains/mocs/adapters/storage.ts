/**
 * MOC Image Storage Adapter
 * (INST-1103: AC55, AC57, AC61, AC64)
 *
 * Implements S3-based storage for MOC thumbnails with:
 * - WebP conversion for optimal compression (AC57)
 * - EXIF metadata stripping for privacy (AC61)
 * - High-resolution validation (reject >8000x8000) (AC64)
 */

import { randomUUID } from 'crypto'
import { uploadToS3, deleteFromS3, ok, err } from '@repo/api-core'
import type { Result } from '@repo/api-core'
import { logger } from '@repo/logger'
import sharp from 'sharp'
import { buildImageUrlFromKey } from '../../../core/cdn/cloudfront.js'
import type { MocImageStorage } from '../ports/index.js'

const MAX_IMAGE_DIMENSION = 8000 // AC64: Reject images >8000x8000

/**
 * Create a MocImageStorage implementation using S3
 */
export function createMocImageStorage(): MocImageStorage {
  const bucket = process.env.S3_BUCKET

  return {
    async uploadThumbnail(
      userId: string,
      mocId: string,
      file: { buffer: Buffer; filename: string; mimetype: string },
    ): Promise<
      Result<{ key: string; url: string }, 'UPLOAD_FAILED' | 'INVALID_IMAGE' | 'IMAGE_TOO_LARGE'>
    > {
      try {
        // Use Sharp to validate, strip EXIF, and convert to WebP
        const sharpInstance = sharp(file.buffer)

        // Get image metadata for validation
        const metadata = await sharpInstance.metadata()

        // AC64: High-resolution validation
        if (metadata.width && metadata.width > MAX_IMAGE_DIMENSION) {
          logger.warn('Image width exceeds maximum', undefined, {
            userId,
            mocId,
            width: metadata.width,
            max: MAX_IMAGE_DIMENSION,
          })
          return err('IMAGE_TOO_LARGE')
        }

        if (metadata.height && metadata.height > MAX_IMAGE_DIMENSION) {
          logger.warn('Image height exceeds maximum', undefined, {
            userId,
            mocId,
            height: metadata.height,
            max: MAX_IMAGE_DIMENSION,
          })
          return err('IMAGE_TOO_LARGE')
        }

        // AC61: Strip EXIF metadata and AC57: Convert to WebP
        const processedBuffer = await sharpInstance
          .rotate() // Auto-rotate based on EXIF orientation
          .withMetadata({ exif: {} }) // Strip all EXIF data
          .webp({ quality: 85, effort: 4 }) // Convert to WebP with good quality
          .toBuffer()

        // AC29: Generate S3 key with pattern: mocs/{userId}/{mocId}/thumbnail/{uuid}-{filename}.webp
        const sanitizedFilename = sanitizeFilename(file.filename)
        const uuid = randomUUID()
        const key = `mocs/${userId}/${mocId}/thumbnail/${uuid}-${sanitizedFilename}.webp`

        // Upload to S3
        const uploadResult = await uploadToS3(key, processedBuffer, 'image/webp')

        if (!uploadResult.ok) {
          logger.error('S3 upload failed', undefined, { userId, mocId, key })
          return err('UPLOAD_FAILED')
        }

        // AC31: Build CloudFront URL
        const url = buildImageUrlFromKey(key)

        logger.info('Thumbnail uploaded successfully', undefined, {
          userId,
          mocId,
          key,
          url,
          originalSize: file.buffer.length,
          processedSize: processedBuffer.length,
        })

        return ok({ key, url })
      } catch (error: any) {
        // Sharp will throw if image is invalid
        if (error.message?.includes('Input buffer') || error.message?.includes('unsupported')) {
          logger.warn('Invalid image format', error, { userId, mocId, mimetype: file.mimetype })
          return err('INVALID_IMAGE')
        }

        logger.error('Thumbnail upload failed', error, { userId, mocId })
        return err('UPLOAD_FAILED')
      }
    },

    async deleteThumbnail(key: string): Promise<Result<void, 'DELETE_FAILED'>> {
      // AC37: Log deletion failures without blocking
      const result = await deleteFromS3(key)
      if (!result.ok) {
        logger.warn('Failed to delete S3 thumbnail (non-blocking)', undefined, { key })
        // Return ok to not block the operation
        return ok(undefined)
      }
      return ok(undefined)
    },

    extractKeyFromUrl(url: string): string | null {
      if (!bucket || !url) return null

      // Handle CloudFront URLs
      if (url.includes('.cloudfront.net/')) {
        const match = url.match(/\.cloudfront\.net\/(.+)$/)
        return match?.[1] || null
      }

      // Handle S3 URLs
      const patterns = [
        new RegExp(`https://${bucket}\\.s3\\.amazonaws\\.com/(.+)`),
        new RegExp(`https://${bucket}\\.s3\\.[^/]+\\.amazonaws\\.com/(.+)`),
      ]

      for (const pattern of patterns) {
        const match = url.match(pattern)
        if (match?.[1]) {
          return match[1]
        }
      }

      return null
    },
  }
}

/**
 * AC30: Sanitize filename (remove special characters, keep alphanumeric and basic punctuation)
 */
function sanitizeFilename(filename: string): string {
  // Remove extension if present (we'll add .webp)
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')

  // Replace special characters with hyphens, allow only alphanumeric, hyphens, underscores
  return nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .slice(0, 50) // Limit length
}
