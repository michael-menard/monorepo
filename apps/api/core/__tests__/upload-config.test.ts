/**
 * Upload Config Unit Tests
 *
 * Story 3.1.5: Config and Validation Foundations
 *
 * Tests:
 * - Parser success/failure cases
 * - CSV normalization (case, whitespace, dedupe)
 * - TTL boundaries (1-60 minutes)
 * - Default values
 * - MB to bytes conversion
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock the logger before importing the module
vi.mock('@/core/observability/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('Upload Config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset modules to clear cached config
    vi.resetModules()
    // Clone env to avoid mutation
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('UploadEnvSchema', () => {
    it('uses default values when env vars are not set', async () => {
      const { getUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      const config = getUploadConfig()

      expect(config.pdfMaxMb).toBe(50)
      expect(config.imageMaxMb).toBe(20)
      expect(config.partsListMaxMb).toBe(10)
      expect(config.imageMaxCount).toBe(10)
      expect(config.partsListMaxCount).toBe(5)
      expect(config.rateLimitPerDay).toBe(100)
      expect(config.presignTtlMinutes).toBe(15)
      expect(config.allowedImageFormats).toEqual(['jpeg', 'png', 'webp', 'heic'])
      expect(config.allowedPartsFormats).toEqual(['txt', 'csv', 'json', 'xml'])
    })

    it('converts MB to bytes correctly', async () => {
      process.env.UPLOAD_PDF_MAX_MB = '100'
      process.env.UPLOAD_IMAGE_MAX_MB = '25'
      process.env.UPLOAD_PARTSLIST_MAX_MB = '15'

      const { getUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      const config = getUploadConfig()

      expect(config.pdfMaxBytes).toBe(100 * 1024 * 1024)
      expect(config.imageMaxBytes).toBe(25 * 1024 * 1024)
      expect(config.partsListMaxBytes).toBe(15 * 1024 * 1024)
    })

    it('converts presign TTL minutes to seconds', async () => {
      process.env.PRESIGN_TTL_MINUTES = '30'

      const { getUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      const config = getUploadConfig()

      expect(config.presignTtlMinutes).toBe(30)
      expect(config.presignTtlSeconds).toBe(1800)
    })
  })

  describe('CSV normalization', () => {
    it('normalizes image formats to lowercase', async () => {
      process.env.UPLOAD_ALLOWED_IMAGE_FORMATS = 'JPEG,PNG,WebP'

      const { getUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      const config = getUploadConfig()

      expect(config.allowedImageFormats).toEqual(['jpeg', 'png', 'webp'])
    })

    it('trims whitespace from formats', async () => {
      process.env.UPLOAD_ALLOWED_IMAGE_FORMATS = ' jpeg , png , webp '

      const { getUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      const config = getUploadConfig()

      expect(config.allowedImageFormats).toEqual(['jpeg', 'png', 'webp'])
    })

    it('deduplicates formats', async () => {
      process.env.UPLOAD_ALLOWED_IMAGE_FORMATS = 'jpeg,png,jpeg,png,webp'

      const { getUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      const config = getUploadConfig()

      expect(config.allowedImageFormats).toEqual(['jpeg', 'png', 'webp'])
    })

    it('filters empty values', async () => {
      process.env.UPLOAD_ALLOWED_IMAGE_FORMATS = 'jpeg,,png,  ,webp'

      const { getUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      const config = getUploadConfig()

      expect(config.allowedImageFormats).toEqual(['jpeg', 'png', 'webp'])
    })
  })

  describe('TTL boundaries', () => {
    it('accepts TTL of 1 minute (minimum)', async () => {
      process.env.PRESIGN_TTL_MINUTES = '1'

      const { getUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      const config = getUploadConfig()

      expect(config.presignTtlMinutes).toBe(1)
      expect(config.presignTtlSeconds).toBe(60)
    })

    it('accepts TTL of 60 minutes (maximum)', async () => {
      process.env.PRESIGN_TTL_MINUTES = '60'

      const { getUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      const config = getUploadConfig()

      expect(config.presignTtlMinutes).toBe(60)
      expect(config.presignTtlSeconds).toBe(3600)
    })

    it('rejects TTL of 0 (below minimum)', async () => {
      process.env.PRESIGN_TTL_MINUTES = '0'

      const { validateUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(() => validateUploadConfig()).toThrow('PRESIGN_TTL_MINUTES must be an integer between 1 and 60')
    })

    it('rejects TTL of 61 (above maximum)', async () => {
      process.env.PRESIGN_TTL_MINUTES = '61'

      const { validateUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(() => validateUploadConfig()).toThrow('PRESIGN_TTL_MINUTES must be an integer between 1 and 60')
    })

    it('truncates decimal TTL to integer (parseInt behavior)', async () => {
      // Note: parseInt('15.5', 10) returns 15, so this is valid
      process.env.PRESIGN_TTL_MINUTES = '15.5'

      const { getUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      const config = getUploadConfig()
      expect(config.presignTtlMinutes).toBe(15)
    })
  })

  describe('Validation failures', () => {
    it('rejects invalid image format', async () => {
      process.env.UPLOAD_ALLOWED_IMAGE_FORMATS = 'jpeg,invalid_format,png'

      const { validateUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(() => validateUploadConfig()).toThrow('Invalid image format(s): invalid_format')
    })

    it('rejects invalid parts list format', async () => {
      process.env.UPLOAD_ALLOWED_PARTS_FORMATS = 'csv,docx,txt'

      const { validateUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(() => validateUploadConfig()).toThrow('Invalid parts list format(s): docx')
    })

    it('rejects negative file size', async () => {
      process.env.UPLOAD_PDF_MAX_MB = '-10'

      const { validateUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(() => validateUploadConfig()).toThrow('UPLOAD_PDF_MAX_MB must be a positive integer')
    })

    it('rejects zero file size', async () => {
      process.env.UPLOAD_IMAGE_MAX_MB = '0'

      const { validateUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(() => validateUploadConfig()).toThrow('UPLOAD_IMAGE_MAX_MB must be a positive integer')
    })

    it('rejects non-numeric file size', async () => {
      process.env.UPLOAD_PARTSLIST_MAX_MB = 'abc'

      const { validateUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(() => validateUploadConfig()).toThrow('UPLOAD_PARTSLIST_MAX_MB must be a positive integer')
    })
  })

  describe('Config caching', () => {
    it('caches config after first access', async () => {
      const { getUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      const config1 = getUploadConfig()
      const config2 = getUploadConfig()

      expect(config1).toBe(config2) // Same reference
    })

    it('resets cache when resetUploadConfig is called', async () => {
      const { getUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      const config1 = getUploadConfig()
      resetUploadConfig()
      const config2 = getUploadConfig()

      expect(config1).not.toBe(config2) // Different references
      expect(config1).toEqual(config2) // Same values
    })
  })

  describe('Helper functions', () => {
    it('isImageFormatAllowed returns true for allowed format', async () => {
      process.env.UPLOAD_ALLOWED_IMAGE_FORMATS = 'jpeg,png'

      const { isImageFormatAllowed, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(isImageFormatAllowed('jpeg')).toBe(true)
      expect(isImageFormatAllowed('JPEG')).toBe(true) // Case insensitive
      expect(isImageFormatAllowed('png')).toBe(true)
    })

    it('isImageFormatAllowed returns false for disallowed format', async () => {
      process.env.UPLOAD_ALLOWED_IMAGE_FORMATS = 'jpeg,png'

      const { isImageFormatAllowed, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(isImageFormatAllowed('webp')).toBe(false)
      expect(isImageFormatAllowed('gif')).toBe(false)
    })

    it('isPartsFormatAllowed returns true for allowed format', async () => {
      process.env.UPLOAD_ALLOWED_PARTS_FORMATS = 'csv,json'

      const { isPartsFormatAllowed, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(isPartsFormatAllowed('csv')).toBe(true)
      expect(isPartsFormatAllowed('CSV')).toBe(true) // Case insensitive
      expect(isPartsFormatAllowed('json')).toBe(true)
    })

    it('isPartsFormatAllowed returns false for disallowed format', async () => {
      process.env.UPLOAD_ALLOWED_PARTS_FORMATS = 'csv,json'

      const { isPartsFormatAllowed, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(isPartsFormatAllowed('xml')).toBe(false)
      expect(isPartsFormatAllowed('txt')).toBe(false)
    })

    it('getFileSizeLimit returns correct size for each file type', async () => {
      process.env.UPLOAD_PDF_MAX_MB = '100'
      process.env.UPLOAD_IMAGE_MAX_MB = '25'
      process.env.UPLOAD_PARTSLIST_MAX_MB = '15'

      const { getFileSizeLimit, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(getFileSizeLimit('instruction')).toBe(100 * 1024 * 1024)
      expect(getFileSizeLimit('parts-list')).toBe(15 * 1024 * 1024)
      expect(getFileSizeLimit('thumbnail')).toBe(25 * 1024 * 1024)
      expect(getFileSizeLimit('gallery-image')).toBe(25 * 1024 * 1024)
    })

    it('getFileCountLimit returns correct count for each file type', async () => {
      process.env.UPLOAD_IMAGE_MAX_COUNT = '20'
      process.env.UPLOAD_PARTSLIST_MAX_COUNT = '8'

      const { getFileCountLimit, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(getFileCountLimit('instruction')).toBe(1) // Always 1
      expect(getFileCountLimit('thumbnail')).toBe(1) // Always 1
      expect(getFileCountLimit('gallery-image')).toBe(20)
      expect(getFileCountLimit('parts-list')).toBe(8)
    })
  })

  // Story 3.1.8: Session TTL and MIME type validation tests
  describe('Session TTL (Story 3.1.8)', () => {
    it('sessionTtlSeconds equals presignTtlSeconds', async () => {
      process.env.PRESIGN_TTL_MINUTES = '20'

      const { getUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      const config = getUploadConfig()

      expect(config.sessionTtlMinutes).toBe(20)
      expect(config.sessionTtlSeconds).toBe(1200)
      expect(config.sessionTtlSeconds).toBe(config.presignTtlSeconds)
    })

    it('sessionTtlMinutes equals presignTtlMinutes', async () => {
      process.env.PRESIGN_TTL_MINUTES = '45'

      const { getUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      const config = getUploadConfig()

      expect(config.sessionTtlMinutes).toBe(config.presignTtlMinutes)
    })
  })

  describe('MIME type validation (Story 3.1.8)', () => {
    it('isMimeTypeAllowed returns true for allowed instruction MIME types', async () => {
      const { isMimeTypeAllowed, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(isMimeTypeAllowed('instruction', 'application/pdf')).toBe(true)
    })

    it('isMimeTypeAllowed returns false for disallowed instruction MIME types', async () => {
      const { isMimeTypeAllowed, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(isMimeTypeAllowed('instruction', 'image/jpeg')).toBe(false)
      expect(isMimeTypeAllowed('instruction', 'text/plain')).toBe(false)
    })

    it('isMimeTypeAllowed returns true for allowed image MIME types', async () => {
      const { isMimeTypeAllowed, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(isMimeTypeAllowed('thumbnail', 'image/jpeg')).toBe(true)
      expect(isMimeTypeAllowed('thumbnail', 'image/png')).toBe(true)
      expect(isMimeTypeAllowed('thumbnail', 'image/webp')).toBe(true)
      expect(isMimeTypeAllowed('gallery-image', 'image/jpeg')).toBe(true)
      expect(isMimeTypeAllowed('gallery-image', 'image/heic')).toBe(true)
    })

    it('isMimeTypeAllowed returns false for disallowed image MIME types', async () => {
      const { isMimeTypeAllowed, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(isMimeTypeAllowed('thumbnail', 'application/pdf')).toBe(false)
      expect(isMimeTypeAllowed('gallery-image', 'text/plain')).toBe(false)
    })

    it('isMimeTypeAllowed returns true for allowed parts-list MIME types', async () => {
      const { isMimeTypeAllowed, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(isMimeTypeAllowed('parts-list', 'text/csv')).toBe(true)
      expect(isMimeTypeAllowed('parts-list', 'application/json')).toBe(true)
      expect(isMimeTypeAllowed('parts-list', 'text/plain')).toBe(true)
      expect(isMimeTypeAllowed('parts-list', 'application/xml')).toBe(true)
      expect(
        isMimeTypeAllowed(
          'parts-list',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ),
      ).toBe(true)
    })

    it('isMimeTypeAllowed returns false for disallowed parts-list MIME types', async () => {
      const { isMimeTypeAllowed, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(isMimeTypeAllowed('parts-list', 'application/pdf')).toBe(false)
      expect(isMimeTypeAllowed('parts-list', 'image/jpeg')).toBe(false)
    })

    it('isMimeTypeAllowed is case-insensitive', async () => {
      const { isMimeTypeAllowed, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(isMimeTypeAllowed('instruction', 'APPLICATION/PDF')).toBe(true)
      expect(isMimeTypeAllowed('thumbnail', 'IMAGE/JPEG')).toBe(true)
    })

    it('getAllowedMimeTypes returns correct types for each file type', async () => {
      const { getAllowedMimeTypes, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      expect(getAllowedMimeTypes('instruction')).toContain('application/pdf')
      expect(getAllowedMimeTypes('thumbnail')).toContain('image/jpeg')
      expect(getAllowedMimeTypes('gallery-image')).toContain('image/png')
      expect(getAllowedMimeTypes('parts-list')).toContain('text/csv')
    })
  })

  describe('Allowed MIME types config (Story 3.1.8)', () => {
    it('config includes allowedMimeTypes object', async () => {
      const { getUploadConfig, resetUploadConfig } = await import('../config/upload')
      resetUploadConfig()

      const config = getUploadConfig()

      expect(config.allowedMimeTypes).toBeDefined()
      expect(config.allowedMimeTypes.instruction).toContain('application/pdf')
      expect(config.allowedMimeTypes.image).toContain('image/jpeg')
      expect(config.allowedMimeTypes.partsList).toContain('text/csv')
    })
  })
})

