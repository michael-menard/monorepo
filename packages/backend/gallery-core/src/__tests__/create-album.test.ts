import { describe, it, expect, vi } from 'vitest'
import { createAlbum } from '../create-album.js'

// Mock schema
const mockSchema = {
  galleryAlbums: {
    id: 'id',
    userId: 'user_id',
    title: 'title',
    description: 'description',
    coverImageId: 'cover_image_id',
    createdAt: 'created_at',
    lastUpdatedAt: 'last_updated_at',
  },
  galleryImages: {
    id: 'id',
    userId: 'user_id',
  },
}

// Helper to create mock DB row
function createMockInsertedRow(overrides: Partial<any> = {}) {
  const now = new Date()
  return {
    id: '22222222-2222-2222-2222-222222222001',
    userId: 'test-user-id',
    title: 'Test Album',
    description: null,
    coverImageId: null,
    createdAt: now,
    lastUpdatedAt: now,
    ...overrides,
  }
}

describe('createAlbum', () => {
  it('creates album with required fields only', async () => {
    const mockRow = createMockInsertedRow()

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockRow]),
        }),
      }),
    }

    const result = await createAlbum(mockDb as any, mockSchema, 'test-user-id', {
      title: 'Test Album',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Test Album')
      expect(result.data.description).toBeNull()
      expect(result.data.coverImageId).toBeNull()
      expect(result.data.imageCount).toBe(0)
    }
  })

  it('creates album with all optional fields', async () => {
    const mockRow = createMockInsertedRow({
      description: 'A great album',
      coverImageId: '33333333-3333-3333-3333-333333333001',
    })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: '33333333-3333-3333-3333-333333333001', userId: 'test-user-id' },
          ]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockRow]),
        }),
      }),
    }

    const result = await createAlbum(mockDb as any, mockSchema, 'test-user-id', {
      title: 'Test Album',
      description: 'A great album',
      coverImageId: '33333333-3333-3333-3333-333333333001',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('A great album')
      expect(result.data.coverImageId).toBe('33333333-3333-3333-3333-333333333001')
    }
  })

  it('returns NOT_FOUND when coverImageId does not exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      insert: vi.fn(),
    }

    const result = await createAlbum(mockDb as any, mockSchema, 'test-user-id', {
      title: 'Test Album',
      coverImageId: 'nonexistent-image-id',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
      expect(result.message).toBe('Cover image not found')
    }
  })

  it('returns FORBIDDEN when coverImageId belongs to another user', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { id: '33333333-3333-3333-3333-333333333003', userId: 'other-user-id' },
          ]),
        }),
      }),
      insert: vi.fn(),
    }

    const result = await createAlbum(mockDb as any, mockSchema, 'test-user-id', {
      title: 'Test Album',
      coverImageId: '33333333-3333-3333-3333-333333333003',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('FORBIDDEN')
      expect(result.message).toBe('Cover image belongs to another user')
    }
  })

  it('returns DB_ERROR when insert fails', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('DB connection failed')),
        }),
      }),
    }

    const result = await createAlbum(mockDb as any, mockSchema, 'test-user-id', {
      title: 'Test Album',
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
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }

    const result = await createAlbum(mockDb as any, mockSchema, 'test-user-id', {
      title: 'Test Album',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB_ERROR')
      expect(result.message).toBe('No row returned from insert')
    }
  })
})
