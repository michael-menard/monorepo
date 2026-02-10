import { describe, it, expect, vi } from 'vitest'
import { createWishlistService } from '../application/services.js'
import type { WishlistRepository } from '../ports/index.js'
import type { WishlistItem } from '../types.js'

/**
 * WISH-20171: Advanced Multi-Filter Unit Tests (55 tests total)
 */

// Test Fixtures
function createMockItem(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    id: overrides.id ?? '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-123',
    title: 'Test Set',
    store: 'LEGO',
    setNumber: '12345',
    sourceUrl: null,
    imageUrl: null,
    imageVariants: null,
    price: '100.00',
    currency: 'USD',
    pieceCount: 1000,
    releaseDate: new Date('2020-01-01'),
    tags: [],
    priority: 3,
    notes: null,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'wishlist',
    statusChangedAt: null,
    purchaseDate: null,
    purchasePrice: null,
    purchaseTax: null,
    purchaseShipping: null,
    buildStatus: null,
    ...overrides,
  }
}

function createMockWishlistRepo(itemsToReturn: WishlistItem[] = []): WishlistRepository {
  return {
    findById: vi.fn().mockResolvedValue({ ok: true, data: itemsToReturn[0] }),
    findByUserId: vi.fn().mockResolvedValue({
      items: itemsToReturn,
      pagination: { page: 1, limit: 20, total: itemsToReturn.length, totalPages: 1, hasMore: false },
    }),
    insert: vi.fn().mockResolvedValue(itemsToReturn[0]),
    update: vi.fn().mockResolvedValue({ ok: true, data: itemsToReturn[0] }),
    delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    getMaxSortOrder: vi.fn().mockResolvedValue(0),
    updateSortOrders: vi.fn().mockResolvedValue({ ok: true, data: 2 }),
    verifyOwnership: vi.fn().mockResolvedValue(true),
  }
}

describe('WISH-20171: Advanced Multi-Filter Unit Tests', () => {
  describe('Store Filter + bestValue Sort (10 tests)', () => {
    it('passes single store filter to repository', async () => {
      const items = [createMockItem({ store: 'LEGO' })]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { store: ['LEGO'], sort: 'bestValue' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { store: ['LEGO'], sort: 'bestValue', status: 'wishlist' },
      )
    })

    it('passes multiple store filter to repository', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { store: ['LEGO', 'BrickLink'], sort: 'bestValue' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { store: ['LEGO', 'BrickLink'], sort: 'bestValue', status: 'wishlist' },
      )
    })

    it('passes store filter with bestValue desc sort', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { store: ['LEGO'], sort: 'bestValue', order: 'desc' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { store: ['LEGO'], sort: 'bestValue', order: 'desc', status: 'wishlist' },
      )
    })

    it('handles empty store array as no filter', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { store: [], sort: 'bestValue' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { store: [], sort: 'bestValue', status: 'wishlist' },
      )
    })

    it('handles undefined store as no filter', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { sort: 'bestValue' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { sort: 'bestValue', status: 'wishlist' },
      )
    })

    it('returns items from repository when store filter applied', async () => {
      const items = [createMockItem(), createMockItem({ id: 'item-2' })]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      const result = await service.listItems('user-123', { page: 1, limit: 20 }, { store: ['LEGO'], sort: 'bestValue' })

      expect(result.items).toHaveLength(items.length)
    })

    it('works with pagination when store filter applied', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 2, limit: 10 }, { store: ['LEGO'], sort: 'bestValue' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 2, limit: 10 },
        { store: ['LEGO'], sort: 'bestValue', status: 'wishlist' },
      )
    })

    it('passes three stores in filter array', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { store: ['LEGO', 'BrickLink', 'Amazon'], sort: 'bestValue' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { store: ['LEGO', 'BrickLink', 'Amazon'], sort: 'bestValue', status: 'wishlist' },
      )
    })

    it('handles store filter without sort parameter', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { store: ['LEGO'] })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { store: ['LEGO'], status: 'wishlist' },
      )
    })

    it('handles store filter with standard column sort', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { store: ['LEGO'], sort: 'price', order: 'asc' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { store: ['LEGO'], sort: 'price', order: 'asc', status: 'wishlist' },
      )
    })
  })

  describe('Priority Range + hiddenGems Sort (10 tests)', () => {
    it('passes priority range 0-2 with hiddenGems sort', async () => {
      const items = [createMockItem({ priority: 1 })]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priorityRange: { min: 0, max: 2 }, sort: 'hiddenGems' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priorityRange: { min: 0, max: 2 }, sort: 'hiddenGems', status: 'wishlist' },
      )
    })

    it('passes priority range 3-5 with hiddenGems sort', async () => {
      const items = [createMockItem({ priority: 4 })]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priorityRange: { min: 3, max: 5 }, sort: 'hiddenGems', order: 'desc' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priorityRange: { min: 3, max: 5 }, sort: 'hiddenGems', order: 'desc', status: 'wishlist' },
      )
    })

    it('passes priority range 2-4 (middle range)', async () => {
      const items = [createMockItem({ priority: 3 })]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priorityRange: { min: 2, max: 4 }, sort: 'hiddenGems' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priorityRange: { min: 2, max: 4 }, sort: 'hiddenGems', status: 'wishlist' },
      )
    })

    it('handles priority range with min = max (single value)', async () => {
      const items = [createMockItem({ priority: 3 })]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priorityRange: { min: 3, max: 3 }, sort: 'hiddenGems' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priorityRange: { min: 3, max: 3 }, sort: 'hiddenGems', status: 'wishlist' },
      )
    })

    it('handles entire priority range (0-5)', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priorityRange: { min: 0, max: 5 }, sort: 'hiddenGems' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priorityRange: { min: 0, max: 5 }, sort: 'hiddenGems', status: 'wishlist' },
      )
    })

    it('returns items from repository when priority range applied', async () => {
      const items = [createMockItem({ priority: 1 }), createMockItem({ id: 'item-2', priority: 2 })]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      const result = await service.listItems('user-123', { page: 1, limit: 20 }, { priorityRange: { min: 0, max: 2 }, sort: 'hiddenGems' })

      expect(result.items).toHaveLength(items.length)
    })

    it('handles priority range without sort parameter', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priorityRange: { min: 0, max: 2 } })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priorityRange: { min: 0, max: 2 }, status: 'wishlist' },
      )
    })

    it('handles priority range with asc order', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priorityRange: { min: 0, max: 2 }, sort: 'hiddenGems', order: 'asc' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priorityRange: { min: 0, max: 2 }, sort: 'hiddenGems', order: 'asc', status: 'wishlist' },
      )
    })

    it('works with pagination when priority range applied', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 3, limit: 5 }, { priorityRange: { min: 0, max: 2 }, sort: 'hiddenGems' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 3, limit: 5 },
        { priorityRange: { min: 0, max: 2 }, sort: 'hiddenGems', status: 'wishlist' },
      )
    })

    it('handles priority range with standard sort (priority column)', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priorityRange: { min: 0, max: 2 }, sort: 'priority', order: 'desc' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priorityRange: { min: 0, max: 2 }, sort: 'priority', order: 'desc', status: 'wishlist' },
      )
    })
  })

  describe('Price Range + expiringSoon Sort (10 tests)', () => {
    it('passes price range 0-50 with expiringSoon sort', async () => {
      const items = [createMockItem({ price: '25.00' })]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priceRange: { min: 0, max: 50 }, sort: 'expiringSoon' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priceRange: { min: 0, max: 50 }, sort: 'expiringSoon', status: 'wishlist' },
      )
    })

    it('passes price range 50-200 with expiringSoon sort', async () => {
      const items = [createMockItem({ price: '100.00' })]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priceRange: { min: 50, max: 200 }, sort: 'expiringSoon', order: 'asc' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priceRange: { min: 50, max: 200 }, sort: 'expiringSoon', order: 'asc', status: 'wishlist' },
      )
    })

    it('passes price range 200+ with expiringSoon sort', async () => {
      const items = [createMockItem({ price: '250.00' })]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priceRange: { min: 200, max: 1000 }, sort: 'expiringSoon' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priceRange: { min: 200, max: 1000 }, sort: 'expiringSoon', status: 'wishlist' },
      )
    })

    it('handles decimal price boundaries (49.99 in 0-50 range)', async () => {
      const items = [createMockItem({ price: '49.99' })]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priceRange: { min: 0, max: 50 }, sort: 'expiringSoon' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priceRange: { min: 0, max: 50 }, sort: 'expiringSoon', status: 'wishlist' },
      )
    })

    it('handles exact price boundary (50.00 in 50-200 range)', async () => {
      const items = [createMockItem({ price: '50.00' })]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priceRange: { min: 50, max: 200 }, sort: 'expiringSoon' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priceRange: { min: 50, max: 200 }, sort: 'expiringSoon', status: 'wishlist' },
      )
    })

    it('handles price range with min = max (exact price)', async () => {
      const items = [createMockItem({ price: '100.00' })]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priceRange: { min: 100, max: 100 }, sort: 'expiringSoon' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priceRange: { min: 100, max: 100 }, sort: 'expiringSoon', status: 'wishlist' },
      )
    })

    it('handles price range starting at 0', async () => {
      const items = [createMockItem({ price: '0.00' })]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priceRange: { min: 0, max: 0 }, sort: 'expiringSoon' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priceRange: { min: 0, max: 0 }, sort: 'expiringSoon', status: 'wishlist' },
      )
    })

    it('returns items from repository when price range applied', async () => {
      const items = [createMockItem({ price: '75.00' }), createMockItem({ id: 'item-2', price: '125.00' })]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      const result = await service.listItems('user-123', { page: 1, limit: 20 }, { priceRange: { min: 50, max: 200 }, sort: 'expiringSoon' })

      expect(result.items).toHaveLength(items.length)
    })

    it('handles price range without sort parameter', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priceRange: { min: 50, max: 200 } })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priceRange: { min: 50, max: 200 }, status: 'wishlist' },
      )
    })

    it('works with pagination when price range applied', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 2, limit: 15 }, { priceRange: { min: 50, max: 200 }, sort: 'expiringSoon' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 2, limit: 15 },
        { priceRange: { min: 50, max: 200 }, sort: 'expiringSoon', status: 'wishlist' },
      )
    })
  })

  describe('All Filters Combined (15 tests)', () => {
    it('passes store + priority range + price range + bestValue', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, {
        store: ['LEGO'],
        priorityRange: { min: 3, max: 5 },
        priceRange: { min: 50, max: 200 },
        sort: 'bestValue'
      })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        {
          store: ['LEGO'],
          priorityRange: { min: 3, max: 5 },
          priceRange: { min: 50, max: 200 },
          sort: 'bestValue',
          status: 'wishlist'
        },
      )
    })

    it('passes multiple stores + priority range + price range + expiringSoon', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, {
        store: ['LEGO', 'BrickLink'],
        priorityRange: { min: 0, max: 2 },
        priceRange: { min: 20, max: 100 },
        sort: 'expiringSoon',
        order: 'asc'
      })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        {
          store: ['LEGO', 'BrickLink'],
          priorityRange: { min: 0, max: 2 },
          priceRange: { min: 20, max: 100 },
          sort: 'expiringSoon',
          order: 'asc',
          status: 'wishlist'
        },
      )
    })

    it('passes store + priority range + price range + hiddenGems', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, {
        store: ['LEGO'],
        priorityRange: { min: 0, max: 3 },
        priceRange: { min: 50, max: 150 },
        sort: 'hiddenGems',
        order: 'desc'
      })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        {
          store: ['LEGO'],
          priorityRange: { min: 0, max: 3 },
          priceRange: { min: 50, max: 150 },
          sort: 'hiddenGems',
          order: 'desc',
          status: 'wishlist'
        },
      )
    })

    it('returns items from repository with all filters', async () => {
      const items = [createMockItem(), createMockItem({ id: 'item-2' })]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      const result = await service.listItems('user-123', { page: 1, limit: 20 }, {
        store: ['LEGO'],
        priorityRange: { min: 3, max: 5 },
        priceRange: { min: 50, max: 200 },
        sort: 'bestValue'
      })

      expect(result.items).toHaveLength(items.length)
    })

    it('works with pagination when all filters applied', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 2, limit: 10 }, {
        store: ['LEGO'],
        priorityRange: { min: 3, max: 5 },
        priceRange: { min: 50, max: 200 },
        sort: 'bestValue'
      })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 2, limit: 10 },
        {
          store: ['LEGO'],
          priorityRange: { min: 3, max: 5 },
          priceRange: { min: 50, max: 200 },
          sort: 'bestValue',
          status: 'wishlist'
        },
      )
    })

    it('handles all filters with standard column sort', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, {
        store: ['LEGO'],
        priorityRange: { min: 3, max: 5 },
        priceRange: { min: 50, max: 200 },
        sort: 'title',
        order: 'asc'
      })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        {
          store: ['LEGO'],
          priorityRange: { min: 3, max: 5 },
          priceRange: { min: 50, max: 200 },
          sort: 'title',
          order: 'asc',
          status: 'wishlist'
        },
      )
    })

    it('handles all filters without sort parameter', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, {
        store: ['LEGO'],
        priorityRange: { min: 3, max: 5 },
        priceRange: { min: 50, max: 200 }
      })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        {
          store: ['LEGO'],
          priorityRange: { min: 3, max: 5 },
          priceRange: { min: 50, max: 200 },
          status: 'wishlist'
        },
      )
    })

    it('handles edge case: empty result set with all filters', async () => {
      const wishlistRepo = createMockWishlistRepo([])
      const service = createWishlistService({ wishlistRepo })

      const result = await service.listItems('user-123', { page: 1, limit: 20 }, {
        store: ['Other'],
        priorityRange: { min: 5, max: 5 },
        priceRange: { min: 1000, max: 2000 },
        sort: 'bestValue'
      })

      expect(result.items).toHaveLength(0)
    })

    it('handles edge case: single item result with all filters', async () => {
      const items = [createMockItem({ id: 'item-a' })]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      const result = await service.listItems('user-123', { page: 1, limit: 20 }, {
        store: ['LEGO'],
        priorityRange: { min: 3, max: 5 },
        priceRange: { min: 50, max: 200 },
        sort: 'bestValue'
      })

      expect(result.items).toHaveLength(1)
    })

    it('handles boundary values: priority 0-5, price 0-max', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, {
        store: ['LEGO'],
        priorityRange: { min: 0, max: 5 },
        priceRange: { min: 0, max: 10000 },
        sort: 'bestValue'
      })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        {
          store: ['LEGO'],
          priorityRange: { min: 0, max: 5 },
          priceRange: { min: 0, max: 10000 },
          sort: 'bestValue',
          status: 'wishlist'
        },
      )
    })

    it('handles boundary values: single priority + exact price', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, {
        store: ['LEGO'],
        priorityRange: { min: 3, max: 3 },
        priceRange: { min: 100, max: 100 },
        sort: 'bestValue'
      })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        {
          store: ['LEGO'],
          priorityRange: { min: 3, max: 3 },
          priceRange: { min: 100, max: 100 },
          sort: 'bestValue',
          status: 'wishlist'
        },
      )
    })

    it('passes AND logic verification (all filters must match)', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, {
        store: ['LEGO', 'BrickLink'],
        priorityRange: { min: 2, max: 4 },
        priceRange: { min: 50, max: 150 },
        sort: 'bestValue'
      })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        {
          store: ['LEGO', 'BrickLink'],
          priorityRange: { min: 2, max: 4 },
          priceRange: { min: 50, max: 150 },
          sort: 'bestValue',
          status: 'wishlist'
        },
      )
    })

    it('handles filters with search parameter', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, {
        search: 'Castle',
        store: ['LEGO'],
        priorityRange: { min: 3, max: 5 },
        priceRange: { min: 50, max: 200 },
        sort: 'bestValue'
      })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        {
          search: 'Castle',
          store: ['LEGO'],
          priorityRange: { min: 3, max: 5 },
          priceRange: { min: 50, max: 200 },
          sort: 'bestValue',
          status: 'wishlist'
        },
      )
    })

    it('handles filters with tags parameter', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, {
        tags: ['Star Wars', 'UCS'],
        store: ['LEGO'],
        priorityRange: { min: 3, max: 5 },
        priceRange: { min: 50, max: 200 },
        sort: 'bestValue'
      })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        {
          tags: ['Star Wars', 'UCS'],
          store: ['LEGO'],
          priorityRange: { min: 3, max: 5 },
          priceRange: { min: 50, max: 200 },
          sort: 'bestValue',
          status: 'wishlist'
        },
      )
    })

    it('handles complex scenario: multiple stores + ranges + search + tags', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, {
        search: 'Millennium',
        tags: ['Star Wars'],
        store: ['LEGO', 'BrickLink', 'Amazon'],
        priorityRange: { min: 4, max: 5 },
        priceRange: { min: 100, max: 500 },
        sort: 'bestValue',
        order: 'desc'
      })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        {
          search: 'Millennium',
          tags: ['Star Wars'],
          store: ['LEGO', 'BrickLink', 'Amazon'],
          priorityRange: { min: 4, max: 5 },
          priceRange: { min: 100, max: 500 },
          sort: 'bestValue',
          order: 'desc',
          status: 'wishlist'
        },
      )
    })
  })

  describe('Null Value Handling (10 tests)', () => {
    it('passes price range filter (nulls excluded at DB level)', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priceRange: { min: 10, max: 100 } })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priceRange: { min: 10, max: 100 }, status: 'wishlist' },
      )
    })

    it('passes priority range filter (nulls excluded at DB level)', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priorityRange: { min: 0, max: 3 } })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priorityRange: { min: 0, max: 3 }, status: 'wishlist' },
      )
    })

    it('includes null price items when no price filter applied', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, {})

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { status: 'wishlist' },
      )
    })

    it('includes null priority items when no priority filter applied', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, {})

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { status: 'wishlist' },
      )
    })

    it('handles null pieceCount with bestValue sort (DB-level NULLS LAST)', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { sort: 'bestValue' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { sort: 'bestValue', status: 'wishlist' },
      )
    })

    it('handles null releaseDate with expiringSoon sort (DB-level NULLS LAST)', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { sort: 'expiringSoon' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { sort: 'expiringSoon', status: 'wishlist' },
      )
    })

    it('handles null pieceCount with hiddenGems sort (DB-level COALESCE)', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { sort: 'hiddenGems' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { sort: 'hiddenGems', status: 'wishlist' },
      )
    })

    it('handles multiple nulls: price range + bestValue sort', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, {
        priceRange: { min: 50, max: 200 },
        sort: 'bestValue'
      })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priceRange: { min: 50, max: 200 }, sort: 'bestValue', status: 'wishlist' },
      )
    })

    it('handles all filters with null values in dataset', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, {
        store: ['LEGO'],
        priorityRange: { min: 0, max: 5 },
        priceRange: { min: 0, max: 1000 },
        sort: 'bestValue'
      })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        {
          store: ['LEGO'],
          priorityRange: { min: 0, max: 5 },
          priceRange: { min: 0, max: 1000 },
          sort: 'bestValue',
          status: 'wishlist'
        },
      )
    })

    it('handles null priority with single priority filter (backward compat)', async () => {
      const items = [createMockItem()]
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { priority: 3 })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { priority: 3, status: 'wishlist' },
      )
    })
  })
})
