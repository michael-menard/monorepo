import type { MockWishlistItem, MockWishlistListResponse } from './wishlist-types'

// Canonical wishlist mock items used by MSW and tests
export const mockWishlistItems: MockWishlistItem[] = [
  {
    id: 'wish-001',
    userId: 'test-user-123',
    title: 'Millennium Falcon',
    store: 'LEGO',
    setNumber: '75192',
    sourceUrl: 'https://lego.com/product/75192',
    imageUrl: '/mock-images/falcon.jpg',
    imageVariants: {
      original: {
        url: '/mock-images/falcon.jpg',
        width: 4032,
        height: 3024,
        sizeBytes: 10485760,
        format: 'jpeg',
      },
      thumbnail: {
        url: '/mock-images/falcon-thumb.webp',
        width: 200,
        height: 150,
        sizeBytes: 18432,
        format: 'webp',
      },
      medium: {
        url: '/mock-images/falcon-medium.webp',
        width: 800,
        height: 600,
        sizeBytes: 102400,
        format: 'webp',
      },
      large: {
        url: '/mock-images/falcon-large.webp',
        width: 1600,
        height: 1200,
        sizeBytes: 307200,
        format: 'webp',
        watermarked: true,
      },
      processingStatus: 'completed',
      processedAt: '2024-01-15T10:05:00Z',
    },
    price: 849.99,
    currency: 'USD',
    pieceCount: 7541,
    releaseDate: '2017-10-01',
    tags: ['Star Wars', 'UCS', 'Display'],
    priority: 5,
    notes: 'Ultimate Collector Series',
    sortOrder: 1,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'wish-002',
    userId: 'test-user-123',
    title: 'Imperial Star Destroyer',
    store: 'Barweer',
    setNumber: '75252',
    sourceUrl: 'https://barweer.com/star-destroyer',
    imageUrl: '/mock-images/star-destroyer.jpg',
    imageVariants: {
      original: {
        url: '/mock-images/star-destroyer.jpg',
        width: 3024,
        height: 4032,
        sizeBytes: 8388608,
        format: 'jpeg',
      },
      thumbnail: {
        url: '/mock-images/star-destroyer-thumb.webp',
        width: 150,
        height: 200,
        sizeBytes: 16384,
        format: 'webp',
      },
      medium: {
        url: '/mock-images/star-destroyer-medium.webp',
        width: 600,
        height: 800,
        sizeBytes: 92160,
        format: 'webp',
      },
      large: {
        url: '/mock-images/star-destroyer-large.webp',
        width: 1200,
        height: 1600,
        sizeBytes: 276480,
        format: 'webp',
        watermarked: true,
      },
      processingStatus: 'completed',
      processedAt: '2024-01-16T10:05:00Z',
    },
    price: 159.99,
    currency: 'USD',
    pieceCount: 4784,
    releaseDate: '2019-09-01',
    tags: ['Star Wars', 'Display'],
    priority: 3,
    notes: null,
    sortOrder: 2,
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
  },
  {
    id: 'wish-003',
    userId: 'test-user-123',
    title: 'Technic Porsche 911 GT3 RS',
    store: 'LEGO',
    setNumber: '42056',
    sourceUrl: null,
    imageUrl: '/mock-images/porsche.jpg',
    imageVariants: {
      original: {
        url: '/mock-images/porsche.jpg',
        width: 3024,
        height: 3024,
        sizeBytes: 9437184,
        format: 'jpeg',
      },
      thumbnail: {
        url: '/mock-images/porsche-thumb.webp',
        width: 200,
        height: 200,
        sizeBytes: 20480,
        format: 'webp',
      },
      medium: {
        url: '/mock-images/porsche-medium.webp',
        width: 800,
        height: 800,
        sizeBytes: 112640,
        format: 'webp',
      },
      large: {
        url: '/mock-images/porsche-large.webp',
        width: 1600,
        height: 1600,
        sizeBytes: 327680,
        format: 'webp',
        watermarked: true,
      },
      processingStatus: 'completed',
      processedAt: '2024-01-17T10:05:00Z',
    },
    price: 299.99,
    currency: 'USD',
    pieceCount: 2704,
    releaseDate: '2016-06-01',
    tags: ['Technic', 'Cars'],
    priority: 4,
    notes: 'Retired set - check secondary market',
    sortOrder: 3,
    createdAt: '2024-01-17T10:00:00Z',
    updatedAt: '2024-01-17T10:00:00Z',
  },
  {
    id: 'wish-004',
    userId: 'test-user-123',
    title: 'Medieval Castle MOC',
    store: 'Other',
    setNumber: null,
    sourceUrl: 'https://rebrickable.com/mocs/MOC-12345',
    imageUrl: '/mock-images/castle.jpg',
    imageVariants: null,
    price: null,
    currency: 'USD',
    pieceCount: 3500,
    releaseDate: null,
    tags: ['Castle', 'MOC', 'Custom'],
    priority: 2,
    notes: 'Need to source parts from BrickLink',
    sortOrder: 4,
    createdAt: '2024-01-18T10:00:00Z',
    updatedAt: '2024-01-18T10:00:00Z',
  },
]

// Helper to build a list response matching WishlistListResponseSchema
export function wishlistListResponse(items: MockWishlistItem[] = mockWishlistItems): MockWishlistListResponse {
  const byStore: Record<string, number> = {}
  const byPriority: Record<string, number> = {}
  const stores = new Set<string>()
  const tags = new Set<string>()

  items.forEach(item => {
    byStore[item.store] = (byStore[item.store] || 0) + 1
    stores.add(item.store)

    const priorityKey = String(item.priority)
    byPriority[priorityKey] = (byPriority[priorityKey] || 0) + 1

    item.tags.forEach(tag => tags.add(tag))
  })

  return {
    items,
    pagination: {
      page: 1,
      limit: 20,
      total: items.length,
      totalPages: Math.ceil(items.length / 20),
    },
    counts: {
      total: items.length,
      byStore,
      byPriority,
    },
    filters: {
      availableStores: Array.from(stores),
      availableTags: Array.from(tags).sort(),
    },
  }
}
