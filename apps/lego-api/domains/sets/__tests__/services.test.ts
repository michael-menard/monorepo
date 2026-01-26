import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSetsService } from '../services.js'
import type { SetRepository, SetImageRepository, ImageStorage } from '../ports.js'
import type { Set, SetImage } from '../types.js'

/**
 * Sets Service Unit Tests
 *
 * Tests business logic using mock repositories/storage.
 * No real database or S3 calls.
 */

// Mock implementations
const mockSet: Set = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: 'user-123',
  title: 'Millennium Falcon',
  setNumber: '75192',
  store: 'LEGO Store',
  sourceUrl: 'https://lego.com/product/75192',
  pieceCount: 7541,
  releaseDate: new Date('2017-10-01'),
  theme: 'Star Wars',
  tags: ['UCS', 'Star Wars', 'Display'],
  notes: 'Ultimate Collector Series',
  isBuilt: true,
  quantity: 1,
  purchasePrice: '799.99',
  tax: '64.00',
  shipping: '0.00',
  purchaseDate: new Date('2017-10-15'),
  wishlistItemId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockSetImage: SetImage = {
  id: 'img-123',
  setId: '123e4567-e89b-12d3-a456-426614174000',
  imageUrl: 'https://bucket.s3.amazonaws.com/sets/user-123/123e4567/img-123.webp',
  thumbnailUrl: 'https://bucket.s3.amazonaws.com/sets/user-123/123e4567/thumbnails/img-123.webp',
  position: 0,
  createdAt: new Date(),
}

function createMockSetRepo(): SetRepository {
  return {
    findById: vi.fn().mockResolvedValue({ ok: true, data: mockSet }),
    findByUserId: vi.fn().mockResolvedValue({
      items: [mockSet],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasMore: false },
    }),
    insert: vi.fn().mockResolvedValue(mockSet),
    update: vi.fn().mockResolvedValue({ ok: true, data: mockSet }),
    delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  }
}

function createMockSetImageRepo(): SetImageRepository {
  return {
    findById: vi.fn().mockResolvedValue({ ok: true, data: mockSetImage }),
    findBySetId: vi.fn().mockResolvedValue([mockSetImage]),
    insert: vi.fn().mockResolvedValue(mockSetImage),
    update: vi.fn().mockResolvedValue({ ok: true, data: mockSetImage }),
    delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    deleteBySetId: vi.fn().mockResolvedValue(undefined),
    getNextPosition: vi.fn().mockResolvedValue(1),
  }
}

function createMockStorage(): ImageStorage {
  return {
    upload: vi.fn().mockResolvedValue({ ok: true, data: { url: 'https://bucket.s3.amazonaws.com/test.webp' } }),
    delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    extractKeyFromUrl: vi.fn().mockReturnValue('sets/user-123/123e4567/test.webp'),
  }
}

describe('SetsService', () => {
  let setRepo: SetRepository
  let setImageRepo: SetImageRepository
  let imageStorage: ImageStorage
  let service: ReturnType<typeof createSetsService>

  beforeEach(() => {
    setRepo = createMockSetRepo()
    setImageRepo = createMockSetImageRepo()
    imageStorage = createMockStorage()
    service = createSetsService({ setRepo, setImageRepo, imageStorage })
  })

  describe('getSet', () => {
    it('returns set when user owns it', async () => {
      const result = await service.getSet('user-123', mockSet.id)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.id).toBe(mockSet.id)
      }
    })

    it('returns FORBIDDEN when user does not own set', async () => {
      const result = await service.getSet('other-user', mockSet.id)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
    })

    it('returns NOT_FOUND when set does not exist', async () => {
      vi.mocked(setRepo.findById).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })

      const result = await service.getSet('user-123', 'nonexistent')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })
  })

  describe('getSetWithImages', () => {
    it('returns set with images when user owns it', async () => {
      const result = await service.getSetWithImages('user-123', mockSet.id)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.set.id).toBe(mockSet.id)
        expect(result.data.images).toHaveLength(1)
      }
    })

    it('returns FORBIDDEN when user does not own set', async () => {
      const result = await service.getSetWithImages('other-user', mockSet.id)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
    })
  })

  describe('listSets', () => {
    it('returns paginated sets for user', async () => {
      const result = await service.listSets('user-123', { page: 1, limit: 20 })

      expect(result.items).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
      expect(setRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        undefined
      )
    })

    it('passes filters to repository', async () => {
      await service.listSets('user-123', { page: 1, limit: 20 }, { theme: 'Star Wars', isBuilt: true })

      expect(setRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { theme: 'Star Wars', isBuilt: true }
      )
    })
  })

  describe('createSet', () => {
    it('creates set for user', async () => {
      const result = await service.createSet('user-123', { title: 'New Set' })

      expect(result.ok).toBe(true)
      expect(setRepo.insert).toHaveBeenCalled()
    })

    it('returns DB_ERROR on database failure', async () => {
      vi.mocked(setRepo.insert).mockRejectedValue(new Error('DB error'))

      const result = await service.createSet('user-123', { title: 'New Set' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('DB_ERROR')
      }
    })
  })

  describe('updateSet', () => {
    it('updates set when user owns it', async () => {
      const result = await service.updateSet('user-123', mockSet.id, { title: 'Updated Title' })

      expect(result.ok).toBe(true)
      expect(setRepo.update).toHaveBeenCalledWith(mockSet.id, { title: 'Updated Title' })
    })

    it('returns FORBIDDEN when user does not own set', async () => {
      const result = await service.updateSet('other-user', mockSet.id, { title: 'Hacked' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
      expect(setRepo.update).not.toHaveBeenCalled()
    })
  })

  describe('deleteSet', () => {
    it('deletes set and S3 files when user owns it', async () => {
      const result = await service.deleteSet('user-123', mockSet.id)

      expect(result.ok).toBe(true)
      expect(imageStorage.delete).toHaveBeenCalled()
      expect(setImageRepo.deleteBySetId).toHaveBeenCalledWith(mockSet.id)
      expect(setRepo.delete).toHaveBeenCalledWith(mockSet.id)
    })

    it('returns FORBIDDEN when user does not own set', async () => {
      const result = await service.deleteSet('other-user', mockSet.id)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
      expect(setRepo.delete).not.toHaveBeenCalled()
    })
  })

  describe('uploadSetImage', () => {
    it('uploads image when user owns set', async () => {
      const file = {
        buffer: Buffer.from('test'),
        filename: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
      }

      const result = await service.uploadSetImage('user-123', mockSet.id, file)

      expect(result.ok).toBe(true)
      expect(imageStorage.upload).toHaveBeenCalled()
      expect(setImageRepo.insert).toHaveBeenCalled()
    })

    it('returns FORBIDDEN when user does not own set', async () => {
      const file = {
        buffer: Buffer.from('test'),
        filename: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
      }

      const result = await service.uploadSetImage('other-user', mockSet.id, file)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
    })

    it('rejects invalid file types', async () => {
      const file = {
        buffer: Buffer.from('test'),
        filename: 'test.exe',
        mimetype: 'application/x-msdownload',
        size: 1000,
      }

      const result = await service.uploadSetImage('user-123', mockSet.id, file)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('INVALID_FILE')
      }
    })

    it('rejects files over size limit', async () => {
      const file = {
        buffer: Buffer.from('test'),
        filename: 'big.jpg',
        mimetype: 'image/jpeg',
        size: 20 * 1024 * 1024, // 20MB
      }

      const result = await service.uploadSetImage('user-123', mockSet.id, file)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('INVALID_FILE')
      }
    })
  })

  describe('deleteSetImage', () => {
    it('deletes image when user owns parent set', async () => {
      const result = await service.deleteSetImage('user-123', mockSetImage.id)

      expect(result.ok).toBe(true)
      expect(imageStorage.delete).toHaveBeenCalled()
      expect(setImageRepo.delete).toHaveBeenCalledWith(mockSetImage.id)
    })

    it('returns FORBIDDEN when user does not own parent set', async () => {
      // Set up: image exists but parent set belongs to different user
      vi.mocked(setRepo.findById).mockResolvedValue({
        ok: true,
        data: { ...mockSet, userId: 'other-user' },
      })

      const result = await service.deleteSetImage('user-123', mockSetImage.id)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
      expect(setImageRepo.delete).not.toHaveBeenCalled()
    })
  })

  describe('listSetImages', () => {
    it('returns images for owned set', async () => {
      const result = await service.listSetImages('user-123', mockSet.id)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toHaveLength(1)
      }
    })

    it('returns FORBIDDEN when user does not own set', async () => {
      const result = await service.listSetImages('other-user', mockSet.id)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
    })
  })
})
