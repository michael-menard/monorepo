/**
 * @monorepo/s3-client
 *
 * Shared S3 client utilities for AWS Lambda functions.
 * Provides optimized S3 operations with connection pooling.
 */

export { getS3Client, uploadToS3, deleteFromS3, uploadToS3Multipart } from './s3-client'
