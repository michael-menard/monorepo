import { describe, it, expect, vi } from 'vitest'
import { deleteWishlistItem } from '../delete-wishlist-item.js'

// Mock schema
const mockSchema = {
  wishlistItems: {
    id: 'id',
    userId: 'user_id',
  },
}

describe('deleteWishlistItem', () => {
  it('deletes existing item owned by user', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: '11111111-1111-1111-1111-111111111001', userId: 'test-user-id' },
          ]),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue({ rowCount: 1 }),
      }),
    }

    const result = await deleteWishlistItem(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111001',
    )

    expect(result.success).toBe(true)
    expect(mockDb.delete).toHaveBeenCalled()
  })

  it('returns NOT_FOUND for non-existent item', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    }

    const result = await deleteWishlistItem(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '00000000-0000-0000-0000-000000000000',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
      expect(result.message).toBe('Wishlist item not found')
    }
  })

  it('returns FORBIDDEN for item owned by another user', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: '11111111-1111-1111-1111-111111111001', userId: 'other-user-id' },
          ]),
        }),
      }),
    }

    const result = await deleteWishlistItem(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111001',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('FORBIDDEN')
      expect(result.message).toBe('You do not have permission to delete this wishlist item')
    }
  })

  it('returns DB_ERROR when delete fails', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: '11111111-1111-1111-1111-111111111001', userId: 'test-user-id' },
          ]),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('DB connection failed')),
      }),
    }

    const result = await deleteWishlistItem(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111001',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB_ERROR')
      expect(result.message).toBe('DB connection failed')
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

    const result = await deleteWishlistItem(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111001',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB_ERROR')
      expect(result.message).toBe('DB query failed')
    }
  })
})
