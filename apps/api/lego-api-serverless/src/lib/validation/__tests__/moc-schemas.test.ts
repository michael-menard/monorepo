/**
 * Unit Tests for MOC Request Validation Schemas
 *
 * Tests Zod schemas for MOC CRUD operations.
 * Focus: Input validation, error messages, type coercion.
 */

import { describe, it, expect } from 'vitest'
import {
  CreateMocSchema,
  UpdateMocSchema,
  ListMocsQuerySchema,
  FileUploadMetadataSchema,
  MocIdSchema,
} from '../moc-schemas'
import { mockCreateMocPayloads } from '@/__tests__/fixtures/mock-mocs'
import { mockFileUploadMetadata } from '@/__tests__/fixtures/mock-files'

describe('MOC Request Validation Schemas', () => {
  describe('CreateMocSchema', () => {
    it('should validate valid MOC creation request', () => {
      // Given: Request with all required fields
      const validRequest = mockCreateMocPayloads.validMoc

      // When: Validation runs
      const result = CreateMocSchema.safeParse(validRequest)

      // Then: Passes with no errors
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe(validRequest.title)
        expect(result.data.type).toBe('moc')
      }
    })

    it('should fail when title is missing', () => {
      // Given: Request without title
      const invalidRequest = {
        type: 'moc',
        description: 'Missing title',
      }

      // When: Validation runs
      const result = CreateMocSchema.safeParse(invalidRequest)

      // Then: Returns error for missing title
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('title')
        expect(result.error.issues[0].message).toContain('required')
      }
    })

    it('should fail with invalid type value', () => {
      // Given: Request with invalid type
      const invalidRequest = {
        title: 'Test MOC',
        type: 'invalid-type',
      }

      // When: Validation runs
      const result = CreateMocSchema.safeParse(invalidRequest)

      // Then: Returns error specifying valid types
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('type')
      }
    })

    it('should validate MOC type request', () => {
      // Given: Valid MOC type request
      const mocRequest = {
        title: 'Custom MOC',
        type: 'moc' as const,
        pieceCount: 1000,
      }

      // When: Validation runs
      const result = CreateMocSchema.safeParse(mocRequest)

      // Then: Passes
      expect(result.success).toBe(true)
    })

    it('should validate Set type request', () => {
      // Given: Valid Set type request
      const setRequest = mockCreateMocPayloads.validSet

      // When: Validation runs
      const result = CreateMocSchema.safeParse(setRequest)

      // Then: Passes
      expect(result.success).toBe(true)
    })

    it('should apply default values', () => {
      // Given: Minimal request without optional fields
      const minimalRequest = {
        title: 'Minimal MOC',
        type: 'moc' as const,
      }

      // When: Validation runs
      const result = CreateMocSchema.safeParse(minimalRequest)

      // Then: Defaults applied
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isPublic).toBe(true) // Default value
        expect(result.data.tags).toEqual([]) // Default empty array
      }
    })

    it('should fail when title exceeds max length', () => {
      // Given: Title > 200 characters
      const longTitle = 'a'.repeat(201)
      const invalidRequest = {
        title: longTitle,
        type: 'moc' as const,
      }

      // When: Validation runs
      const result = CreateMocSchema.safeParse(invalidRequest)

      // Then: Fails with length error
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('200')
      }
    })

    it('should fail when tags exceed limit', () => {
      // Given: More than 10 tags
      const request = {
        title: 'Test MOC',
        type: 'moc' as const,
        tags: Array(11).fill('tag'),
      }

      // When: Validation runs
      const result = CreateMocSchema.safeParse(request)

      // Then: Fails with tag limit error
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('10')
      }
    })

    it('should validate estimatedCost format', () => {
      // Given: Valid cost formats
      const validCosts = ['10', '10.00', '99.99', '1234.56']

      validCosts.forEach(cost => {
        const request = {
          title: 'Test',
          type: 'moc' as const,
          estimatedCost: cost,
        }

        // When: Validation runs
        const result = CreateMocSchema.safeParse(request)

        // Then: Passes
        expect(result.success).toBe(true)
      })
    })

    it('should fail with invalid estimatedCost format', () => {
      // Given: Invalid cost formats
      const invalidCosts = ['10.5', '10.123', 'abc', '10.']

      invalidCosts.forEach(cost => {
        const request = {
          title: 'Test',
          type: 'moc' as const,
          estimatedCost: cost,
        }

        // When: Validation runs
        const result = CreateMocSchema.safeParse(request)

        // Then: Fails
        expect(result.success).toBe(false)
      })
    })
  })

  describe('UpdateMocSchema', () => {
    it('should validate partial update with only title', () => {
      // Given: PATCH request with only title
      const partialUpdate = {
        title: 'Updated Title',
      }

      // When: Validation runs
      const result = UpdateMocSchema.safeParse(partialUpdate)

      // Then: Passes (all fields optional for PATCH)
      expect(result.success).toBe(true)
    })

    it('should validate update with multiple fields', () => {
      // Given: Update with multiple fields
      const update = {
        title: 'New Title',
        description: 'New description',
        difficulty: 'advanced' as const,
      }

      // When: Validation runs
      const result = UpdateMocSchema.safeParse(update)

      // Then: Passes
      expect(result.success).toBe(true)
    })

    it('should fail with invalid field type', () => {
      // Given: PATCH with pieceCount as string instead of number
      const invalidUpdate = {
        pieceCount: 'not-a-number',
      }

      // When: Validation runs
      const result = UpdateMocSchema.safeParse(invalidUpdate)

      // Then: Returns 400 with type error
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('pieceCount')
      }
    })

    it('should allow empty update object', () => {
      // Given: Empty update
      const emptyUpdate = {}

      // When: Validation runs
      const result = UpdateMocSchema.safeParse(emptyUpdate)

      // Then: Passes (all fields optional)
      expect(result.success).toBe(true)
    })
  })

  describe('ListMocsQuerySchema', () => {
    it('should validate and parse valid pagination parameters', () => {
      // Given: page=2, limit=10 as strings
      const queryParams = {
        page: '2',
        limit: '10',
      }

      // When: Validation runs
      const result = ListMocsQuerySchema.safeParse(queryParams)

      // Then: Passes with parsed integers
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(2)
        expect(result.data.limit).toBe(10)
        expect(typeof result.data.page).toBe('number')
        expect(typeof result.data.limit).toBe('number')
      }
    })

    it('should apply default values when missing', () => {
      // Given: Empty query parameters
      const queryParams = {}

      // When: Validation runs
      const result = ListMocsQuerySchema.safeParse(queryParams)

      // Then: Applies defaults
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1) // Default
        expect(result.data.limit).toBe(20) // Default
      }
    })

    it('should fail when page is less than 1', () => {
      // Given: page=0
      const queryParams = {
        page: '0',
      }

      // When: Validation runs
      const result = ListMocsQuerySchema.safeParse(queryParams)

      // Then: Fails (page must be >= 1)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('>= 1')
      }
    })

    it('should fail when limit exceeds maximum', () => {
      // Given: limit=1000 (exceeds max 100)
      const queryParams = {
        limit: '1000',
      }

      // When: Validation runs
      const result = ListMocsQuerySchema.safeParse(queryParams)

      // Then: Fails with max limit error
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('100')
      }
    })

    it('should validate search query parameter', () => {
      // Given: Valid search query
      const queryParams = {
        search: 'castle medieval',
      }

      // When: Validation runs
      const result = ListMocsQuerySchema.safeParse(queryParams)

      // Then: Passes
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.search).toBe('castle medieval')
      }
    })

    it('should validate tag filter parameter', () => {
      // Given: Valid tag filter
      const queryParams = {
        tag: 'medieval',
      }

      // When: Validation runs
      const result = ListMocsQuerySchema.safeParse(queryParams)

      // Then: Passes
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tag).toBe('medieval')
      }
    })
  })

  describe('FileUploadMetadataSchema', () => {
    it('should validate valid file upload metadata', () => {
      // Given: Valid PDF upload metadata
      const metadata = mockFileUploadMetadata.validPdf

      // When: Validation runs
      const result = FileUploadMetadataSchema.safeParse(metadata)

      // Then: Passes
      expect(result.success).toBe(true)
    })

    it('should fail when file type is invalid', () => {
      // Given: Invalid fileType
      const metadata = {
        fileType: 'invalid-type',
        mimeType: 'application/pdf',
        size: 1024000,
        filename: 'test.pdf',
      }

      // When: Validation runs
      const result = FileUploadMetadataSchema.safeParse(metadata)

      // Then: Returns 400 with allowed types
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('fileType')
      }
    })

    it('should fail when file size exceeds limit', () => {
      // Given: File size > 10MB
      const metadata = mockFileUploadMetadata.oversized

      // When: Validation runs
      const result = FileUploadMetadataSchema.safeParse(metadata)

      // Then: Returns 400 with size limit error
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('10MB')
      }
    })

    it('should fail when filename is missing', () => {
      // Given: Missing filename
      const metadata = {
        fileType: 'instruction' as const,
        mimeType: 'application/pdf',
        size: 1024000,
      }

      // When: Validation runs
      const result = FileUploadMetadataSchema.safeParse(metadata)

      // Then: Fails
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('filename')
      }
    })
  })

  describe('MocIdSchema', () => {
    it('should validate valid UUID', () => {
      // Given: Valid UUID
      const params = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      }

      // When: Validation runs
      const result = MocIdSchema.safeParse(params)

      // Then: Passes
      expect(result.success).toBe(true)
    })

    it('should validate non-UUID string ID', () => {
      // Given: Non-UUID ID (custom format)
      const params = {
        id: 'moc-basic-123',
      }

      // When: Validation runs
      const result = MocIdSchema.safeParse(params)

      // Then: Passes (allows non-UUID strings too)
      expect(result.success).toBe(true)
    })

    it('should fail with empty ID', () => {
      // Given: Empty ID
      const params = {
        id: '',
      }

      // When: Validation runs
      const result = MocIdSchema.safeParse(params)

      // Then: Fails
      expect(result.success).toBe(false)
    })
  })
})
