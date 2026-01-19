import { describe, it, expect, vi } from 'vitest'
import { updateAlbum } from '../update-album.js'

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
    imageUrl: 'image_url',
    albumId: 'album_id',
  },
}

// Helper to create mock album row
function createMockAlbumRow(overrides: Partial<any> = {}) {
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

describe('updateAlbum', () => {
  it('updates album title', async () => {
    const existingAlbum = { id: '22222222-2222-2222-2222-222222222001', userId: 'test-user-id' }
    const updatedAlbum = createMockAlbumRow({ title: 'Updated Title' })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingAlbum]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedAlbum]),
          }),
        }),
      }),
    }

    const result = await updateAlbum(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '22222222-2222-2222-2222-222222222001',
      { title: 'Updated Title' },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Updated Title')
    }
  })

  it('clears coverImageId when set to null', async () => {
    const existingAlbum = { id: '22222222-2222-2222-2222-222222222001', userId: 'test-user-id' }
    const updatedAlbum = createMockAlbumRow({ coverImageId: null })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingAlbum]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedAlbum]),
          }),
        }),
      }),
    }

    const result = await updateAlbum(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '22222222-2222-2222-2222-222222222001',
      { coverImageId: null },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.coverImageId).toBeNull()
    }
  })

  it('validates coverImageId ownership when provided', async () => {
    const existingAlbum = { id: '22222222-2222-2222-2222-222222222001', userId: 'test-user-id' }

    let callCount = 0
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) {
              // First call - album exists
              return Promise.resolve([existingAlbum])
            }
            // Second call - image belongs to another user
            return Promise.resolve([
              { id: '33333333-3333-3333-3333-333333333003', userId: 'other-user-id' },
            ])
          }),
        }),
      }),
      update: vi.fn(),
    }

    const result = await updateAlbum(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '22222222-2222-2222-2222-222222222001',
      { coverImageId: '33333333-3333-3333-3333-333333333003' },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('FORBIDDEN')
      expect(result.message).toBe('Cover image belongs to another user')
    }
  })

  it('returns NOT_FOUND when album does not exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      update: vi.fn(),
    }

    const result = await updateAlbum(
      mockDb as any,
      mockSchema,
      'test-user-id',
      'nonexistent-album-id',
      { title: 'New Title' },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
      expect(result.message).toBe('Album not found')
    }
  })

  it('returns FORBIDDEN when album belongs to another user', async () => {
    const existingAlbum = { id: '22222222-2222-2222-2222-222222222001', userId: 'other-user-id' }

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingAlbum]),
        }),
      }),
      update: vi.fn(),
    }

    const result = await updateAlbum(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '22222222-2222-2222-2222-222222222001',
      { title: 'New Title' },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('FORBIDDEN')
      expect(result.message).toBe('You do not have permission to update this album')
    }
  })

  it('returns NOT_FOUND when coverImageId does not exist', async () => {
    const existingAlbum = { id: '22222222-2222-2222-2222-222222222001', userId: 'test-user-id' }

    let callCount = 0
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) {
              return Promise.resolve([existingAlbum])
            }
            return Promise.resolve([])
          }),
        }),
      }),
      update: vi.fn(),
    }

    const result = await updateAlbum(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '22222222-2222-2222-2222-222222222001',
      { coverImageId: 'nonexistent-image-id' },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
      expect(result.message).toBe('Cover image not found')
    }
  })

  it('updates only provided fields', async () => {
    const existingAlbum = { id: '22222222-2222-2222-2222-222222222001', userId: 'test-user-id' }
    const updatedAlbum = createMockAlbumRow({
      description: 'New description',
    })

    const mockSetFn = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updatedAlbum]),
      }),
    })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingAlbum]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: mockSetFn,
      }),
    }

    await updateAlbum(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '22222222-2222-2222-2222-222222222001',
      { description: 'New description' },
    )

    // Verify only description and lastUpdatedAt were in the update
    const setCall = mockSetFn.mock.calls[0][0]
    expect(setCall.description).toBe('New description')
    expect(setCall.lastUpdatedAt).toBeDefined()
    expect(setCall.title).toBeUndefined()
    expect(setCall.coverImageId).toBeUndefined()
  })
})
