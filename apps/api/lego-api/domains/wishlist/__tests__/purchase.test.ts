import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createWishlistService } from '../application/services.js'
import type { WishlistRepository, WishlistImageStorage } from '../ports/index.js'
import type { WishlistItem } from '../types.js'
import type { SetsService } from '../../sets/application/services.js'
import type { Set as SetItem } from '../../sets/types.js'

/**
 * Purchase Flow (markAsPurchased) Unit Tests - WISH-2042
 *
 * Tests the cross-domain purchase transaction logic using mock dependencies.
 */

// Mock wishlist item
const mockWishlistItem: WishlistItem = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: 'user-123',
  title: 'LEGO Star Wars Millennium Falcon',
  store: 'LEGO',
  setNumber: '75192',
  sourceUrl: 'https://lego.com/75192',
  imageUrl: 'https://bucket.s3.amazonaws.com/wishlist/user-123/75192.webp',
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

// Mock Set item (result of purchase)
const mockSetItem: SetItem = {
  id: 'set-123e4567-e89b-12d3-a456-426614174000',
  userId: 'user-123',
  title: 'LEGO Star Wars Millennium Falcon',
  setNumber: '75192',
  store: 'LEGO',
  sourceUrl: 'https://lego.com/75192',
  pieceCount: 7541,
  releaseDate: new Date('2017-10-01'),
  theme: null,
  tags: ['star-wars', 'ultimate-collector'],
  notes: 'Wait for VIP double points',
  isBuilt: false,
  quantity: 1,
  purchasePrice: '849.99',
  tax: null,
  shipping: null,
  purchaseDate: new Date(),
  wishlistItemId: '123e4567-e89b-12d3-a456-426614174000',
  createdAt: new Date(),
  updatedAt: new Date(),
}

function createMockWishlistRepo(): WishlistRepository {
  return {
    findById: vi.fn().mockResolvedValue({ ok: true, data: mockWishlistItem }),
    findByUserId: vi.fn().mockResolvedValue({
      items: [mockWishlistItem],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasMore: false },
    }),
    insert: vi.fn().mockResolvedValue(mockWishlistItem),
    update: vi.fn().mockResolvedValue({ ok: true, data: mockWishlistItem }),
    delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    getMaxSortOrder: vi.fn().mockResolvedValue(0),
    updateSortOrders: vi.fn().mockResolvedValue({ ok: true, data: 2 }),
    verifyOwnership: vi.fn().mockResolvedValue(true),
  }
}

function createMockImageStorage(): WishlistImageStorage {
  return {
    generateUploadUrl: vi.fn().mockResolvedValue({
      ok: true,
      data: { presignedUrl: 'https://s3.test/presigned', key: 'wishlist/test/img.jpg', expiresIn: 900 },
    }),
    buildImageUrl: vi.fn().mockReturnValue('https://bucket.s3.amazonaws.com/test.jpg'),
    copyImage: vi.fn().mockResolvedValue({ ok: true, data: { url: 'https://bucket.s3.amazonaws.com/sets/dest.jpg' } }),
    deleteImage: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    extractKeyFromUrl: vi.fn().mockReturnValue('wishlist/user-123/75192.webp'),
  }
}

function createMockSetsService(): SetsService {
  return {
    createSet: vi.fn().mockResolvedValue({ ok: true, data: mockSetItem }),
    getSet: vi.fn().mockResolvedValue({ ok: true, data: mockSetItem }),
    getSetWithImages: vi.fn().mockResolvedValue({ ok: true, data: { set: mockSetItem, images: [] } }),
    listSets: vi.fn().mockResolvedValue({ items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    updateSet: vi.fn().mockResolvedValue({ ok: true, data: mockSetItem }),
    deleteSet: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    uploadSetImage: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    getSetImage: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    listSetImages: vi.fn().mockResolvedValue({ ok: true, data: [] }),
    updateSetImage: vi.fn().mockResolvedValue({ ok: true, data: {} }),
    deleteSetImage: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  } as unknown as SetsService
}

describe('WishlistService.markAsPurchased', () => {
  let wishlistRepo: WishlistRepository
  let imageStorage: WishlistImageStorage
  let setsService: SetsService
  let service: ReturnType<typeof createWishlistService>

  beforeEach(() => {
    wishlistRepo = createMockWishlistRepo()
    imageStorage = createMockImageStorage()
    setsService = createMockSetsService()
    service = createWishlistService({
      wishlistRepo,
      imageStorage,
      setsService,
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Happy Path Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('Happy Path', () => {
    it('creates Set with correct data from wishlist item', async () => {
      const result = await service.markAsPurchased('user-123', mockWishlistItem.id, {
        pricePaid: '799.99',
        tax: '64.00',
        shipping: '0.00',
        quantity: 1,
        keepOnWishlist: false,
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.id).toBe(mockSetItem.id)
      }

      expect(setsService.createSet).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          title: mockWishlistItem.title,
          setNumber: mockWishlistItem.setNumber,
          store: mockWishlistItem.store,
          purchasePrice: '799.99',
          tax: '64.00',
          shipping: '0.00',
          quantity: 1,
          wishlistItemId: mockWishlistItem.id,
        }),
      )
    })

    it('deletes wishlist item when keepOnWishlist is false', async () => {
      await service.markAsPurchased('user-123', mockWishlistItem.id, {
        quantity: 1,
        keepOnWishlist: false,
      })

      expect(wishlistRepo.delete).toHaveBeenCalledWith(mockWishlistItem.id)
    })

    it('keeps wishlist item when keepOnWishlist is true', async () => {
      await service.markAsPurchased('user-123', mockWishlistItem.id, {
        quantity: 1,
        keepOnWishlist: true,
      })

      expect(wishlistRepo.delete).not.toHaveBeenCalled()
    })

    it('copies image to Sets S3 key when imageUrl exists', async () => {
      await service.markAsPurchased('user-123', mockWishlistItem.id, {
        quantity: 1,
        keepOnWishlist: false,
      })

      expect(imageStorage.extractKeyFromUrl).toHaveBeenCalledWith(mockWishlistItem.imageUrl)
      expect(imageStorage.copyImage).toHaveBeenCalledWith(
        'wishlist/user-123/75192.webp',
        expect.stringContaining('sets/user-123/'),
      )
    })

    it('deletes original image when keepOnWishlist is false', async () => {
      await service.markAsPurchased('user-123', mockWishlistItem.id, {
        quantity: 1,
        keepOnWishlist: false,
      })

      expect(imageStorage.deleteImage).toHaveBeenCalledWith('wishlist/user-123/75192.webp')
    })

    it('does not delete original image when keepOnWishlist is true', async () => {
      await service.markAsPurchased('user-123', mockWishlistItem.id, {
        quantity: 1,
        keepOnWishlist: true,
      })

      expect(imageStorage.deleteImage).not.toHaveBeenCalled()
    })

    it('uses wishlist price when pricePaid not provided', async () => {
      await service.markAsPurchased('user-123', mockWishlistItem.id, {
        quantity: 1,
        keepOnWishlist: false,
      })

      expect(setsService.createSet).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          purchasePrice: mockWishlistItem.price,
        }),
      )
    })

    it('uses default purchase date (today) when not provided', async () => {
      const now = new Date()

      await service.markAsPurchased('user-123', mockWishlistItem.id, {
        quantity: 1,
        keepOnWishlist: false,
      })

      const callArgs = vi.mocked(setsService.createSet).mock.calls[0]
      const purchaseDate = callArgs[1].purchaseDate as Date
      expect(purchaseDate.toDateString()).toBe(now.toDateString())
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Transaction Logic Tests (AC 6, AC 20)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Transaction Logic', () => {
    it('does NOT delete wishlist item when Set creation fails (AC 20)', async () => {
      vi.mocked(setsService.createSet).mockResolvedValue({ ok: false, error: 'DB_ERROR' })

      const result = await service.markAsPurchased('user-123', mockWishlistItem.id, {
        quantity: 1,
        keepOnWishlist: false,
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('SET_CREATION_FAILED')
      }
      expect(wishlistRepo.delete).not.toHaveBeenCalled()
    })

    it('logs warning but returns success when wishlist deletion fails after Set creation', async () => {
      vi.mocked(wishlistRepo.delete).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await service.markAsPurchased('user-123', mockWishlistItem.id, {
        quantity: 1,
        keepOnWishlist: false,
      })

      // Set was created, so result should be success
      expect(result.ok).toBe(true)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })

    it('logs warning but returns success when image copy fails', async () => {
      vi.mocked(imageStorage.copyImage).mockResolvedValue({ ok: false, error: 'COPY_FAILED' })
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await service.markAsPurchased('user-123', mockWishlistItem.id, {
        quantity: 1,
        keepOnWishlist: false,
      })

      // Set was created, so result should be success
      expect(result.ok).toBe(true)
      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Authorization Tests (AC 22, AC 23)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Authorization', () => {
    it('returns FORBIDDEN when user does not own item (AC 22)', async () => {
      const result = await service.markAsPurchased('other-user', mockWishlistItem.id, {
        quantity: 1,
        keepOnWishlist: false,
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
      expect(setsService.createSet).not.toHaveBeenCalled()
    })

    it('returns NOT_FOUND when item does not exist (AC 23)', async () => {
      vi.mocked(wishlistRepo.findById).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })

      const result = await service.markAsPurchased('user-123', 'nonexistent', {
        quantity: 1,
        keepOnWishlist: false,
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
      expect(setsService.createSet).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('handles wishlist item with no image (skips S3 copy)', async () => {
      const itemWithNoImage = { ...mockWishlistItem, imageUrl: null }
      vi.mocked(wishlistRepo.findById).mockResolvedValue({ ok: true, data: itemWithNoImage })

      const result = await service.markAsPurchased('user-123', itemWithNoImage.id, {
        quantity: 1,
        keepOnWishlist: false,
      })

      expect(result.ok).toBe(true)
      expect(imageStorage.copyImage).not.toHaveBeenCalled()
      expect(imageStorage.deleteImage).not.toHaveBeenCalled()
    })

    it('handles quantity greater than 1', async () => {
      await service.markAsPurchased('user-123', mockWishlistItem.id, {
        quantity: 3,
        keepOnWishlist: false,
      })

      expect(setsService.createSet).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          quantity: 3,
        }),
      )
    })

    it('returns SET_CREATION_FAILED when setsService is not available', async () => {
      const serviceWithoutSets = createWishlistService({
        wishlistRepo,
        imageStorage,
        // No setsService
      })

      const result = await serviceWithoutSets.markAsPurchased('user-123', mockWishlistItem.id, {
        quantity: 1,
        keepOnWishlist: false,
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('SET_CREATION_FAILED')
      }
    })

    it('handles custom purchase date', async () => {
      const customDate = '2025-01-15T00:00:00.000Z'

      await service.markAsPurchased('user-123', mockWishlistItem.id, {
        quantity: 1,
        purchaseDate: customDate,
        keepOnWishlist: false,
      })

      const callArgs = vi.mocked(setsService.createSet).mock.calls[0]
      const purchaseDate = callArgs[1].purchaseDate as Date
      expect(purchaseDate.toISOString()).toBe(customDate)
    })

    it('handles extractKeyFromUrl returning null (skips S3 ops)', async () => {
      vi.mocked(imageStorage.extractKeyFromUrl).mockReturnValue(null)

      const result = await service.markAsPurchased('user-123', mockWishlistItem.id, {
        quantity: 1,
        keepOnWishlist: false,
      })

      expect(result.ok).toBe(true)
      expect(imageStorage.copyImage).not.toHaveBeenCalled()
    })
  })
})
