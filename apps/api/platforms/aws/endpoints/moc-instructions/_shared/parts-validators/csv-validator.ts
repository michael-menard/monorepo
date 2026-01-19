/**
 * CSV Parts List Validator
 *
 * Story 3.1.23: CSV validation with strict/relaxed modes.
 *
 * Features:
 * - Automatic header detection
 * - Flexible column mapping
 * - Strict mode: requires exact columns (partNumber, quantity)
 * - Relaxed mode: allows extra columns, flexible header names
 */

import { Readable } from 'stream'
import csv from 'csv-parser'
import { createLogger } from '@/core/observability/logger'
import {
  type PartsListValidator,
  type PartsValidationResult,
  type PartsValidationError,
  type PartEntry,
  type ValidatorConfig,
  PartEntrySchema,
  KNOWN_COLUMN_MAPPINGS,
  STRICT_REQUIRED_COLUMNS,
} from './types'

const logger = createLogger('csv-validator')

// =============================================================================
// CSV Validator Implementation
// =============================================================================

export const csvValidator: PartsListValidator = {
  format: 'csv',
  supportedExtensions: ['csv', 'txt'],
  supportedMimeTypes: ['text/csv', 'application/csv', 'text/plain', 'application/octet-stream'],

  canHandle(filename: string, mimeType: string): boolean {
    const ext = filename.toLowerCase().split('.').pop() || ''
    return this.supportedExtensions.includes(ext) || this.supportedMimeTypes.includes(mimeType)
  },

  async validate(
    fileBuffer: Buffer,
    filename: string,
    config: ValidatorConfig,
  ): Promise<PartsValidationResult> {
    logger.info('Starting CSV validation', {
      filename,
      size: fileBuffer.length,
      mode: config.mode,
    })

    const errors: PartsValidationError[] = []
    const warnings: PartsValidationError[] = []

    // File size check
    if (fileBuffer.length > config.maxFileSize) {
      errors.push({
        code: 'FILE_TOO_LARGE',
        message: `File exceeds maximum size of ${Math.round(config.maxFileSize / 1024 / 1024)}MB`,
        severity: 'error',
      })
      return { success: false, errors, warnings, filename }
    }

    // Empty file check
    const content = fileBuffer.toString('utf-8')
    const lines = content.split('\n').filter(line => line.trim())

    if (lines.length === 0) {
      errors.push({
        code: 'EMPTY_FILE',
        message: 'CSV file is empty',
        severity: 'error',
      })
      return { success: false, errors, warnings, filename }
    }

    // Detect headers
    const firstLine = lines[0].split(',').map(cell => cell.trim().toLowerCase())
    const headerDetection = detectHeaders(firstLine)

    logger.debug('Header detection result', {
      hasHeaders: headerDetection.hasHeaders,
      mapping: headerDetection.mapping,
    })

    // Strict mode: validate required columns are present
    if (config.mode === 'strict') {
      const strictErrors = validateStrictColumns(headerDetection, firstLine)
      errors.push(...strictErrors)
      if (strictErrors.length > 0) {
        return { success: false, errors, warnings, filename }
      }
    }

    // Parse CSV content
    const parseResult = await parseCSVContent(content, headerDetection, config, errors, warnings)

    if (!parseResult.success) {
      return { success: false, errors, warnings, filename }
    }

    // Max parts check
    if (parseResult.parts.length > config.maxParts) {
      errors.push({
        code: 'TOO_MANY_PARTS',
        message: `File contains ${parseResult.parts.length} parts, maximum is ${config.maxParts}`,
        severity: 'error',
      })
      return { success: false, errors, warnings, filename }
    }

    const totalPieceCount = parseResult.parts.reduce((sum, part) => sum + part.quantity, 0)

    logger.info('CSV validation completed', {
      filename,
      partsCount: parseResult.parts.length,
      totalPieceCount,
      errorsCount: errors.length,
      warningsCount: warnings.length,
    })

    return {
      success: errors.length === 0,
      data:
        errors.length === 0
          ? {
              parts: parseResult.parts,
              totalPieceCount,
              format: 'csv',
              metadata: {
                source: 'csv_upload',
                headerDetected: headerDetection.hasHeaders,
                columnMapping: headerDetection.mapping,
              },
            }
          : undefined,
      errors,
      warnings,
      filename,
    }
  },
}

// =============================================================================
// Header Detection
// =============================================================================

interface HeaderDetection {
  hasHeaders: boolean
  mapping: Record<number, string>
}

const detectHeaders = (firstLineCells: string[]): HeaderDetection => {
  const mapping: Record<number, string> = {}
  let headerMatches = 0

  firstLineCells.forEach((cell, index) => {
    const normalized = cell.toLowerCase().trim()

    // Check each known field
    for (const [fieldName, aliases] of Object.entries(KNOWN_COLUMN_MAPPINGS)) {
      if (aliases.includes(normalized)) {
        mapping[index] = fieldName
        headerMatches++
        break
      }
    }
  })

  // Consider it a header row if at least one required field is found
  const hasHeaders = headerMatches > 0

  // If no headers detected, assume standard column order
  if (!hasHeaders) {
    return {
      hasHeaders: false,
      mapping: {
        0: 'partNumber',
        1: 'quantity',
        2: 'color',
        3: 'description',
      },
    }
  }

  return { hasHeaders, mapping }
}

// =============================================================================
// Strict Mode Validation
// =============================================================================

const validateStrictColumns = (
  headerDetection: HeaderDetection,
  firstLineCells: string[],
): PartsValidationError[] => {
  const errors: PartsValidationError[] = []
  const mappedFields = Object.values(headerDetection.mapping)

  // Check required columns are present
  for (const required of STRICT_REQUIRED_COLUMNS.csv) {
    if (!mappedFields.includes(required)) {
      errors.push({
        code: 'MISSING_REQUIRED_COLUMN',
        message: `Required column "${required}" not found. Found columns: ${firstLineCells.join(', ')}`,
        field: required,
        severity: 'error',
      })
    }
  }

  // In strict mode, warn about extra columns
  const knownFields = Object.keys(KNOWN_COLUMN_MAPPINGS)
  firstLineCells.forEach((cell, index) => {
    if (cell && !headerDetection.mapping[index]) {
      errors.push({
        code: 'UNKNOWN_COLUMN',
        message: `Unknown column "${cell}" at position ${index + 1}. Allowed columns: ${knownFields.join(', ')}`,
        field: cell,
        severity: 'error',
      })
    }
  })

  return errors
}

// =============================================================================
// CSV Parsing
// =============================================================================

interface ParseResult {
  success: boolean
  parts: PartEntry[]
}

const parseCSVContent = (
  content: string,
  headerDetection: HeaderDetection,
  config: ValidatorConfig,
  errors: PartsValidationError[],
  warnings: PartsValidationError[],
): Promise<ParseResult> => {
  return new Promise(resolve => {
    const parts: PartEntry[] = []
    let lineNumber = 0
    let isFirstRow = true

    const stream = Readable.from(content)

    stream
      .pipe(csv({ headers: false }))
      .on('data', row => {
        lineNumber++

        // Skip header row
        if (isFirstRow && headerDetection.hasHeaders) {
          isFirstRow = false
          return
        }
        isFirstRow = false

        try {
          const values = Object.values(row) as string[]
          const partData: Record<string, unknown> = {}

          // Map values using header mapping
          Object.entries(headerDetection.mapping).forEach(([columnIndex, fieldName]) => {
            const value = values[parseInt(columnIndex)]
            if (value !== undefined && value !== '') {
              partData[fieldName] = value
            }
          })

          // Convert quantity to number
          if (partData.quantity) {
            const qty = parseInt(String(partData.quantity), 10)
            if (isNaN(qty)) {
              if (config.mode === 'strict') {
                errors.push({
                  code: 'INVALID_QUANTITY',
                  message: `Invalid quantity "${partData.quantity}" at line ${lineNumber}`,
                  line: lineNumber,
                  field: 'quantity',
                  severity: 'error',
                })
              } else {
                warnings.push({
                  code: 'INVALID_QUANTITY',
                  message: `Skipping row with invalid quantity "${partData.quantity}" at line ${lineNumber}`,
                  line: lineNumber,
                  field: 'quantity',
                  severity: 'warning',
                })
              }
              return
            }
            partData.quantity = qty
          }

          // Validate with Zod
          const validation = PartEntrySchema.safeParse(partData)

          if (validation.success) {
            parts.push(validation.data)
          } else {
            validation.error.issues.forEach(issue => {
              const errorItem: PartsValidationError = {
                code: 'VALIDATION_ERROR',
                message: `Line ${lineNumber}: ${issue.message}`,
                line: lineNumber,
                field: issue.path[0]?.toString(),
                severity: config.mode === 'strict' ? 'error' : 'warning',
              }

              if (config.mode === 'strict') {
                errors.push(errorItem)
              } else {
                warnings.push(errorItem)
              }
            })
          }
        } catch (error) {
          const errorItem: PartsValidationError = {
            code: 'PARSE_ERROR',
            message: `Line ${lineNumber}: ${error instanceof Error ? error.message : 'Parse error'}`,
            line: lineNumber,
            severity: config.mode === 'strict' ? 'error' : 'warning',
          }

          if (config.mode === 'strict') {
            errors.push(errorItem)
          } else {
            warnings.push(errorItem)
          }
        }
      })
      .on('end', () => {
        if (parts.length === 0 && errors.length === 0) {
          errors.push({
            code: 'NO_VALID_PARTS',
            message: 'No valid parts found in CSV file',
            severity: 'error',
          })
          resolve({ success: false, parts: [] })
        } else {
          resolve({ success: true, parts })
        }
      })
      .on('error', error => {
        errors.push({
          code: 'CSV_PARSE_ERROR',
          message: `Failed to parse CSV: ${error.message}`,
          severity: 'error',
        })
        resolve({ success: false, parts: [] })
      })
  })
}

export default csvValidator
