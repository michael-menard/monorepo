/**
 * Wishlist Gallery API Tests
 *
 * Tests for the RTK Query wishlist gallery API.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  WishlistListResponseSchema,
  WishlistItemSchema,
  WishlistQueryParamsSchema,
  CreateWishlistItemSchema,
} from '../../schemas/wishlist'

// Mock data for testing
const mockWishlistItem = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: '123e4567-e89b-12d3-a456-426614174001',
  title: 'LEGO Star Wars Millennium Falcon',
  store: 'LEGO',
  setNumber: '75192',
  sourceUrl: 'https://lego.com/product/75192',
  imageUrl: 'https://example.com/image.jpg',
  price: '849.99',
  currency: 'USD',
  pieceCount: 7541,
  releaseDate: '2023-01-01T00:00:00.000Z',
  tags: ['Star Wars', 'UCS'],
  priority: 5,
  notes: 'Dream set!',
  sortOrder: 1,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-15T00:00:00.000Z',
}

const mockListResponse = {
  items: [mockWishlistItem],
  pagination: {
    page: 1,
    limit: 20,
    total: 1,
    totalPages: 1,
  },
  counts: {
    total: 1,
    byStore: { LEGO: 1 },
  },
  filters: {
    availableTags: ['Star Wars', 'UCS'],
    availableStores: ['LEGO'],
  },
}

describe('WishlistListResponseSchema', () => {
  it('should validate a valid list response', () => {
    const result = WishlistListResponseSchema.safeParse(mockListResponse)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items).toHaveLength(1)
      expect(result.data.pagination.page).toBe(1)
      expect(result.data.counts?.total).toBe(1)
    }
  })

  it('should validate response without optional fields', () => {
    const minimalResponse = {
      items: [mockWishlistItem],
      pagination: {
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    }
    const result = WishlistListResponseSchema.safeParse(minimalResponse)
    expect(result.success).toBe(true)
  })

  it('should reject invalid pagination', () => {
    const invalidResponse = {
      items: [mockWishlistItem],
      pagination: {
        page: 'not a number',
        limit: 20,
        total: 1,
        totalPages: 1,
      },
    }
    const result = WishlistListResponseSchema.safeParse(invalidResponse)
    expect(result.success).toBe(false)
  })
})

describe('WishlistItemSchema', () => {
  it('should validate a valid wishlist item', () => {
    const result = WishlistItemSchema.safeParse(mockWishlistItem)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('LEGO Star Wars Millennium Falcon')
      expect(result.data.priority).toBe(5)
    }
  })

  it('should require title and store', () => {
    const itemWithoutTitle = { ...mockWishlistItem, title: '' }
    const result = WishlistItemSchema.safeParse(itemWithoutTitle)
    expect(result.success).toBe(false)
  })

  it('should validate nullable fields', () => {
    const itemWithNulls = {
      ...mockWishlistItem,
      setNumber: null,
      sourceUrl: null,
      imageUrl: null,
      price: null,
      pieceCount: null,
      releaseDate: null,
      notes: null,
    }
    const result = WishlistItemSchema.safeParse(itemWithNulls)
    expect(result.success).toBe(true)
  })

  it('should validate priority range 0-5', () => {
    const validPriority = { ...mockWishlistItem, priority: 0 }
    expect(WishlistItemSchema.safeParse(validPriority).success).toBe(true)

    const invalidPriority = { ...mockWishlistItem, priority: 6 }
    expect(WishlistItemSchema.safeParse(invalidPriority).success).toBe(false)
  })
})

describe('WishlistQueryParamsSchema', () => {
  it('should validate empty query params with defaults', () => {
    const result = WishlistQueryParamsSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(1)
      expect(result.data.limit).toBe(20)
    }
  })

  it('should validate all query params', () => {
    const params = {
      q: 'Star Wars',
      store: 'LEGO',
      tags: 'UCS,Space',
      priority: 5,
      sort: 'createdAt',
      order: 'desc',
      page: 2,
      limit: 10,
    }
    const result = WishlistQueryParamsSchema.safeParse(params)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.q).toBe('Star Wars')
      expect(result.data.sort).toBe('createdAt')
      expect(result.data.page).toBe(2)
    }
  })

  it('should coerce string numbers to integers', () => {
    const params = {
      page: '3',
      limit: '50',
      priority: '2',
    }
    const result = WishlistQueryParamsSchema.safeParse(params)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.page).toBe(3)
      expect(result.data.limit).toBe(50)
      expect(result.data.priority).toBe(2)
    }
  })

  it('should validate sort enum', () => {
    const validSort = { sort: 'title' }
    expect(WishlistQueryParamsSchema.safeParse(validSort).success).toBe(true)

    const invalidSort = { sort: 'invalid' }
    expect(WishlistQueryParamsSchema.safeParse(invalidSort).success).toBe(false)
  })

  it('should validate order enum', () => {
    const validOrder = { order: 'asc' }
    expect(WishlistQueryParamsSchema.safeParse(validOrder).success).toBe(true)

    const invalidOrder = { order: 'sideways' }
    expect(WishlistQueryParamsSchema.safeParse(invalidOrder).success).toBe(false)
  })

  it('should enforce limit bounds', () => {
    const tooLow = { limit: 0 }
    expect(WishlistQueryParamsSchema.safeParse(tooLow).success).toBe(false)

    const tooHigh = { limit: 101 }
    expect(WishlistQueryParamsSchema.safeParse(tooHigh).success).toBe(false)
  })
})

/**
 * CreateWishlistItemSchema Tests
 * Story wish-2002: Add Item Flow
 */
describe('CreateWishlistItemSchema', () => {
  it('should validate a valid create request with required fields only', () => {
    const minimalItem = {
      title: 'Medieval Castle',
      store: 'LEGO',
    }
    const result = CreateWishlistItemSchema.safeParse(minimalItem)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Medieval Castle')
      expect(result.data.store).toBe('LEGO')
      expect(result.data.currency).toBe('USD') // default
      expect(result.data.priority).toBe(0) // default
      expect(result.data.tags).toEqual([]) // default
    }
  })

  it('should validate a valid create request with all fields', () => {
    const fullItem = {
      title: 'Medieval Castle',
      store: 'LEGO',
      setNumber: '10305',
      sourceUrl: 'https://lego.com/product/10305',
      imageUrl: 'https://example.com/image.jpg',
      price: '399.99',
      currency: 'USD',
      pieceCount: 4514,
      priority: 5,
      notes: 'Birthday gift idea',
      tags: ['Castle', 'Creator Expert'],
    }
    const result = CreateWishlistItemSchema.safeParse(fullItem)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Medieval Castle')
      expect(result.data.setNumber).toBe('10305')
      expect(result.data.price).toBe('399.99')
      expect(result.data.pieceCount).toBe(4514)
    }
  })

  it('should require title', () => {
    const noTitle = {
      store: 'LEGO',
    }
    const result = CreateWishlistItemSchema.safeParse(noTitle)
    expect(result.success).toBe(false)
  })

  it('should require store', () => {
    const noStore = {
      title: 'Medieval Castle',
    }
    const result = CreateWishlistItemSchema.safeParse(noStore)
    expect(result.success).toBe(false)
  })

  it('should validate URL format for sourceUrl', () => {
    const invalidUrl = {
      title: 'Medieval Castle',
      store: 'LEGO',
      sourceUrl: 'not-a-valid-url',
    }
    const result = CreateWishlistItemSchema.safeParse(invalidUrl)
    expect(result.success).toBe(false)

    const validUrl = {
      title: 'Medieval Castle',
      store: 'LEGO',
      sourceUrl: 'https://lego.com/product/10305',
    }
    const result2 = CreateWishlistItemSchema.safeParse(validUrl)
    expect(result2.success).toBe(true)
  })

  it('should allow empty string for sourceUrl', () => {
    const emptyUrl = {
      title: 'Medieval Castle',
      store: 'LEGO',
      sourceUrl: '',
    }
    const result = CreateWishlistItemSchema.safeParse(emptyUrl)
    expect(result.success).toBe(true)
  })

  it('should validate price format', () => {
    const validPrices = ['0', '99.99', '1234.56', '0.01']
    validPrices.forEach(price => {
      const item = { title: 'Test', store: 'LEGO', price }
      const result = CreateWishlistItemSchema.safeParse(item)
      expect(result.success).toBe(true)
    })

    const invalidPrices = ['abc', '99.999', '-10', '10.']
    invalidPrices.forEach(price => {
      const item = { title: 'Test', store: 'LEGO', price }
      const result = CreateWishlistItemSchema.safeParse(item)
      expect(result.success).toBe(false)
    })
  })

  it('should validate priority range 0-5', () => {
    const validPriorities = [0, 1, 2, 3, 4, 5]
    validPriorities.forEach(priority => {
      const item = { title: 'Test', store: 'LEGO', priority }
      const result = CreateWishlistItemSchema.safeParse(item)
      expect(result.success).toBe(true)
    })

    const invalidPriorities = [-1, 6, 10]
    invalidPriorities.forEach(priority => {
      const item = { title: 'Test', store: 'LEGO', priority }
      const result = CreateWishlistItemSchema.safeParse(item)
      expect(result.success).toBe(false)
    })
  })

  it('should validate pieceCount as non-negative integer', () => {
    const validCounts = [0, 1, 100, 10000]
    validCounts.forEach(pieceCount => {
      const item = { title: 'Test', store: 'LEGO', pieceCount }
      const result = CreateWishlistItemSchema.safeParse(item)
      expect(result.success).toBe(true)
    })

    const invalidCounts = [-1, 1.5]
    invalidCounts.forEach(pieceCount => {
      const item = { title: 'Test', store: 'LEGO', pieceCount }
      const result = CreateWishlistItemSchema.safeParse(item)
      expect(result.success).toBe(false)
    })
  })

  it('should accept tags as array of strings', () => {
    const withTags = {
      title: 'Test',
      store: 'LEGO',
      tags: ['Star Wars', 'UCS', 'Collector'],
    }
    const result = CreateWishlistItemSchema.safeParse(withTags)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toEqual(['Star Wars', 'UCS', 'Collector'])
    }
  })
})
