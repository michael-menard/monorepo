/**
 * @repo/s3-client
 *
 * Shared S3 client utilities for AWS Lambda functions.
 * Provides optimized S3 operations with connection pooling.
 *
 * Supports both AWS S3 (production) and MinIO (local development).
 */

export {
  getS3Client,
  uploadToS3,
  deleteFromS3,
  uploadToS3Multipart,
  initializeBucket,
} from './s3-client'

export { loadS3Config, isLocalMode } from './config'

export type { S3ClientConfig, EnvironmentConfig } from './__types__'
