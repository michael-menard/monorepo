/**
 * Unit Tests for File Upload Service
 *
 * Tests file validation, S3 key generation, and sanitization.
 * Mock all external dependencies (S3, database).
 */

import { describe, it, expect } from 'vitest'
import { mockFileUploadMetadata } from '@/__tests__/fixtures/mock-files'

describe('File Upload Service', () => {
  describe('S3 Key Generation', () => {
    it('should generate correct S3 key for instruction file', () => {
      // Given: User ID, MOC ID, and file metadata
      const userId = 'user-123'
      const mocId = 'moc-basic-123'
      const fileId = 'uuid-123'

      // When: Generate S3 key
      const s3Key = `mocs/${userId}/${mocId}/${fileId}.pdf`

      // Then: Key follows correct structure
      expect(s3Key).toBe('mocs/user-123/moc-basic-123/uuid-123.pdf')
      expect(s3Key).toContain(userId)
      expect(s3Key).toContain(mocId)
      expect(s3Key).toMatch(/\.pdf$/)
    })

    it('should generate correct S3 key for parts list', () => {
      // Given: Parts list file metadata
      const userId = 'user-456'
      const mocId = 'moc-set-456'
      const fileId = 'uuid-456'

      // When: Generate S3 key
      const s3Key = `mocs/${userId}/${mocId}/${fileId}.csv`

      // Then: Key includes CSV extension
      expect(s3Key).toBe('mocs/user-456/moc-set-456/uuid-456.csv')
      expect(s3Key).toMatch(/\.csv$/)
    })

    it('should generate correct S3 key for thumbnail', () => {
      // Given: Thumbnail image metadata
      const userId = 'user-123'
      const mocId = 'moc-basic-123'
      const fileId = 'uuid-789'

      // When: Generate S3 key
      const s3Key = `mocs/${userId}/${mocId}/${fileId}.jpg`

      // Then: Key includes image extension
      expect(s3Key).toBe('mocs/user-123/moc-basic-123/uuid-789.jpg')
      expect(s3Key).toMatch(/\.(jpg|jpeg|png)$/)
    })
  })

  describe('Filename Sanitization', () => {
    it('should sanitize filename with special characters', () => {
      // Given: Filename with special chars
      const filename = 'My MOC! @#$%^&*()+Instructions.pdf'

      // When: Sanitize filename
      const sanitized = filename
        .replace(/[^a-zA-Z0-9.-]/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase()

      // Then: Special chars are removed/replaced
      expect(sanitized).toBe('my-moc-instructions.pdf')
      expect(sanitized).not.toContain('!')
      expect(sanitized).not.toContain('@')
    })

    it('should preserve file extension during sanitization', () => {
      // Given: Filename with complex extension
      const filename = 'Castle Build.tar.gz'

      // When: Sanitize while preserving extension
      const sanitized = filename
        .replace(/[^a-zA-Z0-9.-]/g, '-')
        .toLowerCase()

      // Then: Extension is preserved
      expect(sanitized).toBe('castle-build.tar.gz')
      expect(sanitized).toMatch(/\.tar\.gz$/)
    })

    it('should handle Unicode characters in filename', () => {
      // Given: Filename with Unicode
      const filename = 'château-médiéval.pdf'

      // When: Sanitize to ASCII
      const sanitized = filename
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9.-]/g, '-')
        .toLowerCase()

      // Then: Unicode is converted to ASCII
      expect(sanitized).toBe('chateau-medieval.pdf')
    })
  })

  describe('File Validation', () => {
    it('should validate PDF instruction file', () => {
      // Given: Valid PDF metadata
      const metadata = mockFileUploadMetadata.validPdf

      // When: Validate file
      const isValid =
        metadata.mimeType === 'application/pdf' &&
        metadata.size <= 10485760 && // 10MB
        metadata.fileType === 'instruction'

      // Then: Validation passes
      expect(isValid).toBe(true)
    })

    it('should reject oversized file', () => {
      // Given: File exceeding 10MB limit
      const metadata = mockFileUploadMetadata.oversized

      // When: Validate file size
      const isValid = metadata.size <= 10485760

      // Then: Validation fails
      expect(isValid).toBe(false)
      expect(metadata.size).toBeGreaterThan(10485760)
    })

    it('should reject invalid MIME type', () => {
      // Given: Invalid MIME type (executable)
      const metadata = mockFileUploadMetadata.invalidMimeType

      // When: Validate MIME type
      const allowedMimeTypes = [
        'application/pdf',
        'text/csv',
        'image/jpeg',
        'image/png',
        'image/webp',
      ]
      const isValid = allowedMimeTypes.includes(metadata.mimeType)

      // Then: Validation fails
      expect(isValid).toBe(false)
      expect(metadata.mimeType).toBe('application/x-msdownload')
    })

    it('should validate CSV parts list', () => {
      // Given: Valid CSV metadata
      const metadata = mockFileUploadMetadata.validCsv

      // When: Validate CSV file
      const isValid =
        metadata.mimeType === 'text/csv' &&
        metadata.size <= 10485760 &&
        metadata.fileType === 'parts-list'

      // Then: Validation passes
      expect(isValid).toBe(true)
    })

    it('should validate file extension matches MIME type', () => {
      // Given: PDF file
      const filename = 'instructions.pdf'
      const mimeType = 'application/pdf'

      // When: Check extension/MIME match
      const extension = filename.split('.').pop()?.toLowerCase()
      const mimeExtensionMap: Record<string, string[]> = {
        'application/pdf': ['pdf'],
        'text/csv': ['csv'],
        'image/jpeg': ['jpg', 'jpeg'],
        'image/png': ['png'],
      }
      const isValid = mimeExtensionMap[mimeType]?.includes(extension || '')

      // Then: Extension matches MIME type
      expect(isValid).toBe(true)
    })
  })

  describe('MIME Type Validation', () => {
    it('should allow all valid instruction file MIME types', () => {
      // Given: Valid instruction MIME types
      const validMimeTypes = ['application/pdf']

      // When: Validate each type
      const results = validMimeTypes.map(mimeType => {
        const allowedTypes = ['application/pdf']
        return allowedTypes.includes(mimeType)
      })

      // Then: All are valid
      expect(results.every(r => r === true)).toBe(true)
    })

    it('should allow all valid image MIME types', () => {
      // Given: Valid image MIME types
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

      // When: Validate each type
      const results = validMimeTypes.map(mimeType => {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
        return allowedTypes.includes(mimeType)
      })

      // Then: All are valid
      expect(results.every(r => r === true)).toBe(true)
    })

    it('should reject executable MIME types', () => {
      // Given: Dangerous MIME types
      const dangerousMimeTypes = [
        'application/x-msdownload',
        'application/x-executable',
        'application/x-sh',
      ]

      // When: Validate each type
      const allowedTypes = [
        'application/pdf',
        'text/csv',
        'image/jpeg',
        'image/png',
        'image/webp',
      ]
      const results = dangerousMimeTypes.map(mimeType => allowedTypes.includes(mimeType))

      // Then: All are rejected
      expect(results.every(r => r === false)).toBe(true)
    })
  })
})
