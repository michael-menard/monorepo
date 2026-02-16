/**
 * S3 Client Configuration
 *
 * Environment-aware configuration for S3 and MinIO.
 * Supports local development (MinIO) and production (AWS S3).
 */

import { S3ClientConfigSchema, EnvironmentConfigSchema, type S3ClientConfig } from './__types__'

/**
 * Load S3 client configuration from environment variables
 *
 * Environment Detection:
 * - Development + S3_ENDPOINT set → MinIO mode (forcePathStyle: true)
 * - Production or no S3_ENDPOINT → AWS S3 mode (standard behavior)
 *
 * Environment Variables:
 * - NODE_ENV: development | test | production
 * - AWS_REGION: AWS region (defaults to us-east-1)
 * - S3_ENDPOINT: Custom endpoint for MinIO/S3-compatible services
 * - S3_ACCESS_KEY_ID: Access key ID (optional, overrides AWS credential chain)
 * - S3_SECRET_ACCESS_KEY: Secret access key (optional, overrides AWS credential chain)
 *
 * @returns Validated S3ClientConfig
 * @throws Error if environment variables are invalid
 */
export function loadS3Config(): S3ClientConfig {
  // Parse and validate environment variables
  const envResult = EnvironmentConfigSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    AWS_REGION: process.env.AWS_REGION,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY,
  })

  if (!envResult.success) {
    throw new Error(
      `Invalid S3 environment configuration: ${envResult.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
    )
  }

  const env = envResult.data

  // Build S3 client configuration
  const config: Partial<S3ClientConfig> = {
    region: env.AWS_REGION || 'us-east-1',
  }

  // Local development with MinIO
  if (env.NODE_ENV === 'development' && env.S3_ENDPOINT) {
    config.endpoint = env.S3_ENDPOINT
    config.forcePathStyle = true

    // Use explicit credentials if provided (required for MinIO)
    if (env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) {
      config.accessKeyId = env.S3_ACCESS_KEY_ID
      config.secretAccessKey = env.S3_SECRET_ACCESS_KEY
    }
  }
  // Production or test with custom endpoint (rare)
  else if (env.S3_ENDPOINT) {
    config.endpoint = env.S3_ENDPOINT
    // Note: forcePathStyle defaults to false for production S3 compatibility
  }

  // Validate final configuration
  const configResult = S3ClientConfigSchema.safeParse(config)

  if (!configResult.success) {
    throw new Error(
      `Invalid S3 client configuration: ${configResult.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
    )
  }

  return configResult.data
}

/**
 * Check if S3 client is in local mode (MinIO)
 *
 * @returns true if using local MinIO, false if using AWS S3
 */
export function isLocalMode(): boolean {
  const env = process.env.NODE_ENV || 'development'
  return env === 'development' && !!process.env.S3_ENDPOINT
}
