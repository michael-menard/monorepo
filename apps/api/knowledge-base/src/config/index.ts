/**
 * Configuration Module
 *
 * Loads and validates environment variables at module load time.
 * Exports a singleton validated configuration object.
 *
 * This module should be imported before any other modules that
 * depend on environment variables to ensure fail-fast behavior.
 *
 * @example
 * ```typescript
 * import { config, Env } from './config'
 *
 * console.log(config.DATABASE_URL) // Type-safe access
 * ```
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config as dotenvConfig } from 'dotenv'
import { validateEnv, type Env } from './env.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env from package root before validation
dotenvConfig({ path: resolve(__dirname, '../../.env') })

// Export schema and types
export { EnvSchema, type Env, validateEnv, safeValidateEnv } from './env.js'

/**
 * Validated configuration singleton.
 *
 * This is lazily initialized on first access to allow test setup
 * to configure environment variables before validation runs.
 */
let _config: Env | null = null

/**
 * Get the validated configuration.
 * Validates environment variables on first access.
 *
 * @returns Validated environment configuration
 * @throws Error if environment validation fails
 */
export function getConfig(): Env {
  if (_config === null) {
    _config = validateEnv()
  }
  return _config
}

/**
 * Reset the configuration singleton.
 * Useful for testing to force re-validation with new env values.
 */
export function resetConfig(): void {
  _config = null
}

/**
 * Pre-validated configuration export.
 * For production use where you want immediate validation.
 *
 * Note: Import { config } if you want fail-fast validation at module load.
 * Import { getConfig } if you need lazy initialization (e.g., for tests).
 */
export const config: Env = getConfig()
