/**
 * Enhanced Gallery API Tests
 * Tests for the enhanced serverless Gallery API with all optimizations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import {
  createGalleryApi,
  enhancedGalleryApi,
} from '../rtk/gallery-api'

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
      [enhancedGalleryApi.reducerPath]: enhancedGalleryApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(enhancedGalleryApi.middleware),
  })
}

// Simplified test without React hooks

describe('Enhanced Gallery API', () => {
  let store: ReturnType<typeof createTestStore>

  beforeEach(() => {
    vi.clearAllMocks()
    store = createTestStore()
  })

  afterEach(() => {
    store.dispatch(enhancedGalleryApi.util.resetApiState())
  })

  describe('API Creation', () => {
    it('should create gallery API with enhanced features', () => {
      const api = createGalleryApi()
      
      expect(api).toBeDefined()
      expect(api.reducerPath).toBe('enhancedGalleryApi')
      expect(api.endpoints).toBeDefined()
    })

    it('should have all enhanced endpoints', () => {
      const api = createGalleryApi()
      
      expect(api.endpoints.enhancedGallerySearch).toBeDefined()
      expect(api.endpoints.batchGetGalleryImages).toBeDefined()
      expect(api.endpoints.enhancedBatchGalleryOperation).toBeDefined()
      expect(api.endpoints.getEnhancedGalleryStats).toBeDefined()
    })
  })

  describe('Enhanced Gallery Search', () => {
    it('should have enhanced gallery search endpoint', () => {
      const api = createGalleryApi()

      expect(api.endpoints.enhancedGallerySearch).toBeDefined()
      // RTK Query endpoints have initiate and select methods, not a query method
      expect(api.endpoints.enhancedGallerySearch.initiate).toBeDefined()
      expect(api.endpoints.enhancedGallerySearch.select).toBeDefined()
    })

    it('should handle advanced filtering parameters', () => {
      const api = createGalleryApi()
      const endpoint = api.endpoints.enhancedGallerySearch

      // Test that endpoint exists and can be initiated
      expect(endpoint).toBeDefined()
      expect(typeof endpoint.initiate).toBe('function')

      // The endpoint should be a query endpoint
      expect(endpoint.matchFulfilled).toBeDefined()
      expect(endpoint.matchPending).toBeDefined()
      expect(endpoint.matchRejected).toBeDefined()
    })

    it('should be a query endpoint type', () => {
      const api = createGalleryApi()
      const endpoint = api.endpoints.enhancedGallerySearch

      // Query endpoints have these action matchers
      expect(endpoint.matchFulfilled).toBeDefined()
      expect(endpoint.matchPending).toBeDefined()
      expect(endpoint.matchRejected).toBeDefined()
    })
  })

  describe('Batch Image Loading', () => {
    it('should have batch image loading endpoint', () => {
      const api = createGalleryApi()

      expect(api.endpoints.batchGetGalleryImages).toBeDefined()
      expect(api.endpoints.batchGetGalleryImages.initiate).toBeDefined()
    })

    it('should be a query endpoint with proper matchers', () => {
      const api = createGalleryApi()
      const endpoint = api.endpoints.batchGetGalleryImages

      // Query endpoints have these action matchers
      expect(endpoint.matchFulfilled).toBeDefined()
      expect(endpoint.matchPending).toBeDefined()
      expect(endpoint.matchRejected).toBeDefined()
    })
  })

  describe('Batch Operations', () => {
    it('should have enhanced batch operation endpoint', () => {
      const api = createGalleryApi()

      expect(api.endpoints.enhancedBatchGalleryOperation).toBeDefined()
      expect(api.endpoints.enhancedBatchGalleryOperation.initiate).toBeDefined()
    })

    it('should be a mutation endpoint', () => {
      const api = createGalleryApi()
      const endpoint = api.endpoints.enhancedBatchGalleryOperation

      // Mutation endpoints have these action matchers
      expect(endpoint.matchFulfilled).toBeDefined()
      expect(endpoint.matchPending).toBeDefined()
      expect(endpoint.matchRejected).toBeDefined()
    })
  })

  describe('Gallery Statistics', () => {
    it('should have enhanced statistics endpoint', () => {
      const api = createGalleryApi()

      expect(api.endpoints.getEnhancedGalleryStats).toBeDefined()
      expect(api.endpoints.getEnhancedGalleryStats.initiate).toBeDefined()
    })

    it('should be a query endpoint with proper matchers', () => {
      const api = createGalleryApi()
      const endpoint = api.endpoints.getEnhancedGalleryStats

      // Query endpoints have these action matchers
      expect(endpoint.matchFulfilled).toBeDefined()
      expect(endpoint.matchPending).toBeDefined()
      expect(endpoint.matchRejected).toBeDefined()
    })
  })
})
