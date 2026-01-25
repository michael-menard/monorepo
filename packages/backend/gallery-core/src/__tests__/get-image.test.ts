import { describe, it, expect, vi } from 'vitest'
import { getGalleryImage } from '../get-image.js'

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

describe('getGalleryImage', () => {
  it('returns image for valid ID and matching user', async () => {
    const mockImage = createMockImageRow()

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockImage]),
        }),
      }),
    }

    const result = await getGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111111',
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.id).toBe('11111111-1111-1111-1111-111111111111')
      expect(result.data.title).toBe('Test Image')
      expect(result.data.imageUrl).toBe('https://example.com/image.jpg')
    }
  })

  it('returns NOT_FOUND for non-existent ID', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
    }

    const result = await getGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      'nonexistent-image-id',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
      expect(result.message).toBe('Image not found')
    }
  })

  it('returns FORBIDDEN for image owned by another user', async () => {
    const mockImage = createMockImageRow({ userId: 'other-user-id' })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockImage]),
        }),
      }),
    }

    const result = await getGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111111',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('FORBIDDEN')
      expect(result.message).toBe('You do not have permission to access this image')
    }
  })

  it('transforms dates to ISO strings correctly', async () => {
    const now = new Date('2026-01-18T12:00:00.000Z')
    const mockImage = createMockImageRow({
      createdAt: now,
      lastUpdatedAt: now,
    })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockImage]),
        }),
      }),
    }

    const result = await getGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111111',
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.createdAt).toBe('2026-01-18T12:00:00.000Z')
      expect(result.data.lastUpdatedAt).toBe('2026-01-18T12:00:00.000Z')
    }
  })

  it('returns image with all fields populated', async () => {
    const mockImage = createMockImageRow({
      description: 'A beautiful castle',
      tags: ['castle', 'medieval'],
      thumbnailUrl: 'https://example.com/thumb.jpg',
      albumId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      flagged: true,
    })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockImage]),
        }),
      }),
    }

    const result = await getGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111111',
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('A beautiful castle')
      expect(result.data.tags).toEqual(['castle', 'medieval'])
      expect(result.data.thumbnailUrl).toBe('https://example.com/thumb.jpg')
      expect(result.data.albumId).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
      expect(result.data.flagged).toBe(true)
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

    const result = await getGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '11111111-1111-1111-1111-111111111111',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB_ERROR')
      expect(result.message).toBe('Connection failed')
    }
  })
})
