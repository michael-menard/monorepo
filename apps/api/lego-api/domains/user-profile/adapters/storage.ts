import { getPresignedUploadUrl, deleteFromS3, ok, err } from '@repo/api-core'
import type { Result } from '@repo/api-core'
import type { AvatarStorage } from '../ports/index.js'

const PRESIGN_EXPIRATION_SECONDS = 900

export function createAvatarStorage(): AvatarStorage {
  const bucket = process.env.S3_BUCKET

  return {
    async generatePresignedUrl(
      key: string,
      contentType: string,
    ): Promise<Result<{ uploadUrl: string; imageUrl: string }, 'PRESIGN_FAILED'>> {
      try {
        const uploadUrl = await getPresignedUploadUrl(key, contentType, PRESIGN_EXPIRATION_SECONDS)
        const endpoint = process.env.S3_ENDPOINT
        const imageUrl = endpoint
          ? `${endpoint}/${bucket}/${key}`
          : `https://${bucket}.s3.amazonaws.com/${key}`
        return ok({ uploadUrl, imageUrl })
      } catch {
        return err('PRESIGN_FAILED')
      }
    },

    async delete(key: string): Promise<Result<void, 'DELETE_FAILED'>> {
      const result = await deleteFromS3(key)
      if (!result.ok) {
        return ok(undefined) // Graceful degradation
      }
      return ok(undefined)
    },
  }
}

export function generateAvatarKey(userId: string, filename: string): string {
  const ext = filename.split('.').pop() ?? 'jpg'
  const timestamp = Date.now()
  return `avatars/${userId}/${timestamp}.${ext}`
}
