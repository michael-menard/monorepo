/**
 * CSV Validator Unit Tests
 *
 * Story 3.1.23: Parts Schema Validation
 */

import { describe, it, expect } from 'vitest'
import { csvValidator } from '../csv-validator'
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

describe('csvValidator', () => {
  describe('canHandle', () => {
    it('should handle .csv files', () => {
      expect(csvValidator.canHandle('parts.csv', 'text/csv')).toBe(true)
    })

    it('should handle .txt files', () => {
      expect(csvValidator.canHandle('parts.txt', 'text/plain')).toBe(true)
    })

    it('should handle by MIME type', () => {
      expect(csvValidator.canHandle('parts', 'application/csv')).toBe(true)
      expect(csvValidator.canHandle('parts', 'text/csv')).toBe(true)
    })

    it('should not handle .xml files', () => {
      expect(csvValidator.canHandle('parts.xml', 'application/xml')).toBe(false)
    })
  })

  describe('validate - relaxed mode', () => {
    it('should parse valid CSV with headers', async () => {
      const csv = `partNumber,quantity,color
3001,4,Red
3002,6,Blue
3003,2,Green`

      const buffer = Buffer.from(csv)
      const result = await csvValidator.validate(buffer, 'parts.csv', defaultConfig)

      expect(result.success).toBe(true)
      expect(result.data?.parts).toHaveLength(3)
      expect(result.data?.totalPieceCount).toBe(12) // 4 + 6 + 2
      expect(result.data?.format).toBe('csv')
    })

    it('should parse LEGO CSV format (elementId, quantity)', async () => {
      const csv = `elementId,quantity
4538456,4
6066113,6
6115198,4`

      const buffer = Buffer.from(csv)
      const result = await csvValidator.validate(buffer, 'parts.csv', defaultConfig)

      expect(result.success).toBe(true)
      expect(result.data?.parts).toHaveLength(3)
      expect(result.data?.parts[0].partNumber).toBe('4538456')
      expect(result.data?.parts[0].quantity).toBe(4)
    })

    it('should handle CSV without headers (default column order)', async () => {
      const csv = `3001,4,Red,Brick
3002,6,Blue,Plate`

      const buffer = Buffer.from(csv)
      const result = await csvValidator.validate(buffer, 'parts.csv', defaultConfig)

      expect(result.success).toBe(true)
      expect(result.data?.parts).toHaveLength(2)
      expect(result.data?.parts[0].partNumber).toBe('3001')
      expect(result.data?.parts[0].quantity).toBe(4)
      expect(result.data?.parts[0].color).toBe('Red')
    })

    it('should skip invalid rows with warnings in relaxed mode', async () => {
      const csv = `partNumber,quantity
3001,4
3002,invalid
3003,2`

      const buffer = Buffer.from(csv)
      const result = await csvValidator.validate(buffer, 'parts.csv', defaultConfig)

      expect(result.success).toBe(true)
      expect(result.data?.parts).toHaveLength(2) // Skipped invalid row
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings?.[0].code).toBe('INVALID_QUANTITY')
    })

    it('should reject empty file', async () => {
      const buffer = Buffer.from('')
      const result = await csvValidator.validate(buffer, 'parts.csv', defaultConfig)

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('EMPTY_FILE')
    })

    it('should reject file exceeding size limit', async () => {
      const smallConfig = { ...defaultConfig, maxFileSize: 10 }
      const csv = 'partNumber,quantity\n3001,4'
      const buffer = Buffer.from(csv)

      const result = await csvValidator.validate(buffer, 'parts.csv', smallConfig)

      expect(result.success).toBe(false)
      expect(result.errors[0].code).toBe('FILE_TOO_LARGE')
    })

    it('should reject file exceeding max parts limit', async () => {
      const smallConfig = { ...defaultConfig, maxParts: 2 }
      const csv = `partNumber,quantity
3001,4
3002,6
3003,2
3004,8`

      const buffer = Buffer.from(csv)
      const result = await csvValidator.validate(buffer, 'parts.csv', smallConfig)

      expect(result.success).toBe(false)
      expect(result.errors[0].code).toBe('TOO_MANY_PARTS')
    })
  })

  describe('validate - strict mode', () => {
    it('should parse valid CSV in strict mode', async () => {
      const csv = `partNumber,quantity
3001,4
3002,6`

      const buffer = Buffer.from(csv)
      const result = await csvValidator.validate(buffer, 'parts.csv', strictConfig)

      expect(result.success).toBe(true)
      expect(result.data?.parts).toHaveLength(2)
    })

    it('should reject CSV with missing required columns', async () => {
      // Use a header that partially matches (partNumber recognized, but quantity missing)
      const csv = `partNumber,color
3001,Red`

      const buffer = Buffer.from(csv)
      const result = await csvValidator.validate(buffer, 'parts.csv', strictConfig)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.code === 'MISSING_REQUIRED_COLUMN')).toBe(true)
    })

    it('should reject CSV with unknown columns in strict mode', async () => {
      const csv = `partNumber,quantity,unknownColumn
3001,4,foo`

      const buffer = Buffer.from(csv)
      const result = await csvValidator.validate(buffer, 'parts.csv', strictConfig)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.code === 'UNKNOWN_COLUMN')).toBe(true)
    })

    it('should error on invalid quantity in strict mode', async () => {
      const csv = `partNumber,quantity
3001,invalid`

      const buffer = Buffer.from(csv)
      const result = await csvValidator.validate(buffer, 'parts.csv', strictConfig)

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_QUANTITY')).toBe(true)
    })
  })

  describe('header detection', () => {
    it('should detect various header formats', async () => {
      const variations = [
        'part,qty',
        'Part_Number,Quantity',
        'PARTNO,COUNT',
        'element_id,amount',
      ]

      for (const header of variations) {
        const csv = `${header}\n3001,4`
        const buffer = Buffer.from(csv)
        const result = await csvValidator.validate(buffer, 'parts.csv', defaultConfig)

        expect(result.success).toBe(true)
        expect(result.data?.parts[0].partNumber).toBe('3001')
        expect(result.data?.parts[0].quantity).toBe(4)
      }
    })
  })
})
