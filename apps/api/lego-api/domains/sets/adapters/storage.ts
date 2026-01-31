import { uploadToS3, deleteFromS3 } from '@repo/api-core'
import type { Result } from '@repo/api-core'
import { ok } from '@repo/api-core'
import type { ImageStorage } from '../ports/index.js'

/**
 * Create an ImageStorage implementation using S3
 */
export function createImageStorage(): ImageStorage {
  const bucket = process.env.S3_BUCKET

  return {
    async upload(
      key: string,
      buffer: Buffer,
      contentType: string
    ): Promise<Result<{ url: string }, 'UPLOAD_FAILED'>> {
      return uploadToS3(key, buffer, contentType)
    },

    async delete(key: string): Promise<Result<void, 'DELETE_FAILED'>> {
      const result = await deleteFromS3(key)
      if (!result.ok) {
        // Treat delete failures gracefully (file might not exist)
        console.warn(`Failed to delete S3 object: ${key}`)
        return ok(undefined)
      }
      return ok(undefined)
    },

    extractKeyFromUrl(url: string): string | null {
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

/**
 * Generate S3 key for a set image
 */
export function generateSetImageKey(userId: string, setId: string, imageId: string): string {
  return `sets/${userId}/${setId}/${imageId}.webp`
}

/**
 * Generate S3 key for a set image thumbnail
 */
export function generateSetThumbnailKey(userId: string, setId: string, imageId: string): string {
  return `sets/${userId}/${setId}/thumbnails/${imageId}.webp`
}
