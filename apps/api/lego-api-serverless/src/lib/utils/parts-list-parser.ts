/**
 * Parts List Parser Utility
 *
 * Parses parts list files (CSV, XML) for LEGO MOC instructions.
 * Extracts part numbers, quantities, colors, and calculates total piece count.
 *
 * Supports:
 * - CSV files with automatic header detection
 * - XML files with flexible element naming
 * - Validation using Zod schemas
 */

import { Readable } from 'stream'
import { z } from 'zod'
import csv from 'csv-parser'
import { DOMParser } from 'xmldom'
import { createLogger } from './logger'

const logger = createLogger('parts-list-parser')

// Types for parts list parsing
export interface PartEntry {
  partNumber: string
  quantity: number
  color?: string
  description?: string
  category?: string
}

export interface ParsedPartsList {
  parts: PartEntry[]
  totalPieceCount: number
  format: 'csv' | 'xml'
  metadata?: {
    source?: string
    version?: string
    [key: string]: any
  }
}

export interface ParsingError {
  code: string
  message: string
  line?: number
  column?: number
}

export interface ParsingResult {
  success: boolean
  data?: ParsedPartsList
  errors: ParsingError[]
}

// Validation schema for part entries
const PartEntrySchema = z.object({
  partNumber: z.string().min(1, 'Part number is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  color: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
})

// File validation for Lambda (Buffer-based)
export function validatePartsListFile(
  filename: string,
  mimeType: string,
  size: number,
): ParsingError[] {
  const errors: ParsingError[] = []

  // Check file size (max 10MB)
  if (size > 10 * 1024 * 1024) {
    errors.push({
      code: 'FILE_TOO_LARGE',
      message: 'File size exceeds 10MB limit',
    })
  }

  // Check file extension
  const extension = filename.toLowerCase().split('.').pop()
  logger.info('File extension detected', { extension })

  if (!['csv', 'txt', 'xml'].includes(extension || '')) {
    logger.warn('Invalid file type', { extension })
    errors.push({
      code: 'INVALID_FILE_TYPE',
      message: 'File must be CSV, TXT, or XML format',
    })
  }

  // Check MIME type - align with Lambda multipart parsing
  const validMimeTypes = [
    'text/csv',
    'application/csv',
    'text/plain',
    'application/xml',
    'text/xml',
    'application/json',
    'application/octet-stream',
  ]

  logger.info(
    'MIME type check',
    { mimetype: mimeType, valid: validMimeTypes.includes(mimeType) },
  )

  if (!validMimeTypes.includes(mimeType)) {
    logger.warn('Invalid MIME type', { mimetype: mimeType })
    errors.push({
      code: 'INVALID_MIME_TYPE',
      message: `Invalid MIME type: ${mimeType}. Expected: ${validMimeTypes.join(', ')}`,
    })
  }

  return errors
}

// CSV Parser with header detection - simplified approach
export async function parseCSVPartsList(fileBuffer: Buffer): Promise<ParsingResult> {
  logger.info('Starting CSV parsing', { bufferSize: fileBuffer.length })

  return new Promise(resolve => {
    const parts: PartEntry[] = []
    const errors: ParsingError[] = []
    let lineNumber = 0
    let isFirstRow = true
    let headerMapping: { [key: string]: string } = {}

    const csvContent = fileBuffer.toString()
    logger.debug('CSV content preview', { preview: csvContent.substring(0, 200) })

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
    logger.debug('First line cells', { firstLine })

    // Check if first line looks like headers
    const headerKeywords = [
      'part',
      'quantity',
      'qty',
      'count',
      'color',
      'description',
      'name',
      'element',
    ]
    const hasHeader = firstLine.some(cell =>
      headerKeywords.some(keyword => cell.toLowerCase().includes(keyword)),
    )

    logger.info('Header detected', { hasHeader })

    // Create header mapping if headers are detected
    if (hasHeader) {
      firstLine.forEach((header, index) => {
        const normalized = header.toLowerCase().trim()
        logger.debug('Processing header', { index, header, normalized })

        if (
          ['part', 'part_number', 'partno', 'part_no', 'element_id', 'elementid'].includes(
            normalized,
          )
        ) {
          headerMapping[index] = 'partNumber'
          logger.debug('Mapped column', { index, header, field: 'partNumber' })
        } else if (['qty', 'quantity', 'count', 'amount'].includes(normalized)) {
          headerMapping[index] = 'quantity'
          logger.debug('Mapped column', { index, header, field: 'quantity' })
        } else if (['color', 'colour', 'part_color'].includes(normalized)) {
          headerMapping[index] = 'color'
          logger.debug('Mapped column', { index, header, field: 'color' })
        } else if (['description', 'desc', 'part_description', 'name'].includes(normalized)) {
          headerMapping[index] = 'description'
          logger.debug('Mapped column', { index, header, field: 'description' })
        } else if (['category', 'cat', 'type', 'part_category'].includes(normalized)) {
          headerMapping[index] = 'category'
          logger.debug('Mapped column', { index, header, field: 'category' })
        } else {
          logger.warn('No mapping for column', { index, header })
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
      logger.info('No headers detected, using default mapping', { headerMapping })
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
          logger.debug('Skipping header row', { row: Object.values(row).join(',') })
          isFirstRow = false
          return
        }
        isFirstRow = false

        logger.debug('Processing CSV row', { lineNumber, row })

        try {
          // Convert row object to array of values
          const values = Object.values(row) as string[]
          logger.debug('Row values', { values })

          // Map values to part data using our header mapping
          const partData: any = {}

          Object.keys(headerMapping).forEach(columnIndex => {
            const fieldName = headerMapping[columnIndex]
            const value = values[parseInt(columnIndex)] || ''
            partData[fieldName] = value
            logger.debug('Column mapping', { columnIndex, value, fieldName })
          })

          logger.debug('Mapped part data', { partData })

          // Convert quantity to number
          if (partData.quantity) {
            const originalQty = partData.quantity
            partData.quantity = parseInt(partData.quantity.toString(), 10)
            logger.debug('Converted quantity', { originalQty, converted: partData.quantity })
          }

          logger.debug('Validating row', { lineNumber, partData })

          // Validate the row
          const validation = PartEntrySchema.safeParse(partData)

          if (validation.success) {
            logger.debug('Row valid', { lineNumber, data: validation.data })
            parts.push(validation.data)
          } else {
            logger.warn('Row validation failed', { lineNumber, issues: validation.error.issues })
            validation.error.issues.forEach(issue => {
              errors.push({
                code: 'VALIDATION_ERROR',
                message: `Line ${lineNumber}: ${issue.message} (column mapping: ${JSON.stringify(headerMapping)})`,
                line: lineNumber,
              })
            })
          }
        } catch (error) {
          logger.error('Row parsing error', { err: error, lineNumber })
          errors.push({
            code: 'PARSING_ERROR',
            message: `Line ${lineNumber}: Failed to parse row - ${error instanceof Error ? error.message : 'Unknown error'}`,
            line: lineNumber,
          })
        }
      })
      .on('end', () => {
        logger.info('CSV parsing completed')
        logger.info('Results', { partsCount: parts.length, errorsCount: errors.length })

        if (parts.length === 0 && errors.length === 0) {
          logger.warn('Empty file detected')
          errors.push({
            code: 'EMPTY_FILE',
            message: 'No valid parts found in CSV file',
          })
        }

        const totalPieceCount = parts.reduce((sum, part) => sum + part.quantity, 0)
        logger.info('Total piece count', { totalPieceCount })

        const result = {
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
                    headerMapping,
                    headerDetected: hasHeader
                      ? 'auto-detected and mapped'
                      : 'assumed standard column order',
                  },
                }
              : undefined,
          errors,
        }

        logger.debug('Final CSV parsing result', { result })
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

// XML Parser
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
        const partData: any = {}

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

// Main parsing function (Buffer-based for Lambda)
export async function parsePartsListFile(
  filename: string,
  mimeType: string,
  fileBuffer: Buffer,
): Promise<ParsingResult> {
  logger.info('Starting parsePartsListFile', { filename, mimeType, size: fileBuffer.length })

  // Validate file first
  const validationErrors = validatePartsListFile(filename, mimeType, fileBuffer.length)
  if (validationErrors.length > 0) {
    logger.warn('File validation failed', { errors: validationErrors })
    return {
      success: false,
      errors: validationErrors,
    }
  }

  const extension = filename.toLowerCase().split('.').pop()
  logger.info('File extension detected', { extension })

  try {
    if (extension === 'csv' || extension === 'txt') {
      logger.info('Parsing as CSV')
      return await parseCSVPartsList(fileBuffer)
    } else if (extension === 'xml') {
      logger.info('Parsing as XML')
      return await parseXMLPartsList(fileBuffer)
    } else {
      logger.warn('Unsupported format', { extension })
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
    logger.error('Parsing exception', { err: error })
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
