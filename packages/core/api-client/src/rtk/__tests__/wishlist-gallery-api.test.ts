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
