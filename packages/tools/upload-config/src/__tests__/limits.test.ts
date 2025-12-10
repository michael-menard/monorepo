import { describe, it, expect } from 'vitest'
import {
  getFileSizeLimit,
  getFileCountLimit,
  isMimeTypeAllowed,
  getAllowedMimeTypes,
  getPresignTtlSeconds,
  getSessionTtlSeconds,
  mbToBytes,
  bytesToMb,
  formatBytes,
} from '../limits'
import { DEFAULT_UPLOAD_CONFIG, type UploadConfig } from '../schema'

describe('upload-config limits', () => {
  const config: UploadConfig = DEFAULT_UPLOAD_CONFIG

  describe('getFileSizeLimit', () => {
    it('returns pdfMaxBytes for instruction category', () => {
      expect(getFileSizeLimit(config, 'instruction')).toBe(config.pdfMaxBytes)
    })

    it('returns partsListMaxBytes for parts-list category', () => {
      expect(getFileSizeLimit(config, 'parts-list')).toBe(config.partsListMaxBytes)
    })

    it('returns thumbnailMaxBytes for thumbnail category', () => {
      expect(getFileSizeLimit(config, 'thumbnail')).toBe(config.thumbnailMaxBytes)
    })

    it('returns imageMaxBytes for gallery-image category', () => {
      expect(getFileSizeLimit(config, 'gallery-image')).toBe(config.imageMaxBytes)
    })

    it('works with custom config', () => {
      const customConfig: UploadConfig = {
        ...config,
        pdfMaxBytes: 100 * 1024 * 1024,
      }
      expect(getFileSizeLimit(customConfig, 'instruction')).toBe(100 * 1024 * 1024)
    })
  })

  describe('getFileCountLimit', () => {
    it('returns 1 for instruction category', () => {
      expect(getFileCountLimit(config, 'instruction')).toBe(1)
    })

    it('returns maxPartsListsPerMoc for parts-list category', () => {
      expect(getFileCountLimit(config, 'parts-list')).toBe(config.maxPartsListsPerMoc)
    })

    it('returns 1 for thumbnail category', () => {
      expect(getFileCountLimit(config, 'thumbnail')).toBe(1)
    })

    it('returns maxImagesPerMoc for gallery-image category', () => {
      expect(getFileCountLimit(config, 'gallery-image')).toBe(config.maxImagesPerMoc)
    })
  })

  describe('isMimeTypeAllowed', () => {
    it('returns true for allowed PDF MIME type', () => {
      expect(isMimeTypeAllowed(config, 'instruction', 'application/pdf')).toBe(true)
    })

    it('returns false for disallowed PDF MIME type', () => {
      expect(isMimeTypeAllowed(config, 'instruction', 'image/png')).toBe(false)
    })

    it('returns true for allowed image MIME types', () => {
      expect(isMimeTypeAllowed(config, 'gallery-image', 'image/jpeg')).toBe(true)
      expect(isMimeTypeAllowed(config, 'gallery-image', 'image/png')).toBe(true)
      expect(isMimeTypeAllowed(config, 'thumbnail', 'image/webp')).toBe(true)
    })

    it('returns true for allowed parts-list MIME types', () => {
      expect(isMimeTypeAllowed(config, 'parts-list', 'text/csv')).toBe(true)
      expect(isMimeTypeAllowed(config, 'parts-list', 'application/json')).toBe(true)
    })

    it('is case-insensitive', () => {
      expect(isMimeTypeAllowed(config, 'instruction', 'APPLICATION/PDF')).toBe(true)
      expect(isMimeTypeAllowed(config, 'gallery-image', 'IMAGE/JPEG')).toBe(true)
    })
  })

  describe('getAllowedMimeTypes', () => {
    it('returns PDF MIME types for instruction category', () => {
      expect(getAllowedMimeTypes(config, 'instruction')).toEqual(config.allowedPdfMimeTypes)
    })

    it('returns parts-list MIME types for parts-list category', () => {
      expect(getAllowedMimeTypes(config, 'parts-list')).toEqual(config.allowedPartsListMimeTypes)
    })

    it('returns image MIME types for thumbnail category', () => {
      expect(getAllowedMimeTypes(config, 'thumbnail')).toEqual(config.allowedImageMimeTypes)
    })

    it('returns image MIME types for gallery-image category', () => {
      expect(getAllowedMimeTypes(config, 'gallery-image')).toEqual(config.allowedImageMimeTypes)
    })
  })

  describe('getPresignTtlSeconds', () => {
    it('converts minutes to seconds', () => {
      expect(getPresignTtlSeconds(config)).toBe(config.presignTtlMinutes * 60)
    })

    it('works with custom TTL', () => {
      const customConfig: UploadConfig = { ...config, presignTtlMinutes: 30 }
      expect(getPresignTtlSeconds(customConfig)).toBe(1800)
    })
  })

  describe('getSessionTtlSeconds', () => {
    it('converts minutes to seconds', () => {
      expect(getSessionTtlSeconds(config)).toBe(config.sessionTtlMinutes * 60)
    })
  })

  describe('mbToBytes', () => {
    it('converts megabytes to bytes', () => {
      expect(mbToBytes(1)).toBe(1024 * 1024)
      expect(mbToBytes(50)).toBe(50 * 1024 * 1024)
      expect(mbToBytes(0.5)).toBe(512 * 1024)
    })
  })

  describe('bytesToMb', () => {
    it('converts bytes to megabytes', () => {
      expect(bytesToMb(1024 * 1024)).toBe(1)
      expect(bytesToMb(50 * 1024 * 1024)).toBe(50)
      expect(bytesToMb(512 * 1024)).toBe(0.5)
    })
  })

  describe('formatBytes', () => {
    it('formats bytes', () => {
      expect(formatBytes(500)).toBe('500 B')
    })

    it('formats kilobytes', () => {
      expect(formatBytes(1024)).toBe('1.0 KB')
      expect(formatBytes(1536)).toBe('1.5 KB')
    })

    it('formats megabytes', () => {
      expect(formatBytes(1024 * 1024)).toBe('1.0 MB')
      expect(formatBytes(50 * 1024 * 1024)).toBe('50.0 MB')
    })

    it('formats gigabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB')
    })
  })
})
