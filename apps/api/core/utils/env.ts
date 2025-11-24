import { z } from 'zod'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('env')

/**
 * Environment Variable Schema
 *
 * Validates and type-checks environment variables for all deployment stages.
 * Uses Zod for runtime validation and TypeScript inference.
 */

const StageSchema = z.enum(['dev', 'staging', 'production'])

export const EnvSchema = z.object({
  // Deployment stage
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  STAGE: StageSchema.default('dev'),

  // AWS Configuration
  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCOUNT_ID: z.string().optional(),

  // Database (populated via SST Resource linking at runtime)
  POSTGRES_HOST: z.string().optional(),
  POSTGRES_PORT: z.string().optional(),
  POSTGRES_DATABASE: z.string().optional(),
  POSTGRES_USERNAME: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),

  // OpenSearch (populated via SST Resource linking)
  OPENSEARCH_ENDPOINT: z.string().optional(),
  OPENSEARCH_DISABLED: z.string().optional(),

  // S3 (populated via SST Resource linking)
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),

  // Cognito (existing auth service)
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
  COGNITO_REGION: z.string().default('us-east-1'),

  // API Configuration
  API_CORS_ORIGINS: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

export type Env = z.infer<typeof EnvSchema>

/**
 * Validates and returns typed environment variables
 */
export function validateEnv(): Env {
  try {
    return EnvSchema.parse(process.env)
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('❌ Invalid environment variables:')
      logger.error(JSON.stringify(error.issues, null, 2))
      throw new Error('Environment validation failed')
    }
    throw error
  }
}

/**
 * Get validated environment variables (memoized)
 */
let _env: Env | null = null

export function getEnv(): Env {
  if (!_env) {
    _env = validateEnv()
  }
  return _env
}
