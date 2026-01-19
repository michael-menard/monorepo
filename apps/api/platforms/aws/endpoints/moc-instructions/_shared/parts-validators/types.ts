/**
 * Parts List Validator Types
 *
 * Story 3.1.23: Pluggable Parts Schema Validation
 *
 * Defines interfaces for pluggable parts list validators.
 * Supports CSV, XML, and extensible for future formats.
 */

import { z } from 'zod'

// =============================================================================
// Validation Mode Configuration
// =============================================================================

/**
 * Validation mode: strict enforces exact column sets, relaxed allows extras
 */
export type ValidationMode = 'strict' | 'relaxed'

/**
 * Supported parts list formats
 */
export type PartsListFormat = 'csv' | 'xml' | 'json'

// =============================================================================
// Part Entry Schema
// =============================================================================

/**
 * Validated part entry schema
 */
export const PartEntrySchema = z.object({
  partNumber: z.string().min(1, 'Part number is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  color: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
})

export type PartEntry = z.infer<typeof PartEntrySchema>

// =============================================================================
// Validation Result Types
// =============================================================================

/**
 * Individual validation error for a specific location in the file
 */
export interface PartsValidationError {
  /** Error code for client mapping */
  code: string
  /** Human-readable error message */
  message: string
  /** Line number (for CSV) or element index (for XML) */
  line?: number
  /** Column name or XML field name */
  field?: string
  /** Severity: error blocks finalization, warning is informational */
  severity: 'error' | 'warning'
}

/**
 * Parsed parts list data
 */
export interface ParsedPartsList {
  parts: PartEntry[]
  totalPieceCount: number
  format: PartsListFormat
  metadata?: {
    source?: string
    version?: string
    headerDetected?: boolean
    columnMapping?: Record<string, string>
    [key: string]: unknown
  }
}

/**
 * Result of parts list validation
 */
export interface PartsValidationResult {
  /** Whether validation passed (no errors, warnings are OK) */
  success: boolean
  /** Parsed data if successful */
  data?: ParsedPartsList
  /** All validation errors */
  errors: PartsValidationError[]
  /** All validation warnings */
  warnings: PartsValidationError[]
  /** File identifier for per-file error tracking */
  fileId?: string
  /** Original filename for error messages */
  filename?: string
}

// =============================================================================
// Validator Interface
// =============================================================================

/**
 * Configuration options for validators
 */
export interface ValidatorConfig {
  /** Validation mode: strict or relaxed */
  mode: ValidationMode
  /** Maximum file size in bytes */
  maxFileSize: number
  /** Maximum number of parts allowed */
  maxParts: number
}

/**
 * Pluggable parts list validator interface
 *
 * Implementations must be stateless and handle their specific format.
 */
export interface PartsListValidator {
  /** Format this validator handles */
  readonly format: PartsListFormat

  /** File extensions this validator supports */
  readonly supportedExtensions: string[]

  /** MIME types this validator supports */
  readonly supportedMimeTypes: string[]

  /**
   * Check if this validator can handle the given file
   */
  canHandle(filename: string, mimeType: string): boolean

  /**
   * Validate and parse the file buffer
   */
  validate(
    fileBuffer: Buffer,
    filename: string,
    config: ValidatorConfig,
  ): Promise<PartsValidationResult>
}

// =============================================================================
// Required Columns Configuration
// =============================================================================

/**
 * Required columns for strict mode validation
 */
export const STRICT_REQUIRED_COLUMNS = {
  csv: ['partNumber', 'quantity'] as const,
  xml: ['partNumber', 'quantity'] as const,
}

/**
 * All known column mappings for relaxed mode
 */
export const KNOWN_COLUMN_MAPPINGS = {
  partNumber: [
    'part',
    'partnumber',
    'part_number',
    'partno',
    'part_no',
    'element_id',
    'elementid',
    'itemid',
    'id',
  ],
  quantity: ['qty', 'quantity', 'count', 'amount', 'minqty'],
  color: ['color', 'colour', 'colorname', 'color_name'],
  description: ['description', 'desc', 'name', 'itemname', 'part_description'],
  category: ['category', 'cat', 'type', 'categoryname', 'itemtype'],
}
