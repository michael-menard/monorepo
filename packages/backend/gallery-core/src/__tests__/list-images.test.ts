import { describe, it, expect, vi } from 'vitest'
import { listGalleryImages } from '../list-images.js'

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

describe('listGalleryImages', () => {
  it('returns paginated images for user', async () => {
    const mockImages = [
      createMockImageRow({ id: '11111111-1111-1111-1111-111111111111', title: 'Image 1' }),
      createMockImageRow({ id: '22222222-2222-2222-2222-222222222222', title: 'Image 2' }),
    ]

    const mockDb = createMockDb(2, mockImages)

    const result = await listGalleryImages(mockDb as any, mockSchema, 'test-user-id', {
      page: 1,
      limit: 20,
    })

    expect(result.data).toHaveLength(2)
    expect(result.data[0].title).toBe('Image 1')
    expect(result.data[1].title).toBe('Image 2')
    expect(result.pagination.total).toBe(2)
    expect(result.pagination.page).toBe(1)
    expect(result.pagination.limit).toBe(20)
    expect(result.pagination.totalPages).toBe(1)
  })

  it('filters by albumId when provided', async () => {
    const mockImages = [
      createMockImageRow({
        id: '22222222-2222-2222-2222-222222222222',
        title: 'Album Image',
        albumId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      }),
    ]

    const mockDb = createMockDb(1, mockImages)

    const result = await listGalleryImages(mockDb as any, mockSchema, 'test-user-id', {
      page: 1,
      limit: 20,
      albumId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    })

    expect(result.data).toHaveLength(1)
    expect(result.data[0].albumId).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
  })

  it('returns only standalone images when albumId not provided', async () => {
    const mockImages = [
      createMockImageRow({
        id: '11111111-1111-1111-1111-111111111111',
        title: 'Standalone Image',
        albumId: null,
      }),
    ]

    const mockDb = createMockDb(1, mockImages)

    const result = await listGalleryImages(mockDb as any, mockSchema, 'test-user-id', {
      page: 1,
      limit: 20,
    })

    expect(result.data).toHaveLength(1)
    expect(result.data[0].albumId).toBeNull()
  })

  it('handles empty results', async () => {
    const mockDb = createMockDb(0, [])

    const result = await listGalleryImages(mockDb as any, mockSchema, 'test-user-id', {
      page: 1,
      limit: 20,
    })

    expect(result.data).toHaveLength(0)
    expect(result.pagination.total).toBe(0)
    expect(result.pagination.totalPages).toBe(0)
  })

  it('caps limit at 100', async () => {
    const mockDb = createMockDb(0, [])

    const result = await listGalleryImages(mockDb as any, mockSchema, 'test-user-id', {
      page: 1,
      limit: 500,
    })

    expect(result.pagination.limit).toBe(100)
  })

  it('calculates totalPages correctly', async () => {
    const mockDb = createMockDb(45, [])

    const result = await listGalleryImages(mockDb as any, mockSchema, 'test-user-id', {
      page: 1,
      limit: 20,
    })

    expect(result.pagination.total).toBe(45)
    expect(result.pagination.totalPages).toBe(3) // 45/20 = 2.25 -> ceil = 3
  })

  it('transforms dates to ISO strings', async () => {
    const now = new Date('2026-01-18T12:00:00.000Z')
    const mockImages = [
      createMockImageRow({
        createdAt: now,
        lastUpdatedAt: now,
      }),
    ]

    const mockDb = createMockDb(1, mockImages)

    const result = await listGalleryImages(mockDb as any, mockSchema, 'test-user-id', {
      page: 1,
      limit: 20,
    })

    expect(result.data[0].createdAt).toBe('2026-01-18T12:00:00.000Z')
    expect(result.data[0].lastUpdatedAt).toBe('2026-01-18T12:00:00.000Z')
  })
})
