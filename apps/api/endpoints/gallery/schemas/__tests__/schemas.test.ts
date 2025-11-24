/**
 * Unit Tests for Gallery Validation Schemas
 *
 * Tests Zod schemas for gallery operations to ensure proper validation.
 * Focus: Input validation, type inference, error messages, boundary conditions.
 */

import { describe, it, expect } from 'vitest'
import {
  CreateGalleryImageSchema,
  UpdateGalleryImageSchema,
  ListGalleryImagesQuerySchema,
  CreateAlbumSchema,
  UpdateAlbumSchema,
  GalleryImageIdSchema,
  GalleryImageSchema,
  GalleryAlbumSchema,
} from '../schemas'

describe('Gallery Validation Schemas', () => {
  describe('CreateGalleryImageSchema', () => {
    it('should validate valid image creation data', () => {
      // Given: Valid image creation data
      const data = {
        title: 'My LEGO Castle',
        description: 'A medieval castle build',
        tags: ['castle', 'medieval', 'architecture'],
      }

      // When: Parsing with schema
      const result = CreateGalleryImageSchema.parse(data)

      // Then: Data is validated successfully
      expect(result.title).toBe('My LEGO Castle')
      expect(result.description).toBe('A medieval castle build')
      expect(result.tags).toEqual(['castle', 'medieval', 'architecture'])
      expect(result.albumId).toBeUndefined()
    })

    it('should validate with albumId', () => {
      // Given: Image creation data with albumId
      const data = {
        title: 'My LEGO Castle',
        albumId: '123e4567-e89b-12d3-a456-426614174000',
      }

      // When: Parsing with schema
      const result = CreateGalleryImageSchema.parse(data)

      // Then: albumId is included
      expect(result.albumId).toBe('123e4567-e89b-12d3-a456-426614174000')
    })

    it('should default tags to empty array', () => {
      // Given: Image data without tags
      const data = {
        title: 'My LEGO Castle',
      }

      // When: Parsing with schema
      const result = CreateGalleryImageSchema.parse(data)

      // Then: tags defaults to empty array
      expect(result.tags).toEqual([])
    })

    it('should reject empty title', () => {
      // Given: Image data with empty title
      const data = {
        title: '',
      }

      // When: Parsing with schema
      // Then: Throws validation error
      expect(() => CreateGalleryImageSchema.parse(data)).toThrow()
    })

    it('should reject title longer than 200 characters', () => {
      // Given: Image data with too long title
      const data = {
        title: 'a'.repeat(201),
      }

      // When: Parsing with schema
      // Then: Throws validation error
      expect(() => CreateGalleryImageSchema.parse(data)).toThrow()
    })

    it('should reject description longer than 2000 characters', () => {
      // Given: Image data with too long description
      const data = {
        title: 'Valid Title',
        description: 'a'.repeat(2001),
      }

      // When: Parsing with schema
      // Then: Throws validation error
      expect(() => CreateGalleryImageSchema.parse(data)).toThrow()
    })

    it('should reject more than 20 tags', () => {
      // Given: Image data with too many tags
      const data = {
        title: 'Valid Title',
        tags: Array(21).fill('tag'),
      }

      // When: Parsing with schema
      // Then: Throws validation error
      expect(() => CreateGalleryImageSchema.parse(data)).toThrow()
    })

    it('should reject invalid UUID for albumId', () => {
      // Given: Image data with invalid UUID
      const data = {
        title: 'Valid Title',
        albumId: 'not-a-uuid',
      }

      // When: Parsing with schema
      // Then: Throws validation error
      expect(() => CreateGalleryImageSchema.parse(data)).toThrow()
    })
  })

  describe('UpdateGalleryImageSchema', () => {
    it('should validate partial update with title only', () => {
      // Given: Partial update data
      const data = {
        title: 'Updated Title',
      }

      // When: Parsing with schema
      const result = UpdateGalleryImageSchema.parse(data)

      // Then: Only title is updated
      expect(result.title).toBe('Updated Title')
      expect(result.description).toBeUndefined()
    })

    it('should validate update with all fields', () => {
      // Given: Complete update data
      const data = {
        title: 'Updated Title',
        description: 'Updated description',
        tags: ['new', 'tags'],
        albumId: '123e4567-e89b-12d3-a456-426614174000',
      }

      // When: Parsing with schema
      const result = UpdateGalleryImageSchema.parse(data)

      // Then: All fields are updated
      expect(result.title).toBe('Updated Title')
      expect(result.description).toBe('Updated description')
      expect(result.tags).toEqual(['new', 'tags'])
      expect(result.albumId).toBe('123e4567-e89b-12d3-a456-426614174000')
    })

    it('should allow null albumId to remove from album', () => {
      // Given: Update data with null albumId
      const data = {
        albumId: null,
      }

      // When: Parsing with schema
      const result = UpdateGalleryImageSchema.parse(data)

      // Then: albumId is null
      expect(result.albumId).toBeNull()
    })

    it('should allow empty object for partial updates', () => {
      // Given: Empty update data (all fields optional)
      const data = {}

      // When: Parsing with schema
      const result = UpdateGalleryImageSchema.parse(data)

      // Then: Accepts empty object (no fields to update)
      expect(result).toEqual({})
    })
  })

  describe('ListGalleryImagesQuerySchema', () => {
    it('should parse query parameters with defaults', () => {
      // Given: Empty query params
      const params = {}

      // When: Parsing with schema
      const result = ListGalleryImagesQuerySchema.parse(params)

      // Then: Defaults are applied
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
      expect(result.search).toBeUndefined()
      expect(result.albumId).toBeUndefined()
    })

    it('should parse string page and limit to numbers', () => {
      // Given: Query params with string numbers
      const params = {
        page: '3',
        limit: '50',
      }

      // When: Parsing with schema
      const result = ListGalleryImagesQuerySchema.parse(params)

      // Then: Strings are converted to numbers
      expect(result.page).toBe(3)
      expect(result.limit).toBe(50)
    })

    it('should accept search parameter', () => {
      // Given: Query params with search
      const params = {
        search: 'castle',
      }

      // When: Parsing with schema
      const result = ListGalleryImagesQuerySchema.parse(params)

      // Then: Search is included
      expect(result.search).toBe('castle')
    })

    it('should accept albumId parameter', () => {
      // Given: Query params with albumId
      const params = {
        albumId: '123e4567-e89b-12d3-a456-426614174000',
      }

      // When: Parsing with schema
      const result = ListGalleryImagesQuerySchema.parse(params)

      // Then: albumId is validated
      expect(result.albumId).toBe('123e4567-e89b-12d3-a456-426614174000')
    })

    it('should reject page less than 1', () => {
      // Given: Invalid page number
      const params = {
        page: '0',
      }

      // When: Parsing with schema
      // Then: Throws validation error
      expect(() => ListGalleryImagesQuerySchema.parse(params)).toThrow()
    })

    it('should reject limit greater than 100', () => {
      // Given: Invalid limit
      const params = {
        limit: '101',
      }

      // When: Parsing with schema
      // Then: Throws validation error
      expect(() => ListGalleryImagesQuerySchema.parse(params)).toThrow()
    })

    it('should reject search longer than 200 characters', () => {
      // Given: Too long search query
      const params = {
        search: 'a'.repeat(201),
      }

      // When: Parsing with schema
      // Then: Throws validation error
      expect(() => ListGalleryImagesQuerySchema.parse(params)).toThrow()
    })
  })

  describe('GalleryImageIdSchema', () => {
    it('should validate valid UUID', () => {
      // Given: Valid image ID object
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
      }

      // When: Parsing with schema
      const result = GalleryImageIdSchema.parse(data)

      // Then: ID is validated
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000')
    })

    it('should reject invalid UUID', () => {
      // Given: Invalid UUID
      const data = {
        id: 'not-a-uuid',
      }

      // When: Parsing with schema
      // Then: Throws validation error
      expect(() => GalleryImageIdSchema.parse(data)).toThrow()
    })

    it('should reject missing id', () => {
      // Given: Empty object
      const data = {}

      // When: Parsing with schema
      // Then: Throws validation error
      expect(() => GalleryImageIdSchema.parse(data)).toThrow()
    })
  })

  describe('CreateAlbumSchema', () => {
    it('should validate valid album creation data', () => {
      // Given: Valid album data
      const data = {
        title: 'My Castle Collection',
        description: 'All my castle builds',
      }

      // When: Parsing with schema
      const result = CreateAlbumSchema.parse(data)

      // Then: Data is validated successfully
      expect(result.title).toBe('My Castle Collection')
      expect(result.description).toBe('All my castle builds')
    })

    it('should validate without description', () => {
      // Given: Album data without description
      const data = {
        title: 'My Collection',
      }

      // When: Parsing with schema
      const result = CreateAlbumSchema.parse(data)

      // Then: Description is optional
      expect(result.title).toBe('My Collection')
      expect(result.description).toBeUndefined()
    })

    it('should reject empty title', () => {
      // Given: Empty title
      const data = {
        title: '',
      }

      // When: Parsing with schema
      // Then: Throws validation error
      expect(() => CreateAlbumSchema.parse(data)).toThrow()
    })
  })

  describe('UpdateAlbumSchema', () => {
    it('should validate partial album update', () => {
      // Given: Partial update data
      const data = {
        title: 'Updated Album Title',
      }

      // When: Parsing with schema
      const result = UpdateAlbumSchema.parse(data)

      // Then: Only title is updated
      expect(result.title).toBe('Updated Album Title')
      expect(result.description).toBeUndefined()
    })

    it('should validate with coverImageId', () => {
      // Given: Update data with coverImageId
      const data = {
        coverImageId: '123e4567-e89b-12d3-a456-426614174000',
      }

      // When: Parsing with schema
      const result = UpdateAlbumSchema.parse(data)

      // Then: coverImageId is validated
      expect(result.coverImageId).toBe('123e4567-e89b-12d3-a456-426614174000')
    })

    it('should allow null coverImageId', () => {
      // Given: Update data with null coverImageId
      const data = {
        coverImageId: null,
      }

      // When: Parsing with schema
      const result = UpdateAlbumSchema.parse(data)

      // Then: coverImageId is null
      expect(result.coverImageId).toBeNull()
    })
  })

  describe('GalleryImageSchema (Response)', () => {
    it('should validate complete gallery image response', () => {
      // Given: Complete gallery image object (with Date objects)
      const now = new Date()
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        title: 'My Castle',
        description: 'A medieval castle',
        imageUrl: 'https://example.com/images/castle.jpg',
        thumbnailUrl: 'https://example.com/images/thumbs/castle.jpg',
        tags: ['castle', 'medieval'],
        albumId: null,
        flagged: false,
        createdAt: now,
        lastUpdatedAt: now,
      }

      // When: Parsing with schema
      const result = GalleryImageSchema.parse(data)

      // Then: All fields are validated
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(result.userId).toBe('user-123')
      expect(result.title).toBe('My Castle')
      expect(result.imageUrl).toBe('https://example.com/images/castle.jpg')
      expect(result.tags).toEqual(['castle', 'medieval'])
      expect(result.createdAt).toEqual(now)
      expect(result.lastUpdatedAt).toEqual(now)
    })

    it('should validate image with albumId', () => {
      // Given: Gallery image with albumId (with Date objects)
      const now = new Date()
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        title: 'My Castle',
        imageUrl: 'https://example.com/images/castle.jpg',
        albumId: '987e6543-e21b-12d3-a456-426614174000',
        tags: [],
        flagged: false,
        createdAt: now,
        lastUpdatedAt: now,
      }

      // When: Parsing with schema
      const result = GalleryImageSchema.parse(data)

      // Then: albumId is validated
      expect(result.albumId).toBe('987e6543-e21b-12d3-a456-426614174000')
    })
  })

  describe('GalleryAlbumSchema (Response)', () => {
    it('should validate complete album response', () => {
      // Given: Complete album object (with Date objects)
      const now = new Date()
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        title: 'My Castle Collection',
        description: 'All my castle builds',
        coverImageId: '987e6543-e21b-12d3-a456-426614174000',
        imageCount: 15,
        createdAt: now,
        lastUpdatedAt: now,
      }

      // When: Parsing with schema
      const result = GalleryAlbumSchema.parse(data)

      // Then: All fields are validated
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(result.userId).toBe('user-123')
      expect(result.title).toBe('My Castle Collection')
      expect(result.imageCount).toBe(15)
      expect(result.createdAt).toEqual(now)
      expect(result.lastUpdatedAt).toEqual(now)
    })

    it('should validate album without coverImageId', () => {
      // Given: Album without cover image (with Date objects)
      const now = new Date()
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        title: 'Empty Album',
        coverImageId: null,
        imageCount: 0,
        createdAt: now,
        lastUpdatedAt: now,
      }

      // When: Parsing with schema
      const result = GalleryAlbumSchema.parse(data)

      // Then: coverImageId is null
      expect(result.coverImageId).toBeNull()
      expect(result.imageCount).toBe(0)
    })
  })
})
