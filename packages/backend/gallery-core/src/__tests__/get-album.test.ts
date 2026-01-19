import { describe, it, expect, vi } from 'vitest'
import { getAlbum } from '../get-album.js'

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
    title: 'title',
    description: 'description',
    tags: 'tags',
    imageUrl: 'image_url',
    thumbnailUrl: 'thumbnail_url',
    albumId: 'album_id',
    flagged: 'flagged',
    createdAt: 'created_at',
    lastUpdatedAt: 'last_updated_at',
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

// Helper to create mock image row
function createMockImageRow(overrides: Partial<any> = {}) {
  const now = new Date()
  return {
    id: '33333333-3333-3333-3333-333333333001',
    userId: 'test-user-id',
    title: 'Test Image',
    description: null,
    tags: null,
    imageUrl: 'https://example.com/image.jpg',
    thumbnailUrl: null,
    albumId: '22222222-2222-2222-2222-222222222001',
    flagged: false,
    createdAt: now,
    lastUpdatedAt: now,
    ...overrides,
  }
}

describe('getAlbum', () => {
  it('returns album with images', async () => {
    const mockAlbum = createMockAlbumRow()
    const mockImages = [
      createMockImageRow({ id: '33333333-3333-3333-3333-333333333001', title: 'Image 1' }),
      createMockImageRow({ id: '33333333-3333-3333-3333-333333333002', title: 'Image 2' }),
    ]

    let callCount = 0
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) {
              // First call is for album
              return Promise.resolve([mockAlbum])
            }
            // Second call is for images
            const promise = Promise.resolve(mockImages)
            ;(promise as any).orderBy = vi.fn().mockResolvedValue(mockImages)
            return promise
          }),
        }),
      }),
    }

    const result = await getAlbum(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '22222222-2222-2222-2222-222222222001',
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Test Album')
      expect(result.data.images).toHaveLength(2)
      expect(result.data.imageCount).toBe(2)
    }
  })

  it('returns NOT_FOUND when album does not exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    }

    const result = await getAlbum(
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
    const mockAlbum = createMockAlbumRow({ userId: 'other-user-id' })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockAlbum]),
        }),
      }),
    }

    const result = await getAlbum(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '22222222-2222-2222-2222-222222222001',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('FORBIDDEN')
      expect(result.message).toBe('You do not have permission to access this album')
    }
  })

  it('includes coverImageUrl when coverImageId is set', async () => {
    const mockAlbum = createMockAlbumRow({
      coverImageId: '33333333-3333-3333-3333-333333333001',
    })
    const mockImages = [
      createMockImageRow({
        id: '33333333-3333-3333-3333-333333333001',
        imageUrl: 'https://example.com/cover.jpg',
      }),
    ]

    let callCount = 0
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) {
              return Promise.resolve([mockAlbum])
            }
            const promise = Promise.resolve(mockImages)
            ;(promise as any).orderBy = vi.fn().mockResolvedValue(mockImages)
            return promise
          }),
        }),
      }),
    }

    const result = await getAlbum(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '22222222-2222-2222-2222-222222222001',
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.coverImageUrl).toBe('https://example.com/cover.jpg')
    }
  })

  it('returns empty images array when album has no images', async () => {
    const mockAlbum = createMockAlbumRow()

    let callCount = 0
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) {
              return Promise.resolve([mockAlbum])
            }
            const promise = Promise.resolve([])
            ;(promise as any).orderBy = vi.fn().mockResolvedValue([])
            return promise
          }),
        }),
      }),
    }

    const result = await getAlbum(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '22222222-2222-2222-2222-222222222001',
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.images).toHaveLength(0)
      expect(result.data.imageCount).toBe(0)
    }
  })
})
