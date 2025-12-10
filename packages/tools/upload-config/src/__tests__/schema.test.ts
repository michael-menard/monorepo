import { describe, it, expect } from 'vitest'
import {
  UploadConfigSchema,
  FileCategorySchema,
  DEFAULT_UPLOAD_CONFIG,
  DEFAULT_ALLOWED_MIME_TYPES,
} from '../schema'

describe('upload-config schema', () => {
  describe('FileCategorySchema', () => {
    it('accepts valid file categories', () => {
      expect(FileCategorySchema.parse('instruction')).toBe('instruction')
      expect(FileCategorySchema.parse('parts-list')).toBe('parts-list')
      expect(FileCategorySchema.parse('thumbnail')).toBe('thumbnail')
      expect(FileCategorySchema.parse('gallery-image')).toBe('gallery-image')
    })

    it('rejects invalid file categories', () => {
      expect(() => FileCategorySchema.parse('invalid')).toThrow()
      expect(() => FileCategorySchema.parse('')).toThrow()
    })
  })

  describe('UploadConfigSchema', () => {
    it('validates DEFAULT_UPLOAD_CONFIG', () => {
      const result = UploadConfigSchema.safeParse(DEFAULT_UPLOAD_CONFIG)
      expect(result.success).toBe(true)
    })

    it('validates custom config', () => {
      const customConfig = {
        pdfMaxBytes: 100 * 1024 * 1024,
        imageMaxBytes: 50 * 1024 * 1024,
        partsListMaxBytes: 20 * 1024 * 1024,
        thumbnailMaxBytes: 30 * 1024 * 1024,
        maxImagesPerMoc: 20,
        maxPartsListsPerMoc: 10,
        allowedPdfMimeTypes: ['application/pdf'],
        allowedImageMimeTypes: ['image/jpeg', 'image/png'],
        allowedPartsListMimeTypes: ['text/csv'],
        presignTtlMinutes: 30,
        sessionTtlMinutes: 30,
        rateLimitPerDay: 200,
        finalizeLockTtlMinutes: 10,
      }

      const result = UploadConfigSchema.safeParse(customConfig)
      expect(result.success).toBe(true)
    })

    it('rejects invalid byte values', () => {
      const invalidConfig = {
        ...DEFAULT_UPLOAD_CONFIG,
        pdfMaxBytes: -1,
      }

      const result = UploadConfigSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
    })

    it('rejects invalid TTL values', () => {
      const invalidConfig = {
        ...DEFAULT_UPLOAD_CONFIG,
        presignTtlMinutes: 0,
      }

      const result = UploadConfigSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
    })

    it('rejects TTL > 60 minutes', () => {
      const invalidConfig = {
        ...DEFAULT_UPLOAD_CONFIG,
        presignTtlMinutes: 61,
      }

      const result = UploadConfigSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
    })

    it('rejects non-integer byte values', () => {
      const invalidConfig = {
        ...DEFAULT_UPLOAD_CONFIG,
        pdfMaxBytes: 50.5, // Non-integer value
      }

      const result = UploadConfigSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
    })
  })

  describe('DEFAULT_ALLOWED_MIME_TYPES', () => {
    it('has instruction MIME types', () => {
      expect(DEFAULT_ALLOWED_MIME_TYPES.instruction).toContain('application/pdf')
    })

    it('has image MIME types', () => {
      expect(DEFAULT_ALLOWED_MIME_TYPES.image).toContain('image/jpeg')
      expect(DEFAULT_ALLOWED_MIME_TYPES.image).toContain('image/png')
      expect(DEFAULT_ALLOWED_MIME_TYPES.image).toContain('image/webp')
    })

    it('has parts list MIME types', () => {
      expect(DEFAULT_ALLOWED_MIME_TYPES.partsList).toContain('text/csv')
      expect(DEFAULT_ALLOWED_MIME_TYPES.partsList).toContain('application/json')
      expect(DEFAULT_ALLOWED_MIME_TYPES.partsList).toContain('text/xml')
    })
  })

  describe('DEFAULT_UPLOAD_CONFIG', () => {
    it('has reasonable default byte limits', () => {
      expect(DEFAULT_UPLOAD_CONFIG.pdfMaxBytes).toBe(50 * 1024 * 1024)
      expect(DEFAULT_UPLOAD_CONFIG.imageMaxBytes).toBe(20 * 1024 * 1024)
      expect(DEFAULT_UPLOAD_CONFIG.partsListMaxBytes).toBe(10 * 1024 * 1024)
    })

    it('has reasonable default count limits', () => {
      expect(DEFAULT_UPLOAD_CONFIG.maxImagesPerMoc).toBe(10)
      expect(DEFAULT_UPLOAD_CONFIG.maxPartsListsPerMoc).toBe(5)
    })

    it('has reasonable default TTL', () => {
      expect(DEFAULT_UPLOAD_CONFIG.presignTtlMinutes).toBe(15)
      expect(DEFAULT_UPLOAD_CONFIG.sessionTtlMinutes).toBe(15)
    })
  })
})
