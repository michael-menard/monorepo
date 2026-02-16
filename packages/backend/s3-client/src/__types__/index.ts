/**
 * Type Definitions for S3 Client
 *
 * All types are derived from Zod schemas for runtime validation.
 */

import { z } from 'zod'

/**
 * S3 Client Configuration Schema
 *
 * Validates environment-specific S3/MinIO configuration.
 */
export const S3ClientConfigSchema = z.object({
  /**
   * AWS region (defaults to us-east-1)
   */
  region: z.string().default('us-east-1'),

  /**
   * Custom S3 endpoint (for MinIO or other S3-compatible services)
   * Example: http://localhost:9000
   */
  endpoint: z.string().url().optional(),

  /**
   * Force path-style URLs (required for MinIO)
   * Example: http://localhost:9000/bucket/key instead of http://bucket.localhost:9000/key
   */
  forcePathStyle: z.boolean().default(false),

  /**
   * Access key ID (overrides AWS credential chain)
   */
  accessKeyId: z.string().optional(),

  /**
   * Secret access key (overrides AWS credential chain)
   */
  secretAccessKey: z.string().optional(),
})

export type S3ClientConfig = z.infer<typeof S3ClientConfigSchema>

/**
 * Environment Configuration Schema
 *
 * Validates environment variables for S3 client configuration.
 */
export const EnvironmentConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  AWS_REGION: z.string().optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
})

export type EnvironmentConfig = z.infer<typeof EnvironmentConfigSchema>
