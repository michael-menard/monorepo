import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { Result } from './types.js'
import { ok, err } from './types.js'

/**
 * S3 client for local development
 *
 * Uses standard AWS credentials (env vars, profile, or IAM role).
 * Simplified from production version (no X-Ray tracing).
 */

let s3Client: S3Client | null = null

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    })
  }
  return s3Client
}

function getBucket(): string {
  const bucket = process.env.S3_BUCKET
  if (!bucket) {
    throw new Error('S3_BUCKET environment variable is required')
  }
  return bucket
}

/**
 * Upload a file to S3
 */
export async function uploadToS3(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType: string
): Promise<Result<{ url: string }, 'UPLOAD_FAILED'>> {
  try {
    const bucket = getBucket()
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
      })
    )

    const url = `https://${bucket}.s3.amazonaws.com/${key}`
    return ok({ url })
  } catch (error) {
    console.error('S3 upload failed:', error)
    return err('UPLOAD_FAILED')
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFromS3(
  key: string
): Promise<Result<void, 'DELETE_FAILED'>> {
  try {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: getBucket(),
        Key: key,
      })
    )
    return ok(undefined)
  } catch (error) {
    console.error('S3 delete failed:', error)
    return err('DELETE_FAILED')
  }
}

/**
 * Get a presigned URL for downloading a file
 */
export async function getPresignedUrl(
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  })
  return getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds })
}

/**
 * Get a presigned URL for uploading a file
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds })
}
