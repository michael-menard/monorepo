/**
 * Parts Validator Configuration
 *
 * Story 3.1.23: Environment-based configuration for parts validation.
 *
 * Supports:
 * - PARTS_VALIDATION_MODE: 'strict' | 'relaxed' (default: 'relaxed')
 * - PARTS_MAX_FILE_SIZE: max file size in bytes (default: 10MB)
 * - PARTS_MAX_PARTS: max parts per file (default: 50000)
 */

import type { ValidationMode, ValidatorConfig } from './types'

// =============================================================================
// Configuration Functions
// =============================================================================

/**
 * Get the current validation mode from environment
 */
export const getValidationMode = (): ValidationMode => {
  const mode = process.env.PARTS_VALIDATION_MODE
  if (mode === 'strict' || mode === 'relaxed') {
    return mode
  }
  return 'relaxed' // Default to relaxed
}

/**
 * Get the maximum file size for parts lists
 */
export const getMaxFileSize = (): number => {
  const size = process.env.PARTS_MAX_FILE_SIZE
  if (size) {
    const parsed = parseInt(size, 10)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }
  return 10 * 1024 * 1024 // 10MB default
}

/**
 * Get the maximum number of parts per file
 */
export const getMaxParts = (): number => {
  const max = process.env.PARTS_MAX_PARTS
  if (max) {
    const parsed = parseInt(max, 10)
    if (!isNaN(parsed) && parsed > 0) {
      return parsed
    }
  }
  return 50000 // 50k parts default
}

/**
 * Get complete validator configuration from environment
 */
export const getValidatorConfig = (): ValidatorConfig => ({
  mode: getValidationMode(),
  maxFileSize: getMaxFileSize(),
  maxParts: getMaxParts(),
})

/**
 * Create a custom validator config with overrides
 */
export const createValidatorConfig = (overrides?: Partial<ValidatorConfig>): ValidatorConfig => ({
  ...getValidatorConfig(),
  ...overrides,
})
