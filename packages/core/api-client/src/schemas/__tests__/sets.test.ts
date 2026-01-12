import { describe, it, expect } from 'vitest'

import {
  SetImageSchema,
  SetSchema,
  CreateSetSchema,
  UpdateSetSchema,
  SetListQuerySchema,
  SetListResponseSchema,
} from '../sets'

describe('Sets Schemas', () => {
  describe('SetImageSchema', () => {
    it('accepts valid image data', () => {
      const result = SetImageSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        position: 0,
      })

      expect(result.imageUrl).toBe('https://example.com/image.jpg')
      expect(result.position).toBe(0)
    })

    it('rejects invalid URL or negative position', () => {
      expect(() =>
        SetImageSchema.parse({
          id: '550e8400-e29b-41d4-a716-446655440000',
          imageUrl: 'not-a-url',
          thumbnailUrl: null,
          position: 0,
        }),
      ).toThrow()

      expect(() =>
        SetImageSchema.parse({
          id: '550e8400-e29b-41d4-a716-446655440000',
          imageUrl: 'https://example.com/image.jpg',
          thumbnailUrl: null,
          position: -1,
        }),
      ).toThrow()
    })
  })

  describe('CreateSetSchema', () => {
    it('accepts minimal valid create input', () => {
      const result = CreateSetSchema.parse({
        title: 'LEGO Castle',
      })

      expect(result.title).toBe('LEGO Castle')
      expect(result.isBuilt).toBe(false)
      expect(result.quantity).toBe(1)
      expect(result.tags).toEqual([])
    })

    it('accepts full valid create input', () => {
      const result = CreateSetSchema.parse({
        title: 'Millennium Falcon',
        setNumber: '75192',
        store: 'LEGO',
        sourceUrl: 'https://lego.com/product/75192',
        pieceCount: 7541,
        releaseDate: '2017-10-01T00:00:00.000Z',
        theme: 'Star Wars',
        tags: ['UCS', 'Expert'],
        notes: 'Day one purchase',
        isBuilt: false,
        quantity: 2,
        purchasePrice: 849.99,
        tax: 70.12,
        shipping: 0,
        purchaseDate: '2017-10-02T00:00:00.000Z',
      })

      expect(result.setNumber).toBe('75192')
      expect(result.pieceCount).toBe(7541)
      expect(result.quantity).toBe(2)
      expect(result.purchasePrice).toBe(849.99)
    })

    it('rejects missing required title', () => {
      expect(() => CreateSetSchema.parse({})).toThrow()
      expect(() => CreateSetSchema.parse({ title: '' })).toThrow()
    })

    it('rejects invalid numeric constraints', () => {
      expect(() =>
        CreateSetSchema.parse({
          title: 'Test',
          pieceCount: -1,
        }),
      ).toThrow()

      expect(() =>
        CreateSetSchema.parse({
          title: 'Test',
          quantity: 0,
        }),
      ).toThrow()

      expect(() =>
        CreateSetSchema.parse({
          title: 'Test',
          purchasePrice: -10,
        }),
      ).toThrow()
    })

    it('rejects too many tags or overly long tags', () => {
      expect(() =>
        CreateSetSchema.parse({
          title: 'Test',
          tags: Array.from({ length: 11 }, (_, i) => `tag-${i}`),
        }),
      ).toThrow()

      expect(() =>
        CreateSetSchema.parse({
          title: 'Test',
          tags: ['x'.repeat(31)],
        }),
      ).toThrow()
    })
  })

  describe('UpdateSetSchema', () => {
    it('allows partial updates', () => {
      const result = UpdateSetSchema.parse({
        title: 'Updated Title',
        isBuilt: true,
      })

      expect(result.title).toBe('Updated Title')
      expect(result.isBuilt).toBe(true)
    })

    it('accepts empty object', () => {
      const result = UpdateSetSchema.parse({})
      expect(result).toEqual({})
    })

    it('still enforces field constraints', () => {
      expect(() =>
        UpdateSetSchema.parse({
          quantity: 0,
        }),
      ).toThrow()
    })
  })

  describe('SetSchema', () => {
    const baseSet = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      userId: '550e8400-e29b-41d4-a716-446655440001',
      title: 'LEGO Castle',
      setNumber: '10305',
      store: 'LEGO',
      sourceUrl: 'https://lego.com/product/10305',
      pieceCount: 4514,
      releaseDate: '2022-08-01T00:00:00.000Z',
      theme: 'Castle',
      tags: ['Castle', 'Icons'],
      notes: 'Classic castle',
      isBuilt: false,
      quantity: 1,
      purchasePrice: 399.99,
      tax: 30.5,
      shipping: 0,
      purchaseDate: '2022-08-15T00:00:00.000Z',
      wishlistItemId: '550e8400-e29b-41d4-a716-446655440002',
      images: [],
      createdAt: '2024-12-27T00:00:00.000Z',
      updatedAt: '2024-12-27T00:00:00.000Z',
    }

    it('validates a complete Set record', () => {
      const result = SetSchema.parse(baseSet)

      expect(result.id).toBe(baseSet.id)
      expect(result.title).toBe('LEGO Castle')
      expect(result.pieceCount).toBe(4514)
    })

    it('accepts null for optional fields', () => {
      const result = SetSchema.parse({
        ...baseSet,
        setNumber: null,
        store: null,
        sourceUrl: null,
        pieceCount: null,
        releaseDate: null,
        theme: null,
        notes: null,
        purchasePrice: null,
        tax: null,
        shipping: null,
        purchaseDate: null,
        wishlistItemId: null,
      })

      expect(result.setNumber).toBeNull()
      expect(result.purchasePrice).toBeNull()
    })

    it('rejects invalid UUID or negative quantity', () => {
      expect(() =>
        SetSchema.parse({
          ...baseSet,
          id: 'not-a-uuid',
        }),
      ).toThrow()

      expect(() =>
        SetSchema.parse({
          ...baseSet,
          quantity: 0,
        }),
      ).toThrow()
    })
  })

  describe('SetListQuerySchema', () => {
    it('provides defaults for pagination and sorting', () => {
      const result = SetListQuerySchema.parse({})

      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
      expect(result.sortField).toBe('createdAt')
      expect(result.sortDirection).toBe('desc')
    })

    it('coerces string numbers and accepts filters', () => {
      const result = SetListQuerySchema.parse({
        page: '3',
        limit: '50',
        isBuilt: true,
        theme: 'Star Wars',
        tags: ['UCS'],
      })

      expect(result.page).toBe(3)
      expect(result.limit).toBe(50)
      expect(result.isBuilt).toBe(true)
      expect(result.theme).toBe('Star Wars')
    })

    it('rejects limit over 100 or page < 1', () => {
      expect(() => SetListQuerySchema.parse({ limit: 150 })).toThrow()
      expect(() => SetListQuerySchema.parse({ page: 0 })).toThrow()
    })
  })

  describe('SetListResponseSchema', () => {
    it('validates list response with items', () => {
      const result = SetListResponseSchema.parse({
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            userId: '550e8400-e29b-41d4-a716-446655440001',
            title: 'Test Set',
            setNumber: null,
            store: null,
            sourceUrl: null,
            pieceCount: null,
            releaseDate: null,
            theme: null,
            tags: [],
            notes: null,
            isBuilt: false,
            quantity: 1,
            purchasePrice: null,
            tax: null,
            shipping: null,
            purchaseDate: null,
            wishlistItemId: null,
            images: [],
            createdAt: '2024-12-27T00:00:00.000Z',
            updatedAt: '2024-12-27T00:00:00.000Z',
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
        filters: {
          availableThemes: ['Star Wars'],
          availableTags: ['UCS'],
        },
      })

      expect(result.items).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
      expect(result.filters?.availableThemes).toContain('Star Wars')
    })
  })
})
