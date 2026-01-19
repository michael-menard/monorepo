/**
 * Upload Session Schemas Unit Tests
 *
 * Story 3.1.11: Upload Session Endpoint — Validation, Owner Keys, TTL
 *
 * Tests Zod schema validation for upload session endpoints.
 */

import { describe, it, expect } from 'vitest'
import {
  FileCategorySchema,
  FileMetadataSchema,
  CreateSessionRequestSchema,
  RegisterFileRequestSchema,
  CompleteFileRequestSchema,
  UploadPartResponseSchema,
  FinalizeSessionRequestSchema,
  FinalizeSessionResponseSchema,
} from '../schemas'

describe('Upload Session Schemas', () => {
  describe('FileCategorySchema', () => {
    it('accepts valid categories', () => {
      expect(FileCategorySchema.parse('instruction')).toBe('instruction')
      expect(FileCategorySchema.parse('parts-list')).toBe('parts-list')
      expect(FileCategorySchema.parse('image')).toBe('image')
      expect(FileCategorySchema.parse('thumbnail')).toBe('thumbnail')
    })

    it('rejects invalid categories', () => {
      expect(() => FileCategorySchema.parse('invalid')).toThrow()
      expect(() => FileCategorySchema.parse('')).toThrow()
      expect(() => FileCategorySchema.parse('pdf')).toThrow()
    })
  })

  describe('FileMetadataSchema', () => {
    const validFile = {
      category: 'instruction',
      name: 'test.pdf',
      size: 1024,
      type: 'application/pdf',
      ext: 'pdf',
    }

    it('accepts valid file metadata', () => {
      const result = FileMetadataSchema.parse(validFile)
      expect(result.category).toBe('instruction')
      expect(result.name).toBe('test.pdf')
      expect(result.size).toBe(1024)
    })

    it('rejects empty name', () => {
      expect(() => FileMetadataSchema.parse({ ...validFile, name: '' })).toThrow()
    })

    it('rejects negative size', () => {
      expect(() => FileMetadataSchema.parse({ ...validFile, size: -1 })).toThrow()
    })

    it('rejects zero size', () => {
      expect(() => FileMetadataSchema.parse({ ...validFile, size: 0 })).toThrow()
    })

    it('rejects empty type', () => {
      expect(() => FileMetadataSchema.parse({ ...validFile, type: '' })).toThrow()
    })

    it('rejects empty extension', () => {
      expect(() => FileMetadataSchema.parse({ ...validFile, ext: '' })).toThrow()
    })

    it('rejects extension longer than 10 chars', () => {
      expect(() => FileMetadataSchema.parse({ ...validFile, ext: 'verylongext' })).toThrow()
    })
  })

  describe('CreateSessionRequestSchema', () => {
    it('accepts valid request with one file', () => {
      const request = {
        files: [
          { category: 'instruction', name: 'test.pdf', size: 1024, type: 'application/pdf', ext: 'pdf' },
        ],
      }
      const result = CreateSessionRequestSchema.parse(request)
      expect(result.files).toHaveLength(1)
    })

    it('accepts valid request with multiple files', () => {
      const request = {
        files: [
          { category: 'instruction', name: 'test.pdf', size: 1024, type: 'application/pdf', ext: 'pdf' },
          { category: 'image', name: 'photo.jpg', size: 2048, type: 'image/jpeg', ext: 'jpg' },
          { category: 'thumbnail', name: 'thumb.png', size: 512, type: 'image/png', ext: 'png' },
        ],
      }
      const result = CreateSessionRequestSchema.parse(request)
      expect(result.files).toHaveLength(3)
    })

    it('rejects empty files array', () => {
      expect(() => CreateSessionRequestSchema.parse({ files: [] })).toThrow()
    })

    it('rejects missing files field', () => {
      expect(() => CreateSessionRequestSchema.parse({})).toThrow()
    })
  })

  describe('RegisterFileRequestSchema', () => {
    it('accepts valid request', () => {
      const request = {
        category: 'instruction',
        name: 'test.pdf',
        size: 1024,
        type: 'application/pdf',
        ext: 'pdf',
      }
      const result = RegisterFileRequestSchema.parse(request)
      expect(result.category).toBe('instruction')
    })
  })

  describe('CompleteFileRequestSchema', () => {
    it('accepts valid parts array', () => {
      const request = {
        parts: [
          { partNumber: 1, etag: '"abc123"' },
          { partNumber: 2, etag: '"def456"' },
        ],
      }
      const result = CompleteFileRequestSchema.parse(request)
      expect(result.parts).toHaveLength(2)
    })

    it('rejects invalid part number', () => {
      expect(() =>
        CompleteFileRequestSchema.parse({ parts: [{ partNumber: 0, etag: '"abc"' }] }),
      ).toThrow()
    })
  })

  describe('UploadPartResponseSchema', () => {
    it('accepts valid response', () => {
      const response = { partNumber: 1, etag: '"abc123"' }
      const result = UploadPartResponseSchema.parse(response)
      expect(result.partNumber).toBe(1)
      expect(result.etag).toBe('"abc123"')
    })
  })

  describe('FinalizeSessionRequestSchema', () => {
    const validRequest = {
      uploadSessionId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'My LEGO MOC',
    }

    it('accepts valid request with required fields', () => {
      const result = FinalizeSessionRequestSchema.parse(validRequest)
      expect(result.uploadSessionId).toBe(validRequest.uploadSessionId)
      expect(result.title).toBe(validRequest.title)
    })

    it('accepts valid request with all optional fields', () => {
      const request = {
        ...validRequest,
        description: 'A cool MOC',
        tags: ['castle', 'medieval'],
        theme: 'Castle',
      }
      const result = FinalizeSessionRequestSchema.parse(request)
      expect(result.description).toBe('A cool MOC')
      expect(result.tags).toEqual(['castle', 'medieval'])
      expect(result.theme).toBe('Castle')
    })

    it('rejects invalid UUID', () => {
      expect(() =>
        FinalizeSessionRequestSchema.parse({ ...validRequest, uploadSessionId: 'not-a-uuid' }),
      ).toThrow('Invalid upload session ID')
    })

    it('rejects empty title', () => {
      expect(() => FinalizeSessionRequestSchema.parse({ ...validRequest, title: '' })).toThrow(
        'Title is required',
      )
    })

    it('rejects title over 200 chars', () => {
      expect(() =>
        FinalizeSessionRequestSchema.parse({ ...validRequest, title: 'a'.repeat(201) }),
      ).toThrow('Title too long')
    })

    it('rejects description over 5000 chars', () => {
      expect(() =>
        FinalizeSessionRequestSchema.parse({ ...validRequest, description: 'a'.repeat(5001) }),
      ).toThrow('Description too long')
    })

    it('rejects more than 20 tags', () => {
      const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`)
      expect(() => FinalizeSessionRequestSchema.parse({ ...validRequest, tags })).toThrow(
        'Maximum 20 tags allowed',
      )
    })
  })

  describe('FinalizeSessionResponseSchema', () => {
    const validResponse = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'My LEGO MOC',
      slug: 'my-lego-moc',
      description: null,
      status: 'private',
      pdfKey: 'https://bucket.s3.amazonaws.com/path/to/file.pdf',
      imageKeys: ['https://bucket.s3.amazonaws.com/path/to/image.jpg'],
      partsKeys: [],
      tags: null,
      theme: null,
      createdAt: '2024-01-01T00:00:00.000Z',
    }

    it('accepts valid response', () => {
      const result = FinalizeSessionResponseSchema.parse(validResponse)
      expect(result.id).toBe(validResponse.id)
      expect(result.slug).toBe('my-lego-moc')
    })

    it('accepts response with idempotent flag', () => {
      const result = FinalizeSessionResponseSchema.parse({ ...validResponse, idempotent: true })
      expect(result.idempotent).toBe(true)
    })

    it('accepts response with tags and theme', () => {
      const result = FinalizeSessionResponseSchema.parse({
        ...validResponse,
        tags: ['castle', 'medieval'],
        theme: 'Castle',
      })
      expect(result.tags).toEqual(['castle', 'medieval'])
      expect(result.theme).toBe('Castle')
    })
  })
})

