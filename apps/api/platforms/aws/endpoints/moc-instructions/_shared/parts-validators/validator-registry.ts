/**
 * Parts Validator Registry
 *
 * Story 3.1.23: Pluggable validator architecture.
 *
 * Provides a registry for format-specific validators that can be
 * extended with new formats without modifying existing code.
 */

import type {
  PartsListValidator,
  PartsValidationResult,
  ValidatorConfig,
  PartsListFormat,
} from './types'
import { getValidatorConfig } from './config'
import csvValidator from './csv-validator'
import xmlValidator from './xml-validator'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('validator-registry')

// =============================================================================
// Validator Registry
// =============================================================================

/**
 * Registry of all available validators
 * Add new validators here to extend format support
 */
const validators: Map<PartsListFormat, PartsListValidator> = new Map([
  ['csv', csvValidator],
  ['xml', xmlValidator],
])

/**
 * Register a new validator
 * Use this to add support for new formats at runtime
 */
export const registerValidator = (validator: PartsListValidator): void => {
  logger.info('Registering validator', { format: validator.format })
  validators.set(validator.format, validator)
}

/**
 * Get a validator by format
 */
export const getValidator = (format: PartsListFormat): PartsListValidator | undefined => {
  return validators.get(format)
}

/**
 * Get all registered validators
 */
export const getAllValidators = (): PartsListValidator[] => {
  return Array.from(validators.values())
}

/**
 * Get all supported file extensions
 */
export const getSupportedExtensions = (): string[] => {
  const extensions: string[] = []
  for (const validator of validators.values()) {
    extensions.push(...validator.supportedExtensions)
  }
  return [...new Set(extensions)]
}

/**
 * Get all supported MIME types
 */
export const getSupportedMimeTypes = (): string[] => {
  const mimeTypes: string[] = []
  for (const validator of validators.values()) {
    mimeTypes.push(...validator.supportedMimeTypes)
  }
  return [...new Set(mimeTypes)]
}

// =============================================================================
// Validator Selection
// =============================================================================

/**
 * Find the appropriate validator for a file
 */
export const findValidator = (
  filename: string,
  mimeType: string,
): PartsListValidator | undefined => {
  for (const validator of validators.values()) {
    if (validator.canHandle(filename, mimeType)) {
      logger.debug('Found validator', {
        filename,
        mimeType,
        format: validator.format,
      })
      return validator
    }
  }

  logger.warn('No validator found', { filename, mimeType })
  return undefined
}

// =============================================================================
// Main Validation Function
// =============================================================================

/**
 * Validate a parts list file
 *
 * Automatically selects the appropriate validator based on file extension/MIME type.
 *
 * @param fileBuffer - File content as Buffer
 * @param filename - Original filename
 * @param mimeType - MIME type of the file
 * @param configOverrides - Optional config overrides
 * @returns Validation result with parsed data or errors
 */
export const validatePartsFile = async (
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
  configOverrides?: Partial<ValidatorConfig>,
): Promise<PartsValidationResult> => {
  const config = { ...getValidatorConfig(), ...configOverrides }

  logger.info('Validating parts file', {
    filename,
    mimeType,
    size: fileBuffer.length,
    mode: config.mode,
  })

  // Find appropriate validator
  const validator = findValidator(filename, mimeType)

  if (!validator) {
    const supportedExts = getSupportedExtensions().join(', ')
    return {
      success: false,
      errors: [
        {
          code: 'UNSUPPORTED_FORMAT',
          message: `Unsupported file format. Supported formats: ${supportedExts}`,
          severity: 'error',
        },
      ],
      warnings: [],
      filename,
    }
  }

  // Run validation
  const result = await validator.validate(fileBuffer, filename, config)
  result.filename = filename

  return result
}

/**
 * Validate multiple parts files
 *
 * Returns individual results for each file, allowing partial success.
 */
export const validatePartsFiles = async (
  files: Array<{ buffer: Buffer; filename: string; mimeType: string; fileId?: string }>,
  configOverrides?: Partial<ValidatorConfig>,
): Promise<Map<string, PartsValidationResult>> => {
  const results = new Map<string, PartsValidationResult>()

  await Promise.all(
    files.map(async file => {
      const result = await validatePartsFile(
        file.buffer,
        file.filename,
        file.mimeType,
        configOverrides,
      )
      result.fileId = file.fileId
      results.set(file.fileId || file.filename, result)
    }),
  )

  return results
}
