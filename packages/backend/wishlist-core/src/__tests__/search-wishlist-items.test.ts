import { describe, it, expect, vi } from 'vitest'
import { searchWishlistItems } from '../search-wishlist-items.js'

// Mock schema
const mockSchema = {
  wishlistItems: {
    id: 'id',
    userId: 'user_id',
    title: 'title',
    store: 'store',
    setNumber: 'set_number',
    sourceUrl: 'source_url',
    imageUrl: 'image_url',
    price: 'price',
    currency: 'currency',
    pieceCount: 'piece_count',
    releaseDate: 'release_date',
    tags: 'tags',
    priority: 'priority',
    notes: 'notes',
    sortOrder: 'sort_order',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}

// Helper to create mock DB rows
function createMockRow(overrides: Partial<any> = {}) {
  const now = new Date()
  return {
    id: '11111111-1111-1111-1111-111111111001',
    userId: 'test-user-id',
    title: 'Millennium Falcon',
    store: 'LEGO',
    setNumber: '75192',
    sourceUrl: 'https://lego.com/75192',
    imageUrl: 'https://s3.example.com/image.jpg',
    price: '849.99',
    currency: 'USD',
    pieceCount: 7541,
    releaseDate: now,
    tags: ['Star Wars', 'UCS'],
    priority: 5,
    notes: 'Must have!',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('searchWishlistItems', () => {
  it('returns matching items for search query', async () => {
    const mockRow = createMockRow()

    const mockDb = {
      select: vi.fn(),
    }

    // Setup count query
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      }),
    })

    // Setup data query
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([mockRow]),
            }),
          }),
        }),
      }),
    })

    const result = await searchWishlistItems(mockDb as any, mockSchema, 'test-user-id', {
      q: 'millennium',
      page: 1,
      limit: 20,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('Millennium Falcon')
    expect(result.pagination.total).toBe(1)
  })

  it('returns empty results when no matches', async () => {
    const mockDb = {
      select: vi.fn(),
    }

    // Setup count query
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    })

    // Setup data query
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    })

    const result = await searchWishlistItems(mockDb as any, mockSchema, 'test-user-id', {
      q: 'nonexistent',
      page: 1,
      limit: 20,
    })

    expect(result.items).toHaveLength(0)
    expect(result.pagination.total).toBe(0)
  })

  it('supports pagination', async () => {
    const mockRow = createMockRow({
      id: '11111111-1111-1111-1111-111111111002',
      title: 'Millennium Falcon Micro',
    })

    const mockDb = {
      select: vi.fn(),
    }

    // Setup count query - total of 25 items
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 25 }]),
      }),
    })

    // Setup data query
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([mockRow]),
            }),
          }),
        }),
      }),
    })

    const result = await searchWishlistItems(mockDb as any, mockSchema, 'test-user-id', {
      q: 'millennium',
      page: 2,
      limit: 10,
    })

    expect(result.pagination.page).toBe(2)
    expect(result.pagination.limit).toBe(10)
    expect(result.pagination.total).toBe(25)
    expect(result.pagination.totalPages).toBe(3)
  })

  it('caps limit at 100', async () => {
    const mockDb = {
      select: vi.fn(),
    }

    // Setup count query
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    })

    // Setup data query
    const limitMock = vi.fn().mockReturnValue({
      offset: vi.fn().mockResolvedValue([]),
    })
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: limitMock,
          }),
        }),
      }),
    })

    const result = await searchWishlistItems(mockDb as any, mockSchema, 'test-user-id', {
      q: 'test',
      page: 1,
      limit: 200,
    })

    expect(result.pagination.limit).toBe(100)
  })

  it('escapes special characters in search query', async () => {
    const mockDb = {
      select: vi.fn(),
    }

    // Setup count query
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    })

    // Setup data query
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }),
    })

    // This should not throw - special chars should be escaped
    const result = await searchWishlistItems(mockDb as any, mockSchema, 'test-user-id', {
      q: '100%_complete\\test',
      page: 1,
      limit: 20,
    })

    expect(result.items).toHaveLength(0)
  })
})
