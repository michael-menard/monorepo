import { uploadToS3, deleteFromS3, ok } from '@repo/api-core'
import type { Result } from '@repo/api-core'
import type { FileStorage } from './ports.js'

/**
 * Create a FileStorage implementation using S3
 */
export function createFileStorage(): FileStorage {
  const bucket = process.env.S3_BUCKET

  return {
    async upload(
      key: string,
      buffer: Buffer,
      contentType: string,
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
 * Generate S3 key for a MOC instruction file
 */
export function generateInstructionFileKey(
  userId: string,
  mocId: string,
  filename: string,
): string {
  const ext = filename.split('.').pop() || 'pdf'
  return `mocs/${userId}/${mocId}/instructions/${Date.now()}.${ext}`
}

/**
 * Generate S3 key for a MOC thumbnail
 */
export function generateThumbnailKey(userId: string, mocId: string): string {
  return `mocs/${userId}/${mocId}/thumbnail.webp`
}

/**
 * Generate S3 key for a MOC gallery image
 */
export function generateGalleryImageKey(userId: string, mocId: string, imageId: string): string {
  return `mocs/${userId}/${mocId}/gallery/${imageId}.webp`
}

/**
 * Generate S3 key for a parts list file
 */
export function generatePartsListKey(userId: string, mocId: string, filename: string): string {
  const ext = filename.split('.').pop() || 'csv'
  return `mocs/${userId}/${mocId}/parts-lists/${Date.now()}.${ext}`
}
