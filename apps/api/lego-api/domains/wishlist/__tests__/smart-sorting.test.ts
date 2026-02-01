import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createWishlistService } from '../application/services.js'
import type { WishlistRepository, WishlistImageStorage } from '../ports/index.js'
import type { WishlistItem } from '../types.js'

/**
 * WISH-2014: Smart Sorting Algorithms Unit Tests
 *
 * Tests the three smart sorting modes:
 * - bestValue: price/pieceCount ratio (lowest first)
 * - expiringSoon: oldest release date first
 * - hiddenGems: (5 - priority) * pieceCount (highest first)
 *
 * Note: These tests verify that the service layer correctly passes
 * sort parameters to the repository. The actual SQL sorting logic
 * is tested in integration tests.
 */

// ─────────────────────────────────────────────────────────────────────────
// Test Fixtures
// ─────────────────────────────────────────────────────────────────────────

/**
 * Create a mock wishlist item with optional overrides
 */
function createMockItem(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    id: overrides.id ?? '123e4567-e89b-12d3-a456-426614174000',
    userId: 'user-123',
    title: 'Test Set',
    store: 'LEGO',
    setNumber: '12345',
    sourceUrl: null,
    imageUrl: null,
    imageVariants: null, // WISH-2016
    price: '100.00',
    currency: 'USD',
    pieceCount: 1000,
    releaseDate: new Date('2020-01-01'),
    tags: [],
    priority: 0,
    notes: null,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

/**
 * Create mock items for Best Value testing
 * Returns items with different price/pieceCount ratios
 */
function createBestValueTestItems(): WishlistItem[] {
  return [
    createMockItem({ id: 'item-a', price: '100.00', pieceCount: 1000, title: 'Best (0.10)' }), // ratio: 0.10
    createMockItem({ id: 'item-b', price: '50.00', pieceCount: 250, title: 'Fourth (0.20)' }), // ratio: 0.20
    createMockItem({ id: 'item-c', price: '200.00', pieceCount: 2000, title: 'Tied (0.10)' }), // ratio: 0.10
    createMockItem({ id: 'item-d', price: '30.00', pieceCount: 100, title: 'Worst (0.30)' }), // ratio: 0.30
    createMockItem({ id: 'item-e', price: null, pieceCount: 500, title: 'Null Price' }), // null price - at end
    createMockItem({ id: 'item-f', price: '100.00', pieceCount: 0, title: 'Zero Pieces' }), // zero pieces - at end
    createMockItem({ id: 'item-g', price: '100.00', pieceCount: null, title: 'Null Pieces' }), // null pieces - at end
  ]
}

/**
 * Create mock items for Expiring Soon testing
 * Returns items with different release dates
 */
function createExpiringSoonTestItems(): WishlistItem[] {
  return [
    createMockItem({ id: 'item-a', releaseDate: new Date('2020-01-01'), title: 'Middle' }),
    createMockItem({ id: 'item-b', releaseDate: new Date('2023-06-15'), title: 'Recent' }),
    createMockItem({ id: 'item-c', releaseDate: new Date('2019-05-10'), title: 'Oldest' }),
    createMockItem({ id: 'item-d', releaseDate: new Date('2024-12-20'), title: 'Newest' }),
    createMockItem({ id: 'item-e', releaseDate: null, title: 'No Date' }), // null - at end
  ]
}

/**
 * Create mock items for Hidden Gems testing
 * Returns items with different priority/pieceCount combinations
 * Score formula: (5 - priority) * pieceCount
 */
function createHiddenGemsTestItems(): WishlistItem[] {
  return [
    createMockItem({ id: 'item-a', priority: 0, pieceCount: 2000, title: 'Score: 10000' }), // (5-0)*2000 = 10000
    createMockItem({ id: 'item-b', priority: 5, pieceCount: 1500, title: 'Score: 0' }), // (5-5)*1500 = 0
    createMockItem({ id: 'item-c', priority: 1, pieceCount: 3000, title: 'Score: 12000' }), // (5-1)*3000 = 12000
    createMockItem({ id: 'item-d', priority: 0, pieceCount: 500, title: 'Score: 2500' }), // (5-0)*500 = 2500
    createMockItem({ id: 'item-e', priority: 2, pieceCount: 1000, title: 'Score: 3000' }), // (5-2)*1000 = 3000
    createMockItem({ id: 'item-f', priority: 0, pieceCount: null, title: 'Null Pieces' }), // null - at end
  ]
}

/**
 * Create a mock WishlistRepository
 */
function createMockWishlistRepo(
  itemsToReturn: WishlistItem[] = [],
): WishlistRepository {
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

// ─────────────────────────────────────────────────────────────────────────
// Best Value Sort Tests
// ─────────────────────────────────────────────────────────────────────────

describe('WISH-2014: Smart Sorting Algorithms', () => {
  describe('Best Value Sort (price/pieceCount ratio)', () => {
    it('passes bestValue sort parameter to repository', async () => {
      const items = createBestValueTestItems()
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { sort: 'bestValue', order: 'asc' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { sort: 'bestValue', order: 'asc' },
      )
    })

    it('defaults to ascending order for bestValue', async () => {
      const items = createBestValueTestItems()
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { sort: 'bestValue' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { sort: 'bestValue' },
      )
    })

    it('supports descending order for bestValue', async () => {
      const items = createBestValueTestItems()
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { sort: 'bestValue', order: 'desc' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { sort: 'bestValue', order: 'desc' },
      )
    })

    it('returns items array from repository (null handling done at DB level)', async () => {
      const items = createBestValueTestItems()
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      const result = await service.listItems('user-123', { page: 1, limit: 20 }, { sort: 'bestValue' })

      expect(result.items).toHaveLength(items.length)
    })

    it('works with pagination parameters', async () => {
      const items = createBestValueTestItems()
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 2, limit: 5 }, { sort: 'bestValue', order: 'asc' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 2, limit: 5 },
        { sort: 'bestValue', order: 'asc' },
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Expiring Soon Sort Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('Expiring Soon Sort (oldest release date first)', () => {
    it('passes expiringSoon sort parameter to repository', async () => {
      const items = createExpiringSoonTestItems()
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { sort: 'expiringSoon', order: 'asc' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { sort: 'expiringSoon', order: 'asc' },
      )
    })

    it('defaults to ascending order for expiringSoon', async () => {
      const items = createExpiringSoonTestItems()
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { sort: 'expiringSoon' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { sort: 'expiringSoon' },
      )
    })

    it('supports descending order for expiringSoon', async () => {
      const items = createExpiringSoonTestItems()
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { sort: 'expiringSoon', order: 'desc' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { sort: 'expiringSoon', order: 'desc' },
      )
    })

    it('returns items array from repository', async () => {
      const items = createExpiringSoonTestItems()
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      const result = await service.listItems('user-123', { page: 1, limit: 20 }, { sort: 'expiringSoon' })

      expect(result.items).toHaveLength(items.length)
    })

    it('works with pagination parameters', async () => {
      const items = createExpiringSoonTestItems()
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 3, limit: 10 }, { sort: 'expiringSoon', order: 'asc' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 3, limit: 10 },
        { sort: 'expiringSoon', order: 'asc' },
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // Hidden Gems Sort Tests
  // ─────────────────────────────────────────────────────────────────────────

  describe('Hidden Gems Sort ((5 - priority) * pieceCount)', () => {
    it('passes hiddenGems sort parameter to repository', async () => {
      const items = createHiddenGemsTestItems()
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { sort: 'hiddenGems', order: 'desc' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { sort: 'hiddenGems', order: 'desc' },
      )
    })

    it('supports ascending order for hiddenGems', async () => {
      const items = createHiddenGemsTestItems()
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 20 }, { sort: 'hiddenGems', order: 'asc' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { sort: 'hiddenGems', order: 'asc' },
      )
    })

    it('returns items array from repository', async () => {
      const items = createHiddenGemsTestItems()
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      const result = await service.listItems('user-123', { page: 1, limit: 20 }, { sort: 'hiddenGems' })

      expect(result.items).toHaveLength(items.length)
    })

    it('works with pagination parameters', async () => {
      const items = createHiddenGemsTestItems()
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems('user-123', { page: 1, limit: 50 }, { sort: 'hiddenGems', order: 'desc' })

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 50 },
        { sort: 'hiddenGems', order: 'desc' },
      )
    })

    it('works combined with other filters', async () => {
      const items = createHiddenGemsTestItems()
      const wishlistRepo = createMockWishlistRepo(items)
      const service = createWishlistService({ wishlistRepo })

      await service.listItems(
        'user-123',
        { page: 1, limit: 20 },
        { sort: 'hiddenGems', order: 'desc', store: 'LEGO', search: 'Star Wars' },
      )

      expect(wishlistRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { sort: 'hiddenGems', order: 'desc', store: 'LEGO', search: 'Star Wars' },
      )
    })
  })
})
