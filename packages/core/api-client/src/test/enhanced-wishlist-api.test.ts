/**
 * Enhanced Wishlist API Tests
 * Tests for the enhanced serverless Wishlist API with all optimizations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import {
  createWishlistApi,
  enhancedWishlistApi,
} from '../rtk/wishlist-api'

// Mock dependencies
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

vi.mock('../lib/performance', () => ({
  performanceMonitor: {
    trackComponentRender: vi.fn(),
  },
}))

vi.mock('@repo/cache/utils/serverlessCacheManager', () => ({
  getServerlessCacheManager: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
  })),
}))

vi.mock('../auth/rtk-auth-integration', () => ({
  createAuthenticatedBaseQuery: vi.fn(() => vi.fn()),
}))

// Mock performance API
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
  writable: true,
})

// Test store setup
function createTestStore() {
  return configureStore({
    reducer: {
      [enhancedWishlistApi.reducerPath]: enhancedWishlistApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(enhancedWishlistApi.middleware),
  })
}

describe('Enhanced Wishlist API', () => {
  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    vi.clearAllMocks()
    store = createTestStore()
  })

  afterEach(() => {
    store.dispatch(enhancedWishlistApi.util.resetApiState())
  })

  describe('API Creation', () => {
    it('should create wishlist API with enhanced features', () => {
      const api = createWishlistApi()
      
      expect(api).toBeDefined()
      expect(api.reducerPath).toBe('enhancedWishlistApi')
      expect(api.endpoints).toBeDefined()
    })

    it('should have all enhanced endpoints', () => {
      const api = createWishlistApi()
      
      expect(api.endpoints.enhancedWishlistQuery).toBeDefined()
      expect(api.endpoints.enhancedBatchWishlistOperation).toBeDefined()
      expect(api.endpoints.getEnhancedPriceEstimates).toBeDefined()
      expect(api.endpoints.getEnhancedWishlistStats).toBeDefined()
      expect(api.endpoints.managePriceAlerts).toBeDefined()
    })
  })

  describe('Enhanced Wishlist Query', () => {
    it('should have enhanced wishlist query endpoint', () => {
      const api = createWishlistApi()
      const endpoint = api.endpoints.enhancedWishlistQuery

      expect(endpoint).toBeDefined()
      expect(endpoint.initiate).toBeDefined()
      expect(endpoint.select).toBeDefined()
    })

    it('should be a query endpoint with proper matchers', () => {
      const api = createWishlistApi()
      const endpoint = api.endpoints.enhancedWishlistQuery

      // Query endpoints have these action matchers
      expect(endpoint.matchFulfilled).toBeDefined()
      expect(endpoint.matchPending).toBeDefined()
      expect(endpoint.matchRejected).toBeDefined()
    })

    it('should have initiate function for dispatching queries', () => {
      const api = createWishlistApi()
      const endpoint = api.endpoints.enhancedWishlistQuery

      expect(typeof endpoint.initiate).toBe('function')
    })
  })

  describe('Batch Wishlist Operations', () => {
    it('should have enhanced batch operation endpoint', () => {
      const api = createWishlistApi()

      expect(api.endpoints.enhancedBatchWishlistOperation).toBeDefined()
      expect(api.endpoints.enhancedBatchWishlistOperation.initiate).toBeDefined()
    })

    it('should be a mutation endpoint with proper matchers', () => {
      const api = createWishlistApi()
      const endpoint = api.endpoints.enhancedBatchWishlistOperation

      // Mutation endpoints have these action matchers
      expect(endpoint.matchFulfilled).toBeDefined()
      expect(endpoint.matchPending).toBeDefined()
      expect(endpoint.matchRejected).toBeDefined()
    })
  })

  describe('Price Tracking and Alerts', () => {
    it('should have enhanced price estimates endpoint', () => {
      const api = createWishlistApi()

      expect(api.endpoints.getEnhancedPriceEstimates).toBeDefined()
      expect(api.endpoints.getEnhancedPriceEstimates.initiate).toBeDefined()
    })

    it('should have price alert management endpoint', () => {
      const api = createWishlistApi()
      const endpoint = api.endpoints.managePriceAlerts

      expect(endpoint).toBeDefined()
      expect(endpoint.initiate).toBeDefined()
      expect(endpoint.matchFulfilled).toBeDefined()
    })
  })

  describe('Wishlist Statistics', () => {
    it('should have enhanced statistics endpoint', () => {
      const api = createWishlistApi()

      expect(api.endpoints.getEnhancedWishlistStats).toBeDefined()
      expect(api.endpoints.getEnhancedWishlistStats.initiate).toBeDefined()
    })

    it('should be a query endpoint with proper matchers', () => {
      const api = createWishlistApi()
      const endpoint = api.endpoints.getEnhancedWishlistStats

      // Query endpoints have these action matchers
      expect(endpoint.matchFulfilled).toBeDefined()
      expect(endpoint.matchPending).toBeDefined()
      expect(endpoint.matchRejected).toBeDefined()
    })
  })
})
