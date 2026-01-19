import { describe, it, expect, vi } from 'vitest'
import { listAlbums } from '../list-albums.js'

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
    albumId: 'album_id',
    imageUrl: 'image_url',
  },
}

// Helper to create mock album rows
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
    imageCount: 0,
    coverImageUrl: null,
    ...overrides,
  }
}

describe('listAlbums', () => {
  it('returns empty list when user has no albums', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            const promise = Promise.resolve([{ count: 0 }])
            ;(promise as any).orderBy = vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            })
            return promise
          }),
        }),
      }),
    }

    const result = await listAlbums(mockDb as any, mockSchema, 'test-user-id', {
      page: 1,
      limit: 20,
    })

    expect(result.data).toHaveLength(0)
    expect(result.pagination.total).toBe(0)
    expect(result.pagination.totalPages).toBe(0)
  })

  it('returns paginated albums', async () => {
    const mockAlbums = [
      createMockAlbumRow({ id: '22222222-2222-2222-2222-222222222001', title: 'Album 1' }),
      createMockAlbumRow({ id: '22222222-2222-2222-2222-222222222002', title: 'Album 2' }),
    ]

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            const promise = Promise.resolve([{ count: 2 }])
            ;(promise as any).orderBy = vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockAlbums),
              }),
            })
            return promise
          }),
        }),
      }),
    }

    const result = await listAlbums(mockDb as any, mockSchema, 'test-user-id', {
      page: 1,
      limit: 20,
    })

    expect(result.data).toHaveLength(2)
    expect(result.data[0].title).toBe('Album 1')
    expect(result.data[1].title).toBe('Album 2')
    expect(result.pagination.total).toBe(2)
    expect(result.pagination.totalPages).toBe(1)
  })

  it('caps limit at 100', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            const promise = Promise.resolve([{ count: 0 }])
            ;(promise as any).orderBy = vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            })
            return promise
          }),
        }),
      }),
    }

    const result = await listAlbums(mockDb as any, mockSchema, 'test-user-id', {
      page: 1,
      limit: 200,
    })

    expect(result.pagination.limit).toBe(100)
  })

  it('uses default pagination when not provided', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            const promise = Promise.resolve([{ count: 0 }])
            ;(promise as any).orderBy = vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue([]),
              }),
            })
            return promise
          }),
        }),
      }),
    }

    const result = await listAlbums(mockDb as any, mockSchema, 'test-user-id', {})

    expect(result.pagination.page).toBe(1)
    expect(result.pagination.limit).toBe(20)
  })

  it('includes imageCount and coverImageUrl', async () => {
    const mockAlbums = [
      createMockAlbumRow({
        imageCount: 5,
        coverImageUrl: 'https://example.com/cover.jpg',
      }),
    ]

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            const promise = Promise.resolve([{ count: 1 }])
            ;(promise as any).orderBy = vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(mockAlbums),
              }),
            })
            return promise
          }),
        }),
      }),
    }

    const result = await listAlbums(mockDb as any, mockSchema, 'test-user-id', {
      page: 1,
      limit: 20,
    })

    expect(result.data[0].imageCount).toBe(5)
    expect(result.data[0].coverImageUrl).toBe('https://example.com/cover.jpg')
  })
})
