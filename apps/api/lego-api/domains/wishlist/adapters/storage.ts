import { randomUUID } from 'crypto'
import type { Result } from '@repo/api-core'
import { getPresignedUploadUrl, deleteFromS3, copyS3Object, ok, err } from '@repo/api-core'
import type { WishlistImageStorage } from '../ports/index.js'

/**
 * Allowed image extensions for wishlist uploads
 */
export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'] as const

/**
 * Allowed MIME types for wishlist uploads
 */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const

/**
 * Maximum file size in bytes (10MB)
 */
export const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Presigned URL expiration in seconds (15 minutes)
 */
const PRESIGN_EXPIRATION_SECONDS = 900

/**
 * Create a WishlistImageStorage implementation using S3
 */
export function createWishlistImageStorage(): WishlistImageStorage {
  return {
    async generateUploadUrl(
      userId: string,
      fileName: string,
      mimeType: string,
    ): Promise<
      Result<
        { presignedUrl: string; key: string; expiresIn: number },
        'INVALID_EXTENSION' | 'INVALID_MIME_TYPE' | 'PRESIGN_FAILED'
      >
    > {
      // Validate extension
      const extension = fileName.split('.').pop()?.toLowerCase()
      if (!extension || !ALLOWED_IMAGE_EXTENSIONS.includes(extension as never)) {
        return err('INVALID_EXTENSION')
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(mimeType as never)) {
        return err('INVALID_MIME_TYPE')
      }

      // Generate unique key for S3
      const imageId = randomUUID()
      const key = `wishlist/${userId}/${imageId}.${extension}`

      try {
        const presignedUrl = await getPresignedUploadUrl(key, mimeType, PRESIGN_EXPIRATION_SECONDS)

        return ok({
          presignedUrl,
          key,
          expiresIn: PRESIGN_EXPIRATION_SECONDS,
        })
      } catch (error) {
        console.error('Failed to generate presigned URL:', error)
        return err('PRESIGN_FAILED')
      }
    },

    /**
     * Build the S3 URL from a key
     */
    buildImageUrl(key: string): string {
      const bucket = process.env.S3_BUCKET
      if (!bucket) {
        throw new Error('S3_BUCKET environment variable is required')
      }
      return `https://${bucket}.s3.amazonaws.com/${key}`
    },

    /**
     * Copy an image from one S3 key to another
     * Used for cross-domain image transfer (e.g., wishlist to sets)
     */
    async copyImage(
      sourceKey: string,
      destKey: string,
    ): Promise<Result<{ url: string }, 'COPY_FAILED' | 'SOURCE_NOT_FOUND'>> {
      return copyS3Object(sourceKey, destKey)
    },

    /**
     * Delete an image from S3
     */
    async deleteImage(key: string): Promise<Result<void, 'DELETE_FAILED'>> {
      const result = await deleteFromS3(key)
      if (!result.ok) {
        // Treat delete failures gracefully (file might not exist)
        console.warn(`Failed to delete S3 object: ${key}`)
        return ok(undefined)
      }
      return ok(undefined)
    },

    /**
     * Extract S3 key from a full URL
     */
    extractKeyFromUrl(url: string): string | null {
      const bucket = process.env.S3_BUCKET
      if (!bucket) return null

      // URL format: https://{bucket}.s3.amazonaws.com/{key}
      // or: https://{bucket}.s3.{region}.amazonaws.com/{key}
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
