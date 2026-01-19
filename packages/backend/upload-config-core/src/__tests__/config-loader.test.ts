/**
 * Unit tests for upload config core logic
 * Tests platform-agnostic business logic with mock environment variables
 */

import { describe, it, expect } from 'vitest'
import { loadUploadConfigFromEnv, getPublicUploadConfig } from '../config-loader'
import type { EnvVars } from '../__types__'
import type { UploadConfig } from '@repo/upload-config'

const validEnv: EnvVars = {
  PDF_MAX_BYTES: '104857600',
  IMAGE_MAX_BYTES: '10485760',
  PARTS_LIST_MAX_BYTES: '5242880',
  THUMBNAIL_MAX_BYTES: '2097152',
  MAX_IMAGES_PER_MOC: '20',
  MAX_PARTS_LISTS_PER_MOC: '5',
  ALLOWED_PDF_MIME_TYPES: 'application/pdf',
  ALLOWED_IMAGE_MIME_TYPES: 'image/jpeg,image/png,image/webp',
  ALLOWED_PARTS_LIST_MIME_TYPES: 'text/csv,application/xml',
  PRESIGN_TTL_MINUTES: '15',
  SESSION_TTL_MINUTES: '60',
}

describe('loadUploadConfigFromEnv', () => {
  it('loads valid configuration from environment variables', () => {
    const config = loadUploadConfigFromEnv(validEnv)

    expect(config.pdfMaxBytes).toBe(104857600)
    expect(config.imageMaxBytes).toBe(10485760)
    expect(config.partsListMaxBytes).toBe(5242880)
    expect(config.thumbnailMaxBytes).toBe(2097152)
    expect(config.maxImagesPerMoc).toBe(20)
    expect(config.maxPartsListsPerMoc).toBe(5)
    expect(config.allowedPdfMimeTypes).toEqual(['application/pdf'])
    expect(config.allowedImageMimeTypes).toEqual(['image/jpeg', 'image/png', 'image/webp'])
    expect(config.allowedPartsListMimeTypes).toEqual(['text/csv', 'application/xml'])
    expect(config.presignTtlMinutes).toBe(15)
    expect(config.sessionTtlMinutes).toBe(60)
    expect(config.rateLimitPerDay).toBe(100)
    expect(config.finalizeLockTtlMinutes).toBe(5)
  })

  it('parses single MIME type correctly', () => {
    const config = loadUploadConfigFromEnv(validEnv)
    expect(config.allowedPdfMimeTypes).toEqual(['application/pdf'])
  })

  it('parses comma-separated MIME types correctly', () => {
    const config = loadUploadConfigFromEnv(validEnv)
    expect(config.allowedImageMimeTypes).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })

  it('trims whitespace from MIME types', () => {
    const env: EnvVars = {
      ...validEnv,
      ALLOWED_IMAGE_MIME_TYPES: ' image/jpeg , image/png , image/webp ',
    }
    const config = loadUploadConfigFromEnv(env)
    expect(config.allowedImageMimeTypes).toEqual(['image/jpeg', 'image/png', 'image/webp'])
  })

  it('throws error when required variable is missing', () => {
    const invalidEnv: EnvVars = { ...validEnv }
    delete invalidEnv.PDF_MAX_BYTES

    expect(() => loadUploadConfigFromEnv(invalidEnv)).toThrow(
      'Missing required environment variables: PDF_MAX_BYTES',
    )
  })

  it('throws error when multiple required variables are missing', () => {
    const invalidEnv: EnvVars = { ...validEnv }
    delete invalidEnv.PDF_MAX_BYTES
    delete invalidEnv.IMAGE_MAX_BYTES

    expect(() => loadUploadConfigFromEnv(invalidEnv)).toThrow(
      'Missing required environment variables',
    )
  })

  it('throws error when numeric value is invalid', () => {
    const invalidEnv: EnvVars = {
      ...validEnv,
      PDF_MAX_BYTES: 'not-a-number',
    }

    expect(() => loadUploadConfigFromEnv(invalidEnv)).toThrow(
      'Invalid number for PDF_MAX_BYTES: not-a-number',
    )
  })

  it('parses zero as valid number', () => {
    const envWithZero: EnvVars = {
      ...validEnv,
      MAX_IMAGES_PER_MOC: '0',
    }

    const config = loadUploadConfigFromEnv(envWithZero)
    expect(config.maxImagesPerMoc).toBe(0)
  })

  it('uses default values for fields not in environment', () => {
    const config = loadUploadConfigFromEnv(validEnv)

    expect(config.rateLimitPerDay).toBe(100)
    expect(config.finalizeLockTtlMinutes).toBe(5)
  })
})

describe('getPublicUploadConfig', () => {
  it('returns only public-safe fields', () => {
    const fullConfig: UploadConfig = {
      pdfMaxBytes: 104857600,
      imageMaxBytes: 10485760,
      partsListMaxBytes: 5242880,
      thumbnailMaxBytes: 2097152,
      maxImagesPerMoc: 20,
      maxPartsListsPerMoc: 5,
      allowedPdfMimeTypes: ['application/pdf'],
      allowedImageMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      allowedPartsListMimeTypes: ['text/csv', 'application/xml'],
      presignTtlMinutes: 15,
      sessionTtlMinutes: 60,
      rateLimitPerDay: 100,
      finalizeLockTtlMinutes: 5,
    }

    const publicConfig = getPublicUploadConfig(fullConfig)

    // Should include public fields
    expect(publicConfig.pdfMaxBytes).toBe(104857600)
    expect(publicConfig.imageMaxBytes).toBe(10485760)
    expect(publicConfig.partsListMaxBytes).toBe(5242880)
    expect(publicConfig.thumbnailMaxBytes).toBe(2097152)
    expect(publicConfig.maxImagesPerMoc).toBe(20)
    expect(publicConfig.maxPartsListsPerMoc).toBe(5)
    expect(publicConfig.allowedPdfMimeTypes).toEqual(['application/pdf'])
    expect(publicConfig.allowedImageMimeTypes).toEqual(['image/jpeg', 'image/png', 'image/webp'])
    expect(publicConfig.allowedPartsListMimeTypes).toEqual(['text/csv', 'application/xml'])
    expect(publicConfig.presignTtlMinutes).toBe(15)
    expect(publicConfig.sessionTtlMinutes).toBe(60)

    // Should NOT include internal fields
    expect(publicConfig).not.toHaveProperty('rateLimitPerDay')
    expect(publicConfig).not.toHaveProperty('finalizeLockTtlMinutes')
  })

  it('preserves all MIME types arrays', () => {
    const fullConfig: UploadConfig = {
      pdfMaxBytes: 1,
      imageMaxBytes: 1,
      partsListMaxBytes: 1,
      thumbnailMaxBytes: 1,
      maxImagesPerMoc: 1,
      maxPartsListsPerMoc: 1,
      allowedPdfMimeTypes: ['application/pdf', 'application/x-pdf'],
      allowedImageMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
      allowedPartsListMimeTypes: ['text/csv', 'application/xml', 'application/json'],
      presignTtlMinutes: 15,
      sessionTtlMinutes: 60,
      rateLimitPerDay: 100,
      finalizeLockTtlMinutes: 5,
    }

    const publicConfig = getPublicUploadConfig(fullConfig)

    expect(publicConfig.allowedPdfMimeTypes).toEqual(['application/pdf', 'application/x-pdf'])
    expect(publicConfig.allowedImageMimeTypes).toEqual([
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
    ])
    expect(publicConfig.allowedPartsListMimeTypes).toEqual([
      'text/csv',
      'application/xml',
      'application/json',
    ])
  })
})
