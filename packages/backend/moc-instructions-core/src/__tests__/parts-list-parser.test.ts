import { describe, it, expect } from 'vitest'
import {
  parsePartsListFile,
  parseCSVPartsList,
  parseXMLPartsList,
  validatePartsListFile,
} from '../parts-list-parser.js'

// ============================================================
// MOCK DATA
// ============================================================

const validCSVWithHeaders = `part,quantity,color,description
3001,10,Red,2x4 Brick
3002,5,Blue,2x3 Brick
3003,20,White,2x2 Brick`

const validCSVNoHeaders = `3001,10,Red,2x4 Brick
3002,5,Blue,2x3 Brick
3003,20,White,2x2 Brick`

const validCSVAlternateHeaders = `part_number,qty,colour,desc
3001,10,Red,2x4 Brick
3002,5,Blue,2x3 Brick`

const invalidCSVMissingQuantity = `part,quantity,color
3001,,Red
3002,5,Blue`

const validXML = `<?xml version="1.0" encoding="UTF-8"?>
<inventory>
  <item>
    <partNumber>3001</partNumber>
    <quantity>10</quantity>
    <color>Red</color>
    <description>2x4 Brick</description>
  </item>
  <item>
    <partNumber>3002</partNumber>
    <quantity>5</quantity>
    <color>Blue</color>
    <description>2x3 Brick</description>
  </item>
</inventory>`

const validXMLWithAttributes = `<?xml version="1.0" encoding="UTF-8"?>
<parts>
  <part partNumber="3001" quantity="10" color="Red" />
  <part partNumber="3002" quantity="5" color="Blue" />
</parts>`

const invalidXML = `<?xml version="1.0"?>
<inventory>
  <item>
    <partNumber>3001</partNumber>
  <!-- unclosed tag`

const emptyXML = `<?xml version="1.0"?>
<inventory></inventory>`

// ============================================================
// TESTS - validatePartsListFile
// ============================================================

describe('validatePartsListFile', () => {
  it('returns empty array for valid CSV file', () => {
    const errors = validatePartsListFile('parts.csv', 'text/csv', 1000)
    expect(errors).toHaveLength(0)
  })

  it('returns empty array for valid XML file', () => {
    const errors = validatePartsListFile('parts.xml', 'application/xml', 1000)
    expect(errors).toHaveLength(0)
  })

  it('returns empty array for valid TXT file', () => {
    const errors = validatePartsListFile('parts.txt', 'text/plain', 1000)
    expect(errors).toHaveLength(0)
  })

  it('returns FILE_TOO_LARGE error when file exceeds 10MB', () => {
    const errors = validatePartsListFile('parts.csv', 'text/csv', 11 * 1024 * 1024)
    expect(errors).toHaveLength(1)
    expect(errors[0].code).toBe('FILE_TOO_LARGE')
  })

  it('returns INVALID_FILE_TYPE error for invalid extension', () => {
    const errors = validatePartsListFile('parts.json', 'application/json', 1000)
    expect(errors).toHaveLength(1)
    expect(errors[0].code).toBe('INVALID_FILE_TYPE')
  })

  it('returns INVALID_MIME_TYPE error for invalid MIME type', () => {
    const errors = validatePartsListFile('parts.csv', 'application/x-invalid', 1000)
    expect(errors).toHaveLength(1)
    expect(errors[0].code).toBe('INVALID_MIME_TYPE')
  })

  it('returns multiple errors when file has multiple issues', () => {
    const errors = validatePartsListFile('parts.exe', 'application/x-invalid', 15 * 1024 * 1024)
    expect(errors.length).toBeGreaterThanOrEqual(2)
  })

  it('accepts text/plain MIME type', () => {
    const errors = validatePartsListFile('parts.csv', 'text/plain', 1000)
    expect(errors).toHaveLength(0)
  })

  it('accepts application/octet-stream MIME type', () => {
    const errors = validatePartsListFile('parts.csv', 'application/octet-stream', 1000)
    expect(errors).toHaveLength(0)
  })

  it('handles file exactly at 10MB limit', () => {
    const errors = validatePartsListFile('parts.csv', 'text/csv', 10 * 1024 * 1024)
    expect(errors).toHaveLength(0)
  })

  it('rejects file 1 byte over 10MB limit', () => {
    const errors = validatePartsListFile('parts.csv', 'text/csv', 10 * 1024 * 1024 + 1)
    expect(errors).toHaveLength(1)
    expect(errors[0].code).toBe('FILE_TOO_LARGE')
  })
})

// ============================================================
// TESTS - parseCSVPartsList
// ============================================================

describe('parseCSVPartsList', () => {
  it('parses CSV with headers', async () => {
    const buffer = Buffer.from(validCSVWithHeaders)
    const result = await parseCSVPartsList(buffer)

    expect(result.success).toBe(true)
    expect(result.data?.parts).toHaveLength(3)
    expect(result.data?.totalPieceCount).toBe(35) // 10 + 5 + 20
    expect(result.data?.format).toBe('csv')
  })

  it('parses CSV without headers (assumes standard order)', async () => {
    const buffer = Buffer.from(validCSVNoHeaders)
    const result = await parseCSVPartsList(buffer)

    expect(result.success).toBe(true)
    expect(result.data?.parts).toHaveLength(3)
  })

  it('detects and maps alternate header names', async () => {
    const buffer = Buffer.from(validCSVAlternateHeaders)
    const result = await parseCSVPartsList(buffer)

    expect(result.success).toBe(true)
    expect(result.data?.parts).toHaveLength(2)
    expect(result.data?.parts[0].partNumber).toBe('3001')
    expect(result.data?.parts[0].quantity).toBe(10)
  })

  it('calculates correct totalPieceCount', async () => {
    const csv = `part,quantity
3001,100
3002,200
3003,300`
    const buffer = Buffer.from(csv)
    const result = await parseCSVPartsList(buffer)

    expect(result.success).toBe(true)
    expect(result.data?.totalPieceCount).toBe(600)
  })

  it('returns error for empty CSV', async () => {
    const buffer = Buffer.from('')
    const result = await parseCSVPartsList(buffer)

    expect(result.success).toBe(false)
    expect(result.errors[0].code).toBe('EMPTY_FILE')
  })

  it('returns error for CSV with only whitespace', async () => {
    const buffer = Buffer.from('   \n   \n   ')
    const result = await parseCSVPartsList(buffer)

    expect(result.success).toBe(false)
    expect(result.errors[0].code).toBe('EMPTY_FILE')
  })

  it('includes validation errors for invalid rows', async () => {
    const buffer = Buffer.from(invalidCSVMissingQuantity)
    const result = await parseCSVPartsList(buffer)

    // Should have errors for the invalid row
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('extracts optional fields when present', async () => {
    const buffer = Buffer.from(validCSVWithHeaders)
    const result = await parseCSVPartsList(buffer)

    expect(result.success).toBe(true)
    expect(result.data?.parts[0].color).toBe('Red')
    expect(result.data?.parts[0].description).toBe('2x4 Brick')
  })

  it('handles CSV with extra columns', async () => {
    const csv = `part,quantity,color,description,extra,another
3001,10,Red,Brick,foo,bar
3002,5,Blue,Brick,baz,qux`
    const buffer = Buffer.from(csv)
    const result = await parseCSVPartsList(buffer)

    expect(result.success).toBe(true)
    expect(result.data?.parts).toHaveLength(2)
  })

  it('includes metadata about header detection', async () => {
    const buffer = Buffer.from(validCSVWithHeaders)
    const result = await parseCSVPartsList(buffer)

    expect(result.data?.metadata?.hasHeader).toBe(true)
    expect(result.data?.metadata?.headerDetected).toContain('auto-detected')
  })

  it('handles single part CSV', async () => {
    const csv = `part,quantity
3001,1`
    const buffer = Buffer.from(csv)
    const result = await parseCSVPartsList(buffer)

    expect(result.success).toBe(true)
    expect(result.data?.parts).toHaveLength(1)
    expect(result.data?.totalPieceCount).toBe(1)
  })

  it('handles large quantities', async () => {
    const csv = `part,quantity
3001,999999`
    const buffer = Buffer.from(csv)
    const result = await parseCSVPartsList(buffer)

    expect(result.success).toBe(true)
    expect(result.data?.parts[0].quantity).toBe(999999)
  })
})

// ============================================================
// TESTS - parseXMLPartsList
// ============================================================

describe('parseXMLPartsList', () => {
  it('parses XML with child elements', async () => {
    const buffer = Buffer.from(validXML)
    const result = await parseXMLPartsList(buffer)

    expect(result.success).toBe(true)
    expect(result.data?.parts).toHaveLength(2)
    expect(result.data?.totalPieceCount).toBe(15) // 10 + 5
    expect(result.data?.format).toBe('xml')
  })

  it('parses XML with attributes', async () => {
    const buffer = Buffer.from(validXMLWithAttributes)
    const result = await parseXMLPartsList(buffer)

    expect(result.success).toBe(true)
    expect(result.data?.parts).toHaveLength(2)
    expect(result.data?.parts[0].partNumber).toBe('3001')
    expect(result.data?.parts[0].quantity).toBe(10)
  })

  it('extracts optional fields from XML', async () => {
    const buffer = Buffer.from(validXML)
    const result = await parseXMLPartsList(buffer)

    expect(result.success).toBe(true)
    expect(result.data?.parts[0].color).toBe('Red')
    expect(result.data?.parts[0].description).toBe('2x4 Brick')
  })

  it('returns error for invalid XML', async () => {
    const buffer = Buffer.from(invalidXML)
    const result = await parseXMLPartsList(buffer)

    expect(result.success).toBe(false)
    // Either XML_PARSE_ERROR or validation errors
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('returns error for XML with no parts', async () => {
    const buffer = Buffer.from(emptyXML)
    const result = await parseXMLPartsList(buffer)

    expect(result.success).toBe(false)
    expect(result.errors[0].code).toBe('NO_PARTS_FOUND')
  })

  it('handles different XML element names', async () => {
    const xml = `<?xml version="1.0"?>
<pieces>
  <piece>
    <id>3001</id>
    <qty>10</qty>
  </piece>
</pieces>`
    const buffer = Buffer.from(xml)
    const result = await parseXMLPartsList(buffer)

    // Should find pieces using alternative selectors
    expect(result.success).toBe(true)
  })

  it('handles XML with element_id attribute', async () => {
    const xml = `<?xml version="1.0"?>
<parts>
  <part elementId="3001" quantity="10" />
</parts>`
    const buffer = Buffer.from(xml)
    const result = await parseXMLPartsList(buffer)

    expect(result.success).toBe(true)
    expect(result.data?.parts[0].partNumber).toBe('3001')
  })

  it('includes metadata about element count', async () => {
    const buffer = Buffer.from(validXML)
    const result = await parseXMLPartsList(buffer)

    expect(result.data?.metadata?.totalElements).toBe(2)
    expect(result.data?.metadata?.source).toBe('xml_upload')
  })
})

// ============================================================
// TESTS - parsePartsListFile (main function)
// ============================================================

describe('parsePartsListFile', () => {
  it('routes CSV files to CSV parser', async () => {
    const buffer = Buffer.from(validCSVWithHeaders)
    const result = await parsePartsListFile('parts.csv', 'text/csv', buffer)

    expect(result.success).toBe(true)
    expect(result.data?.format).toBe('csv')
  })

  it('routes TXT files to CSV parser', async () => {
    const buffer = Buffer.from(validCSVWithHeaders)
    const result = await parsePartsListFile('parts.txt', 'text/plain', buffer)

    expect(result.success).toBe(true)
    expect(result.data?.format).toBe('csv')
  })

  it('routes XML files to XML parser', async () => {
    const buffer = Buffer.from(validXML)
    const result = await parsePartsListFile('parts.xml', 'application/xml', buffer)

    expect(result.success).toBe(true)
    expect(result.data?.format).toBe('xml')
  })

  it('validates file before parsing', async () => {
    const buffer = Buffer.from(validCSVWithHeaders)
    const result = await parsePartsListFile('parts.exe', 'application/x-executable', buffer)

    expect(result.success).toBe(false)
    expect(result.errors.some(e => e.code === 'INVALID_FILE_TYPE')).toBe(true)
  })

  it('rejects files that are too large', async () => {
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024) // 11MB
    const result = await parsePartsListFile('parts.csv', 'text/csv', largeBuffer)

    expect(result.success).toBe(false)
    expect(result.errors[0].code).toBe('FILE_TOO_LARGE')
  })

  it('returns UNSUPPORTED_FORMAT for unknown extension', async () => {
    const buffer = Buffer.from('data')
    const result = await parsePartsListFile('parts.xyz', 'text/plain', buffer)

    expect(result.success).toBe(false)
    expect(result.errors[0].code).toBe('INVALID_FILE_TYPE')
  })

  it('handles uppercase file extensions', async () => {
    const buffer = Buffer.from(validCSVWithHeaders)
    const result = await parsePartsListFile('PARTS.CSV', 'text/csv', buffer)

    expect(result.success).toBe(true)
  })

  it('handles mixed case file extensions', async () => {
    const buffer = Buffer.from(validXML)
    const result = await parsePartsListFile('Parts.Xml', 'application/xml', buffer)

    expect(result.success).toBe(true)
  })

  it('returns complete parsing result with all fields', async () => {
    const buffer = Buffer.from(validCSVWithHeaders)
    const result = await parsePartsListFile('parts.csv', 'text/csv', buffer)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data?.parts).toBeDefined()
    expect(result.data?.totalPieceCount).toBeDefined()
    expect(result.data?.format).toBeDefined()
    expect(result.data?.metadata).toBeDefined()
    expect(result.errors).toHaveLength(0)
  })

  it('handles empty buffer gracefully', async () => {
    const buffer = Buffer.from('')
    const result = await parsePartsListFile('parts.csv', 'text/csv', buffer)

    expect(result.success).toBe(false)
  })
})
