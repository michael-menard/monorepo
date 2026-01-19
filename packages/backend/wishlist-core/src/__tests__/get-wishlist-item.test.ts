import { describe, it, expect, vi } from 'vitest'
import { getWishlistItemById } from '../get-wishlist-item.js'

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

describe('getWishlistItemById', () => {
  it('returns wishlist item for valid ID owned by user', async () => {
    const mockRow = createMockRow()

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockRow]),
        }),
      }),
    }

    const result = await getWishlistItemById(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111001',
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('11111111-1111-1111-1111-111111111001')
      expect(result.data.title).toBe('Millennium Falcon')
      expect(result.data.store).toBe('LEGO')
      expect(result.data.price).toBe('849.99')
    }
  })

  it('returns NOT_FOUND for non-existent ID', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    }

    const result = await getWishlistItemById(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '00000000-0000-0000-0000-000000000000',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
    }
  })

  it('returns FORBIDDEN for item owned by another user', async () => {
    const mockRow = createMockRow({ userId: 'other-user-id' })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockRow]),
        }),
      }),
    }

    const result = await getWishlistItemById(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111001',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('FORBIDDEN')
    }
  })

  it('preserves null optional fields', async () => {
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
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockRow]),
        }),
      }),
    }

    const result = await getWishlistItemById(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111001',
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.setNumber).toBeNull()
      expect(result.data.sourceUrl).toBeNull()
      expect(result.data.imageUrl).toBeNull()
      expect(result.data.price).toBeNull()
      expect(result.data.currency).toBeNull()
      expect(result.data.pieceCount).toBeNull()
      expect(result.data.releaseDate).toBeNull()
      expect(result.data.tags).toBeNull()
      expect(result.data.priority).toBeNull()
      expect(result.data.notes).toBeNull()
    }
  })

  it('converts dates to ISO strings', async () => {
    const testDate = new Date('2024-01-15T10:30:00Z')
    const mockRow = createMockRow({
      releaseDate: testDate,
      createdAt: testDate,
      updatedAt: testDate,
    })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockRow]),
        }),
      }),
    }

    const result = await getWishlistItemById(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111001',
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.releaseDate).toBe('2024-01-15T10:30:00.000Z')
      expect(result.data.createdAt).toBe('2024-01-15T10:30:00.000Z')
      expect(result.data.updatedAt).toBe('2024-01-15T10:30:00.000Z')
    }
  })
})
