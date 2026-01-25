import { describe, it, expect, vi } from 'vitest'
import { flagGalleryImage } from '../flag-image.js'

// Mock schema
const mockSchema = {
  galleryImages: {
    id: 'id',
  },
  galleryFlags: {
    id: 'id',
    imageId: 'image_id',
    userId: 'user_id',
    reason: 'reason',
    createdAt: 'created_at',
    lastUpdatedAt: 'last_updated_at',
  },
}

// Helper to create mock flag row
function createMockFlagRow(overrides: Partial<any> = {}) {
  const now = new Date()
  return {
    id: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    imageId: '11111111-1111-1111-1111-111111111111',
    userId: 'test-user-id',
    reason: null,
    createdAt: now,
    lastUpdatedAt: now,
    ...overrides,
  }
}

describe('flagGalleryImage', () => {
  it('creates flag record successfully', async () => {
    const mockFlag = createMockFlagRow()

    let selectCallCount = 0
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++
            if (selectCallCount === 1) {
              // Image exists
              return Promise.resolve([{ id: '11111111-1111-1111-1111-111111111111' }])
            }
            // No existing flag
            return Promise.resolve([])
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockFlag]),
        }),
      }),
    }

    const result = await flagGalleryImage(mockDb as any, mockSchema, 'test-user-id', {
      imageId: '11111111-1111-1111-1111-111111111111',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.imageId).toBe('11111111-1111-1111-1111-111111111111')
      expect(result.data.userId).toBe('test-user-id')
      expect(result.data.reason).toBeNull()
    }
  })

  it('creates flag with optional reason', async () => {
    const mockFlag = createMockFlagRow({ reason: 'Inappropriate content' })

    let selectCallCount = 0
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++
            if (selectCallCount === 1) {
              return Promise.resolve([{ id: '11111111-1111-1111-1111-111111111111' }])
            }
            return Promise.resolve([])
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockFlag]),
        }),
      }),
    }

    const result = await flagGalleryImage(mockDb as any, mockSchema, 'test-user-id', {
      imageId: '11111111-1111-1111-1111-111111111111',
      reason: 'Inappropriate content',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reason).toBe('Inappropriate content')
    }
  })

  it('creates flag without reason (null)', async () => {
    const mockFlag = createMockFlagRow({ reason: null })

    let selectCallCount = 0
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++
            if (selectCallCount === 1) {
              return Promise.resolve([{ id: '11111111-1111-1111-1111-111111111111' }])
            }
            return Promise.resolve([])
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockFlag]),
        }),
      }),
    }

    const result = await flagGalleryImage(mockDb as any, mockSchema, 'test-user-id', {
      imageId: '11111111-1111-1111-1111-111111111111',
      reason: null,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.reason).toBeNull()
    }
  })

  it('returns NOT_FOUND for non-existent image', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      }),
      insert: vi.fn(),
    }

    const result = await flagGalleryImage(mockDb as any, mockSchema, 'test-user-id', {
      imageId: '99999999-9999-9999-9999-999999999999',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
      expect(result.message).toBe('Image not found')
    }
  })

  it('returns CONFLICT for duplicate flag', async () => {
    let selectCallCount = 0
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++
            if (selectCallCount === 1) {
              // Image exists
              return Promise.resolve([{ id: '11111111-1111-1111-1111-111111111111' }])
            }
            // Existing flag found
            return Promise.resolve([{ id: 'existing-flag-id' }])
          }),
        }),
      }),
      insert: vi.fn(),
    }

    const result = await flagGalleryImage(mockDb as any, mockSchema, 'test-user-id', {
      imageId: '11111111-1111-1111-1111-111111111111',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('CONFLICT')
      expect(result.message).toBe('You have already flagged this image')
    }
  })

  it('returns CONFLICT when unique constraint is violated', async () => {
    let selectCallCount = 0
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++
            if (selectCallCount === 1) {
              return Promise.resolve([{ id: '11111111-1111-1111-1111-111111111111' }])
            }
            return Promise.resolve([])
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('23505 unique constraint violation')),
        }),
      }),
    }

    const result = await flagGalleryImage(mockDb as any, mockSchema, 'test-user-id', {
      imageId: '11111111-1111-1111-1111-111111111111',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('CONFLICT')
      expect(result.message).toBe('You have already flagged this image')
    }
  })

  it('returns DB_ERROR when database throws', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('Connection failed')),
        }),
      }),
      insert: vi.fn(),
    }

    const result = await flagGalleryImage(mockDb as any, mockSchema, 'test-user-id', {
      imageId: '11111111-1111-1111-1111-111111111111',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('DB_ERROR')
      expect(result.message).toBe('Connection failed')
    }
  })

  it('transforms dates to ISO strings', async () => {
    const now = new Date('2026-01-18T12:00:00.000Z')
    const mockFlag = createMockFlagRow({
      createdAt: now,
      lastUpdatedAt: now,
    })

    let selectCallCount = 0
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++
            if (selectCallCount === 1) {
              return Promise.resolve([{ id: '11111111-1111-1111-1111-111111111111' }])
            }
            return Promise.resolve([])
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockFlag]),
        }),
      }),
    }

    const result = await flagGalleryImage(mockDb as any, mockSchema, 'test-user-id', {
      imageId: '11111111-1111-1111-1111-111111111111',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.createdAt).toBe('2026-01-18T12:00:00.000Z')
      expect(result.data.lastUpdatedAt).toBe('2026-01-18T12:00:00.000Z')
    }
  })
})
