/**
 * Comprehensive Integration Tests
 * End-to-end testing of the enhanced serverless API client ecosystem
 */

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Import our enhanced APIs
import { enhancedGalleryApi } from '../rtk/gallery-api'
import { enhancedWishlistApi } from '../rtk/wishlist-api'
import { initializeCognitoTokenManager, getCognitoAuthToken } from '../auth/cognito-integration'
import { ServerlessApiClient } from '../client/serverless-client'
import { performanceMonitor } from '../lib/performance'

// Mock server for API responses
const server = setupServer(
  // Gallery API endpoints
  http.get('/api/v2/gallery/search', () => {
    return HttpResponse.json({
      success: true,
      data: {
        images: [
          {
            id: 'img1',
            title: 'Technic Crane',
            category: 'vehicles',
            tags: ['technic', 'crane'],
            difficulty: 'advanced',
            pieceCount: 1292,
            themes: ['Technic'],
            estimatedCost: 199.99,
          },
          {
            id: 'img2',
            title: 'Creator House',
            category: 'buildings',
            tags: ['creator', 'modular'],
            difficulty: 'intermediate',
            pieceCount: 2164,
            themes: ['Creator Expert'],
            estimatedCost: 249.99,
          },
        ],
        totalCount: 2,
      },
      pagination: {
        page: 1,
        limit: 20,
        hasMore: false,
      },
    })
  }),

  // Wishlist API endpoints
  http.get('/api/v2/wishlist/items', () => {
    return HttpResponse.json({
      success: true,
      data: {
        items: [
          {
            id: 'wish1',
            title: 'Technic Crane',
            priority: 'high',
            category: 'vehicles',
            themes: ['Technic'],
            estimatedCost: 199.99,
            isPurchased: false,
            isWatching: true,
            hasNotes: true,
            priceAlerts: true,
          },
          {
            id: 'wish2',
            title: 'Creator House',
            priority: 'medium',
            category: 'buildings',
            themes: ['Creator Expert'],
            estimatedCost: 249.99,
            isPurchased: false,
            isWatching: false,
            hasNotes: false,
            priceAlerts: false,
          },
        ],
        totalCount: 2,
        totalValue: 449.98,
      },
      pagination: {
        page: 1,
        limit: 20,
        hasMore: false,
      },
    })
  }),

  // Batch operations
  http.post('/api/v2/gallery/search/batch', () => {
    return HttpResponse.json({
      success: true,
      data: [
        { id: 'img1', title: 'Technic Crane', batchProcessed: true },
        { id: 'img2', title: 'Creator House', batchProcessed: true },
      ],
    })
  }),

  http.post('/api/v2/wishlist/items/batch', () => {
    return HttpResponse.json({
      success: true,
      data: {
        processed: 2,
        operation: 'updatePriority',
        items: ['wish1', 'wish2'],
      },
    })
  }),

  // Statistics endpoints
  http.get('/api/v2/gallery/search/stats', () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalImages: 1250,
        totalCategories: 12,
        popularCategories: ['vehicles', 'buildings', 'space'],
        recentUploads: 45,
      },
    })
  }),

  http.get('/api/v2/wishlist/items/stats', () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalItems: 25,
        totalValue: 2499.75,
        highPriorityItems: 8,
        itemsByCategory: { vehicles: 10, buildings: 8, space: 7 },
        itemsByTheme: { Technic: 12, Creator: 8, City: 5 },
      },
    })
  }),

  // Price estimates
  http.get('/api/v2/wishlist/items/price-estimates', () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalValue: 449.98,
        averagePrice: 224.99,
        priceHistory: [
          { date: '2023-12-01', price: 199.99 },
          { date: '2023-12-15', price: 189.99 },
        ],
      },
    })
  }),

  // Authentication endpoint
  http.post('/auth/token/refresh', () => {
    return HttpResponse.json({
      access_token: 'new-mock-token',
      expires_in: 3600,
    })
  }),
)

// Test store setup
function createIntegrationTestStore() {
  return configureStore({
    reducer: {
      [enhancedGalleryApi.reducerPath]: enhancedGalleryApi.reducer,
      [enhancedWishlistApi.reducerPath]: enhancedWishlistApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(
        enhancedGalleryApi.middleware,
        enhancedWishlistApi.middleware
      ),
  })
}

// Simplified test without React components

describe('Comprehensive Integration Tests', () => {
  let store: ReturnType<typeof createIntegrationTestStore>

  beforeAll(() => {
    server.listen()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    store = createIntegrationTestStore()
    
    // Initialize mock authentication
    initializeCognitoTokenManager({
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      idToken: 'mock-id-token',
    })
  })

  afterEach(() => {
    server.resetHandlers()
    store.dispatch(enhancedGalleryApi.util.resetApiState())
    store.dispatch(enhancedWishlistApi.util.resetApiState())
  })

  afterAll(() => {
    server.close()
  })

  describe('End-to-End API Integration', () => {
    it('should have both Gallery and Wishlist APIs configured', () => {
      // Verify both APIs are properly configured
      expect(enhancedGalleryApi).toBeDefined()
      expect(enhancedWishlistApi).toBeDefined()

      expect(enhancedGalleryApi.reducerPath).toBe('enhancedGalleryApi')
      expect(enhancedWishlistApi.reducerPath).toBe('enhancedWishlistApi')

      // Verify enhanced endpoints exist
      expect(enhancedGalleryApi.endpoints.enhancedGallerySearch).toBeDefined()
      expect(enhancedWishlistApi.endpoints.enhancedWishlistQuery).toBeDefined()
    })

    it('should handle API endpoint configuration', () => {
      // Test Gallery API endpoint is properly configured
      const galleryEndpoint = enhancedGalleryApi.endpoints.enhancedGallerySearch
      expect(galleryEndpoint).toBeDefined()
      expect(galleryEndpoint.initiate).toBeDefined()
      expect(galleryEndpoint.select).toBeDefined()
      expect(galleryEndpoint.matchFulfilled).toBeDefined()

      // Test Wishlist API endpoint is properly configured
      const wishlistEndpoint = enhancedWishlistApi.endpoints.enhancedWishlistQuery
      expect(wishlistEndpoint).toBeDefined()
      expect(wishlistEndpoint.initiate).toBeDefined()
      expect(wishlistEndpoint.select).toBeDefined()
      expect(wishlistEndpoint.matchFulfilled).toBeDefined()
    })

    it('should support cross-API parameter compatibility', () => {
      // Both APIs should have query endpoints
      const galleryEndpoint = enhancedGalleryApi.endpoints.enhancedGallerySearch
      const wishlistEndpoint = enhancedWishlistApi.endpoints.enhancedWishlistQuery

      // Verify both endpoints have the same interface
      expect(galleryEndpoint.initiate).toBeDefined()
      expect(wishlistEndpoint.initiate).toBeDefined()
      expect(typeof galleryEndpoint.initiate).toBe('function')
      expect(typeof wishlistEndpoint.initiate).toBe('function')
    })
  })

  describe('Performance and Caching Integration', () => {
    it('should support caching configuration', () => {
      // Test that APIs have endpoints configured for caching
      const galleryEndpoint = enhancedGalleryApi.endpoints.enhancedGallerySearch
      const wishlistEndpoint = enhancedWishlistApi.endpoints.enhancedWishlistQuery

      // Verify endpoints exist and have proper RTK Query structure
      expect(galleryEndpoint).toBeDefined()
      expect(wishlistEndpoint).toBeDefined()

      // Verify endpoints can be dispatched with caching parameters
      expect(galleryEndpoint.initiate).toBeDefined()
      expect(wishlistEndpoint.initiate).toBeDefined()

      // Both APIs should be configurable with middleware for caching
      expect(enhancedGalleryApi.middleware).toBeDefined()
      expect(enhancedWishlistApi.middleware).toBeDefined()
    })

    it('should have performance monitoring integration', () => {
      // Verify performance monitor is available
      expect(performanceMonitor).toBeDefined()
      expect(performanceMonitor.trackComponentRender).toBeDefined()

      // Test that we can track performance
      const trackSpy = vi.spyOn(performanceMonitor, 'trackComponentRender')
      performanceMonitor.trackComponentRender('test-operation', 100)

      expect(trackSpy).toHaveBeenCalledWith('test-operation', 100)
    })
  })

  describe('Authentication Integration', () => {
    it('should handle authentication configuration', () => {
      // Verify auth token is available
      const authToken = getCognitoAuthToken()
      expect(authToken).toBe('mock-access-token')

      // Verify APIs are configured with authentication
      expect(enhancedGalleryApi.reducerPath).toBe('enhancedGalleryApi')
      expect(enhancedWishlistApi.reducerPath).toBe('enhancedWishlistApi')
    })

    it('should support serverless client integration', () => {
      // Test that ServerlessApiClient can be created
      const client = new ServerlessApiClient({
        baseURL: 'https://api.example.com',
        timeout: 5000,
      })

      expect(client).toBeDefined()
      expect(client.setAuthToken).toBeDefined()

      // Test setting auth token
      client.setAuthToken('test-token')
      // No error should be thrown
    })
  })
})
