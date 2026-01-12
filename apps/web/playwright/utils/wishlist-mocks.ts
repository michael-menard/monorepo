/**
 * Wishlist mock response helpers for Playwright tests.
 *
 * This module now delegates to the canonical wishlist mocks defined in
 * `apps/web/main-app/src/test/mocks`. It exists primarily to provide
 * convenient response-shaping utilities for tests that need them
 * without duplicating data definitions.
 */

import type { MockWishlistItem, MockWishlistListResponse } from '../../main-app/src/test/mocks/wishlist-types'
import { mockWishlistItems } from '../../main-app/src/test/mocks/wishlist-mocks'

export type { MockWishlistItem, MockWishlistListResponse }

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

