import { describe, it, expect, vi } from 'vitest'
import { updateWishlistItem } from '../update-wishlist-item.js'

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
function createMockRow(overrides: Partial<any> = {}) {
  const now = new Date()
  return {
    id: '11111111-1111-1111-1111-111111111001',
    userId: 'test-user-id',
    title: 'Original Title',
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

describe('updateWishlistItem', () => {
  it('updates single field', async () => {
    const originalRow = createMockRow()
    const updatedRow = createMockRow({ title: 'Updated Title', updatedAt: new Date() })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([originalRow]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedRow]),
          }),
        }),
      }),
    }

    const result = await updateWishlistItem(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111001',
      { title: 'Updated Title' },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Updated Title')
    }
  })

  it('updates multiple fields', async () => {
    const originalRow = createMockRow()
    const updatedRow = createMockRow({
      title: 'New Title',
      priority: 5,
      notes: 'Updated notes',
      updatedAt: new Date(),
    })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([originalRow]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedRow]),
          }),
        }),
      }),
    }

    const result = await updateWishlistItem(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111001',
      { title: 'New Title', priority: 5, notes: 'Updated notes' },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('New Title')
      expect(result.data.priority).toBe(5)
      expect(result.data.notes).toBe('Updated notes')
    }
  })

  it('allows empty body update (only updates updatedAt)', async () => {
    const originalRow = createMockRow()
    const updatedRow = createMockRow({ updatedAt: new Date() })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([originalRow]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedRow]),
          }),
        }),
      }),
    }

    const result = await updateWishlistItem(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111001',
      {},
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Original Title') // Unchanged
    }
  })

  it('returns NOT_FOUND for non-existent item', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    }

    const result = await updateWishlistItem(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '00000000-0000-0000-0000-000000000000',
      { title: 'Updated Title' },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
      expect(result.message).toBe('Wishlist item not found')
    }
  })

  it('returns FORBIDDEN for item owned by another user', async () => {
    const otherUserRow = createMockRow({ userId: 'other-user-id' })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([otherUserRow]),
        }),
      }),
    }

    const result = await updateWishlistItem(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111001',
      { title: 'Updated Title' },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('FORBIDDEN')
      expect(result.message).toBe('You do not have permission to update this wishlist item')
    }
  })

  it('returns DB_ERROR when update fails', async () => {
    const originalRow = createMockRow()

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([originalRow]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(new Error('DB connection failed')),
          }),
        }),
      }),
    }

    const result = await updateWishlistItem(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111001',
      { title: 'Updated Title' },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB_ERROR')
      expect(result.message).toBe('DB connection failed')
    }
  })

  it('allows setting fields to null', async () => {
    const originalRow = createMockRow({ notes: 'Some notes', priority: 3 })
    const updatedRow = createMockRow({ notes: null, priority: null, updatedAt: new Date() })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([originalRow]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedRow]),
          }),
        }),
      }),
    }

    const result = await updateWishlistItem(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111001',
      { notes: null, priority: null },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.notes).toBeNull()
      expect(result.data.priority).toBeNull()
    }
  })
})
