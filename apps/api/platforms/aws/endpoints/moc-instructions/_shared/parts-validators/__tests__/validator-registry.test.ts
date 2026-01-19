/**
 * Validator Registry Unit Tests
 *
 * Story 3.1.23: Pluggable Parts Schema Validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  findValidator,
  validatePartsFile,
  getSupportedExtensions,
  getSupportedMimeTypes,
} from '../validator-registry'

describe('validator-registry', () => {
  describe('findValidator', () => {
    it('should find CSV validator for .csv files', () => {
      const validator = findValidator('parts.csv', 'text/csv')
      expect(validator).toBeDefined()
      expect(validator?.format).toBe('csv')
    })

    it('should find CSV validator for .txt files', () => {
      const validator = findValidator('parts.txt', 'text/plain')
      expect(validator).toBeDefined()
      expect(validator?.format).toBe('csv')
    })

    it('should find XML validator for .xml files', () => {
      const validator = findValidator('parts.xml', 'application/xml')
      expect(validator).toBeDefined()
      expect(validator?.format).toBe('xml')
    })

    it('should return undefined for unsupported formats', () => {
      const validator = findValidator('parts.json', 'application/json')
      expect(validator).toBeUndefined()
    })
  })

  describe('getSupportedExtensions', () => {
    it('should return all supported extensions', () => {
      const extensions = getSupportedExtensions()
      expect(extensions).toContain('csv')
      expect(extensions).toContain('txt')
      expect(extensions).toContain('xml')
    })
  })

  describe('getSupportedMimeTypes', () => {
    it('should return all supported MIME types', () => {
      const mimeTypes = getSupportedMimeTypes()
      expect(mimeTypes).toContain('text/csv')
      expect(mimeTypes).toContain('application/xml')
      expect(mimeTypes).toContain('text/plain')
    })
  })

  describe('validatePartsFile', () => {
    it('should validate valid CSV file', async () => {
      const csv = `partNumber,quantity
3001,4
3002,6`

      const buffer = Buffer.from(csv)
      const result = await validatePartsFile(buffer, 'parts.csv', 'text/csv')

      expect(result.success).toBe(true)
      expect(result.data?.parts).toHaveLength(2)
      expect(result.filename).toBe('parts.csv')
    })

    it('should validate valid XML file', async () => {
      const xml = `<INVENTORY>
        <ITEM><ITEMID>3001</ITEMID><MINQTY>4</MINQTY></ITEM>
      </INVENTORY>`

      const buffer = Buffer.from(xml)
      const result = await validatePartsFile(buffer, 'parts.xml', 'application/xml')

      expect(result.success).toBe(true)
      expect(result.data?.parts).toHaveLength(1)
    })

    it('should return error for unsupported format', async () => {
      const buffer = Buffer.from('{"parts": []}')
      const result = await validatePartsFile(buffer, 'parts.json', 'application/json')

      expect(result.success).toBe(false)
      expect(result.errors[0].code).toBe('UNSUPPORTED_FORMAT')
    })

    it('should use config overrides', async () => {
      const csv = `partNumber,quantity
3001,4
3002,6
3003,2`

      const buffer = Buffer.from(csv)
      const result = await validatePartsFile(buffer, 'parts.csv', 'text/csv', {
        maxParts: 2,
      })

      expect(result.success).toBe(false)
      expect(result.errors[0].code).toBe('TOO_MANY_PARTS')
    })
  })

  describe('environment configuration', () => {
    const originalEnv = process.env

    beforeEach(() => {
      vi.resetModules()
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('should respect PARTS_VALIDATION_MODE=strict', async () => {
      process.env.PARTS_VALIDATION_MODE = 'strict'

      // Re-import to pick up env changes
      const { validatePartsFile: validateFresh } = await import('../validator-registry')

      const csv = `partNumber,quantity,unknownColumn
3001,4,foo`

      const buffer = Buffer.from(csv)
      const result = await validateFresh(buffer, 'parts.csv', 'text/csv')

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.code === 'UNKNOWN_COLUMN')).toBe(true)
    })
  })
})
