import { describe, it, expect, vi } from 'vitest'
import { reorderWishlistItems } from '../reorder-wishlist-items.js'

// Mock schema
const mockSchema = {
  wishlistItems: {
    id: 'id',
    userId: 'user_id',
    sortOrder: 'sort_order',
    updatedAt: 'updated_at',
  },
}

describe('reorderWishlistItems', () => {
  it('reorders items successfully', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: '11111111-1111-1111-1111-111111111001', userId: 'test-user-id' },
            { id: '11111111-1111-1111-1111-111111111002', userId: 'test-user-id' },
          ]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ rowCount: 1 }),
        }),
      }),
    }

    const result = await reorderWishlistItems(mockDb as any, mockSchema, 'test-user-id', {
      items: [
        { id: '11111111-1111-1111-1111-111111111001', sortOrder: 1 },
        { id: '11111111-1111-1111-1111-111111111002', sortOrder: 0 },
      ],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.updated).toBe(2)
    }
    expect(mockDb.update).toHaveBeenCalledTimes(2)
  })

  it('returns NOT_FOUND when item does not exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: '11111111-1111-1111-1111-111111111001', userId: 'test-user-id' },
            // Missing second item
          ]),
        }),
      }),
    }

    const result = await reorderWishlistItems(mockDb as any, mockSchema, 'test-user-id', {
      items: [
        { id: '11111111-1111-1111-1111-111111111001', sortOrder: 1 },
        { id: '00000000-0000-0000-0000-000000000000', sortOrder: 0 },
      ],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
      expect(result.message).toContain('00000000-0000-0000-0000-000000000000')
    }
  })

  it('returns FORBIDDEN when item belongs to another user', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: '11111111-1111-1111-1111-111111111001', userId: 'test-user-id' },
            { id: '11111111-1111-1111-1111-111111111002', userId: 'other-user-id' },
          ]),
        }),
      }),
    }

    const result = await reorderWishlistItems(mockDb as any, mockSchema, 'test-user-id', {
      items: [
        { id: '11111111-1111-1111-1111-111111111001', sortOrder: 1 },
        { id: '11111111-1111-1111-1111-111111111002', sortOrder: 0 },
      ],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('FORBIDDEN')
      expect(result.message).toBe(
        'You do not have permission to reorder some of these wishlist items',
      )
    }
  })

  it('returns DB_ERROR when update fails', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: '11111111-1111-1111-1111-111111111001', userId: 'test-user-id' },
          ]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('DB connection failed')),
        }),
      }),
    }

    const result = await reorderWishlistItems(mockDb as any, mockSchema, 'test-user-id', {
      items: [{ id: '11111111-1111-1111-1111-111111111001', sortOrder: 1 }],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB_ERROR')
      expect(result.message).toBe('DB connection failed')
    }
  })

  it('handles single item reorder', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: '11111111-1111-1111-1111-111111111001', userId: 'test-user-id' },
          ]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ rowCount: 1 }),
        }),
      }),
    }

    const result = await reorderWishlistItems(mockDb as any, mockSchema, 'test-user-id', {
      items: [{ id: '11111111-1111-1111-1111-111111111001', sortOrder: 5 }],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.updated).toBe(1)
    }
  })

  it('returns DB_ERROR when select fails', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('DB query failed')),
        }),
      }),
    }

    const result = await reorderWishlistItems(mockDb as any, mockSchema, 'test-user-id', {
      items: [{ id: '11111111-1111-1111-1111-111111111001', sortOrder: 1 }],
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB_ERROR')
      expect(result.message).toBe('DB query failed')
    }
  })
})
