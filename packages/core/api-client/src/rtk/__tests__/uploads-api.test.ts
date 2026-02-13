/**
 * Uploads API Tests
 *
 * Tests for the presigned URL generation schemas and API configuration.
 * Story BUGF-032: Frontend Integration for Presigned URL Upload
 */

import { describe, it, expect } from 'vitest'
import {
  GeneratePresignedUrlRequestSchema,
  GeneratePresignedUrlResponseSchema,
  FileCategorySchema,
} from '../../schemas/uploads'

// Mock data
const mockPresignedUrlRequest = {
  fileName: 'instructions.pdf',
  mimeType: 'application/pdf',
  fileSize: 2_048_000,
  category: 'instruction' as const,
}

const mockPresignedUrlResponse = {
  presignedUrl: 'https://s3.amazonaws.com/bucket/key?X-Amz-Signature=abc123',
  key: 'uploads/user123/instructions.pdf',
  expiresIn: 900,
  expiresAt: '2026-02-11T21:15:00.000Z',
}

describe('FileCategorySchema', () => {
  it('should validate all valid categories', () => {
    const categories = ['instruction', 'parts-list', 'thumbnail', 'image']
    for (const category of categories) {
      const result = FileCategorySchema.safeParse(category)
      expect(result.success).toBe(true)
    }
  })

  it('should reject invalid category', () => {
    const result = FileCategorySchema.safeParse('video')
    expect(result.success).toBe(false)
  })
})

describe('GeneratePresignedUrlRequestSchema', () => {
  it('should validate a valid request', () => {
    const result = GeneratePresignedUrlRequestSchema.safeParse(mockPresignedUrlRequest)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.fileName).toBe('instructions.pdf')
      expect(result.data.mimeType).toBe('application/pdf')
      expect(result.data.fileSize).toBe(2_048_000)
      expect(result.data.category).toBe('instruction')
    }
  })

  it('should require all fields', () => {
    const incomplete = { fileName: 'test.pdf' }
    const result = GeneratePresignedUrlRequestSchema.safeParse(incomplete)
    expect(result.success).toBe(false)
  })

  it('should reject empty fileName', () => {
    const result = GeneratePresignedUrlRequestSchema.safeParse({
      ...mockPresignedUrlRequest,
      fileName: '',
    })
    expect(result.success).toBe(false)
  })

  it('should reject empty mimeType', () => {
    const result = GeneratePresignedUrlRequestSchema.safeParse({
      ...mockPresignedUrlRequest,
      mimeType: '',
    })
    expect(result.success).toBe(false)
  })

  it('should reject zero fileSize', () => {
    const result = GeneratePresignedUrlRequestSchema.safeParse({
      ...mockPresignedUrlRequest,
      fileSize: 0,
    })
    expect(result.success).toBe(false)
  })

  it('should reject negative fileSize', () => {
    const result = GeneratePresignedUrlRequestSchema.safeParse({
      ...mockPresignedUrlRequest,
      fileSize: -100,
    })
    expect(result.success).toBe(false)
  })

  it('should reject non-integer fileSize', () => {
    const result = GeneratePresignedUrlRequestSchema.safeParse({
      ...mockPresignedUrlRequest,
      fileSize: 1024.5,
    })
    expect(result.success).toBe(false)
  })

  it('should validate all file categories', () => {
    const categories = ['instruction', 'parts-list', 'thumbnail', 'image']
    for (const category of categories) {
      const result = GeneratePresignedUrlRequestSchema.safeParse({
        ...mockPresignedUrlRequest,
        category,
      })
      expect(result.success).toBe(true)
    }
  })
})

describe('GeneratePresignedUrlResponseSchema', () => {
  it('should validate a valid response', () => {
    const result = GeneratePresignedUrlResponseSchema.safeParse(mockPresignedUrlResponse)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.presignedUrl).toContain('s3.amazonaws.com')
      expect(result.data.key).toBe('uploads/user123/instructions.pdf')
      expect(result.data.expiresIn).toBe(900)
      expect(result.data.expiresAt).toBe('2026-02-11T21:15:00.000Z')
    }
  })

  it('should require valid URL for presignedUrl', () => {
    const result = GeneratePresignedUrlResponseSchema.safeParse({
      ...mockPresignedUrlResponse,
      presignedUrl: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  it('should require positive integer for expiresIn', () => {
    const result = GeneratePresignedUrlResponseSchema.safeParse({
      ...mockPresignedUrlResponse,
      expiresIn: 0,
    })
    expect(result.success).toBe(false)
  })

  it('should require valid datetime for expiresAt', () => {
    const result = GeneratePresignedUrlResponseSchema.safeParse({
      ...mockPresignedUrlResponse,
      expiresAt: 'not-a-date',
    })
    expect(result.success).toBe(false)
  })

  it('should require key field', () => {
    const { key: _, ...withoutKey } = mockPresignedUrlResponse
    const result = GeneratePresignedUrlResponseSchema.safeParse(withoutKey)
    expect(result.success).toBe(false)
  })

  it('should require all fields', () => {
    const result = GeneratePresignedUrlResponseSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
