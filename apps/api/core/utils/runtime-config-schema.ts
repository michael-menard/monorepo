import { z } from 'zod'

/**
 * Runtime Configuration Schema
 *
 * Validates the structure of the runtime configuration file deployed to S3.
 * This configuration allows the frontend to dynamically switch between
 * Express and Serverless APIs without rebuild/redeploy.
 *
 * Story 1.1: Runtime Configuration Infrastructure Setup
 */
export const RuntimeConfigSchema = z.object({
  /**
   * Base URL for the API endpoint
   * - Express API: http://localhost:9000 (dev) or https://api.example.com (prod)
   * - Serverless API: https://api-gateway.{stage}.example.com
   */
  apiBaseUrl: z.string().url('API base URL must be a valid URL'),

  /**
   * Flag to determine which API implementation to use
   * - true: Use serverless API (Lambda + API Gateway)
   * - false: Use traditional Express API
   */
  useServerless: z.boolean(),

  /**
   * AWS Cognito configuration for authentication
   * Contains environment-specific Cognito settings
   */
  cognitoConfig: z.object({
    /**
     * Cognito User Pool ID
     * Format: us-east-1_XXXXXXXXX
     */
    userPoolId: z.string().min(1, 'User Pool ID is required'),

    /**
     * Cognito User Pool Client ID
     * Format: 26-character alphanumeric string
     */
    clientId: z.string().min(1, 'Client ID is required'),

    /**
     * AWS Region where Cognito User Pool is deployed
     * Format: us-east-1, us-west-2, etc.
     */
    region: z.string().min(1, 'Region is required'),
  }),
})

/**
 * TypeScript type inferred from the Zod schema
 * Use this type for type-safe access to runtime configuration
 */
export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>

/**
 * Validates runtime configuration data
 *
 * @param data - Raw configuration data to validate
 * @returns Validated runtime configuration
 * @throws ZodError if validation fails
 *
 * @example
 * ```typescript
 * const config = validateRuntimeConfig({
 *   apiBaseUrl: 'https://api-gateway.dev.example.com',
 *   useServerless: true,
 *   cognitoConfig: {
 *     userPoolId: 'us-east-1_XXXXXXXXX',
 *     clientId: 'abcdef1234567890abcdef1234',
 *     region: 'us-east-1'
 *   }
 * })
 * ```
 */
export function validateRuntimeConfig(data: unknown): RuntimeConfig {
  return RuntimeConfigSchema.parse(data)
}

/**
 * Safely validates runtime configuration data
 * Returns validation result with success/error information
 *
 * @param data - Raw configuration data to validate
 * @returns SafeParseReturnType with success flag and data/error
 *
 * @example
 * ```typescript
 * const result = safeValidateRuntimeConfig(configData)
 * if (result.success) {
 *   console.log('Valid config:', result.data)
 * } else {
 *   console.error('Validation errors:', result.error.issues)
 * }
 * ```
 */
export function safeValidateRuntimeConfig(data: unknown) {
  return RuntimeConfigSchema.safeParse(data)
}
