/**
 * Environment Variable Schema and Validation
 *
 * Zod-based validation for all knowledge base environment variables.
 * Validates at startup to fail fast with clear error messages.
 *
 * @see README.md#environment-setup for configuration details
 */

import { z } from 'zod'

/**
 * Environment variable schema with validation rules.
 *
 * Required:
 * - DATABASE_URL: PostgreSQL connection string
 * - OPENAI_API_KEY: OpenAI API key for embeddings
 *
 * Optional (with defaults):
 * - EMBEDDING_MODEL: Model name (default: text-embedding-3-small)
 * - EMBEDDING_BATCH_SIZE: Batch size (default: 100)
 * - LOG_LEVEL: Logging level (default: info)
 */
export const EnvSchema = z.object({
  // Required: Database connection string
  // Supports both DATABASE_URL format and KB_DB_* format
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required')
    .refine(
      val => val.startsWith('postgresql://') || val.startsWith('postgres://'),
      'DATABASE_URL must be a PostgreSQL connection string (postgresql:// or postgres://)',
    ),

  // Required: OpenAI API key for embeddings
  OPENAI_API_KEY: z
    .string()
    .min(1, 'OPENAI_API_KEY is required')
    .refine(
      val => val.startsWith('sk-'),
      'OPENAI_API_KEY must be a valid OpenAI API key (starts with sk-)',
    ),

  // Optional: Embedding model name
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),

  // Optional: Batch size for embedding operations
  EMBEDDING_BATCH_SIZE: z.coerce.number().positive().default(100),

  // Optional: Logging level
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

/**
 * Inferred type from the Zod schema.
 * Use this for type-safe access to environment variables.
 */
export type Env = z.infer<typeof EnvSchema>

/**
 * Error message format for missing/invalid environment variables.
 */
function formatValidationError(issues: z.ZodIssue[]): string {
  const lines = [
    'ERROR: Invalid environment configuration',
    '',
    'The following environment variables are missing or invalid:',
    '',
  ]

  for (const issue of issues) {
    const path = issue.path.join('.')
    lines.push(`  ${path}: ${issue.message}`)
  }

  lines.push('')
  lines.push('See: apps/api/knowledge-base/README.md#environment-setup')
  lines.push('')

  return lines.join('\n')
}

/**
 * Build DATABASE_URL from KB_DB_* environment variables.
 * Provides backward compatibility with existing .env files.
 */
function buildDatabaseUrlFromKbVars(env: NodeJS.ProcessEnv): string | undefined {
  const host = env.KB_DB_HOST
  const port = env.KB_DB_PORT
  const name = env.KB_DB_NAME
  const user = env.KB_DB_USER
  const password = env.KB_DB_PASSWORD

  // Only build if all parts are present
  if (host && port && name && user && password) {
    return `postgresql://${user}:${password}@${host}:${port}/${name}`
  }

  return undefined
}

/**
 * Validate environment variables against the schema.
 *
 * @param env - Environment object to validate (defaults to process.env)
 * @returns Validated and typed environment configuration
 * @throws Error with detailed message listing all validation issues
 *
 * @example
 * ```typescript
 * const config = validateEnv()
 * console.log(config.DATABASE_URL) // Type-safe access
 * ```
 */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): Env {
  // Build DATABASE_URL from KB_DB_* vars if not directly set
  const databaseUrl = env.DATABASE_URL ?? buildDatabaseUrlFromKbVars(env)

  const envToValidate = {
    DATABASE_URL: databaseUrl ?? '',
    OPENAI_API_KEY: env.OPENAI_API_KEY ?? '',
    EMBEDDING_MODEL: env.EMBEDDING_MODEL,
    EMBEDDING_BATCH_SIZE: env.EMBEDDING_BATCH_SIZE,
    LOG_LEVEL: env.LOG_LEVEL,
  }

  const result = EnvSchema.safeParse(envToValidate)

  if (!result.success) {
    throw new Error(formatValidationError(result.error.issues))
  }

  return result.data
}

/**
 * Safe validation that returns a result object instead of throwing.
 *
 * @param env - Environment object to validate
 * @returns Object with success status and either data or error
 *
 * @example
 * ```typescript
 * const result = safeValidateEnv()
 * if (result.success) {
 *   console.log(result.data.DATABASE_URL)
 * } else {
 *   console.error(result.error)
 * }
 * ```
 */
export function safeValidateEnv(
  env: NodeJS.ProcessEnv = process.env,
): { success: true; data: Env } | { success: false; error: string } {
  try {
    const data = validateEnv(env)
    return { success: true, data }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    return { success: false, error }
  }
}
