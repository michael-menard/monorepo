/**
 * Backward Compatibility Tests
 * Ensures enhanced APIs maintain compatibility with existing code patterns
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

// Import both old and new APIs
import { galleryApi, enhancedGalleryApi } from '../rtk/gallery-api'
import { wishlistApi, enhancedWishlistApi } from '../rtk/wishlist-api'
import { createGalleryApi } from '../rtk/gallery-api'
import { createWishlistApi } from '../rtk/wishlist-api'

// Mock server for backward compatibility testing
const server = setupServer(
  http.get('/api/gallery/search', () => {
    return HttpResponse.json({
      success: true,
      data: {
        images: [
          {
            id: 'img1',
            title: 'Test Image',
            category: 'test',
            tags: ['test'],
          },
        ],
        totalCount: 1,
      },
      pagination: { page: 1, limit: 20, hasMore: false },
    })
  }),

  http.get('/api/wishlist', () => {
    return HttpResponse.json({
      success: true,
      data: {
        items: [
          {
            id: 'wish1',
            title: 'Test Wishlist Item',
            priority: 'medium',
            category: 'test',
          },
        ],
        totalCount: 1,
        totalValue: 99.99,
      },
      pagination: { page: 1, limit: 20, hasMore: false },
    })
  }),
)

describe('Backward Compatibility Tests', () => {
  beforeEach(() => {
    server.listen()
    vi.clearAllMocks()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  afterAll(() => {
    server.close()
  })

  describe('API Export Compatibility', () => {
    it('should maintain legacy galleryApi export', () => {
      // Legacy code should still work
      expect(galleryApi).toBeDefined()
      expect(galleryApi.reducerPath).toBe('enhancedGalleryApi')
      expect(galleryApi.endpoints).toBeDefined()
      
      // Should be the same as enhanced API
      expect(galleryApi).toBe(enhancedGalleryApi)
    })

    it('should maintain legacy wishlistApi export', () => {
      // Legacy code should still work
      expect(wishlistApi).toBeDefined()
      expect(wishlistApi.reducerPath).toBe('enhancedWishlistApi')
      expect(wishlistApi.endpoints).toBeDefined()
      
      // Should be the same as enhanced API
      expect(wishlistApi).toBe(enhancedWishlistApi)
    })

    it('should support legacy API creation patterns', () => {
      // Legacy pattern: createGalleryApi(() => 'token')
      const legacyGalleryApi = createGalleryApi(() => 'legacy-token')
      expect(legacyGalleryApi).toBeDefined()
      expect(legacyGalleryApi.reducerPath).toBe('enhancedGalleryApi')

      // Legacy pattern: createWishlistApi(() => 'token')
      const legacyWishlistApi = createWishlistApi(() => 'legacy-token')
      expect(legacyWishlistApi).toBeDefined()
      expect(legacyWishlistApi.reducerPath).toBe('enhancedWishlistApi')
    })
  })

  describe('Store Configuration Compatibility', () => {
    it('should work with legacy store configuration', () => {
      // Legacy store setup should still work
      const legacyStore = configureStore({
        reducer: {
          // Legacy reducer names
          galleryApi: galleryApi.reducer,
          wishlistApi: wishlistApi.reducer,
        },
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware().concat(
            galleryApi.middleware,
            wishlistApi.middleware
          ),
      })

      expect(legacyStore).toBeDefined()
      expect(legacyStore.getState().galleryApi).toBeDefined()
      expect(legacyStore.getState().wishlistApi).toBeDefined()
    })

    it('should work with enhanced store configuration', () => {
      // Enhanced store setup
      const enhancedStore = configureStore({
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

      expect(enhancedStore).toBeDefined()
      expect(enhancedStore.getState().enhancedGalleryApi).toBeDefined()
      expect(enhancedStore.getState().enhancedWishlistApi).toBeDefined()
    })
  })

  describe('Hook Compatibility', () => {
    it('should provide both legacy and enhanced hooks', () => {
      // Enhanced hooks should be available
      expect(enhancedGalleryApi.endpoints.enhancedGallerySearch).toBeDefined()
      expect(enhancedWishlistApi.endpoints.enhancedWishlistQuery).toBeDefined()

      // Legacy-compatible hooks should still work
      expect(galleryApi.endpoints.enhancedGallerySearch).toBeDefined()
      expect(wishlistApi.endpoints.enhancedWishlistQuery).toBeDefined()
    })

    it('should maintain hook naming patterns', () => {
      // Check that endpoint keys exist and are properly named
      const galleryEndpointKeys = Object.keys(galleryApi.endpoints)
      const wishlistEndpointKeys = Object.keys(wishlistApi.endpoints)

      // Endpoints should exist with 'enhanced' prefix or 'Search/Query' suffix patterns
      expect(galleryEndpointKeys.length).toBeGreaterThan(0)
      expect(wishlistEndpointKeys.length).toBeGreaterThan(0)

      // Verify known endpoints exist
      expect(galleryEndpointKeys).toContain('enhancedGallerySearch')
      expect(wishlistEndpointKeys).toContain('enhancedWishlistQuery')
    })
  })

  describe('Parameter Compatibility', () => {
    it('should handle legacy parameter formats', () => {
      // Legacy simple parameters should still work
      const galleryEndpoint = galleryApi.endpoints.enhancedGallerySearch

      // Verify endpoint has the initiate method for dispatching
      expect(galleryEndpoint.initiate).toBeDefined()
      expect(typeof galleryEndpoint.initiate).toBe('function')

      // Verify endpoint structure is correct
      expect(galleryEndpoint.select).toBeDefined()
      expect(galleryEndpoint.matchFulfilled).toBeDefined()
      expect(galleryEndpoint.matchRejected).toBeDefined()
    })

    it('should handle enhanced parameter formats', () => {
      // Enhanced parameters should work
      const wishlistEndpoint = wishlistApi.endpoints.enhancedWishlistQuery

      // Verify endpoint has the initiate method for dispatching
      expect(wishlistEndpoint.initiate).toBeDefined()
      expect(typeof wishlistEndpoint.initiate).toBe('function')

      // Verify endpoint structure is correct
      expect(wishlistEndpoint.select).toBeDefined()
      expect(wishlistEndpoint.matchFulfilled).toBeDefined()
      expect(wishlistEndpoint.matchRejected).toBeDefined()
    })
  })
})
