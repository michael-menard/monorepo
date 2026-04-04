/**
 * S3 Client for File Storage
 *
 * Provides configured S3 client for image and file uploads in Lambda functions.
 * Optimized for serverless with connection reuse across Lambda invocations.
 *
 * Supports both AWS S3 (production) and MinIO (local development).
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'
import { loadS3Config, isLocalMode } from './config'

let _s3Client: S3Client | null = null

/**
 * Get or create S3 client instance
 *
 * Environment Detection:
 * - Local development (NODE_ENV=development + S3_ENDPOINT): Uses MinIO with forcePathStyle
 * - Production: Uses AWS S3 with standard configuration
 *
 * Client is reused across Lambda invocations for performance.
 *
 * @param region - AWS region (optional, overrides environment)
 * @returns Configured S3Client instance
 */
export function getS3Client(region?: string): S3Client {
  if (!_s3Client) {
    const config = loadS3Config()

    // Build S3Client configuration
    const clientConfig: any = {
      region: region || config.region,
    }

    // Add endpoint and forcePathStyle for MinIO
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint
      clientConfig.forcePathStyle = config.forcePathStyle
    }

    // Add credentials if provided (required for MinIO)
    if (config.accessKeyId && config.secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      }
    }

    _s3Client = new S3Client(clientConfig)
  }

  return _s3Client
}

/**
 * Initialize S3 bucket (create if it doesn't exist)
 *
 * This function is idempotent - it succeeds if the bucket already exists.
 * Useful for local development with MinIO or testing environments.
 *
 * @param bucketName - Name of the bucket to create
 * @throws Error if bucket creation fails (except for "already exists")
 */
export async function initializeBucket(bucketName: string): Promise<void> {
  const s3 = getS3Client()

  try {
    // Check if bucket exists
    await s3.send(new HeadBucketCommand({ Bucket: bucketName }))
    // Bucket exists, nothing to do
  } catch (error: any) {
    // Bucket doesn't exist, create it
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      try {
        await s3.send(new CreateBucketCommand({ Bucket: bucketName }))
      } catch (createError: any) {
        // Handle race condition: bucket was created between check and create
        if (
          createError.name !== 'BucketAlreadyOwnedByYou' &&
          createError.name !== 'BucketAlreadyExists'
        ) {
          throw new Error(`Failed to create bucket ${bucketName}: ${createError.message}`)
        }
      }
    } else {
      throw new Error(`Failed to check bucket ${bucketName}: ${error.message}`)
    }
  }
}

/**
 * Upload file to S3
 */
export async function uploadToS3(params: {
  key: string
  body: Buffer
  contentType: string
  bucket: string
  serverSideEncryption?: string
}): Promise<string> {
  const s3 = getS3Client()

  // Build command parameters
  const commandParams: any = {
    Bucket: params.bucket,
    Key: params.key,
    Body: params.body,
    ContentType: params.contentType,
  }

  // Only add server-side encryption for AWS S3 (not MinIO)
  if (!isLocalMode()) {
    commandParams.ServerSideEncryption = (params.serverSideEncryption || 'AES256') as 'AES256'
  }

  await s3.send(new PutObjectCommand(commandParams))

  // Return URL (MinIO-aware)
  return getObjectUrl(params.bucket, params.key)
}

/**
 * Check if an object exists in S3
 */
export async function objectExistsInS3(params: { key: string; bucket: string }): Promise<boolean> {
  const s3 = getS3Client()
  try {
    await s3.send(new HeadObjectCommand({ Bucket: params.bucket, Key: params.key }))
    return true
  } catch {
    return false
  }
}

/**
 * List objects in S3 under a given prefix
 */
export async function listObjectsFromS3(params: {
  bucket: string
  prefix: string
}): Promise<string[]> {
  const s3 = getS3Client()
  const keys: string[] = []
  let continuationToken: string | undefined

  do {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: params.bucket,
        Prefix: params.prefix,
        ContinuationToken: continuationToken,
      }),
    )
    for (const obj of response.Contents ?? []) {
      if (obj.Key) keys.push(obj.Key)
    }
    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  return keys
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(params: { key: string; bucket: string }): Promise<void> {
  const s3 = getS3Client()

  await s3.send(
    new DeleteObjectCommand({
      Bucket: params.bucket,
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
  bucket: string
  partSize?: number
  serverSideEncryption?: string
}): Promise<string> {
  const s3 = getS3Client()
  const partSize = params.partSize || 5 * 1024 * 1024 // 5MB default part size

  let uploadId: string | undefined

  try {
    // Build create multipart upload parameters
    const createParams: any = {
      Bucket: params.bucket,
      Key: params.key,
      ContentType: params.contentType,
    }

    // Only add server-side encryption for AWS S3 (not MinIO)
    if (!isLocalMode()) {
      createParams.ServerSideEncryption = (params.serverSideEncryption || 'AES256') as 'AES256'
    }

    // Initiate multipart upload
    const createResponse = await s3.send(new CreateMultipartUploadCommand(createParams))

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
          Bucket: params.bucket,
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
        Bucket: params.bucket,
        Key: params.key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts,
        },
      }),
    )

    // Return URL (MinIO-aware)
    return getObjectUrl(params.bucket, params.key)
  } catch (error) {
    // Abort multipart upload on error
    if (uploadId) {
      try {
        await s3.send(
          new AbortMultipartUploadCommand({
            Bucket: params.bucket,
            Key: params.key,
            UploadId: uploadId,
          }),
        )
      } catch (abortError) {
        // Silently ignore abort errors - original error is more important
      }
    }
    throw error
  }
}

/**
 * Get object URL for S3 or MinIO
 *
 * @param bucket - Bucket name
 * @param key - Object key
 * @returns URL to access the object
 */
function getObjectUrl(bucket: string, key: string): string {
  if (isLocalMode()) {
    // MinIO path-style URL
    const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000'
    return `${endpoint}/${bucket}/${key}`
  } else {
    // AWS S3 virtual-hosted style URL
    return `https://${bucket}.s3.amazonaws.com/${key}`
  }
}
