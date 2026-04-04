import { uploadToS3, deleteFromS3, ok } from '@repo/api-core'
import type { Result } from '@repo/api-core'
import type { FileStorage } from '../ports/index.js'

/**
 * Build a full URL from an S3 key.
 * Works with both local MinIO and production S3.
 */
export function buildFileUrl(s3Key: string): string {
  const endpoint = process.env.S3_ENDPOINT || `https://${process.env.S3_BUCKET}.s3.amazonaws.com`
  const bucket = process.env.S3_BUCKET || 'lego-moc-files'

  // MinIO-style: http://localhost:9000/bucket/key
  if (endpoint.includes('localhost') || endpoint.includes('127.0.0.1')) {
    return `${endpoint}/${bucket}/${s3Key}`
  }

  // AWS S3-style: https://bucket.s3.amazonaws.com/key
  return `https://${bucket}.s3.amazonaws.com/${s3Key}`
}

/**
 * Create a FileStorage implementation using S3
 */
export function createFileStorage(): FileStorage {
  return {
    async upload(
      key: string,
      buffer: Buffer,
      contentType: string,
    ): Promise<Result<{ key: string }, 'UPLOAD_FAILED'>> {
      const result = await uploadToS3(key, buffer, contentType)
      if (!result.ok) return result
      return ok({ key })
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
