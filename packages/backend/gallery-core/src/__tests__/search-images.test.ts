import { describe, it, expect, vi } from 'vitest'
import { searchGalleryImages } from '../search-images.js'

// Mock schema
const mockSchema = {
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

// Helper to create mock image row
function createMockImageRow(overrides: Partial<any> = {}) {
  const now = new Date()
  return {
    id: '11111111-1111-1111-1111-111111111111',
    userId: 'test-user-id',
    title: 'Test Image',
    description: null,
    tags: null,
    imageUrl: 'https://example.com/image.jpg',
    thumbnailUrl: null,
    albumId: null,
    flagged: false,
    createdAt: now,
    lastUpdatedAt: now,
    ...overrides,
  }
}

// Helper to create mock DB with count and data
function createMockDb(countValue: number, dataRows: any[]) {
  let callCount = 0
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          callCount++
          if (callCount === 1) {
            // First call is for count
            return Promise.resolve([{ count: countValue }])
          }
          // Second call is for data
          const promise = Promise.resolve(dataRows)
          ;(promise as any).orderBy = vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              offset: vi.fn().mockResolvedValue(dataRows),
            }),
          })
          return promise
        }),
      }),
    }),
  }
}

describe('searchGalleryImages', () => {
  it('returns matching images for search term', async () => {
    const mockImages = [
      createMockImageRow({ id: '11111111-1111-1111-1111-111111111111', title: 'Medieval Castle' }),
      createMockImageRow({ id: '22222222-2222-2222-2222-222222222222', title: 'Castle Tower' }),
    ]

    const mockDb = createMockDb(2, mockImages)

    const result = await searchGalleryImages(mockDb as any, mockSchema, 'test-user-id', {
      search: 'castle',
      page: 1,
      limit: 20,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data).toHaveLength(2)
      expect(result.data.pagination.total).toBe(2)
    }
  })

  it('searches across title, description, tags', async () => {
    const mockImages = [
      createMockImageRow({
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Medieval Build',
        description: 'A castle design',
        tags: ['architecture'],
      }),
    ]

    const mockDb = createMockDb(1, mockImages)

    const result = await searchGalleryImages(mockDb as any, mockSchema, 'test-user-id', {
      search: 'castle',
      page: 1,
      limit: 20,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data).toHaveLength(1)
    }
  })

  it('returns empty array when no matches', async () => {
    const mockDb = createMockDb(0, [])

    const result = await searchGalleryImages(mockDb as any, mockSchema, 'test-user-id', {
      search: 'nonexistent',
      page: 1,
      limit: 20,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.data).toHaveLength(0)
      expect(result.data.pagination.total).toBe(0)
    }
  })

  it('supports pagination', async () => {
    const mockImages = [createMockImageRow()]

    const mockDb = createMockDb(25, mockImages)

    const result = await searchGalleryImages(mockDb as any, mockSchema, 'test-user-id', {
      search: 'test',
      page: 2,
      limit: 10,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pagination.page).toBe(2)
      expect(result.data.pagination.limit).toBe(10)
      expect(result.data.pagination.total).toBe(25)
      expect(result.data.pagination.totalPages).toBe(3)
    }
  })

  it('returns VALIDATION_ERROR for empty search term', async () => {
    const mockDb = createMockDb(0, [])

    const result = await searchGalleryImages(mockDb as any, mockSchema, 'test-user-id', {
      search: '',
      page: 1,
      limit: 20,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('VALIDATION_ERROR')
      expect(result.message).toBe('Search term is required')
    }
  })

  it('returns VALIDATION_ERROR for whitespace-only search term', async () => {
    const mockDb = createMockDb(0, [])

    const result = await searchGalleryImages(mockDb as any, mockSchema, 'test-user-id', {
      search: '   ',
      page: 1,
      limit: 20,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('VALIDATION_ERROR')
      expect(result.message).toBe('Search term is required')
    }
  })

  it('caps limit at 100', async () => {
    const mockDb = createMockDb(0, [])

    const result = await searchGalleryImages(mockDb as any, mockSchema, 'test-user-id', {
      search: 'test',
      page: 1,
      limit: 500,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.pagination.limit).toBe(100)
    }
  })

  it('returns DB_ERROR when database throws', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Connection failed')),
        }),
      }),
    }

    const result = await searchGalleryImages(mockDb as any, mockSchema, 'test-user-id', {
      search: 'test',
      page: 1,
      limit: 20,
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB_ERROR')
      expect(result.message).toBe('Connection failed')
    }
  })
})
