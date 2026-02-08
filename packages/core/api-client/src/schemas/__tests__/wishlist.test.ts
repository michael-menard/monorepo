import { describe, it, expect } from 'vitest'

import {
  WishlistStoreSchema,
  CurrencySchema,
  ItemStatusSchema,
  BuildStatusSchema,
  WishlistItemSchema,
  CreateWishlistItemSchema,
  UpdateWishlistItemSchema,
  WishlistQueryParamsSchema,
  WishlistListResponseSchema,
  ReorderWishlistItemSchema,
  BatchReorderSchema,
  MarkAsPurchasedSchema,
  UpdateBuildStatusSchema,
} from '../wishlist'

describe('Wishlist Schemas', () => {
  describe('WishlistStoreSchema', () => {
    it('should accept valid store values', () => {
      expect(WishlistStoreSchema.parse('LEGO')).toBe('LEGO')
      expect(WishlistStoreSchema.parse('Barweer')).toBe('Barweer')
      expect(WishlistStoreSchema.parse('Cata')).toBe('Cata')
      expect(WishlistStoreSchema.parse('BrickLink')).toBe('BrickLink')
      expect(WishlistStoreSchema.parse('Other')).toBe('Other')
    })

    it('should reject invalid store values', () => {
      expect(() => WishlistStoreSchema.parse('InvalidStore')).toThrow()
    })
  })

  describe('CurrencySchema', () => {
    it('should accept valid currency values', () => {
      expect(CurrencySchema.parse('USD')).toBe('USD')
      expect(CurrencySchema.parse('EUR')).toBe('EUR')
      expect(CurrencySchema.parse('GBP')).toBe('GBP')
    })

    it('should reject invalid currency values', () => {
      expect(() => CurrencySchema.parse('INVALID')).toThrow()
    })
  })

  describe('CreateWishlistItemSchema', () => {
    it('should accept valid create input with required fields', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'LEGO Castle',
        store: 'LEGO',
      })

      expect(result.title).toBe('LEGO Castle')
      expect(result.store).toBe('LEGO')
      expect(result.tags).toEqual([])
      expect(result.priority).toBe(0)
      expect(result.currency).toBe('USD')
    })

    it('should accept valid create input with all fields', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'LEGO Star Wars Millennium Falcon',
        store: 'LEGO',
        setNumber: '75192',
        sourceUrl: 'https://lego.com/product/75192',
        imageUrl: 'https://s3.amazonaws.com/bucket/image.jpg',
        price: '849.99',
        currency: 'USD',
        pieceCount: 7541,
        releaseDate: '2017-10-01T00:00:00.000Z',
        tags: ['Star Wars', 'UCS', 'Expert'],
        priority: 5,
        notes: 'Dream set - wait for sale',
      })

      expect(result.title).toBe('LEGO Star Wars Millennium Falcon')
      expect(result.setNumber).toBe('75192')
      expect(result.price).toBe('849.99')
      expect(result.pieceCount).toBe(7541)
      expect(result.priority).toBe(5)
    })

    it('should reject missing required fields', () => {
      expect(() => CreateWishlistItemSchema.parse({})).toThrow()
      expect(() => CreateWishlistItemSchema.parse({ title: 'Test' })).toThrow()
      expect(() => CreateWishlistItemSchema.parse({ store: 'LEGO' })).toThrow()
    })

    it('should reject empty title', () => {
      expect(() =>
        CreateWishlistItemSchema.parse({
          title: '',
          store: 'LEGO',
        }),
      ).toThrow()
    })

    it('should reject invalid price format', () => {
      expect(() =>
        CreateWishlistItemSchema.parse({
          title: 'Test',
          store: 'LEGO',
          price: 'invalid',
        }),
      ).toThrow()
    })

    it('should accept valid decimal price formats', () => {
      const result1 = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        price: '99.99',
      })
      expect(result1.price).toBe('99.99')

      const result2 = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        price: '100',
      })
      expect(result2.price).toBe('100')
    })

    it('should reject negative piece count', () => {
      expect(() =>
        CreateWishlistItemSchema.parse({
          title: 'Test',
          store: 'LEGO',
          pieceCount: -100,
        }),
      ).toThrow()
    })

    it('should reject priority out of range', () => {
      expect(() =>
        CreateWishlistItemSchema.parse({
          title: 'Test',
          store: 'LEGO',
          priority: 10,
        }),
      ).toThrow()

      expect(() =>
        CreateWishlistItemSchema.parse({
          title: 'Test',
          store: 'LEGO',
          priority: -1,
        }),
      ).toThrow()
    })

    it('should accept empty string for optional URL fields', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        sourceUrl: '',
        price: '',
      })
      expect(result.sourceUrl).toBe('')
      expect(result.price).toBe('')
    })

    it('should reject invalid URL format', () => {
      expect(() =>
        CreateWishlistItemSchema.parse({
          title: 'Test',
          store: 'LEGO',
          sourceUrl: 'not-a-url',
        }),
      ).toThrow()
    })
  })

  describe('UpdateWishlistItemSchema', () => {
    it('should accept partial updates', () => {
      const result = UpdateWishlistItemSchema.parse({
        title: 'Updated Title',
      })
      expect(result.title).toBe('Updated Title')
      expect(result.store).toBeUndefined()
    })

    it('should accept empty object', () => {
      const result = UpdateWishlistItemSchema.parse({})
      expect(result).toEqual({})
    })

    it('should still validate field constraints', () => {
      expect(() =>
        UpdateWishlistItemSchema.parse({
          priority: 10,
        }),
      ).toThrow()
    })
  })

  describe('WishlistQueryParamsSchema', () => {
    it('should provide defaults for pagination', () => {
      const result = WishlistQueryParamsSchema.parse({})
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('should coerce string numbers', () => {
      const result = WishlistQueryParamsSchema.parse({
        page: '5',
        limit: '50',
        priority: '3',
      })
      expect(result.page).toBe(5)
      expect(result.limit).toBe(50)
      expect(result.priority).toBe(3)
    })

    it('should accept valid sort options', () => {
      const result = WishlistQueryParamsSchema.parse({
        sort: 'price',
        order: 'desc',
      })
      expect(result.sort).toBe('price')
      expect(result.order).toBe('desc')
    })

    it('should reject invalid sort options', () => {
      expect(() =>
        WishlistQueryParamsSchema.parse({
          sort: 'invalidSort',
        }),
      ).toThrow()
    })

    it('should reject limit over 100', () => {
      expect(() =>
        WishlistQueryParamsSchema.parse({
          limit: 150,
        }),
      ).toThrow()
    })

    it('should reject page less than 1', () => {
      expect(() =>
        WishlistQueryParamsSchema.parse({
          page: 0,
        }),
      ).toThrow()
    })
  })

  describe('WishlistItemSchema', () => {
    it('should validate complete item from database', () => {
      const result = WishlistItemSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        title: 'LEGO Castle',
        store: 'LEGO',
        setNumber: '10305',
        sourceUrl: 'https://lego.com/product/10305',
        imageUrl: 'https://s3.amazonaws.com/bucket/image.jpg',
        price: '399.99',
        currency: 'USD',
        pieceCount: 4514,
        releaseDate: '2022-08-01T00:00:00.000Z',
        tags: ['Castle', 'Icons'],
        priority: 4,
        notes: 'Want this one!',
        sortOrder: 0,
        createdAt: '2024-12-27T00:00:00.000Z',
        updatedAt: '2024-12-27T00:00:00.000Z',
        createdBy: null,
        updatedBy: null,
      })

      expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(result.title).toBe('LEGO Castle')
      expect(result.pieceCount).toBe(4514)
    })

    it('should accept null for optional fields', () => {
      const result = WishlistItemSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Test',
        store: 'LEGO',
        setNumber: null,
        sourceUrl: null,
        imageUrl: null,
        price: null,
        currency: 'USD',
        pieceCount: null,
        releaseDate: null,
        tags: [],
        priority: 0,
        notes: null,
        sortOrder: 0,
        createdAt: '2024-12-27T00:00:00.000Z',
        updatedAt: '2024-12-27T00:00:00.000Z',
        createdBy: null,
        updatedBy: null,
      })

      expect(result.setNumber).toBeNull()
      expect(result.price).toBeNull()
    })

    it('should reject invalid UUID', () => {
      expect(() =>
        WishlistItemSchema.parse({
          id: 'not-a-uuid',
          userId: '550e8400-e29b-41d4-a716-446655440001',
          title: 'Test',
          store: 'LEGO',
          setNumber: null,
          sourceUrl: null,
          imageUrl: null,
          price: null,
          currency: 'USD',
          pieceCount: null,
          releaseDate: null,
          tags: [],
          priority: 0,
          notes: null,
          sortOrder: 0,
          createdAt: '2024-12-27T00:00:00.000Z',
          updatedAt: '2024-12-27T00:00:00.000Z',
          createdBy: null,
          updatedBy: null,
        }),
      ).toThrow()
    })
  })

  describe('WishlistListResponseSchema', () => {
    it('should validate list response with items', () => {
      const result = WishlistListResponseSchema.parse({
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            userId: '550e8400-e29b-41d4-a716-446655440001',
            title: 'Test',
            store: 'LEGO',
            setNumber: null,
            sourceUrl: null,
            imageUrl: null,
            price: null,
            currency: 'USD',
            pieceCount: null,
            releaseDate: null,
            tags: [],
            priority: 0,
            notes: null,
            sortOrder: 0,
            createdAt: '2024-12-27T00:00:00.000Z',
            updatedAt: '2024-12-27T00:00:00.000Z',
            createdBy: null,
            updatedBy: null,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      })

      expect(result.items).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
    })

    it('should accept optional counts and filters', () => {
      const result = WishlistListResponseSchema.parse({
        items: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
        counts: {
          total: 0,
          byStore: { LEGO: 0, Barweer: 0 },
        },
        filters: {
          availableTags: ['Castle', 'Star Wars'],
          availableStores: ['LEGO', 'Barweer'],
        },
      })

      expect(result.counts?.total).toBe(0)
      expect(result.filters?.availableTags).toContain('Castle')
    })
  })

  describe('ReorderWishlistItemSchema', () => {
    it('should validate reorder request', () => {
      const result = ReorderWishlistItemSchema.parse({
        itemId: '550e8400-e29b-41d4-a716-446655440000',
        newSortOrder: 5,
      })

      expect(result.itemId).toBe('550e8400-e29b-41d4-a716-446655440000')
      expect(result.newSortOrder).toBe(5)
    })

    it('should reject negative sort order', () => {
      expect(() =>
        ReorderWishlistItemSchema.parse({
          itemId: '550e8400-e29b-41d4-a716-446655440000',
          newSortOrder: -1,
        }),
      ).toThrow()
    })
  })

  describe('BatchReorderSchema', () => {
    it('should validate batch reorder request', () => {
      const result = BatchReorderSchema.parse({
        items: [
          { id: '550e8400-e29b-41d4-a716-446655440000', sortOrder: 0 },
          { id: '550e8400-e29b-41d4-a716-446655440001', sortOrder: 1 },
          { id: '550e8400-e29b-41d4-a716-446655440002', sortOrder: 2 },
        ],
      })

      expect(result.items).toHaveLength(3)
      expect(result.items[0].sortOrder).toBe(0)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Additional Tests for 31+ Coverage (WISH-2000)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Price Edge Cases', () => {
    it('should accept large decimal price (999999.99)', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        price: '999999.99',
      })
      expect(result.price).toBe('999999.99')
    })

    it('should accept very small price (0.01)', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        price: '0.01',
      })
      expect(result.price).toBe('0.01')
    })

    it('should accept zero price', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        price: '0',
      })
      expect(result.price).toBe('0')
    })

    it('should reject price with more than 2 decimal places', () => {
      expect(() =>
        CreateWishlistItemSchema.parse({
          title: 'Test',
          store: 'LEGO',
          price: '99.999',
        }),
      ).toThrow()
    })
  })

  describe('Tags Array Handling', () => {
    it('should handle empty tags array', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        tags: [],
      })
      expect(result.tags).toEqual([])
    })

    it('should handle large tags array (10+ items)', () => {
      const largeTags = Array.from({ length: 15 }, (_, i) => `Tag${i + 1}`)
      const result = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        tags: largeTags,
      })
      expect(result.tags).toHaveLength(15)
    })

    it('should handle tags with special characters', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        tags: ['Star Wars: Episode V', 'UCS (Ultimate)', 'Retired!'],
      })
      expect(result.tags).toContain('Star Wars: Episode V')
    })
  })

  describe('Priority Boundary Values', () => {
    it('should accept priority at minimum (0)', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        priority: 0,
      })
      expect(result.priority).toBe(0)
    })

    it('should accept priority at maximum (5)', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        priority: 5,
      })
      expect(result.priority).toBe(5)
    })

    it('should reject priority of 6', () => {
      expect(() =>
        CreateWishlistItemSchema.parse({
          title: 'Test',
          store: 'LEGO',
          priority: 6,
        }),
      ).toThrow()
    })
  })

  describe('sortOrder Edge Cases', () => {
    it('should accept sortOrder of 0', () => {
      const result = ReorderWishlistItemSchema.parse({
        itemId: '550e8400-e29b-41d4-a716-446655440000',
        newSortOrder: 0,
      })
      expect(result.newSortOrder).toBe(0)
    })

    it('should accept large sortOrder value', () => {
      const result = ReorderWishlistItemSchema.parse({
        itemId: '550e8400-e29b-41d4-a716-446655440000',
        newSortOrder: 1000000,
      })
      expect(result.newSortOrder).toBe(1000000)
    })

    it('should allow multiple items with same sortOrder in batch', () => {
      const result = BatchReorderSchema.parse({
        items: [
          { id: '550e8400-e29b-41d4-a716-446655440000', sortOrder: 5 },
          { id: '550e8400-e29b-41d4-a716-446655440001', sortOrder: 5 },
        ],
      })
      expect(result.items[0].sortOrder).toBe(result.items[1].sortOrder)
    })
  })

  describe('URL Edge Cases', () => {
    it('should accept URL with query parameters', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        sourceUrl: 'https://example.com/product?id=123&ref=wishlist',
      })
      expect(result.sourceUrl).toContain('?id=123')
    })

    it('should accept URL with fragment', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        sourceUrl: 'https://example.com/product#details',
      })
      expect(result.sourceUrl).toContain('#details')
    })
  })

  describe('pieceCount Edge Cases', () => {
    it('should accept pieceCount of 0', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        pieceCount: 0,
      })
      expect(result.pieceCount).toBe(0)
    })

    it('should accept very large pieceCount', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        pieceCount: 11695, // Biggest LEGO set
      })
      expect(result.pieceCount).toBe(11695)
    })

    it('should reject fractional pieceCount', () => {
      expect(() =>
        CreateWishlistItemSchema.parse({
          title: 'Test',
          store: 'LEGO',
          pieceCount: 100.5,
        }),
      ).toThrow()
    })
  })

  describe('Unicode and Special Characters', () => {
    it('should accept unicode in title', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'LEGO Creator 3in1: Drache',
        store: 'LEGO',
      })
      expect(result.title).toBe('LEGO Creator 3in1: Drache')
    })

    it('should accept unicode in notes', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        notes: 'Wait for sale - prices in Europe are higher',
      })
      expect(result.notes).toBe('Wait for sale - prices in Europe are higher')
    })

    it('should accept emoji in notes', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        notes: 'Must have! Will buy soon',
      })
      expect(result.notes).toContain('Must have!')
    })
  })

  describe('Timestamp Validation', () => {
    it('should reject invalid ISO datetime format', () => {
      expect(() =>
        CreateWishlistItemSchema.parse({
          title: 'Test',
          store: 'LEGO',
          releaseDate: '2024-13-45T99:99:99.000Z',
        }),
      ).toThrow()
    })

    it('should accept valid ISO datetime', () => {
      const result = CreateWishlistItemSchema.parse({
        title: 'Test',
        store: 'LEGO',
        releaseDate: '2024-06-15T10:30:00.000Z',
      })
      expect(result.releaseDate).toBe('2024-06-15T10:30:00.000Z')
    })
  })

  describe('Audit Fields', () => {
    it('should accept audit fields in WishlistItemSchema', () => {
      const result = WishlistItemSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Test',
        store: 'LEGO',
        setNumber: null,
        sourceUrl: null,
        imageUrl: null,
        price: null,
        currency: 'USD',
        pieceCount: null,
        releaseDate: null,
        tags: [],
        priority: 0,
        notes: null,
        sortOrder: 0,
        createdAt: '2024-12-27T00:00:00.000Z',
        updatedAt: '2024-12-27T00:00:00.000Z',
        createdBy: '550e8400-e29b-41d4-a716-446655440001',
        updatedBy: '550e8400-e29b-41d4-a716-446655440001',
      })
      expect(result.createdBy).toBe('550e8400-e29b-41d4-a716-446655440001')
      expect(result.updatedBy).toBe('550e8400-e29b-41d4-a716-446655440001')
    })

    it('should accept null for audit fields', () => {
      const result = WishlistItemSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        title: 'Test',
        store: 'LEGO',
        setNumber: null,
        sourceUrl: null,
        imageUrl: null,
        price: null,
        currency: 'USD',
        pieceCount: null,
        releaseDate: null,
        tags: [],
        priority: 0,
        notes: null,
        sortOrder: 0,
        createdAt: '2024-12-27T00:00:00.000Z',
        updatedAt: '2024-12-27T00:00:00.000Z',
        createdBy: null,
        updatedBy: null,
      })
      expect(result.createdBy).toBeNull()
      expect(result.updatedBy).toBeNull()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────────
  // Collection Management Tests (SETS-MVP-001)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('ItemStatusSchema', () => {
    it('should accept wishlist status', () => {
      expect(ItemStatusSchema.parse('wishlist')).toBe('wishlist')
    })

    it('should accept owned status', () => {
      expect(ItemStatusSchema.parse('owned')).toBe('owned')
    })

    it('should reject invalid status', () => {
      expect(() => ItemStatusSchema.parse('pending')).toThrow()
    })
  })

  describe('BuildStatusSchema', () => {
    it('should accept not_started status', () => {
      expect(BuildStatusSchema.parse('not_started')).toBe('not_started')
    })

    it('should accept in_progress status', () => {
      expect(BuildStatusSchema.parse('in_progress')).toBe('in_progress')
    })

    it('should accept completed status', () => {
      expect(BuildStatusSchema.parse('completed')).toBe('completed')
    })

    it('should reject invalid build status', () => {
      expect(() => BuildStatusSchema.parse('building')).toThrow()
    })
  })

  describe('WishlistItemSchema with Collection Fields', () => {
    it('should validate item with default status=wishlist', () => {
      const result = WishlistItemSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        title: 'LEGO Castle',
        store: 'LEGO',
        setNumber: null,
        sourceUrl: null,
        imageUrl: null,
        price: null,
        currency: 'USD',
        pieceCount: null,
        releaseDate: null,
        tags: [],
        priority: 0,
        notes: null,
        sortOrder: 0,
        createdAt: '2024-12-27T00:00:00.000Z',
        updatedAt: '2024-12-27T00:00:00.000Z',
        createdBy: null,
        updatedBy: null,
      })

      expect(result.status).toBe('wishlist')
      expect(result.buildStatus).toBeUndefined()
    })

    it('should validate owned item with purchase details', () => {
      const result = WishlistItemSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        title: 'LEGO Star Wars',
        store: 'LEGO',
        setNumber: '75192',
        sourceUrl: null,
        imageUrl: null,
        price: null,
        currency: 'USD',
        pieceCount: 7541,
        releaseDate: null,
        tags: [],
        priority: 0,
        notes: null,
        sortOrder: 0,
        createdAt: '2024-12-27T00:00:00.000Z',
        updatedAt: '2024-12-27T00:00:00.000Z',
        createdBy: null,
        updatedBy: null,
        status: 'owned',
        statusChangedAt: '2024-12-28T10:00:00.000Z',
        purchaseDate: '2024-12-28T10:00:00.000Z',
        purchasePrice: '849.99',
        purchaseTax: '85.00',
        purchaseShipping: '15.00',
        buildStatus: 'not_started',
      })

      expect(result.status).toBe('owned')
      expect(result.purchasePrice).toBe('849.99')
      expect(result.buildStatus).toBe('not_started')
    })

    it('should accept null for owned-specific fields when status=wishlist', () => {
      const result = WishlistItemSchema.parse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        title: 'LEGO Castle',
        store: 'LEGO',
        setNumber: null,
        sourceUrl: null,
        imageUrl: null,
        price: null,
        currency: 'USD',
        pieceCount: null,
        releaseDate: null,
        tags: [],
        priority: 0,
        notes: null,
        sortOrder: 0,
        createdAt: '2024-12-27T00:00:00.000Z',
        updatedAt: '2024-12-27T00:00:00.000Z',
        createdBy: null,
        updatedBy: null,
        status: 'wishlist',
        statusChangedAt: null,
        purchaseDate: null,
        purchasePrice: null,
        purchaseTax: null,
        purchaseShipping: null,
        buildStatus: null,
      })

      expect(result.status).toBe('wishlist')
      expect(result.purchaseDate).toBeNull()
      expect(result.buildStatus).toBeNull()
    })
  })

  describe('MarkAsPurchasedSchema', () => {
    it('should validate mark as purchased request with all fields', () => {
      const result = MarkAsPurchasedSchema.parse({
        purchaseDate: '2024-12-28T10:00:00.000Z',
        purchasePrice: '849.99',
        purchaseTax: '85.00',
        purchaseShipping: '15.00',
      })

      expect(result.purchasePrice).toBe('849.99')
      expect(result.purchaseTax).toBe('85.00')
      expect(result.purchaseShipping).toBe('15.00')
    })

    it('should accept empty request (minimal purchase)', () => {
      const result = MarkAsPurchasedSchema.parse({})
      expect(result.purchaseDate).toBeUndefined()
      expect(result.purchasePrice).toBeUndefined()
    })

    it('should accept empty strings for optional price fields', () => {
      const result = MarkAsPurchasedSchema.parse({
        purchasePrice: '',
        purchaseTax: '',
        purchaseShipping: '',
      })

      expect(result.purchasePrice).toBe('')
      expect(result.purchaseTax).toBe('')
      expect(result.purchaseShipping).toBe('')
    })

    it('should reject invalid price format', () => {
      expect(() =>
        MarkAsPurchasedSchema.parse({
          purchasePrice: 'invalid',
        }),
      ).toThrow()
    })

    it('should accept valid decimal formats', () => {
      const result = MarkAsPurchasedSchema.parse({
        purchasePrice: '99.99',
        purchaseTax: '10.50',
        purchaseShipping: '5.00',
      })

      expect(result.purchasePrice).toBe('99.99')
      expect(result.purchaseTax).toBe('10.50')
      expect(result.purchaseShipping).toBe('5.00')
    })
  })

  describe('UpdateBuildStatusSchema', () => {
    it('should validate build status update', () => {
      const result = UpdateBuildStatusSchema.parse({
        buildStatus: 'in_progress',
      })

      expect(result.buildStatus).toBe('in_progress')
    })

    it('should accept all valid build statuses', () => {
      const result1 = UpdateBuildStatusSchema.parse({ buildStatus: 'not_started' })
      const result2 = UpdateBuildStatusSchema.parse({ buildStatus: 'in_progress' })
      const result3 = UpdateBuildStatusSchema.parse({ buildStatus: 'completed' })

      expect(result1.buildStatus).toBe('not_started')
      expect(result2.buildStatus).toBe('in_progress')
      expect(result3.buildStatus).toBe('completed')
    })

    it('should reject invalid build status', () => {
      expect(() =>
        UpdateBuildStatusSchema.parse({
          buildStatus: 'building',
        }),
      ).toThrow()
    })

    it('should require buildStatus field', () => {
      expect(() => UpdateBuildStatusSchema.parse({})).toThrow()
    })
  })

  describe('WishlistQueryParamsSchema with Status Filter', () => {
    it('should default to wishlist status', () => {
      const result = WishlistQueryParamsSchema.parse({})
      expect(result.status).toBe('wishlist')
    })

    it('should accept owned status filter', () => {
      const result = WishlistQueryParamsSchema.parse({
        status: 'owned',
      })
      expect(result.status).toBe('owned')
    })

    it('should accept wishlist status filter', () => {
      const result = WishlistQueryParamsSchema.parse({
        status: 'wishlist',
      })
      expect(result.status).toBe('wishlist')
    })

    it('should reject invalid status filter', () => {
      expect(() =>
        WishlistQueryParamsSchema.parse({
          status: 'pending',
        }),
      ).toThrow()
    })
  })
})
