import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createWishlistService } from '../application/services.js'
import type { WishlistRepository, WishlistImageStorage } from '../ports/index.js'
import type { WishlistItem } from '../types.js'

/**
 * Create a mock WishlistImageStorage with all required methods
 */
function createMockImageStorage(overrides: Partial<WishlistImageStorage> = {}): WishlistImageStorage {
  return {
    generateUploadUrl: vi.fn().mockResolvedValue({
      ok: true,
      data: { presignedUrl: 'https://s3.test/presigned', key: 'wishlist/test/img.jpg', expiresIn: 900 },
    }),
    buildImageUrl: vi.fn().mockReturnValue('https://bucket.s3.amazonaws.com/test.jpg'),
    copyImage: vi.fn().mockResolvedValue({ ok: true, data: { url: 'https://bucket.s3.amazonaws.com/dest.jpg' } }),
    deleteImage: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    extractKeyFromUrl: vi.fn().mockReturnValue('wishlist/user-123/test.jpg'),
    ...overrides,
  }
}

/**
 * Wishlist Service Unit Tests
 *
 * Tests business logic using mock repositories.
 * No real database calls.
 */

// Mock implementations
const mockItem: WishlistItem = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: 'user-123',
  title: 'LEGO Star Wars Millennium Falcon',
  store: 'LEGO',
  setNumber: '75192',
  sourceUrl: 'https://lego.com/75192',
  imageUrl: 'https://bucket.s3.amazonaws.com/wishlist/user-123/75192.webp',
  imageVariants: null, // WISH-2016
  price: '849.99',
  currency: 'USD',
  pieceCount: 7541,
  releaseDate: new Date('2017-10-01'),
  tags: ['star-wars', 'ultimate-collector'],
  priority: 5,
  notes: 'Wait for VIP double points',
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

function createMockWishlistRepo(): WishlistRepository {
  return {
    findById: vi.fn().mockResolvedValue({ ok: true, data: mockItem }),
    findByUserId: vi.fn().mockResolvedValue({
      items: [mockItem],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasMore: false },
    }),
    insert: vi.fn().mockResolvedValue(mockItem),
    update: vi.fn().mockResolvedValue({ ok: true, data: mockItem }),
    delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    getMaxSortOrder: vi.fn().mockResolvedValue(0),
    updateSortOrders: vi.fn().mockResolvedValue({ ok: true, data: 2 }),
    verifyOwnership: vi.fn().mockResolvedValue(true),
  }
}

describe('WishlistService', () => {
  let wishlistRepo: WishlistRepository
  let service: ReturnType<typeof createWishlistService>

  beforeEach(() => {
    wishlistRepo = createMockWishlistRepo()
    service = createWishlistService({ wishlistRepo })
  })

  describe('getItem', () => {
    it('returns item when user owns it', async () => {
      const result = await service.getItem('user-123', mockItem.id)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.id).toBe(mockItem.id)
      }
    })

    it('returns FORBIDDEN when user does not own item', async () => {
      const result = await service.getItem('other-user', mockItem.id)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
    })

    it('returns NOT_FOUND when item does not exist', async () => {
      vi.mocked(wishlistRepo.findById).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })

      const result = await service.getItem('user-123', 'nonexistent')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })
  })

  describe('listItems', () => {
    it('returns paginated items for user', async () => {
      const result = await service.listItems('user-123', { page: 1, limit: 20 })

      expect(result.items).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        undefined
      )
    })

    it('passes filters to repository', async () => {
      await service.listItems('user-123', { page: 1, limit: 20 }, { store: 'LEGO', priority: 5 })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { store: 'LEGO', priority: 5 }
      )
    })
  })

  describe('createItem', () => {
    it('creates item with auto-incremented sortOrder', async () => {
      vi.mocked(wishlistRepo.getMaxSortOrder).mockResolvedValue(5)

      const result = await service.createItem('user-123', {
        title: 'New Set',
        store: 'LEGO',
        currency: 'USD',
        tags: [],
        priority: 0,
      })

      expect(result.ok).toBe(true)
      expect(wishlistRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          title: 'New Set',
          store: 'LEGO',
          sortOrder: 6, // maxSortOrder + 1
        })
      )
    })

    it('uses default values for optional fields', async () => {
      await service.createItem('user-123', {
        title: 'New Set',
        store: 'LEGO',
        currency: 'USD',
        tags: [],
        priority: 0,
      })

      expect(wishlistRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'USD',
          priority: 0,
          tags: [],
        })
      )
    })
  })

  describe('updateItem', () => {
    it('updates item when user owns it', async () => {
      const result = await service.updateItem('user-123', mockItem.id, {
        title: 'Updated Title',
        priority: 3,
      })

      expect(result.ok).toBe(true)
      expect(wishlistRepo.update).toHaveBeenCalledWith(mockItem.id, {
        title: 'Updated Title',
        priority: 3,
      })
    })

    it('returns FORBIDDEN when user does not own item', async () => {
      const result = await service.updateItem('other-user', mockItem.id, {
        title: 'Updated Title',
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
      expect(wishlistRepo.update).not.toHaveBeenCalled()
    })
  })

  describe('deleteItem', () => {
    it('deletes item when user owns it', async () => {
      const result = await service.deleteItem('user-123', mockItem.id)

      expect(result.ok).toBe(true)
      expect(wishlistRepo.delete).toHaveBeenCalledWith(mockItem.id)
    })

    it('returns FORBIDDEN when user does not own item', async () => {
      const result = await service.deleteItem('other-user', mockItem.id)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
      expect(wishlistRepo.delete).not.toHaveBeenCalled()
    })
  })

  describe('reorderItems', () => {
    it('reorders items when user owns all', async () => {
      const result = await service.reorderItems('user-123', {
        items: [
          { id: 'item-1', sortOrder: 0 },
          { id: 'item-2', sortOrder: 1 },
        ],
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.updated).toBe(2)
      }
      expect(wishlistRepo.verifyOwnership).toHaveBeenCalledWith('user-123', ['item-1', 'item-2'])
      expect(wishlistRepo.updateSortOrders).toHaveBeenCalled()
    })

    it('returns VALIDATION_ERROR when user does not own all items', async () => {
      vi.mocked(wishlistRepo.verifyOwnership).mockResolvedValue(false)

      const result = await service.reorderItems('user-123', {
        items: [
          { id: 'item-1', sortOrder: 0 },
          { id: 'other-users-item', sortOrder: 1 },
        ],
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('VALIDATION_ERROR')
      }
      expect(wishlistRepo.updateSortOrders).not.toHaveBeenCalled()
    })
  })

  describe('generateImageUploadUrl', () => {
    it('generates presigned URL with imageStorage configured', async () => {
      const mockImageStorage = createMockImageStorage({
        generateUploadUrl: vi.fn().mockResolvedValue({
          ok: true,
          data: {
            presignedUrl: 'https://s3.amazonaws.com/presigned-url',
            key: 'wishlist/user-123/12345.jpg',
            expiresIn: 900,
          },
        }),
      })

      const serviceWithStorage = createWishlistService({
        wishlistRepo,
        imageStorage: mockImageStorage,
      })

      const result = await serviceWithStorage.generateImageUploadUrl(
        'user-123',
        'test.jpg',
        'image/jpeg'
      )

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.presignedUrl).toBe('https://s3.amazonaws.com/presigned-url')
        expect(result.data.key).toBe('wishlist/user-123/12345.jpg')
        expect(result.data.expiresIn).toBe(900)
      }
      // WISH-2013: Now includes optional fileSize parameter
      expect(mockImageStorage.generateUploadUrl).toHaveBeenCalledWith(
        'user-123',
        'test.jpg',
        'image/jpeg',
        undefined
      )
    })

    it('returns PRESIGN_FAILED when imageStorage is not configured', async () => {
      // Service without imageStorage
      const serviceWithoutStorage = createWishlistService({ wishlistRepo })

      const result = await serviceWithoutStorage.generateImageUploadUrl(
        'user-123',
        'test.jpg',
        'image/jpeg'
      )

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('PRESIGN_FAILED')
      }
    })

    it('propagates INVALID_EXTENSION error from storage adapter', async () => {
      const mockImageStorage = createMockImageStorage({
        generateUploadUrl: vi.fn().mockResolvedValue({
          ok: false,
          error: 'INVALID_EXTENSION',
        }),
      })

      const serviceWithStorage = createWishlistService({
        wishlistRepo,
        imageStorage: mockImageStorage,
      })

      const result = await serviceWithStorage.generateImageUploadUrl(
        'user-123',
        'test.pdf',
        'application/pdf'
      )

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('INVALID_EXTENSION')
      }
    })

    it('propagates INVALID_MIME_TYPE error from storage adapter', async () => {
      const mockImageStorage = createMockImageStorage({
        generateUploadUrl: vi.fn().mockResolvedValue({
          ok: false,
          error: 'INVALID_MIME_TYPE',
        }),
      })

      const serviceWithStorage = createWishlistService({
        wishlistRepo,
        imageStorage: mockImageStorage,
      })

      const result = await serviceWithStorage.generateImageUploadUrl(
        'user-123',
        'test.jpg',
        'video/mp4'
      )

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('INVALID_MIME_TYPE')
      }
    })

    it('propagates PRESIGN_FAILED error from storage adapter', async () => {
      const mockImageStorage = createMockImageStorage({
        generateUploadUrl: vi.fn().mockResolvedValue({
          ok: false,
          error: 'PRESIGN_FAILED',
        }),
      })

      const serviceWithStorage = createWishlistService({
        wishlistRepo,
        imageStorage: mockImageStorage,
      })

      const result = await serviceWithStorage.generateImageUploadUrl(
        'user-123',
        'test.jpg',
        'image/jpeg'
      )

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('PRESIGN_FAILED')
      }
    })
  })

  describe('buildImageUrl', () => {
    it('builds image URL when imageStorage is configured', () => {
      const mockImageStorage = createMockImageStorage({
        buildImageUrl: vi.fn().mockReturnValue('https://bucket.s3.amazonaws.com/wishlist/user-123/test.jpg'),
      })

      const serviceWithStorage = createWishlistService({
        wishlistRepo,
        imageStorage: mockImageStorage,
      })

      const url = serviceWithStorage.buildImageUrl('wishlist/user-123/test.jpg')

      expect(url).toBe('https://bucket.s3.amazonaws.com/wishlist/user-123/test.jpg')
      expect(mockImageStorage.buildImageUrl).toHaveBeenCalledWith('wishlist/user-123/test.jpg')
    })

    it('returns null when imageStorage is not configured', () => {
      // Service without imageStorage
      const serviceWithoutStorage = createWishlistService({ wishlistRepo })

      const url = serviceWithoutStorage.buildImageUrl('wishlist/user-123/test.jpg')

      expect(url).toBeNull()
    })
  })
})
