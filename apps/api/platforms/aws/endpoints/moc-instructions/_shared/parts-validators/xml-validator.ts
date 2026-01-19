/**
 * XML Parts List Validator
 *
 * Story 3.1.23: XML validation with strict/relaxed modes.
 *
 * Features:
 * - Supports Bricklink XML format (INVENTORY > ITEM)
 * - Flexible element naming
 * - Strict mode: requires exact elements
 * - Relaxed mode: allows extra elements, flexible naming
 */

import { DOMParser } from 'xmldom'
import { createLogger } from '@/core/observability/logger'

// Type definitions for xmldom (minimal set needed for validation)
interface XMLElement {
  getElementsByTagName(name: string): XMLElement[]
  getAttribute(name: string): string | null
  textContent: string | null
  length?: number
}

interface XMLDocument extends XMLElement {
  documentElement: XMLElement | null
}
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

const logger = createLogger('xml-validator')

// =============================================================================
// XML Validator Implementation
// =============================================================================

export const xmlValidator: PartsListValidator = {
  format: 'xml',
  supportedExtensions: ['xml'],
  supportedMimeTypes: ['application/xml', 'text/xml', 'application/octet-stream'],

  canHandle(filename: string, mimeType: string): boolean {
    const ext = filename.toLowerCase().split('.').pop() || ''
    return this.supportedExtensions.includes(ext) || this.supportedMimeTypes.includes(mimeType)
  },

  async validate(
    fileBuffer: Buffer,
    filename: string,
    config: ValidatorConfig,
  ): Promise<PartsValidationResult> {
    logger.info('Starting XML validation', {
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

    // Check for empty content
    const content = fileBuffer.toString('utf-8').trim()
    if (!content) {
      errors.push({
        code: 'EMPTY_FILE',
        message: 'XML file is empty',
        severity: 'error',
      })
      return { success: false, errors, warnings, filename }
    }

    // Parse XML
    let doc: XMLDocument

    try {
      const parser = new DOMParser({
        errorHandler: {
          warning: msg => {
            warnings.push({
              code: 'XML_WARNING',
              message: msg,
              severity: 'warning',
            })
          },
          error: msg => {
            errors.push({
              code: 'XML_ERROR',
              message: msg,
              severity: 'error',
            })
          },
          fatalError: msg => {
            errors.push({
              code: 'XML_FATAL_ERROR',
              message: msg,
              severity: 'error',
            })
          },
        },
      })
      doc = parser.parseFromString(content, 'text/xml') as unknown as XMLDocument
    } catch (error) {
      errors.push({
        code: 'XML_PARSE_ERROR',
        message: `Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error',
      })
      return { success: false, errors, warnings, filename }
    }

    // Check for parser errors in the document
    const parserErrors = doc.getElementsByTagName('parsererror')
    if (parserErrors.length > 0) {
      errors.push({
        code: 'XML_PARSE_ERROR',
        message: 'Invalid XML format',
        severity: 'error',
      })
      return { success: false, errors, warnings, filename }
    }

    // Find part elements
    const partElements = findPartElements(doc)

    if (partElements.length === 0) {
      errors.push({
        code: 'NO_PARTS_FOUND',
        message: 'No parts found in XML. Expected elements: ITEM, part, piece, or element',
        severity: 'error',
      })
      return { success: false, errors, warnings, filename }
    }

    // Parse parts
    const parts = parseXMLParts(partElements, config, errors, warnings)

    // Max parts check
    if (parts.length > config.maxParts) {
      errors.push({
        code: 'TOO_MANY_PARTS',
        message: `File contains ${parts.length} parts, maximum is ${config.maxParts}`,
        severity: 'error',
      })
      return { success: false, errors, warnings, filename }
    }

    if (parts.length === 0 && errors.length === 0) {
      errors.push({
        code: 'NO_VALID_PARTS',
        message: 'No valid parts found in XML file',
        severity: 'error',
      })
      return { success: false, errors, warnings, filename }
    }

    const totalPieceCount = parts.reduce((sum, part) => sum + part.quantity, 0)

    logger.info('XML validation completed', {
      filename,
      partsCount: parts.length,
      totalPieceCount,
      errorsCount: errors.length,
      warningsCount: warnings.length,
    })

    return {
      success: errors.length === 0,
      data:
        errors.length === 0
          ? {
              parts,
              totalPieceCount,
              format: 'xml',
              metadata: {
                source: 'xml_upload',
                totalElements: partElements.length,
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
// XML Element Finding
// =============================================================================

/**
 * Find part elements in various XML structures
 * Supports: Bricklink (INVENTORY/ITEM), generic (parts/part, items/item)
 */
const findPartElements = (doc: XMLDocument): XMLElement[] => {
  const possibleTags = ['ITEM', 'item', 'part', 'piece', 'element']

  for (const tag of possibleTags) {
    const elements = doc.getElementsByTagName(tag)
    if (elements.length > 0) {
      return Array.from(elements) as XMLElement[]
    }
  }

  return []
}

// =============================================================================
// XML Parsing
// =============================================================================

/**
 * Extract text content from child element by name(s)
 */
const getElementValue = (element: XMLElement, names: string[]): string | undefined => {
  for (const name of names) {
    // Try exact match first
    const children = element.getElementsByTagName(name)
    if (children.length > 0 && children[0]?.textContent) {
      return children[0].textContent.trim()
    }

    // Try case-insensitive match
    const upperName = name.toUpperCase()
    const upperChildren = element.getElementsByTagName(upperName)
    if (upperChildren.length > 0 && upperChildren[0]?.textContent) {
      return upperChildren[0].textContent.trim()
    }
  }

  // Try attributes
  for (const name of names) {
    const attr = element.getAttribute(name)
    if (attr) return attr
  }

  return undefined
}

/**
 * Parse XML elements into parts
 */
const parseXMLParts = (
  elements: XMLElement[],
  config: ValidatorConfig,
  errors: PartsValidationError[],
  warnings: PartsValidationError[],
): PartEntry[] => {
  const parts: PartEntry[] = []

  elements.forEach((element, index) => {
    const lineNum = index + 1

    try {
      // Extract part number
      const partNumber = getElementValue(element, [
        'ITEMID',
        'itemid',
        ...KNOWN_COLUMN_MAPPINGS.partNumber,
      ])

      // Extract quantity
      const quantityStr = getElementValue(element, [
        'MINQTY',
        'minqty',
        ...KNOWN_COLUMN_MAPPINGS.quantity,
      ])

      // Extract optional fields
      const color = getElementValue(element, ['COLOR', 'color', ...KNOWN_COLUMN_MAPPINGS.color])

      const description = getElementValue(element, [
        'ITEMNAME',
        'itemname',
        ...KNOWN_COLUMN_MAPPINGS.description,
      ])

      const category = getElementValue(element, [
        'ITEMTYPE',
        'itemtype',
        ...KNOWN_COLUMN_MAPPINGS.category,
      ])

      // Build part data
      const partData: Record<string, unknown> = {}

      if (partNumber) partData.partNumber = partNumber
      if (color) partData.color = color
      if (description) partData.description = description
      if (category) partData.category = category

      // Convert quantity
      if (quantityStr) {
        const qty = parseInt(quantityStr, 10)
        if (isNaN(qty)) {
          const errorItem: PartsValidationError = {
            code: 'INVALID_QUANTITY',
            message: `Invalid quantity "${quantityStr}" at element ${lineNum}`,
            line: lineNum,
            field: 'quantity',
            severity: config.mode === 'strict' ? 'error' : 'warning',
          }

          if (config.mode === 'strict') {
            errors.push(errorItem)
          } else {
            warnings.push(errorItem)
          }
          return
        }
        partData.quantity = qty
      }

      // Strict mode: check required fields
      if (config.mode === 'strict') {
        const missingFields: string[] = []
        for (const required of STRICT_REQUIRED_COLUMNS.xml) {
          if (!partData[required]) {
            missingFields.push(required)
          }
        }

        if (missingFields.length > 0) {
          errors.push({
            code: 'MISSING_REQUIRED_FIELD',
            message: `Element ${lineNum}: Missing required fields: ${missingFields.join(', ')}`,
            line: lineNum,
            field: missingFields[0],
            severity: 'error',
          })
          return
        }
      }

      // Validate with Zod
      const validation = PartEntrySchema.safeParse(partData)

      if (validation.success) {
        parts.push(validation.data)
      } else {
        validation.error.issues.forEach(issue => {
          const errorItem: PartsValidationError = {
            code: 'VALIDATION_ERROR',
            message: `Element ${lineNum}: ${issue.message}`,
            line: lineNum,
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
        message: `Element ${lineNum}: ${error instanceof Error ? error.message : 'Parse error'}`,
        line: lineNum,
        severity: config.mode === 'strict' ? 'error' : 'warning',
      }

      if (config.mode === 'strict') {
        errors.push(errorItem)
      } else {
        warnings.push(errorItem)
      }
    }
  })

  return parts
}

export default xmlValidator
