import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { ok, err, type Result } from '@repo/api-core'
import { logger } from '@repo/logger'
import type { InspirationImageStorage } from '../ports/index.js'
import { MAX_FILE_SIZE } from '../types.js'

/**
 * Allowed file extensions for inspiration images
 */
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif']

/**
 * MIME type to extension mapping
 */
const MIME_TYPE_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/**
 * Create Inspiration Image Storage Adapter
 *
 * Handles S3 operations for inspiration images including:
 * - Presigned URL generation for uploads
 * - Image deletion
 * - URL building
 */
export function createInspirationImageStorage(): InspirationImageStorage {
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
  })

  const bucket =
    process.env.S3_INSPIRATION_BUCKET || process.env.S3_BUCKET || 'lego-moc-inspirations'
  const cdnBaseUrl = process.env.CDN_BASE_URL || `https://${bucket}.s3.amazonaws.com`

  return {
    async generateUploadUrl(userId, fileName, mimeType, fileSize) {
      // Validate file size if provided
      if (fileSize !== undefined) {
        if (fileSize <= 0) {
          logger.warn('File too small:', { userId, fileName, fileSize })
          return err('FILE_TOO_SMALL')
        }
        if (fileSize > MAX_FILE_SIZE) {
          logger.warn('File too large:', { userId, fileName, fileSize, maxSize: MAX_FILE_SIZE })
          return err('FILE_TOO_LARGE')
        }
      }

      // Validate MIME type
      const normalizedMimeType = mimeType.toLowerCase()
      if (!MIME_TYPE_MAP[normalizedMimeType]) {
        logger.warn('Invalid MIME type:', { userId, fileName, mimeType })
        return err('INVALID_MIME_TYPE')
      }

      // Extract and validate extension
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''
      if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
        logger.warn('Invalid file extension:', { userId, fileName, extension: fileExtension })
        return err('INVALID_EXTENSION')
      }

      // Generate a unique key for the image
      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
      const key = `inspirations/${userId}/${timestamp}-${randomSuffix}-${sanitizedFileName}`

      try {
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          ContentType: normalizedMimeType,
          // Add content length constraint if size is provided
          ...(fileSize ? { ContentLength: fileSize } : {}),
        })

        const expiresIn = 3600 // 1 hour
        const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn })

        return ok({
          presignedUrl,
          key,
          expiresIn,
        })
      } catch (error) {
        logger.error('Failed to generate presigned URL:', error)
        return err('PRESIGN_FAILED')
      }
    },

    buildImageUrl(key) {
      // Use CDN URL if available, otherwise construct S3 URL
      return `${cdnBaseUrl}/${key}`
    },

    extractKeyFromUrl(url) {
      try {
        // Handle both CDN and S3 URLs
        const urlObj = new URL(url)

        // Remove leading slash from pathname
        let key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname

        // If the URL has a bucket prefix in the path (for some S3 URL formats), remove it
        if (key.startsWith(`${bucket}/`)) {
          key = key.slice(bucket.length + 1)
        }

        return key || null
      } catch {
        return null
      }
    },

    async deleteImage(key) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        })

        await s3Client.send(command)
        return ok(undefined)
      } catch (error) {
        logger.error('Failed to delete image:', { key, error })
        return err('DELETE_FAILED')
      }
    },

    async copyImage(sourceKey, destKey) {
      try {
        const command = new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${sourceKey}`,
          Key: destKey,
        })

        await s3Client.send(command)
        const url = `${cdnBaseUrl}/${destKey}`
        return ok({ url })
      } catch (error) {
        logger.error('Failed to copy image:', { sourceKey, destKey, error })
        return err('COPY_FAILED')
      }
    },
  }
}
