import { describe, it, expect, vi } from 'vitest'
import { listWishlistItems } from '../list-wishlist-items.js'

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

describe('listWishlistItems', () => {
  it('returns paginated list of wishlist items', async () => {
    const mockRow = createMockRow()

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockImplementation(() => {
        // First call returns count, subsequent calls return rows
        return {
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          offset: vi.fn().mockResolvedValue([mockRow]),
        }
      }),
    }

    // Setup count query to return 1
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

    const result = await listWishlistItems(mockDb as any, mockSchema, 'test-user-id', {
      page: 1,
      limit: 20,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].title).toBe('Millennium Falcon')
    expect(result.pagination.page).toBe(1)
    expect(result.pagination.limit).toBe(20)
    expect(result.pagination.total).toBe(1)
    expect(result.pagination.totalPages).toBe(1)
  })

  it('returns empty list for user with no items', async () => {
    const mockDb = {
      select: vi.fn(),
    }

    // Setup count query to return 0
    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    })

    // Setup data query to return empty
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

    const result = await listWishlistItems(mockDb as any, mockSchema, 'test-user-id', {
      page: 1,
      limit: 20,
    })

    expect(result.items).toHaveLength(0)
    expect(result.pagination.total).toBe(0)
    expect(result.pagination.totalPages).toBe(0)
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

    const result = await listWishlistItems(mockDb as any, mockSchema, 'test-user-id', {
      page: 1,
      limit: 200, // Exceeds max
    })

    // Verify limit was capped
    expect(result.pagination.limit).toBe(100)
  })

  it('handles null optional fields correctly', async () => {
    const mockRow = createMockRow({
      setNumber: null,
      sourceUrl: null,
      imageUrl: null,
      price: null,
      currency: null,
      pieceCount: null,
      releaseDate: null,
      tags: null,
      priority: null,
      notes: null,
    })

    const mockDb = {
      select: vi.fn(),
    }

    mockDb.select.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 1 }]),
      }),
    })

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

    const result = await listWishlistItems(mockDb as any, mockSchema, 'test-user-id', {
      page: 1,
      limit: 20,
    })

    expect(result.items[0].setNumber).toBeNull()
    expect(result.items[0].sourceUrl).toBeNull()
    expect(result.items[0].imageUrl).toBeNull()
    expect(result.items[0].price).toBeNull()
    expect(result.items[0].currency).toBeNull()
    expect(result.items[0].pieceCount).toBeNull()
    expect(result.items[0].releaseDate).toBeNull()
    expect(result.items[0].tags).toBeNull()
    expect(result.items[0].priority).toBeNull()
    expect(result.items[0].notes).toBeNull()
  })
})
