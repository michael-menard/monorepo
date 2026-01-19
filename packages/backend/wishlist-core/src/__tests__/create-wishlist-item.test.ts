import { describe, it, expect, vi } from 'vitest'
import { createWishlistItem } from '../create-wishlist-item.js'

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

// Helper to create mock DB row
function createMockInsertedRow(overrides: Partial<any> = {}) {
  const now = new Date()
  return {
    id: '11111111-1111-1111-1111-111111111001',
    userId: 'test-user-id',
    title: 'Test Item',
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
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('createWishlistItem', () => {
  it('creates item with required fields only', async () => {
    const mockRow = createMockInsertedRow()

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ maxSortOrder: null }]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockRow]),
        }),
      }),
    }

    const result = await createWishlistItem(mockDb as any, mockSchema, 'test-user-id', {
      title: 'Test Item',
      store: 'LEGO',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Test Item')
      expect(result.data.store).toBe('LEGO')
      expect(result.data.currency).toBe('USD')
      expect(result.data.priority).toBe(0)
      expect(result.data.sortOrder).toBe(0)
    }
  })

  it('creates item with all optional fields', async () => {
    const now = new Date()
    const mockRow = createMockInsertedRow({
      setNumber: '75192',
      sourceUrl: 'https://lego.com/75192',
      price: '849.99',
      currency: 'EUR',
      pieceCount: 7541,
      releaseDate: now,
      tags: ['Star Wars', 'UCS'],
      priority: 5,
      notes: 'Dream set!',
    })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ maxSortOrder: 2 }]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ ...mockRow, sortOrder: 3 }]),
        }),
      }),
    }

    const result = await createWishlistItem(mockDb as any, mockSchema, 'test-user-id', {
      title: 'Millennium Falcon',
      store: 'LEGO',
      setNumber: '75192',
      sourceUrl: 'https://lego.com/75192',
      price: '849.99',
      currency: 'EUR',
      pieceCount: 7541,
      releaseDate: now.toISOString(),
      tags: ['Star Wars', 'UCS'],
      priority: 5,
      notes: 'Dream set!',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.setNumber).toBe('75192')
      expect(result.data.price).toBe('849.99')
      expect(result.data.currency).toBe('EUR')
      expect(result.data.pieceCount).toBe(7541)
      expect(result.data.tags).toEqual(['Star Wars', 'UCS'])
      expect(result.data.priority).toBe(5)
      expect(result.data.sortOrder).toBe(3) // MAX(2) + 1
    }
  })

  it('calculates sortOrder as MAX+1 for user', async () => {
    const mockRow = createMockInsertedRow({ sortOrder: 5 })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ maxSortOrder: 4 }]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockRow]),
        }),
      }),
    }

    const result = await createWishlistItem(mockDb as any, mockSchema, 'test-user-id', {
      title: 'Test Item',
      store: 'LEGO',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sortOrder).toBe(5)
    }
  })

  it('sets sortOrder to 0 for first item', async () => {
    const mockRow = createMockInsertedRow({ sortOrder: 0 })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ maxSortOrder: null }]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockRow]),
        }),
      }),
    }

    const result = await createWishlistItem(mockDb as any, mockSchema, 'test-user-id', {
      title: 'First Item',
      store: 'LEGO',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.sortOrder).toBe(0)
    }
  })

  it('returns DB_ERROR when insert fails', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ maxSortOrder: null }]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('DB connection failed')),
        }),
      }),
    }

    const result = await createWishlistItem(mockDb as any, mockSchema, 'test-user-id', {
      title: 'Test Item',
      store: 'LEGO',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB_ERROR')
      expect(result.message).toBe('DB connection failed')
    }
  })

  it('returns DB_ERROR when no row returned', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ maxSortOrder: null }]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }

    const result = await createWishlistItem(mockDb as any, mockSchema, 'test-user-id', {
      title: 'Test Item',
      store: 'LEGO',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB_ERROR')
      expect(result.message).toBe('No row returned from insert')
    }
  })
})
