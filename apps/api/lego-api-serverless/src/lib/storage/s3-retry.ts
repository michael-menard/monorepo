/**
 * S3 Upload Retry Wrapper with Presigned URL Fallback
 *
 * Implements retry logic for S3 operations with:
 * - Exponential backoff for transient failures
 * - Presigned URL generation as fallback when upload fails
 * - Structured logging of retry attempts
 *
 * Usage:
 * ```typescript
 * import { uploadToS3WithRetry } from '@/lib/storage/s3-retry'
 *
 * const url = await uploadToS3WithRetry({
 *   key: 'images/photo.jpg',
 *   body: buffer,
 *   contentType: 'image/jpeg'
 * })
 * ```
 */

import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { retryWithBackoff } from '@/lib/utils/retry'
import { ExternalServiceError } from '@monorepo/lambda-responses'
import { createLogger } from '@/lib/utils/logger'
import { getS3Client, uploadToS3, uploadToS3Multipart } from './s3-client'
import { getEnv } from '@/lib/utils/env'

const logger = createLogger('s3-retry')

/**
 * Upload file to S3 with automatic retry on failures
 *
 * If all retries fail, generates a presigned URL for client-side upload
 *
 * @param params - Upload parameters
 * @returns S3 URL if upload succeeds, or presigned URL for client upload
 * @throws ExternalServiceError with presigned URL in details if upload fails
 *
 * @example
 * ```typescript
 * try {
 *   const url = await uploadToS3WithRetry({
 *     key: 'uploads/file.pdf',
 *     body: fileBuffer,
 *     contentType: 'application/pdf'
 *   })
 *   // Upload succeeded, use the URL
 *   return { url }
 * } catch (error) {
 *   if (error instanceof ExternalServiceError && error.details?.presignedUrl) {
 *     // Upload failed, return presigned URL for client-side upload
 *     return { presignedUrl: error.details.presignedUrl }
 *   }
 *   throw error
 * }
 * ```
 */
export async function uploadToS3WithRetry(params: {
  key: string
  body: Buffer
  contentType: string
  bucket?: string
  useMultipart?: boolean
}): Promise<string> {
  try {
    return await retryWithBackoff(
      async () => {
        try {
          // Use multipart for large files (>5MB) or if explicitly requested
          const useMultipart = params.useMultipart || params.body.length > 5 * 1024 * 1024

          if (useMultipart) {
            logger.info('Uploading file to S3 using multipart', {
              key: params.key,
              size: params.body.length,
            })
            return await uploadToS3Multipart(params)
          }

          logger.info('Uploading file to S3', {
            key: params.key,
            size: params.body.length,
          })
          return await uploadToS3(params)
        } catch (error) {
          // Classify AWS S3 errors
          const errorName = error instanceof Error ? error.name : 'unknown'

          // Determine if error is retryable
          const isRetryable = isS3ErrorRetryable(error)

          logger.warn('S3 upload failed', {
            key: params.key,
            errorName,
            isRetryable,
            errorMessage: error instanceof Error ? error.message : String(error),
          })

          throw new ExternalServiceError(
            'S3',
            `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            {
              key: params.key,
              errorName,
            },
            isRetryable,
          )
        }
      },
      {
        maxAttempts: 3,
        baseDelay: 500, // S3 operations may take longer
        maxDelay: 5000,
        jitter: true,
        context: 's3-upload',
      },
    )
  } catch (error) {
    // All retries exhausted - generate presigned URL as fallback
    logger.error('S3 upload failed after retries, generating presigned URL', {
      key: params.key,
      error: error instanceof Error ? error.message : String(error),
    })

    const presignedUrl = await generatePresignedUploadUrl({
      key: params.key,
      contentType: params.contentType,
      bucket: params.bucket,
      expiresIn: 3600, // 1 hour
    })

    // Throw error with presigned URL in details
    throw new ExternalServiceError(
      'S3',
      'Upload failed after retries. Please use the presigned URL for client-side upload.',
      {
        presignedUrl,
        key: params.key,
      },
      false, // Not retryable at this point
    )
  }
}

/**
 * Generate presigned URL for client-side upload
 *
 * @param params - Presigned URL parameters
 * @returns Presigned URL that client can use to upload directly to S3
 */
export async function generatePresignedUploadUrl(params: {
  key: string
  contentType: string
  bucket?: string
  expiresIn?: number
}): Promise<string> {
  const s3 = await getS3Client()
  const env = getEnv()
  const bucket = params.bucket || env.S3_BUCKET
  const expiresIn = params.expiresIn || 3600 // Default 1 hour

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    ContentType: params.contentType,
    ServerSideEncryption: 'AES256',
  })

  const presignedUrl = await getSignedUrl(s3, command, { expiresIn })

  logger.info('Generated presigned upload URL', {
    key: params.key,
    expiresIn,
  })

  return presignedUrl
}

/**
 * Generate presigned URL for client-side download
 *
 * @param params - Presigned URL parameters
 * @returns Presigned URL that client can use to download from S3
 */
export async function generatePresignedDownloadUrl(params: {
  key: string
  bucket?: string
  expiresIn?: number
}): Promise<string> {
  const s3 = await getS3Client()
  const env = getEnv()
  const bucket = params.bucket || env.S3_BUCKET
  const expiresIn = params.expiresIn || 3600 // Default 1 hour

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: params.key,
  })

  return await getSignedUrl(s3, command, { expiresIn })
}

/**
 * Determine if an S3 error is retryable
 *
 * @param error - The error to check
 * @returns true if error should be retried
 */
function isS3ErrorRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const errorName = error.name
  const message = error.message.toLowerCase()

  // AWS SDK retryable errors
  const retryableErrors = [
    'RequestTimeout',
    'RequestTimeoutException',
    'PriorRequestNotComplete',
    'ConnectionError',
    'NetworkingError',
    'ThrottlingException',
    'Throttling',
    'TooManyRequestsException',
    'ProvisionedThroughputExceededException',
    'RequestLimitExceeded',
    'BandwidthLimitExceeded',
    'RequestThrottled',
    'SlowDown',
    'ServiceUnavailable',
    'InternalError',
    '503',
    '500',
  ]

  // Check error name
  if (retryableErrors.some((retryable) => errorName.includes(retryable))) {
    return true
  }

  // Check error message for patterns
  const retryablePatterns = [
    'timeout',
    'throttl',
    'slow down',
    'try again',
    'service unavailable',
    'internal error',
    'connection',
    'network',
  ]

  return retryablePatterns.some((pattern) => message.includes(pattern))
}

/**
 * Delete file from S3 with retry
 *
 * @param params - Delete parameters
 */
export async function deleteFromS3WithRetry(params: {
  key: string
  bucket?: string
}): Promise<void> {
  const { deleteFromS3 } = await import('./s3-client')

  return retryWithBackoff(
    async () => {
      try {
        await deleteFromS3(params)
      } catch (error) {
        const isRetryable = isS3ErrorRetryable(error)

        throw new ExternalServiceError(
          'S3',
          `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
          {
            key: params.key,
            errorName: error instanceof Error ? error.name : 'unknown',
          },
          isRetryable,
        )
      }
    },
    {
      maxAttempts: 3,
      baseDelay: 300,
      maxDelay: 3000,
      jitter: true,
      context: 's3-delete',
    },
  )
}
