/**
 * Parts List Parser Utility
 *
 * Platform-agnostic parser for parts list files (CSV, XML) for LEGO MOC instructions.
 * Extracts part numbers, quantities, colors, and calculates total piece count.
 *
 * Supports:
 * - CSV files with automatic header detection
 * - XML files with flexible element naming
 * - Validation using Zod schemas
 *
 * STORY-016: Extracted from AWS handler to core package for reuse across platforms.
 */

import { Readable } from 'stream'
import { z } from 'zod'
import csv from 'csv-parser'
import { DOMParser } from '@xmldom/xmldom'

// ============================================================
// TYPES
// ============================================================

/**
 * Single part entry from a parts list
 */
export interface PartEntry {
  partNumber: string
  quantity: number
  color?: string
  description?: string
  category?: string
}

/**
 * Successfully parsed parts list data
 */
export interface ParsedPartsList {
  parts: PartEntry[]
  totalPieceCount: number
  format: 'csv' | 'xml'
  metadata?: {
    source?: string
    version?: string
    totalRows?: number
    totalElements?: number
    hasHeader?: boolean
    headerMapping?: Record<string, string>
    headerDetected?: string
    [key: string]: unknown
  }
}

/**
 * Error encountered during parsing
 */
export interface ParsingError {
  code: string
  message: string
  line?: number
  column?: number
}

/**
 * Result of parsing a parts list file
 */
export interface ParsingResult {
  success: boolean
  data?: ParsedPartsList
  errors: ParsingError[]
}

// ============================================================
// VALIDATION
// ============================================================

/**
 * Zod schema for validating part entries
 */
const PartEntrySchema = z.object({
  partNumber: z.string().min(1, 'Part number is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  color: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
})

/**
 * Valid MIME types for parts list files
 */
const VALID_MIME_TYPES = [
  'text/csv',
  'application/csv',
  'text/plain',
  'application/xml',
  'text/xml',
  'application/json',
  'application/octet-stream',
]

/**
 * Valid file extensions for parts list files
 */
const VALID_EXTENSIONS = ['csv', 'txt', 'xml']

/**
 * Maximum file size in bytes (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Validate a parts list file before parsing
 */
export function validatePartsListFile(
  filename: string,
  mimeType: string,
  size: number,
): ParsingError[] {
  const errors: ParsingError[] = []

  // Check file size (max 10MB)
  if (size > MAX_FILE_SIZE) {
    errors.push({
      code: 'FILE_TOO_LARGE',
      message: 'File size exceeds 10MB limit',
    })
  }

  // Check file extension
  const extension = filename.toLowerCase().split('.').pop()

  if (!VALID_EXTENSIONS.includes(extension || '')) {
    errors.push({
      code: 'INVALID_FILE_TYPE',
      message: 'File must be CSV, TXT, or XML format',
    })
  }

  // Check MIME type
  if (!VALID_MIME_TYPES.includes(mimeType)) {
    errors.push({
      code: 'INVALID_MIME_TYPE',
      message: `Invalid MIME type: ${mimeType}. Expected: ${VALID_MIME_TYPES.join(', ')}`,
    })
  }

  return errors
}

// ============================================================
// CSV PARSER
// ============================================================

/**
 * Keywords that indicate a header row
 */
const HEADER_KEYWORDS = [
  'part',
  'quantity',
  'qty',
  'count',
  'color',
  'description',
  'name',
  'element',
]

/**
 * Parse a CSV parts list file
 */
export async function parseCSVPartsList(fileBuffer: Buffer): Promise<ParsingResult> {
  return new Promise(resolve => {
    const parts: PartEntry[] = []
    const errors: ParsingError[] = []
    let lineNumber = 0
    let isFirstRow = true
    let headerMapping: Record<number, string> = {}

    const csvContent = fileBuffer.toString()

    // Split into lines to detect header
    const lines = csvContent.split('\n').filter(line => line.trim())
    if (lines.length === 0) {
      resolve({
        success: false,
        errors: [
          {
            code: 'EMPTY_FILE',
            message: 'CSV file is empty',
          },
        ],
      })
      return
    }

    // Parse first line to determine if it's a header
    const firstLine = lines[0].split(',').map(cell => cell.trim())

    // Check if first line looks like headers
    const hasHeader = firstLine.some(cell =>
      HEADER_KEYWORDS.some(keyword => cell.toLowerCase().includes(keyword)),
    )

    // Create header mapping if headers are detected
    if (hasHeader) {
      firstLine.forEach((header, index) => {
        const normalized = header.toLowerCase().trim()

        if (
          ['part', 'part_number', 'partno', 'part_no', 'element_id', 'elementid'].includes(
            normalized,
          )
        ) {
          headerMapping[index] = 'partNumber'
        } else if (['qty', 'quantity', 'count', 'amount'].includes(normalized)) {
          headerMapping[index] = 'quantity'
        } else if (['color', 'colour', 'part_color'].includes(normalized)) {
          headerMapping[index] = 'color'
        } else if (['description', 'desc', 'part_description', 'name'].includes(normalized)) {
          headerMapping[index] = 'description'
        } else if (['category', 'cat', 'type', 'part_category'].includes(normalized)) {
          headerMapping[index] = 'category'
        }
      })
    } else {
      // No headers - assume standard order
      headerMapping = {
        0: 'partNumber',
        1: 'quantity',
        2: 'color',
        3: 'description',
      }
    }

    const stream = Readable.from(csvContent)

    stream
      .pipe(
        csv({
          headers: false, // Always use false and handle headers manually
        }),
      )
      .on('data', row => {
        lineNumber++

        // Skip header row if it exists
        if (isFirstRow && hasHeader) {
          isFirstRow = false
          return
        }
        isFirstRow = false

        try {
          // Convert row object to array of values
          const values = Object.values(row) as string[]

          // Map values to part data using our header mapping
          const partData: Record<string, string | number> = {}

          Object.keys(headerMapping).forEach(columnIndex => {
            const fieldName = headerMapping[parseInt(columnIndex)]
            const value = values[parseInt(columnIndex)] || ''
            partData[fieldName] = value
          })

          // Convert quantity to number
          if (partData.quantity) {
            partData.quantity = parseInt(partData.quantity.toString(), 10)
          }

          // Validate the row
          const validation = PartEntrySchema.safeParse(partData)

          if (validation.success) {
            parts.push(validation.data)
          } else {
            validation.error.issues.forEach(issue => {
              errors.push({
                code: 'VALIDATION_ERROR',
                message: `Line ${lineNumber}: ${issue.message}`,
                line: lineNumber,
              })
            })
          }
        } catch (error) {
          errors.push({
            code: 'PARSING_ERROR',
            message: `Line ${lineNumber}: Failed to parse row - ${error instanceof Error ? error.message : 'Unknown error'}`,
            line: lineNumber,
          })
        }
      })
      .on('end', () => {
        if (parts.length === 0 && errors.length === 0) {
          errors.push({
            code: 'EMPTY_FILE',
            message: 'No valid parts found in CSV file',
          })
        }

        const totalPieceCount = parts.reduce((sum, part) => sum + part.quantity, 0)

        const result: ParsingResult = {
          success: errors.length === 0,
          data:
            errors.length === 0
              ? {
                  parts,
                  totalPieceCount,
                  format: 'csv' as const,
                  metadata: {
                    source: 'csv_upload',
                    totalRows: lineNumber,
                    hasHeader,
                    headerMapping: Object.fromEntries(
                      Object.entries(headerMapping).map(([k, v]) => [v, k]),
                    ),
                    headerDetected: hasHeader
                      ? 'auto-detected and mapped'
                      : 'assumed standard column order',
                  },
                }
              : undefined,
          errors,
        }

        resolve(result)
      })
      .on('error', error => {
        resolve({
          success: false,
          errors: [
            {
              code: 'CSV_PARSE_ERROR',
              message: `Failed to parse CSV: ${error.message}`,
            },
          ],
        })
      })
  })
}

// ============================================================
// XML PARSER
// ============================================================

/**
 * Parse an XML parts list file
 */
export async function parseXMLPartsList(fileBuffer: Buffer): Promise<ParsingResult> {
  try {
    const xmlContent = fileBuffer.toString('utf-8')
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlContent, 'text/xml')

    const errors: ParsingError[] = []
    const parts: PartEntry[] = []

    // Check for parsing errors
    const parserErrors = doc.getElementsByTagName('parsererror')
    if (parserErrors.length > 0) {
      return {
        success: false,
        errors: [
          {
            code: 'XML_PARSE_ERROR',
            message: 'Invalid XML format',
          },
        ],
      }
    }

    // Try different XML structures
    // Using 'any' for xmldom elements since they don't match DOM Element interface
    let partElements: any[] = []

    // Common XML structures for LEGO parts lists
    const possibleSelectors = [
      'part',
      'item',
      'piece',
      'element',
      'inventory/item',
      'parts/part',
      'items/item',
    ]

    for (const selector of possibleSelectors) {
      const elements = doc.getElementsByTagName(selector.split('/').pop() || selector)
      if (elements.length > 0) {
        partElements = Array.from(elements)
        break
      }
    }

    if (partElements.length === 0) {
      return {
        success: false,
        errors: [
          {
            code: 'NO_PARTS_FOUND',
            message: 'No parts found in XML. Expected elements: part, item, piece, or element',
          },
        ],
      }
    }

    // Parse each part element
    partElements.forEach((element, index) => {
      try {
        const partData: Record<string, string | number | undefined> = {}

        // Extract data from attributes or child elements
        const getElementValue = (names: string[]): string | undefined => {
          // Try attributes first
          for (const name of names) {
            const attr = element.getAttribute(name)
            if (attr) return attr
          }

          // Try child elements
          for (const name of names) {
            const child = element.getElementsByTagName(name)[0]
            if (child && child.textContent) return child.textContent.trim()
          }

          return undefined
        }

        // Extract part number
        partData.partNumber = getElementValue([
          'partNumber',
          'part_number',
          'partno',
          'part_no',
          'elementId',
          'element_id',
          'id',
          'itemid',
        ])

        // Extract quantity
        const quantityStr = getElementValue(['quantity', 'qty', 'count', 'amount', 'minqty'])
        partData.quantity = quantityStr ? parseInt(quantityStr, 10) : undefined

        // Extract optional fields
        partData.color = getElementValue(['color', 'colour', 'colorname', 'color_name'])

        partData.description = getElementValue([
          'description',
          'desc',
          'name',
          'itemname',
          'part_description',
        ])

        partData.category = getElementValue(['category', 'cat', 'type', 'categoryname'])

        // Validate the part data
        const validation = PartEntrySchema.safeParse(partData)

        if (validation.success) {
          parts.push(validation.data)
        } else {
          validation.error.issues.forEach(issue => {
            errors.push({
              code: 'VALIDATION_ERROR',
              message: `Element ${index + 1}: ${issue.message}`,
              line: index + 1,
            })
          })
        }
      } catch (error) {
        errors.push({
          code: 'PARSING_ERROR',
          message: `Element ${index + 1}: Failed to parse - ${error instanceof Error ? error.message : 'Unknown error'}`,
          line: index + 1,
        })
      }
    })

    if (parts.length === 0 && errors.length === 0) {
      errors.push({
        code: 'EMPTY_FILE',
        message: 'No valid parts found in XML file',
      })
    }

    const totalPieceCount = parts.reduce((sum, part) => sum + part.quantity, 0)

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
    }
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          code: 'XML_PARSE_ERROR',
          message: `Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    }
  }
}

// ============================================================
// MAIN PARSER FUNCTION
// ============================================================

/**
 * Parse a parts list file (CSV or XML)
 *
 * Automatically detects file format based on extension and parses accordingly.
 *
 * @param filename - Original filename (used for format detection)
 * @param mimeType - MIME type of the file
 * @param fileBuffer - File content as Buffer
 * @returns Parsing result with parts data or errors
 */
export async function parsePartsListFile(
  filename: string,
  mimeType: string,
  fileBuffer: Buffer,
): Promise<ParsingResult> {
  // Validate file first
  const validationErrors = validatePartsListFile(filename, mimeType, fileBuffer.length)
  if (validationErrors.length > 0) {
    return {
      success: false,
      errors: validationErrors,
    }
  }

  const extension = filename.toLowerCase().split('.').pop()

  try {
    if (extension === 'csv' || extension === 'txt') {
      return await parseCSVPartsList(fileBuffer)
    } else if (extension === 'xml') {
      return await parseXMLPartsList(fileBuffer)
    } else {
      return {
        success: false,
        errors: [
          {
            code: 'UNSUPPORTED_FORMAT',
            message: `Unsupported file format: ${extension}. Supported formats: CSV, TXT, XML`,
          },
        ],
      }
    }
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          code: 'PARSING_ERROR',
          message: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    }
  }
}
