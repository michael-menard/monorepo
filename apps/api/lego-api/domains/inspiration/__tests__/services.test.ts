import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok, err } from '@repo/api-core'
import { createInspirationService } from '../application/services.js'
import type {
  InspirationRepository,
  InspirationImageRepository,
  AlbumRepository,
  AlbumItemRepository,
  AlbumParentRepository,
  InspirationImageStorage,
} from '../ports/index.js'
import type { Inspiration, InspirationImage } from '../types.js'

const mockInspiration: Inspiration = {
  id: 'insp-001',
  userId: 'user-123',
  title: 'Lakehouse',
  description: 'A beautiful lakehouse build',
  imageUrl: 'http://minio:9000/bucket/inspirations/user-123/img.jpg',
  thumbnailUrl: null,
  sourceUrl: 'https://example.com/lakehouse',
  tags: ['building', 'water'],
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockImage: InspirationImage = {
  id: 'img-001',
  inspirationId: 'insp-001',
  imageUrl: 'http://minio:9000/bucket/inspirations/user-123/img.jpg',
  thumbnailUrl: null,
  previewUrl: null,
  originalFilename: 'lakehouse.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 1024000,
  fileHash: 'abc123hash',
  minioKey: 'inspirations/user-123/12345-lakehouse.jpg',
  processingStatus: 'pending',
  sortOrder: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function createMockInspirationRepo(): InspirationRepository {
  return {
    insert: vi.fn().mockResolvedValue(mockInspiration),
    findById: vi.fn().mockResolvedValue(ok(mockInspiration)),
    findByUserId: vi.fn().mockResolvedValue({ items: [mockInspiration], pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } }),
    getMaxSortOrder: vi.fn().mockResolvedValue(0),
    update: vi.fn().mockResolvedValue(ok(mockInspiration)),
    updateSortOrders: vi.fn().mockResolvedValue(ok(1)),
    delete: vi.fn().mockResolvedValue(ok(undefined)),
    verifyOwnership: vi.fn().mockResolvedValue(true),
  }
}

function createMockImageRepo(): InspirationImageRepository {
  return {
    insert: vi.fn().mockResolvedValue(mockImage),
    findByInspirationId: vi.fn().mockResolvedValue([mockImage]),
    findById: vi.fn().mockResolvedValue(ok(mockImage)),
    update: vi.fn().mockResolvedValue(ok(mockImage)),
    delete: vi.fn().mockResolvedValue(ok(undefined)),
    findByHash: vi.fn().mockResolvedValue(null),
    getMaxSortOrder: vi.fn().mockResolvedValue(0),
  }
}

function createMockAlbumRepo(): AlbumRepository {
  return {
    insert: vi.fn(),
    findById: vi.fn(),
    findByIdWithMetadata: vi.fn(),
    findByUserId: vi.fn(),
    existsByTitle: vi.fn().mockResolvedValue(false),
    getMaxSortOrder: vi.fn().mockResolvedValue(0),
    update: vi.fn(),
    updateSortOrders: vi.fn(),
    delete: vi.fn(),
    verifyOwnership: vi.fn().mockResolvedValue(true),
    verifyOwnershipMultiple: vi.fn().mockResolvedValue(true),
  }
}

function createMockAlbumItemRepo(): AlbumItemRepository {
  return {
    addToAlbum: vi.fn().mockResolvedValue(ok(1)),
    removeFromAlbum: vi.fn().mockResolvedValue(ok(1)),
    updateSortOrders: vi.fn().mockResolvedValue(ok(1)),
    getAlbumsForInspiration: vi.fn().mockResolvedValue([]),
    isInAlbum: vi.fn().mockResolvedValue(false),
  }
}

function createMockAlbumParentRepo(): AlbumParentRepository {
  return {
    addParent: vi.fn().mockResolvedValue(ok(undefined)),
    removeParent: vi.fn().mockResolvedValue(ok(undefined)),
    getParents: vi.fn().mockResolvedValue([]),
    getChildren: vi.fn().mockResolvedValue([]),
    getAncestors: vi.fn().mockResolvedValue([]),
    getDepth: vi.fn().mockResolvedValue(0),
  }
}

function createMockImageStorage(): InspirationImageStorage {
  return {
    generateUploadUrl: vi.fn().mockResolvedValue(ok({ presignedUrl: 'https://presigned.url', key: 'test-key', expiresIn: 3600 })),
    buildImageUrl: vi.fn().mockReturnValue('http://minio:9000/bucket/test-key'),
    extractKeyFromUrl: vi.fn().mockReturnValue('test-key'),
    deleteImage: vi.fn().mockResolvedValue(ok(undefined)),
    copyImage: vi.fn().mockResolvedValue(ok({ url: 'http://minio:9000/bucket/copy-key' })),
    generateReadUrl: vi.fn().mockResolvedValue(ok('https://presigned-read.url')),
  }
}

describe('InspirationService', () => {
  let inspirationRepo: InspirationRepository
  let imageRepo: InspirationImageRepository
  let albumRepo: AlbumRepository
  let albumItemRepo: AlbumItemRepository
  let albumParentRepo: AlbumParentRepository
  let imageStorage: InspirationImageStorage
  let service: ReturnType<typeof createInspirationService>

  beforeEach(() => {
    inspirationRepo = createMockInspirationRepo()
    imageRepo = createMockImageRepo()
    albumRepo = createMockAlbumRepo()
    albumItemRepo = createMockAlbumItemRepo()
    albumParentRepo = createMockAlbumParentRepo()
    imageStorage = createMockImageStorage()

    service = createInspirationService({
      inspirationRepo,
      imageRepo,
      albumRepo,
      albumItemRepo,
      albumParentRepo,
      imageStorage,
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // Multi-Image Support
  // ─────────────────────────────────────────────────────────────────────

  describe('addImageToInspiration', () => {
    it('adds an image to an existing inspiration', async () => {
      const result = await service.addImageToInspiration('user-123', 'insp-001', {
        imageUrl: 'http://minio:9000/bucket/img.jpg',
        minioKey: 'inspirations/user-123/img.jpg',
        originalFilename: 'lakehouse.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024000,
        fileHash: 'abc123hash',
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.id).toBe('img-001')
        expect(result.data.processingStatus).toBe('pending')
      }
      expect(imageRepo.insert).toHaveBeenCalledOnce()
    })

    it('rejects if user does not own the inspiration', async () => {
      vi.mocked(inspirationRepo.findById).mockResolvedValue(
        ok({ ...mockInspiration, userId: 'other-user' }),
      )

      const result = await service.addImageToInspiration('user-123', 'insp-001', {
        imageUrl: 'http://minio:9000/bucket/img.jpg',
        minioKey: 'key',
      })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe('FORBIDDEN')
    })

    it('detects duplicate by file hash', async () => {
      vi.mocked(imageRepo.findByHash).mockResolvedValue(mockImage)

      const result = await service.addImageToInspiration('user-123', 'insp-001', {
        imageUrl: 'http://minio:9000/bucket/img.jpg',
        minioKey: 'key',
        fileHash: 'abc123hash',
      })

      expect(result.ok).toBe(false)
    })

    it('returns NOT_FOUND if inspiration does not exist', async () => {
      vi.mocked(inspirationRepo.findById).mockResolvedValue(err('NOT_FOUND'))

      const result = await service.addImageToInspiration('user-123', 'nonexistent', {
        imageUrl: 'http://minio:9000/bucket/img.jpg',
        minioKey: 'key',
      })

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe('NOT_FOUND')
    })
  })

  describe('getInspirationImages', () => {
    it('returns images for an inspiration', async () => {
      const result = await service.getInspirationImages('user-123', 'insp-001')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].id).toBe('img-001')
      }
    })

    it('rejects if user does not own the inspiration', async () => {
      vi.mocked(inspirationRepo.findById).mockResolvedValue(
        ok({ ...mockInspiration, userId: 'other-user' }),
      )

      const result = await service.getInspirationImages('user-123', 'insp-001')

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe('FORBIDDEN')
    })
  })

  describe('removeImageFromInspiration', () => {
    it('removes an image and deletes from storage', async () => {
      const result = await service.removeImageFromInspiration('user-123', 'insp-001', 'img-001')

      expect(result.ok).toBe(true)
      expect(imageStorage.deleteImage).toHaveBeenCalledWith(mockImage.minioKey)
      expect(imageRepo.delete).toHaveBeenCalledWith('img-001')
    })

    it('rejects if image belongs to different inspiration', async () => {
      vi.mocked(imageRepo.findById).mockResolvedValue(
        ok({ ...mockImage, inspirationId: 'other-insp' }),
      )

      const result = await service.removeImageFromInspiration('user-123', 'insp-001', 'img-001')

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe('FORBIDDEN')
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // Duplicate Detection
  // ─────────────────────────────────────────────────────────────────────

  describe('checkDuplicate', () => {
    it('returns isDuplicate: false when no match', async () => {
      const result = await service.checkDuplicate('user-123', 'newhash')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.isDuplicate).toBe(false)
      }
    })

    it('returns isDuplicate: true with existing image when hash matches', async () => {
      vi.mocked(imageRepo.findByHash).mockResolvedValue(mockImage)

      const result = await service.checkDuplicate('user-123', 'abc123hash')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.isDuplicate).toBe(true)
        expect(result.data.existingImage?.id).toBe('img-001')
      }
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // Soft Delete
  // ─────────────────────────────────────────────────────────────────────

  describe('deleteInspiration (soft delete)', () => {
    it('calls delete which sets deleted_at instead of hard deleting', async () => {
      const result = await service.deleteInspiration('user-123', 'insp-001')

      expect(result.ok).toBe(true)
      expect(inspirationRepo.delete).toHaveBeenCalledWith('insp-001')
    })

    it('rejects if user does not own the inspiration', async () => {
      vi.mocked(inspirationRepo.findById).mockResolvedValue(
        ok({ ...mockInspiration, userId: 'other-user' }),
      )

      const result = await service.deleteInspiration('user-123', 'insp-001')

      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe('FORBIDDEN')
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // Inspiration CRUD
  // ─────────────────────────────────────────────────────────────────────

  describe('createInspiration', () => {
    it('creates an inspiration with correct sort order', async () => {
      vi.mocked(inspirationRepo.getMaxSortOrder).mockResolvedValue(5)

      await service.createInspiration('user-123', {
        title: 'New Inspiration',
        imageUrl: 'http://minio:9000/bucket/img.jpg',
        tags: ['castle'],
      })

      expect(inspirationRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          title: 'New Inspiration',
          sortOrder: 6,
        }),
      )
    })
  })

  describe('updateInspiration', () => {
    it('updates an inspiration owned by the user', async () => {
      vi.mocked(inspirationRepo.update).mockResolvedValue(
        ok({ ...mockInspiration, title: 'Updated Title' }),
      )

      const result = await service.updateInspiration('user-123', 'insp-001', {
        title: 'Updated Title',
      })

      expect(result.ok).toBe(true)
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // Presigned URL Generation
  // ─────────────────────────────────────────────────────────────────────

  describe('generateImageUploadUrl', () => {
    it('generates a presigned URL for image upload', async () => {
      const result = await service.generateImageUploadUrl('user-123', 'photo.jpg', 'image/jpeg')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.presignedUrl).toBe('https://presigned.url')
        expect(result.data.key).toBe('test-key')
      }
    })
  })
})
