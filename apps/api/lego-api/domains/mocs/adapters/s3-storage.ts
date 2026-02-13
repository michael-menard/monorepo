/**
 * S3 Storage Adapter
 * (INST-1105: AC87)
 *
 * Implements S3StoragePort interface for presigned URLs and file operations.
 * Uses AWS SDK v3 for S3 operations.
 */

import { S3Client, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { ok, err } from '@repo/api-core'
import { logger } from '@repo/logger'
import type { S3StoragePort } from '../ports/index.js'

/**
 * Create an S3StoragePort implementation using AWS SDK v3
 * (INST-1105: AC87)
 *
 * @param s3Client - Configured S3Client instance
 * @param cloudfrontDomain - CloudFront distribution domain for public URLs (optional)
 */
export function createS3StorageAdapter(
  s3Client: S3Client,
  cloudfrontDomain?: string,
): S3StoragePort {
  return {
    /**
     * Generate a presigned PUT URL for direct S3 upload
     * (INST-1105: AC44, AC45)
     */
    async generatePresignedPutUrl(
      bucket: string,
      key: string,
      contentType: string,
      expiresIn: number,
    ): Promise<string> {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      })

      const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn })

      logger.debug('Generated presigned PUT URL', undefined, {
        bucket,
        key,
        contentType,
        expiresIn,
      })

      return presignedUrl
    },

    /**
     * Check if an object exists in S3 and get metadata
     * (INST-1105: AC53, AC54)
     */
    async headObject(bucket: string, key: string) {
      try {
        const command = new HeadObjectCommand({
          Bucket: bucket,
          Key: key,
        })

        const result = await s3Client.send(command)

        return ok({
          contentLength: result.ContentLength ?? 0,
          contentType: result.ContentType,
        })
      } catch (error: unknown) {
        const errorName = (error as { name?: string })?.name

        if (errorName === 'NotFound' || errorName === 'NoSuchKey') {
          logger.debug('S3 object not found', undefined, { bucket, key })
          return err('NOT_FOUND' as const)
        }

        logger.error('S3 headObject failed', error, { bucket, key })
        return err('S3_ERROR' as const)
      }
    },

    /**
     * Get the public URL for an S3 object
     * Uses CloudFront if configured, otherwise falls back to S3 URL
     * (INST-1105: AC57)
     */
    getPublicUrl(bucket: string, key: string): string {
      if (cloudfrontDomain) {
        return `https://${cloudfrontDomain}/${key}`
      }

      // Fallback to direct S3 URL
      return `https://${bucket}.s3.amazonaws.com/${key}`
    },
  }
}
