/**
 * XML Validator Unit Tests
 *
 * Story 3.1.23: Parts Schema Validation
 */

import { describe, it, expect } from 'vitest'
import { xmlValidator } from '../xml-validator'
import type { ValidatorConfig } from '../types'

const defaultConfig: ValidatorConfig = {
  mode: 'relaxed',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxParts: 50000,
}

const strictConfig: ValidatorConfig = {
  ...defaultConfig,
  mode: 'strict',
}

describe('xmlValidator', () => {
  describe('canHandle', () => {
    it('should handle .xml files', () => {
      expect(xmlValidator.canHandle('parts.xml', 'application/xml')).toBe(true)
    })

    it('should handle by MIME type', () => {
      expect(xmlValidator.canHandle('parts', 'text/xml')).toBe(true)
      expect(xmlValidator.canHandle('parts', 'application/xml')).toBe(true)
    })

    it('should not handle .csv files', () => {
      expect(xmlValidator.canHandle('parts.csv', 'text/csv')).toBe(false)
    })
  })

  describe('validate - Bricklink format', () => {
    it('should parse valid Bricklink XML', async () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<INVENTORY>
  <ITEM>
    <ITEMTYPE>P</ITEMTYPE>
    <ITEMID>3001</ITEMID>
    <COLOR>11</COLOR>
    <MINQTY>4</MINQTY>
  </ITEM>
  <ITEM>
    <ITEMTYPE>P</ITEMTYPE>
    <ITEMID>3002</ITEMID>
    <COLOR>5</COLOR>
    <MINQTY>6</MINQTY>
  </ITEM>
</INVENTORY>`

      const buffer = Buffer.from(xml)
      const result = await xmlValidator.validate(buffer, 'parts.xml', defaultConfig)

      expect(result.success).toBe(true)
      expect(result.data?.parts).toHaveLength(2)
      expect(result.data?.totalPieceCount).toBe(10) // 4 + 6
      expect(result.data?.format).toBe('xml')
      expect(result.data?.parts[0].partNumber).toBe('3001')
      expect(result.data?.parts[0].quantity).toBe(4)
      expect(result.data?.parts[0].color).toBe('11')
    })

    it('should handle compact Bricklink XML (no whitespace)', async () => {
      const xml = '<INVENTORY><ITEM><ITEMTYPE>P</ITEMTYPE><ITEMID>64644</ITEMID><COLOR>11</COLOR><MINQTY>4</MINQTY></ITEM><ITEM><ITEMTYPE>P</ITEMTYPE><ITEMID>15332</ITEMID><COLOR>11</COLOR><MINQTY>6</MINQTY></ITEM></INVENTORY>'

      const buffer = Buffer.from(xml)
      const result = await xmlValidator.validate(buffer, 'parts.xml', defaultConfig)

      expect(result.success).toBe(true)
      expect(result.data?.parts).toHaveLength(2)
      expect(result.data?.totalPieceCount).toBe(10)
    })
  })

  describe('validate - generic format', () => {
    it('should parse generic XML with item elements and nested values', async () => {
      const xml = `<?xml version="1.0"?>
<parts>
  <item>
    <itemid>3001</itemid>
    <minqty>4</minqty>
    <color>Red</color>
  </item>
  <item>
    <itemid>3002</itemid>
    <minqty>6</minqty>
    <color>Blue</color>
  </item>
</parts>`

      const buffer = Buffer.from(xml)
      const result = await xmlValidator.validate(buffer, 'parts.xml', defaultConfig)

      expect(result.success).toBe(true)
      expect(result.data?.parts).toHaveLength(2)
    })

    it('should parse XML with part_number and quantity elements', async () => {
      const xml = `<?xml version="1.0"?>
<parts>
  <part>
    <part_number>3001</part_number>
    <quantity>4</quantity>
    <color>Red</color>
  </part>
  <part>
    <part_number>3002</part_number>
    <quantity>6</quantity>
    <color>Blue</color>
  </part>
</parts>`

      const buffer = Buffer.from(xml)
      const result = await xmlValidator.validate(buffer, 'parts.xml', defaultConfig)

      expect(result.success).toBe(true)
      expect(result.data?.parts).toHaveLength(2)
      expect(result.data?.parts[0].partNumber).toBe('3001')
    })
  })

  describe('validate - error handling', () => {
    it('should reject invalid XML', async () => {
      const xml = '<invalid><not-closed>'
      const buffer = Buffer.from(xml)

      const result = await xmlValidator.validate(buffer, 'parts.xml', defaultConfig)

      expect(result.success).toBe(false)
      // xmldom doesn't throw on unclosed tags, but the file won't have valid parts
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should reject empty file', async () => {
      const buffer = Buffer.from('')
      const result = await xmlValidator.validate(buffer, 'parts.xml', defaultConfig)

      expect(result.success).toBe(false)
    })

    it('should reject XML with no parts', async () => {
      const xml = `<?xml version="1.0"?>
<document>
  <metadata>Some data</metadata>
</document>`

      const buffer = Buffer.from(xml)
      const result = await xmlValidator.validate(buffer, 'parts.xml', defaultConfig)

      expect(result.success).toBe(false)
      expect(result.errors[0].code).toBe('NO_PARTS_FOUND')
    })

    it('should reject file exceeding size limit', async () => {
      const smallConfig = { ...defaultConfig, maxFileSize: 10 }
      const xml = '<INVENTORY><ITEM><ITEMID>3001</ITEMID><MINQTY>4</MINQTY></ITEM></INVENTORY>'
      const buffer = Buffer.from(xml)

      const result = await xmlValidator.validate(buffer, 'parts.xml', smallConfig)

      expect(result.success).toBe(false)
      expect(result.errors[0].code).toBe('FILE_TOO_LARGE')
    })

    it('should reject file exceeding max parts limit', async () => {
      const smallConfig = { ...defaultConfig, maxParts: 1 }
      const xml = `<INVENTORY>
        <ITEM><ITEMID>3001</ITEMID><MINQTY>4</MINQTY></ITEM>
        <ITEM><ITEMID>3002</ITEMID><MINQTY>6</MINQTY></ITEM>
      </INVENTORY>`

      const buffer = Buffer.from(xml)
      const result = await xmlValidator.validate(buffer, 'parts.xml', smallConfig)

      expect(result.success).toBe(false)
      expect(result.errors[0].code).toBe('TOO_MANY_PARTS')
    })
  })

  describe('validate - strict mode', () => {
    it('should parse valid XML in strict mode', async () => {
      const xml = `<INVENTORY>
        <ITEM><ITEMID>3001</ITEMID><MINQTY>4</MINQTY></ITEM>
      </INVENTORY>`

      const buffer = Buffer.from(xml)
      const result = await xmlValidator.validate(buffer, 'parts.xml', strictConfig)

      expect(result.success).toBe(true)
    })

    it('should error on missing required fields in strict mode', async () => {
      const xml = `<INVENTORY>
        <ITEM><ITEMID>3001</ITEMID></ITEM>
      </INVENTORY>`

      const buffer = Buffer.from(xml)
      const result = await xmlValidator.validate(buffer, 'parts.xml', strictConfig)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.code === 'MISSING_REQUIRED_FIELD')).toBe(true)
    })

    it('should error on invalid quantity in strict mode', async () => {
      const xml = `<INVENTORY>
        <ITEM><ITEMID>3001</ITEMID><MINQTY>invalid</MINQTY></ITEM>
      </INVENTORY>`

      const buffer = Buffer.from(xml)
      const result = await xmlValidator.validate(buffer, 'parts.xml', strictConfig)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_QUANTITY')).toBe(true)
    })
  })

  describe('validate - relaxed mode with warnings', () => {
    it('should skip invalid items with warnings in relaxed mode', async () => {
      const xml = `<INVENTORY>
        <ITEM><ITEMID>3001</ITEMID><MINQTY>4</MINQTY></ITEM>
        <ITEM><ITEMID>3002</ITEMID><MINQTY>invalid</MINQTY></ITEM>
        <ITEM><ITEMID>3003</ITEMID><MINQTY>2</MINQTY></ITEM>
      </INVENTORY>`

      const buffer = Buffer.from(xml)
      const result = await xmlValidator.validate(buffer, 'parts.xml', defaultConfig)

      expect(result.success).toBe(true)
      expect(result.data?.parts).toHaveLength(2) // Skipped invalid row
      expect(result.warnings).toHaveLength(1)
    })
  })
})
