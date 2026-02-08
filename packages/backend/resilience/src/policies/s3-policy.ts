/**
 * @repo/resilience - S3 Policy
 *
 * Pre-configured resilience policy for AWS S3 API calls.
 * Handles object storage operations with appropriate timeouts.
 */

import { createServicePolicy, type ServicePolicy } from './index.js'

/**
 * S3-specific circuit breaker configuration.
 * Tuned for typical S3 behavior (usually fast but can vary by size).
 */
const S3_CIRCUIT_BREAKER_CONFIG = {
  name: 's3',
  timeout: 30000, // 30s - larger objects can take time
  errorThresholdPercentage: 50,
  resetTimeout: 30000, // 30s recovery
  volumeThreshold: 5,
  enabled: true,
}

/**
 * S3 rate limiter configuration.
 * S3 has high limits, but we want to control concurrency.
 */
const S3_RATE_LIMITER_CONFIG = {
  name: 's3',
  maxConcurrent: 100, // S3 can handle high concurrency
  minTime: 0, // No minimum time between requests
  enabled: true,
}

/**
 * Pre-built S3 service policy.
 */
export function createS3Policy(): ServicePolicy {
  return createServicePolicy({
    name: 's3',
    circuitBreaker: S3_CIRCUIT_BREAKER_CONFIG,
    rateLimiter: S3_RATE_LIMITER_CONFIG,
    timeoutMs: 30000,
  })
}

/**
 * Singleton instance of S3 policy.
 */
let s3PolicyInstance: ServicePolicy | null = null

export function getS3Policy(): ServicePolicy {
  if (!s3PolicyInstance) {
    s3PolicyInstance = createS3Policy()
  }
  return s3PolicyInstance
}

/**
 * S3 upload-specific policy with longer timeouts.
 */
export function createS3UploadPolicy(): ServicePolicy {
  return createServicePolicy({
    name: 's3-upload',
    circuitBreaker: {
      ...S3_CIRCUIT_BREAKER_CONFIG,
      name: 's3-upload',
      timeout: 120000, // 2 minutes for large uploads
    },
    rateLimiter: {
      ...S3_RATE_LIMITER_CONFIG,
      name: 's3-upload',
      maxConcurrent: 20, // Lower concurrency for uploads
    },
    timeoutMs: 120000,
  })
}

/**
 * S3 download-specific policy.
 */
export function createS3DownloadPolicy(): ServicePolicy {
  return createServicePolicy({
    name: 's3-download',
    circuitBreaker: {
      ...S3_CIRCUIT_BREAKER_CONFIG,
      name: 's3-download',
      timeout: 60000, // 1 minute for downloads
    },
    rateLimiter: {
      ...S3_RATE_LIMITER_CONFIG,
      name: 's3-download',
      maxConcurrent: 50,
    },
    timeoutMs: 60000,
  })
}
