import { describe, it, expect } from 'vitest'
import {
  validateFile,
  createLegoPartsListValidationConfig,
  createImageValidationConfig,
  formatFileSize,
  getFileExtension,
} from '../validators.js'

// Mock file objects
const createMockFile = (name: string, size: number, type: string) => ({
  name,
  size,
  type,
  lastModified: Date.now(),
})

describe('File Validator', () => {
  describe('validateFile', () => {
    it('should validate a valid CSV file for LEGO parts list', () => {
      const file = createMockFile('parts-list.csv', 1024, 'text/csv')
      const config = createLegoPartsListValidationConfig()

      const result = validateFile(file, config)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject oversized files', () => {
      const file = createMockFile('large-file.csv', 50 * 1024 * 1024, 'text/csv') // 50MB
      const config = createLegoPartsListValidationConfig() // Max 10MB

      const result = validateFile(file, config)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('FILE_TOO_LARGE')
    })

    it('should handle MIME type fallback for CSV files', () => {
      // CSV files are often detected as application/octet-stream
      const file = createMockFile('parts-list.csv', 1024, 'application/octet-stream')
      const config = createLegoPartsListValidationConfig()

      const result = validateFile(file, config)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate image files', () => {
      const file = createMockFile('image.jpg', 1024 * 1024, 'image/jpeg')
      const config = createImageValidationConfig()

      const result = validateFile(file, config)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid file types', () => {
      const file = createMockFile('document.pdf', 1024, 'application/pdf')
      const config = createImageValidationConfig() // Only allows images

      const result = validateFile(file, config)

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].code).toBe('INVALID_FILE_TYPE')
    })
  })

  describe('utility functions', () => {
    it('should format file sizes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes')
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1024 * 1024)).toBe('1 MB')
      expect(formatFileSize(1536)).toBe('1.5 KB')
    })

    it('should extract file extensions correctly', () => {
      expect(getFileExtension('file.txt')).toBe('.txt')
      expect(getFileExtension('image.JPEG')).toBe('.jpeg')
      expect(getFileExtension('no-extension')).toBe('')
      expect(getFileExtension('multiple.dots.csv')).toBe('.csv')
    })
  })
})
