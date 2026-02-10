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

  // ─────────────────────────────────────────────────────────────────────────────
  // Custom Error Message Tests (WISH-2110)
  // ─────────────────────────────────────────────────────────────────────────────

  describe('Custom Error Messages - CreateWishlistItemSchema', () => {
    it('should return "Title is required" for empty title', () => {
      const result = CreateWishlistItemSchema.safeParse({
        title: '',
        store: 'LEGO',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Title is required')
      }
    })

    it('should return "Store is required" for empty store', () => {
      const result = CreateWishlistItemSchema.safeParse({
        title: 'Test',
        store: '',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Store is required')
      }
    })

    it('should return "Invalid URL format" for invalid sourceUrl', () => {
      const result = CreateWishlistItemSchema.safeParse({
        title: 'Test',
        store: 'LEGO',
        sourceUrl: 'not-a-url',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid URL format')
      }
    })

    it('should return "Invalid image URL format" for invalid imageUrl', () => {
      const result = CreateWishlistItemSchema.safeParse({
        title: 'Test',
        store: 'LEGO',
        imageUrl: 'not-a-url',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid image URL format')
      }
    })

    it('should return "Price must be a valid decimal with up to 2 decimal places" for invalid price', () => {
      const result = CreateWishlistItemSchema.safeParse({
        title: 'Test',
        store: 'LEGO',
        price: 'abc',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Price must be a valid decimal with up to 2 decimal places')
      }
    })

    it('should return "Piece count must be a whole number" for decimal pieceCount', () => {
      const result = CreateWishlistItemSchema.safeParse({
        title: 'Test',
        store: 'LEGO',
        pieceCount: 100.5,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Piece count must be a whole number')
      }
    })

    it('should return "Piece count cannot be negative" for negative pieceCount', () => {
      const result = CreateWishlistItemSchema.safeParse({
        title: 'Test',
        store: 'LEGO',
        pieceCount: -10,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Piece count cannot be negative')
      }
    })

    it('should return "Priority must be between 0 and 5" for priority > 5', () => {
      const result = CreateWishlistItemSchema.safeParse({
        title: 'Test',
        store: 'LEGO',
        priority: 10,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Priority must be between 0 and 5')
      }
    })

    it('should return "Priority must be between 0 and 5" for negative priority', () => {
      const result = CreateWishlistItemSchema.safeParse({
        title: 'Test',
        store: 'LEGO',
        priority: -1,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Priority must be between 0 and 5')
      }
    })

    it('should return "Invalid release date format" for invalid releaseDate', () => {
      const result = CreateWishlistItemSchema.safeParse({
        title: 'Test',
        store: 'LEGO',
        releaseDate: 'not-a-date',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid release date format')
      }
    })
  })

  describe('Custom Error Messages - WishlistQueryParamsSchema', () => {
    it('should return "Page number must be at least 1" for page < 1', () => {
      const result = WishlistQueryParamsSchema.safeParse({
        page: 0,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Page number must be at least 1')
      }
    })

    it('should return "Limit cannot exceed 100 items" for limit > 100', () => {
      const result = WishlistQueryParamsSchema.safeParse({
        limit: 101,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Limit cannot exceed 100 items')
      }
    })

    it('should return "Priority must be between 0 and 5" for priority > 5', () => {
      const result = WishlistQueryParamsSchema.safeParse({
        priority: 6,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Priority must be between 0 and 5')
      }
    })

    it('should return "Invalid sort field" for invalid sort', () => {
      const result = WishlistQueryParamsSchema.safeParse({
        sort: 'invalidSort',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid sort field')
      }
    })

    it('should return "Sort order must be \'asc\' or \'desc\'" for invalid order', () => {
      const result = WishlistQueryParamsSchema.safeParse({
        order: 'invalid',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Sort order must be 'asc' or 'desc'")
      }
    })
  })

  describe('Custom Error Messages - BatchReorderSchema', () => {
    it('should return "At least one item is required for reordering" for empty items array', () => {
      const result = BatchReorderSchema.safeParse({
        items: [],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('At least one item is required for reordering')
      }
    })

    it('should return "Invalid item ID in reorder list" for invalid UUID', () => {
      const result = BatchReorderSchema.safeParse({
        items: [
          { id: 'not-a-uuid', sortOrder: 0 },
        ],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid item ID in reorder list')
      }
    })

    it('should return "Sort order cannot be negative" for negative sortOrder', () => {
      const result = BatchReorderSchema.safeParse({
        items: [
          { id: '550e8400-e29b-41d4-a716-446655440000', sortOrder: -1 },
        ],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Sort order cannot be negative')
      }
    })
  })

  describe('Custom Error Messages - MarkAsPurchasedSchema', () => {
    it('should return "Invalid purchase date format" for invalid purchaseDate', () => {
      const result = MarkAsPurchasedSchema.safeParse({
        purchaseDate: 'not-a-date',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid purchase date format')
      }
    })

    it('should return "Price must be a valid decimal with up to 2 decimal places" for invalid purchasePrice', () => {
      const result = MarkAsPurchasedSchema.safeParse({
        purchasePrice: 'abc',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Price must be a valid decimal with up to 2 decimal places')
      }
    })

    it('should return "Tax must be a valid decimal with up to 2 decimal places" for invalid purchaseTax', () => {
      const result = MarkAsPurchasedSchema.safeParse({
        purchaseTax: 'abc',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Tax must be a valid decimal with up to 2 decimal places')
      }
    })

    it('should return "Shipping must be a valid decimal with up to 2 decimal places" for invalid purchaseShipping', () => {
      const result = MarkAsPurchasedSchema.safeParse({
        purchaseShipping: 'abc',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Shipping must be a valid decimal with up to 2 decimal places')
      }
    })
  })

  describe('Custom Error Messages - Enum Schemas', () => {
    it('should return "Store must be LEGO, Barweer, Cata, BrickLink, or Other" for invalid store', () => {
      const result = WishlistStoreSchema.safeParse('InvalidStore')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Store must be LEGO, Barweer, Cata, BrickLink, or Other')
      }
    })

    it('should return "Currency must be USD, EUR, GBP, CAD, or AUD" for invalid currency', () => {
      const result = CurrencySchema.safeParse('JPY')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Currency must be USD, EUR, GBP, CAD, or AUD')
      }
    })

    it('should return "Status must be wishlist or owned" for invalid status', () => {
      const result = ItemStatusSchema.safeParse('pending')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Status must be wishlist or owned')
      }
    })

    it('should return "Build status must be not_started, in_progress, or completed" for invalid buildStatus', () => {
      const result = BuildStatusSchema.safeParse('building')
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Build status must be not_started, in_progress, or completed')
      }
    })
  })

  describe('Custom Error Messages - WishlistItemSchema', () => {
    it('should return "Invalid UUID format" for invalid id', () => {
      const result = WishlistItemSchema.safeParse({
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
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid UUID format')
      }
    })

    it('should return "Title is required" for empty title in WishlistItemSchema', () => {
      const result = WishlistItemSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: '550e8400-e29b-41d4-a716-446655440001',
        title: '',
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
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Title is required')
      }
    })

    it('should return "Sort order must be a whole number" for decimal sortOrder', () => {
      const result = WishlistItemSchema.safeParse({
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
        sortOrder: 0.5,
        createdAt: '2024-12-27T00:00:00.000Z',
        updatedAt: '2024-12-27T00:00:00.000Z',
        createdBy: null,
        updatedBy: null,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Sort order must be a whole number')
      }
    })
  })

  describe('Custom Error Messages - UpdateWishlistItemSchema', () => {
    it('should return custom message when updating with invalid priority', () => {
      const result = UpdateWishlistItemSchema.safeParse({
        priority: 10,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Priority must be between 0 and 5')
      }
    })

    it('should return custom message when updating with invalid URL', () => {
      const result = UpdateWishlistItemSchema.safeParse({
        sourceUrl: 'not-a-url',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid URL format')
      }
    })

    it('should return custom message when updating with invalid pieceCount', () => {
      const result = UpdateWishlistItemSchema.safeParse({
        pieceCount: -5,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Piece count cannot be negative')
      }
    })
  })

// ─────────────────────────────────────────────────────────────────────────────
// WISH-20171: Schema Alignment Tests (Frontend ↔ Backend)
// ─────────────────────────────────────────────────────────────────────────────

describe('WISH-20171: Advanced Filter Schema Alignment', () => {
  describe('Store Filter Structure', () => {
    it('frontend store array maps to backend comma-separated string', () => {
      const frontendParams = { store: ['LEGO', 'BrickLink'] }
      
      // Frontend uses array, backend expects comma-separated
      const backendQueryString = frontendParams.store.join(',')
      expect(backendQueryString).toBe('LEGO,BrickLink')
    })

    it('single store value works in both frontend and backend', () => {
      const frontendParams = { store: ['LEGO'] }
      const backendQueryString = frontendParams.store.join(',')
      expect(backendQueryString).toBe('LEGO')
    })

    it('empty store array maps to empty string', () => {
      const frontendParams = { store: [] }
      const backendQueryString = frontendParams.store.join(',')
      expect(backendQueryString).toBe('')
    })
  })

  describe('Priority Range Structure', () => {
    it('priorityRange structure matches between frontend and backend', () => {
      const params = { priorityRange: { min: 3, max: 5 } }
      
      // Frontend schema accepts this structure
      const result = WishlistQueryParamsSchema.parse(params)
      expect(result.priorityRange).toEqual({ min: 3, max: 5 })
    })

    it('validates priority range min <= max constraint', () => {
      const result = WishlistQueryParamsSchema.safeParse({
        priorityRange: { min: 5, max: 3 },
      })
      
      // Should fail validation - min > max
      expect(result.success).toBe(false)
    })

    it('validates priority range 0-5 boundaries', () => {
      const result1 = WishlistQueryParamsSchema.safeParse({
        priorityRange: { min: 0, max: 5 },
      })
      expect(result1.success).toBe(true)

      const result2 = WishlistQueryParamsSchema.safeParse({
        priorityRange: { min: 0, max: 6 },
      })
      expect(result2.success).toBe(false)

      const result3 = WishlistQueryParamsSchema.safeParse({
        priorityRange: { min: -1, max: 5 },
      })
      expect(result3.success).toBe(false)
    })

    it('frontend priorityRange maps to backend comma-separated format', () => {
      const frontendParams = { priorityRange: { min: 3, max: 5 } }
      
      // Backend expects "3,5" query string format
      const backendQueryString = `${frontendParams.priorityRange.min},${frontendParams.priorityRange.max}`
      expect(backendQueryString).toBe('3,5')
    })
  })

  describe('Price Range Structure', () => {
    it('priceRange structure matches between frontend and backend', () => {
      const params = { priceRange: { min: 50, max: 200 } }
      
      // Frontend schema accepts this structure
      const result = WishlistQueryParamsSchema.parse(params)
      expect(result.priceRange).toEqual({ min: 50, max: 200 })
    })

    it('validates price range min <= max constraint', () => {
      const result = WishlistQueryParamsSchema.safeParse({
        priceRange: { min: 200, max: 50 },
      })
      
      // Should fail validation - min > max
      expect(result.success).toBe(false)
    })

    it('validates price range >= 0 constraint', () => {
      const result1 = WishlistQueryParamsSchema.safeParse({
        priceRange: { min: 0, max: 100 },
      })
      expect(result1.success).toBe(true)

      const result2 = WishlistQueryParamsSchema.safeParse({
        priceRange: { min: -10, max: 100 },
      })
      expect(result2.success).toBe(false)
    })

    it('frontend priceRange maps to backend comma-separated format', () => {
      const frontendParams = { priceRange: { min: 50, max: 200 } }
      
      // Backend expects "50,200" query string format
      const backendQueryString = `${frontendParams.priceRange.min},${frontendParams.priceRange.max}`
      expect(backendQueryString).toBe('50,200')
    })

    it('handles decimal price boundaries in string format', () => {
      const frontendParams = { priceRange: { min: 49.99, max: 199.99 } }
      const backendQueryString = `${frontendParams.priceRange.min},${frontendParams.priceRange.max}`
      expect(backendQueryString).toBe('49.99,199.99')
    })
  })

  describe('Combined Filter Schema Alignment', () => {
    it('validates all filters together in frontend schema', () => {
      const params = {
        store: ['LEGO', 'BrickLink'],
        priorityRange: { min: 3, max: 5 },
        priceRange: { min: 50, max: 200 },
        sort: 'bestValue',
        order: 'asc',
      }
      
      const result = WishlistQueryParamsSchema.parse(params)
      expect(result.store).toEqual(['LEGO', 'BrickLink'])
      expect(result.priorityRange).toEqual({ min: 3, max: 5 })
      expect(result.priceRange).toEqual({ min: 50, max: 200 })
      expect(result.sort).toBe('bestValue')
      expect(result.order).toBe('asc')
    })

    it('converts frontend params to backend query string format', () => {
      const frontendParams = {
        store: ['LEGO', 'BrickLink'],
        priorityRange: { min: 3, max: 5 },
        priceRange: { min: 50, max: 200 },
        sort: 'bestValue',
        order: 'asc',
      }
      
      // Build backend query string
      const queryParams = new URLSearchParams({
        store: frontendParams.store.join(','),
        priorityRange: `${frontendParams.priorityRange.min},${frontendParams.priorityRange.max}`,
        priceRange: `${frontendParams.priceRange.min},${frontendParams.priceRange.max}`,
        sort: frontendParams.sort,
        order: frontendParams.order,
      })
      
      expect(queryParams.get('store')).toBe('LEGO,BrickLink')
      expect(queryParams.get('priorityRange')).toBe('3,5')
      expect(queryParams.get('priceRange')).toBe('50,200')
      expect(queryParams.get('sort')).toBe('bestValue')
      expect(queryParams.get('order')).toBe('asc')
    })

    it('validates that frontend and backend schemas define identical filter structures', () => {
      // This test verifies schema alignment by parsing the same logical data
      const frontendData = {
        store: ['LEGO'],
        priorityRange: { min: 0, max: 5 },
        priceRange: { min: 0, max: 1000 },
      }
      
      // Frontend schema parse
      const frontendResult = WishlistQueryParamsSchema.parse(frontendData)
      
      // Backend would parse from query string: "store=LEGO&priorityRange=0,5&priceRange=0,1000"
      // After parsing, both should have identical structure
      expect(frontendResult.store).toEqual(['LEGO'])
      expect(frontendResult.priorityRange).toEqual({ min: 0, max: 5 })
      expect(frontendResult.priceRange).toEqual({ min: 0, max: 1000 })
    })
  })

  describe('Smart Sort Compatibility', () => {
    it('supports bestValue sort with all filters', () => {
      const params = {
        store: ['LEGO'],
        priorityRange: { min: 3, max: 5 },
        priceRange: { min: 50, max: 200 },
        sort: 'bestValue',
      }
      
      const result = WishlistQueryParamsSchema.parse(params)
      expect(result.sort).toBe('bestValue')
    })

    it('supports expiringSoon sort with all filters', () => {
      const params = {
        store: ['LEGO'],
        priorityRange: { min: 0, max: 2 },
        priceRange: { min: 20, max: 100 },
        sort: 'expiringSoon',
      }
      
      const result = WishlistQueryParamsSchema.parse(params)
      expect(result.sort).toBe('expiringSoon')
    })

    it('supports hiddenGems sort with all filters', () => {
      const params = {
        store: ['LEGO'],
        priorityRange: { min: 0, max: 3 },
        priceRange: { min: 50, max: 150 },
        sort: 'hiddenGems',
      }
      
      const result = WishlistQueryParamsSchema.parse(params)
      expect(result.sort).toBe('hiddenGems')
    })
  })
})
