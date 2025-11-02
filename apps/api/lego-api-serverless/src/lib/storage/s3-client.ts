/**
 * S3 Client for File Storage
 *
 * Provides configured S3 client for image and file uploads.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getEnv } from '@/lib/utils/env'

let _s3Client: S3Client | null = null

/**
 * Get or create S3 client instance
 * - Client is reused across Lambda invocations
 */
export async function getS3Client(): Promise<S3Client> {
  if (!_s3Client) {
    const env = getEnv()

    _s3Client = new S3Client({
      region: env.AWS_REGION || 'us-east-1',
    })
  }

  return _s3Client
}

/**
 * Upload file to S3
 */
export async function uploadToS3(params: {
  key: string
  body: Buffer
  contentType: string
  bucket?: string
}): Promise<string> {
  const s3 = await getS3Client()
  const env = getEnv()
  const bucket = params.bucket || env.S3_BUCKET

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      // Optional: Add server-side encryption
      ServerSideEncryption: 'AES256',
    }),
  )

  // Return public URL (adjust based on your S3 configuration)
  return `https://${bucket}.s3.amazonaws.com/${params.key}`
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(params: { key: string; bucket?: string }): Promise<void> {
  const s3 = await getS3Client()
  const env = getEnv()
  const bucket = params.bucket || env.S3_BUCKET

  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: params.key,
    }),
  )
}
