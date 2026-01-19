import { describe, it, expect, vi } from 'vitest'
import { deleteAlbum } from '../delete-album.js'

// Mock schema
const mockSchema = {
  galleryAlbums: {
    id: 'id',
    userId: 'user_id',
  },
  galleryImages: {
    albumId: 'album_id',
  },
}

describe('deleteAlbum', () => {
  it('deletes album successfully', async () => {
    const existingAlbum = { id: '22222222-2222-2222-2222-222222222001', userId: 'test-user-id' }

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingAlbum]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }

    const result = await deleteAlbum(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '22222222-2222-2222-2222-222222222001',
    )

    expect(result.success).toBe(true)
  })

  it('orphans images before deleting album', async () => {
    const existingAlbum = { id: '22222222-2222-2222-2222-222222222001', userId: 'test-user-id' }

    const mockUpdateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingAlbum]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: mockUpdateSet,
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }

    await deleteAlbum(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '22222222-2222-2222-2222-222222222001',
    )

    // Verify images were orphaned (albumId set to null)
    expect(mockUpdateSet).toHaveBeenCalledWith({ albumId: null })
  })

  it('returns NOT_FOUND when album does not exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      update: vi.fn(),
      delete: vi.fn(),
    }

    const result = await deleteAlbum(
      mockDb as any,
      mockSchema,
      'test-user-id',
      'nonexistent-album-id',
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
      delete: vi.fn(),
    }

    const result = await deleteAlbum(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '22222222-2222-2222-2222-222222222001',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('FORBIDDEN')
      expect(result.message).toBe('You do not have permission to delete this album')
    }
  })

  it('returns DB_ERROR when delete fails', async () => {
    const existingAlbum = { id: '22222222-2222-2222-2222-222222222001', userId: 'test-user-id' }

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingAlbum]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error('DB connection failed')),
      }),
    }

    const result = await deleteAlbum(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '22222222-2222-2222-2222-222222222001',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB_ERROR')
      expect(result.message).toBe('DB connection failed')
    }
  })
})
