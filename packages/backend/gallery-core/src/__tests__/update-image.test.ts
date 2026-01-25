import { describe, it, expect, vi } from 'vitest'
import { updateGalleryImage } from '../update-image.js'

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
  galleryAlbums: {
    id: 'id',
    userId: 'user_id',
  },
}

// Helper to create mock image row
function createMockImageRow(overrides: Partial<any> = {}) {
  const now = new Date()
  return {
    id: '66666666-6666-6666-6666-666666666666',
    userId: 'test-user-id',
    title: 'Test Image',
    description: null,
    tags: null,
    imageUrl: 'https://example.com/images/test.jpg',
    thumbnailUrl: 'https://example.com/thumbs/test.jpg',
    albumId: null,
    flagged: false,
    createdAt: now,
    lastUpdatedAt: now,
    ...overrides,
  }
}

describe('updateGalleryImage', () => {
  it('updates image title', async () => {
    const existingImage = { id: '66666666-6666-6666-6666-666666666666', userId: 'test-user-id' }
    const updatedImage = createMockImageRow({ title: 'Updated Title' })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedImage]),
          }),
        }),
      }),
    }

    const result = await updateGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '66666666-6666-6666-6666-666666666666',
      { title: 'Updated Title' },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Updated Title')
    }
  })

  it('updates image description', async () => {
    const existingImage = { id: '66666666-6666-6666-6666-666666666666', userId: 'test-user-id' }
    const updatedImage = createMockImageRow({ description: 'Updated description' })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedImage]),
          }),
        }),
      }),
    }

    const result = await updateGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '66666666-6666-6666-6666-666666666666',
      { description: 'Updated description' },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBe('Updated description')
    }
  })

  it('clears description when set to null', async () => {
    const existingImage = { id: '66666666-6666-6666-6666-666666666666', userId: 'test-user-id' }
    const updatedImage = createMockImageRow({ description: null })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedImage]),
          }),
        }),
      }),
    }

    const result = await updateGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '66666666-6666-6666-6666-666666666666',
      { description: null },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.description).toBeNull()
    }
  })

  it('updates image tags', async () => {
    const existingImage = { id: '66666666-6666-6666-6666-666666666666', userId: 'test-user-id' }
    const updatedImage = createMockImageRow({ tags: ['tag1', 'tag2'] })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedImage]),
          }),
        }),
      }),
    }

    const result = await updateGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '66666666-6666-6666-6666-666666666666',
      { tags: ['tag1', 'tag2'] },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toEqual(['tag1', 'tag2'])
    }
  })

  it('clears tags when set to null', async () => {
    const existingImage = { id: '66666666-6666-6666-6666-666666666666', userId: 'test-user-id' }
    const updatedImage = createMockImageRow({ tags: null })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedImage]),
          }),
        }),
      }),
    }

    const result = await updateGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '66666666-6666-6666-6666-666666666666',
      { tags: null },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toBeNull()
    }
  })

  it('sets tags to empty array', async () => {
    const existingImage = { id: '66666666-6666-6666-6666-666666666666', userId: 'test-user-id' }
    const updatedImage = createMockImageRow({ tags: [] })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedImage]),
          }),
        }),
      }),
    }

    const result = await updateGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '66666666-6666-6666-6666-666666666666',
      { tags: [] },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tags).toEqual([])
    }
  })

  it('updates albumId to move image to album', async () => {
    const existingImage = { id: '66666666-6666-6666-6666-666666666666', userId: 'test-user-id' }
    const album = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', userId: 'test-user-id' }
    const updatedImage = createMockImageRow({ albumId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' })

    let selectCallCount = 0
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++
            if (selectCallCount === 1) {
              return Promise.resolve([existingImage])
            }
            return Promise.resolve([album])
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedImage]),
          }),
        }),
      }),
    }

    const result = await updateGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '66666666-6666-6666-6666-666666666666',
      { albumId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.albumId).toBe('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
    }
  })

  it('clears albumId when set to null (move to standalone)', async () => {
    const existingImage = { id: '66666666-6666-6666-6666-666666666666', userId: 'test-user-id' }
    const updatedImage = createMockImageRow({ albumId: null })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedImage]),
          }),
        }),
      }),
    }

    const result = await updateGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '66666666-6666-6666-6666-666666666666',
      { albumId: null },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.albumId).toBeNull()
    }
  })

  it('updates lastUpdatedAt even with empty body (AC-4)', async () => {
    const existingImage = { id: '66666666-6666-6666-6666-666666666666', userId: 'test-user-id' }
    const updatedImage = createMockImageRow()

    const mockSetFn = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updatedImage]),
      }),
    })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: mockSetFn,
      }),
    }

    const result = await updateGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '66666666-6666-6666-6666-666666666666',
      {}, // Empty body
    )

    expect(result.success).toBe(true)
    // Verify lastUpdatedAt was set even with empty body
    const setCall = mockSetFn.mock.calls[0][0]
    expect(setCall.lastUpdatedAt).toBeDefined()
    expect(setCall.title).toBeUndefined()
    expect(setCall.description).toBeUndefined()
    expect(setCall.tags).toBeUndefined()
    expect(setCall.albumId).toBeUndefined()
  })

  it('returns NOT_FOUND when image does not exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      update: vi.fn(),
    }

    const result = await updateGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      'nonexistent-image-id',
      { title: 'New Title' },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
      expect(result.message).toBe('Image not found')
    }
  })

  it('returns FORBIDDEN when image belongs to another user', async () => {
    const existingImage = { id: '66666666-6666-6666-6666-666666666666', userId: 'other-user-id' }

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
        }),
      }),
      update: vi.fn(),
    }

    const result = await updateGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '66666666-6666-6666-6666-666666666666',
      { title: 'New Title' },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('FORBIDDEN')
      expect(result.message).toBe('You do not have permission to update this image')
    }
  })

  it('returns VALIDATION_ERROR when albumId does not exist', async () => {
    const existingImage = { id: '66666666-6666-6666-6666-666666666666', userId: 'test-user-id' }

    let selectCallCount = 0
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++
            if (selectCallCount === 1) {
              return Promise.resolve([existingImage])
            }
            return Promise.resolve([]) // Album not found
          }),
        }),
      }),
      update: vi.fn(),
    }

    const result = await updateGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '66666666-6666-6666-6666-666666666666',
      { albumId: 'nonexistent-album-id' },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('VALIDATION_ERROR')
      expect(result.message).toBe('Album not found')
    }
  })

  it('returns FORBIDDEN when albumId belongs to another user', async () => {
    const existingImage = { id: '66666666-6666-6666-6666-666666666666', userId: 'test-user-id' }
    const album = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', userId: 'other-user-id' }

    let selectCallCount = 0
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++
            if (selectCallCount === 1) {
              return Promise.resolve([existingImage])
            }
            return Promise.resolve([album])
          }),
        }),
      }),
      update: vi.fn(),
    }

    const result = await updateGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '66666666-6666-6666-6666-666666666666',
      { albumId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('FORBIDDEN')
      expect(result.message).toBe('Album belongs to another user')
    }
  })

  it('updates only provided fields', async () => {
    const existingImage = { id: '66666666-6666-6666-6666-666666666666', userId: 'test-user-id' }
    const updatedImage = createMockImageRow({ description: 'New description' })

    const mockSetFn = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updatedImage]),
      }),
    })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: mockSetFn,
      }),
    }

    await updateGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '66666666-6666-6666-6666-666666666666',
      { description: 'New description' },
    )

    // Verify only description and lastUpdatedAt were in the update
    const setCall = mockSetFn.mock.calls[0][0]
    expect(setCall.description).toBe('New description')
    expect(setCall.lastUpdatedAt).toBeDefined()
    expect(setCall.title).toBeUndefined()
    expect(setCall.tags).toBeUndefined()
    expect(setCall.albumId).toBeUndefined()
  })

  it('updates multiple fields at once', async () => {
    const existingImage = { id: '66666666-6666-6666-6666-666666666666', userId: 'test-user-id' }
    const updatedImage = createMockImageRow({
      title: 'New Title',
      description: 'New Description',
      tags: ['tag1'],
    })

    const mockSetFn = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updatedImage]),
      }),
    })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: mockSetFn,
      }),
    }

    const result = await updateGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '66666666-6666-6666-6666-666666666666',
      { title: 'New Title', description: 'New Description', tags: ['tag1'] },
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('New Title')
      expect(result.data.description).toBe('New Description')
      expect(result.data.tags).toEqual(['tag1'])
    }

    // Verify all fields were set
    const setCall = mockSetFn.mock.calls[0][0]
    expect(setCall.title).toBe('New Title')
    expect(setCall.description).toBe('New Description')
    expect(setCall.tags).toEqual(['tag1'])
    expect(setCall.lastUpdatedAt).toBeDefined()
  })

  it('handles database errors', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Connection failed')),
        }),
      }),
      update: vi.fn(),
    }

    const result = await updateGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '66666666-6666-6666-6666-666666666666',
      { title: 'New Title' },
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB_ERROR')
      expect(result.message).toBe('Connection failed')
    }
  })
})
