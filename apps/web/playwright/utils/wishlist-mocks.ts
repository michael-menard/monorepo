/**
 * Wishlist API Mocking Utilities for E2E Tests (LEGACY)
 * Story wish-2001: Wishlist Gallery MVP
 *
 * Provides mock responses for wishlist API endpoints.
 * Tests run against mocked API - no backend deployment required.
 *
 * IMPORTANT (wish-2007): These mocks MUST NOT be used by the real
 * wishlist end-to-end regression suite. Real E2E tests for wishlist
 * flows should exercise the deployed API + database without
 * page.route() interception. This file is kept only for legacy/
 * exploratory tests and BDD scenarios that are explicitly marked
 * as mocked.
 */

import type { Page, Route } from '@playwright/test'

/**
 * Mock wishlist item type (matches WishlistItemSchema)
 */
export interface MockWishlistItem {
  id: string
  userId: string
  title: string
  store: 'LEGO' | 'Barweer' | 'AliExpress' | 'Other'
  setNumber: string | null
  sourceUrl: string | null
  imageUrl: string | null
  price: number | null
  currency: string
  pieceCount: number | null
  releaseDate: string | null
  tags: string[]
  priority: number
  notes: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/**
 * Mock list response type (matches WishlistListResponseSchema)
 */
export interface MockWishlistListResponse {
  items: MockWishlistItem[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  counts: {
    total: number
    byStore: Record<string, number>
    byPriority: Record<string, number>
  }
  filters: {
    availableStores: string[]
    availableTags: string[]
  }
}

/**
 * Sample mock wishlist items
 */
export const mockWishlistItems: MockWishlistItem[] = [
  {
    id: 'wish-001',
    userId: 'test-user-123',
    title: 'Millennium Falcon',
    store: 'LEGO',
    setNumber: '75192',
    sourceUrl: 'https://lego.com/product/75192',
    imageUrl: '/mock-images/falcon.jpg',
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

/**
 * Generate mock responses for different scenarios
 */
export const wishlistMockResponses = {
  /**
   * Standard list response with items
   */
  list: (items: MockWishlistItem[] = mockWishlistItems): MockWishlistListResponse => {
    const byStore: Record<string, number> = {}
    const byPriority: Record<string, number> = {}
    const stores = new Set<string>()
    const tags = new Set<string>()

    items.forEach(item => {
      // Count by store
      byStore[item.store] = (byStore[item.store] || 0) + 1
      stores.add(item.store)

      // Count by priority
      const priorityKey = String(item.priority)
      byPriority[priorityKey] = (byPriority[priorityKey] || 0) + 1

      // Collect tags
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
  },

  /**
   * Empty list response
   */
  empty: (): MockWishlistListResponse => ({
    items: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    },
    counts: {
      total: 0,
      byStore: {},
      byPriority: {},
    },
    filters: {
      availableStores: [],
      availableTags: [],
    },
  }),

  /**
   * Filtered list (by store)
   */
  filteredByStore: (store: string): MockWishlistListResponse => {
    const filtered = mockWishlistItems.filter(item => item.store === store)
    return wishlistMockResponses.list(filtered)
  },

  /**
   * Search results
   */
  searchResults: (query: string): MockWishlistListResponse => {
    const lowerQuery = query.toLowerCase()
    const filtered = mockWishlistItems.filter(
      item =>
        item.title.toLowerCase().includes(lowerQuery) ||
        item.setNumber?.toLowerCase().includes(lowerQuery) ||
        item.tags.some(tag => tag.toLowerCase().includes(lowerQuery)),
    )
    return wishlistMockResponses.list(filtered)
  },

  /**
   * Single item response
   */
  singleItem: (id: string): MockWishlistItem | null => {
    return mockWishlistItems.find(item => item.id === id) || null
  },

  /**
   * Error responses
   */
  error: {
    serverError: { error: 'INTERNAL_ERROR', message: 'Internal server error' },
    notFound: { error: 'NOT_FOUND', message: 'Item not found' },
    unauthorized: { error: 'UNAUTHORIZED', message: 'Authentication required' },
    forbidden: { error: 'FORBIDDEN', message: 'Access denied' },
  },
}

/**
 * Mock scenario options
 */
export interface WishlistMockOptions {
  scenario?: 'success' | 'empty' | 'error' | 'unauthorized'
  store?: string
  searchQuery?: string
  delayMs?: number
}

/**
 * Setup mock API routes for wishlist endpoints
 */
export async function setupWishlistMocks(page: Page, options: WishlistMockOptions = {}) {
  const { scenario = 'success', store, searchQuery, delayMs = 0 } = options

  // Mock GET /api/wishlist - List endpoint
  await page.route('**/api/wishlist', async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }

    // Add artificial delay if specified
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    switch (scenario) {
      case 'error':
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify(wishlistMockResponses.error.serverError),
        })
        break

      case 'unauthorized':
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify(wishlistMockResponses.error.unauthorized),
        })
        break

      case 'empty':
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(wishlistMockResponses.empty()),
        })
        break

      case 'success':
      default: {
        let response: MockWishlistListResponse

        // Check URL params for filtering
        const url = new URL(route.request().url())
        const storeParam = store || url.searchParams.get('store')
        const queryParam = searchQuery || url.searchParams.get('q')

        if (queryParam) {
          response = wishlistMockResponses.searchResults(queryParam)
        } else if (storeParam) {
          response = wishlistMockResponses.filteredByStore(storeParam)
        } else {
          response = wishlistMockResponses.list()
        }

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(response),
        })
      }
    }
  })

  // Mock GET /api/wishlist/:id - Single item endpoint
  await page.route('**/api/wishlist/*', async (route: Route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }

    // Skip if this is the list endpoint (no trailing ID)
    const url = route.request().url()
    if (url.endsWith('/wishlist') || url.endsWith('/wishlist/')) {
      await route.continue()
      return
    }

    // Add artificial delay if specified
    if (delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }

    // Extract ID from URL
    const id = url.split('/').pop()

    if (scenario === 'error') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify(wishlistMockResponses.error.serverError),
      })
      return
    }

    if (scenario === 'unauthorized') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify(wishlistMockResponses.error.unauthorized),
      })
      return
    }

    const item = wishlistMockResponses.singleItem(id || '')

    if (item) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(item),
      })
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify(wishlistMockResponses.error.notFound),
      })
    }
  })
}

/**
 * Clear wishlist mocks
 */
export async function clearWishlistMocks(page: Page) {
  await page.unroute('**/api/wishlist')
  await page.unroute('**/api/wishlist/*')
}
