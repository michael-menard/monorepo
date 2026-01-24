/**
 * Config Bootstrap Module
 *
 * Story 3.1.5: Config and Validation Foundations
 *
 * Validates all config schemas at module load time (Lambda cold start).
 * Import this module from handlers that require validated config.
 *
 * On validation failure:
 * - Logs structured ERROR with Zod issues
 * - Throws error (causes Lambda initialization failure)
 *
 * Usage:
 * ```typescript
 * // At top of handler file
 * import '@/core/config/bootstrap'
 * ```
 */

import { validateUploadConfig } from './upload'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('config-bootstrap')

/**
 * Validate all required configs at startup
 * This runs once during Lambda cold start
 */
const bootstrapConfig = (): void => {
  try {
    logger.info('Validating configuration at startup...')

    // Validate upload config
    validateUploadConfig()

    logger.info('All configuration validated successfully')
  } catch (error) {
    // Log structured error
    logger.error('Configuration validation failed at startup', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Re-throw to fail Lambda initialization
    throw error
  }
}

// Execute validation immediately on module load
bootstrapConfig()

export { bootstrapConfig }
