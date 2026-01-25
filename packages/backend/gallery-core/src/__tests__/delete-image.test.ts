import { describe, it, expect, vi } from 'vitest'
import { deleteGalleryImage } from '../delete-image.js'

// Mock schema
const mockSchema = {
  galleryImages: {
    id: 'id',
    userId: 'user_id',
    imageUrl: 'image_url',
    thumbnailUrl: 'thumbnail_url',
  },
  galleryAlbums: {
    id: 'id',
    coverImageId: 'cover_image_id',
  },
}

describe('deleteGalleryImage', () => {
  it('deletes image successfully and returns URLs', async () => {
    const existingImage = {
      id: '77777777-7777-7777-7777-777777777777',
      userId: 'test-user-id',
      imageUrl: 'https://example.com/images/test.jpg',
      thumbnailUrl: 'https://example.com/thumbs/test.jpg',
    }

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
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

    const result = await deleteGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '77777777-7777-7777-7777-777777777777',
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.imageUrl).toBe('https://example.com/images/test.jpg')
      expect(result.thumbnailUrl).toBe('https://example.com/thumbs/test.jpg')
    }
  })

  it('returns null thumbnailUrl when image has no thumbnail', async () => {
    const existingImage = {
      id: '77777777-7777-7777-7777-777777777777',
      userId: 'test-user-id',
      imageUrl: 'https://example.com/images/test.jpg',
      thumbnailUrl: null,
    }

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
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

    const result = await deleteGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '77777777-7777-7777-7777-777777777777',
    )

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.thumbnailUrl).toBeNull()
    }
  })

  it('clears coverImageId on albums before deleting (AC-6)', async () => {
    const existingImage = {
      id: '88888888-8888-8888-8888-888888888888',
      userId: 'test-user-id',
      imageUrl: 'https://example.com/images/cover.jpg',
      thumbnailUrl: 'https://example.com/thumbs/cover.jpg',
    }

    const mockUpdateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    })

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: mockUpdateSet,
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }

    await deleteGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '88888888-8888-8888-8888-888888888888',
    )

    // Verify coverImageId was cleared on albums
    expect(mockUpdateSet).toHaveBeenCalledWith({ coverImageId: null })
  })

  it('returns NOT_FOUND when image does not exist', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      update: vi.fn(),
      delete: vi.fn(),
    }

    const result = await deleteGalleryImage(
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

  it('returns FORBIDDEN when image belongs to another user', async () => {
    const existingImage = {
      id: '77777777-7777-7777-7777-777777777777',
      userId: 'other-user-id',
      imageUrl: 'https://example.com/images/test.jpg',
      thumbnailUrl: 'https://example.com/thumbs/test.jpg',
    }

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
        }),
      }),
      update: vi.fn(),
      delete: vi.fn(),
    }

    const result = await deleteGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '77777777-7777-7777-7777-777777777777',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('FORBIDDEN')
      expect(result.message).toBe('You do not have permission to delete this image')
    }
  })

  it('returns DB_ERROR when delete fails', async () => {
    const existingImage = {
      id: '77777777-7777-7777-7777-777777777777',
      userId: 'test-user-id',
      imageUrl: 'https://example.com/images/test.jpg',
      thumbnailUrl: 'https://example.com/thumbs/test.jpg',
    }

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
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

    const result = await deleteGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '77777777-7777-7777-7777-777777777777',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB_ERROR')
      expect(result.message).toBe('DB connection failed')
    }
  })

  it('returns DB_ERROR when update (coverImageId clear) fails', async () => {
    const existingImage = {
      id: '77777777-7777-7777-7777-777777777777',
      userId: 'test-user-id',
      imageUrl: 'https://example.com/images/test.jpg',
      thumbnailUrl: 'https://example.com/thumbs/test.jpg',
    }

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Update failed')),
        }),
      }),
      delete: vi.fn(),
    }

    const result = await deleteGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '77777777-7777-7777-7777-777777777777',
    )

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB_ERROR')
      expect(result.message).toBe('Update failed')
    }
  })

  it('calls update before delete (order matters for FK constraints)', async () => {
    const existingImage = {
      id: '77777777-7777-7777-7777-777777777777',
      userId: 'test-user-id',
      imageUrl: 'https://example.com/images/test.jpg',
      thumbnailUrl: 'https://example.com/thumbs/test.jpg',
    }

    const callOrder: string[] = []

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([existingImage]),
        }),
      }),
      update: vi.fn().mockImplementation(() => {
        callOrder.push('update')
        return {
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }
      }),
      delete: vi.fn().mockImplementation(() => {
        callOrder.push('delete')
        return {
          where: vi.fn().mockResolvedValue(undefined),
        }
      }),
    }

    await deleteGalleryImage(
      mockDb as any,
      mockSchema,
      'test-user-id',
      '77777777-7777-7777-7777-777777777777',
    )

    // Verify update (clear coverImageId) is called before delete
    expect(callOrder).toEqual(['update', 'delete'])
  })
})
