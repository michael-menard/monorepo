/**
 * S3 Client for File Storage
 *
 * Provides configured S3 client for image and file uploads.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3'
import { getEnv } from '@/lib/utils/env'
import { createLogger } from '../utils/logger'

const logger = createLogger('s3-client')
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

/**
 * Upload large file to S3 using multipart upload
 * Recommended for files >5MB for better reliability and performance
 */
export async function uploadToS3Multipart(params: {
  key: string
  body: Buffer
  contentType: string
  bucket?: string
  partSize?: number
}): Promise<string> {
  const s3 = await getS3Client()
  const env = getEnv()
  const bucket = params.bucket || env.S3_BUCKET
  const partSize = params.partSize || 5 * 1024 * 1024 // 5MB default part size

  let uploadId: string | undefined

  try {
    // Initiate multipart upload
    const createResponse = await s3.send(
      new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: params.key,
        ContentType: params.contentType,
        ServerSideEncryption: 'AES256',
      }),
    )

    uploadId = createResponse.UploadId

    if (!uploadId) {
      throw new Error('Failed to initiate multipart upload')
    }

    // Split buffer into parts
    const parts: { PartNumber: number; ETag: string }[] = []
    const totalParts = Math.ceil(params.body.length / partSize)

    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * partSize
      const end = Math.min(start + partSize, params.body.length)
      const partBody = params.body.subarray(start, end)

      const uploadPartResponse = await s3.send(
        new UploadPartCommand({
          Bucket: bucket,
          Key: params.key,
          UploadId: uploadId,
          PartNumber: partNumber,
          Body: partBody,
        }),
      )

      if (uploadPartResponse.ETag) {
        parts.push({
          PartNumber: partNumber,
          ETag: uploadPartResponse.ETag,
        })
      }
    }

    // Complete multipart upload
    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: params.key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts,
        },
      }),
    )

    // Return public URL
    return `https://${bucket}.s3.amazonaws.com/${params.key}`
  } catch (error) {
    // Abort multipart upload on error
    if (uploadId) {
      try {
        await s3.send(
          new AbortMultipartUploadCommand({
            Bucket: bucket,
            Key: params.key,
            UploadId: uploadId,
          }),
        )
      } catch (abortError) {
        logger.error('Failed to abort multipart upload:', abortError)
      }
    }
    throw error
  }
}
