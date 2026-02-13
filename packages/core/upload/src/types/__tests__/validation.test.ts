import { describe, it, expect } from 'vitest'
import { FileValidationResultSchema } from '../validation'

describe('FileValidationResultSchema', () => {
  describe('valid results', () => {
    it('should accept valid result without error', () => {
      const result = { valid: true }
      expect(FileValidationResultSchema.safeParse(result).success).toBe(true)
    })

    it('should accept valid result with optional error field', () => {
      const result = { valid: true, error: undefined }
      expect(FileValidationResultSchema.safeParse(result).success).toBe(true)
    })
  })

  describe('invalid results', () => {
    it('should accept invalid result with error message', () => {
      const result = { valid: false, error: 'File too large' }
      const parsed = FileValidationResultSchema.safeParse(result)
      expect(parsed.success).toBe(true)
      if (parsed.success) {
        expect(parsed.data.valid).toBe(false)
        expect(parsed.data.error).toBe('File too large')
      }
    })

    it('should accept invalid result without error (optional)', () => {
      const result = { valid: false }
      expect(FileValidationResultSchema.safeParse(result).success).toBe(true)
    })

    it('should accept empty string error', () => {
      const result = { valid: false, error: '' }
      expect(FileValidationResultSchema.safeParse(result).success).toBe(true)
    })
  })

  describe('rejection cases', () => {
    it('should reject missing valid field', () => {
      const result = { error: 'File too large' }
      expect(FileValidationResultSchema.safeParse(result).success).toBe(false)
    })

    it('should reject invalid valid field type', () => {
      const result = { valid: 'yes', error: 'test' }
      expect(FileValidationResultSchema.safeParse(result).success).toBe(false)
    })

    it('should reject invalid error field type', () => {
      const result = { valid: true, error: 123 }
      expect(FileValidationResultSchema.safeParse(result).success).toBe(false)
    })
  })

  describe('type inference', () => {
    it('should produce correct inferred type shape', () => {
      const result = FileValidationResultSchema.parse({ valid: true })
      // Type check: these properties should exist
      const valid: boolean = result.valid
      const error: string | undefined = result.error
      expect(valid).toBe(true)
      expect(error).toBeUndefined()
    })

    it('should parse and return all fields', () => {
      const input = { valid: false, error: 'Unsupported type' }
      const result = FileValidationResultSchema.parse(input)
      expect(result).toEqual(input)
    })
  })

  describe('barrel export', () => {
    it('should be importable from types barrel', async () => {
      const types = await import('../index')
      expect(types.FileValidationResultSchema).toBeDefined()
      expect(typeof types.FileValidationResultSchema.parse).toBe('function')
    })
  })
})
