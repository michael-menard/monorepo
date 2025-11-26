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
      expect(api.endpoints.enhancedGallerySearch.query).toBeDefined()
    })

    it('should handle advanced filtering parameters', () => {
      const api = createGalleryApi()
      const endpoint = api.endpoints.enhancedGallerySearch

      const searchParams = {
        query: 'vehicle',
        difficulty: ['intermediate', 'advanced'],
        pieceCount: { min: 500, max: 2000 },
        themes: ['Technic'],
        hasInstructions: true,
        cacheStrategy: 'medium' as const,
      }

      const queryConfig = endpoint.query(searchParams)
      expect(queryConfig.url).toBeDefined()
      expect(queryConfig.params).toBeDefined()
    })

    it('should serialize complex parameters correctly', () => {
      const api = createGalleryApi()
      const endpoint = api.endpoints.enhancedGallerySearch

      const searchParams = {
        pieceCount: { min: 100, max: 500 },
        dateRange: { start: '2023-01-01', end: '2023-12-31' },
      }

      const queryConfig = endpoint.query(searchParams)
      expect(queryConfig.params.pieceCount).toBe(JSON.stringify(searchParams.pieceCount))
      expect(queryConfig.params.dateRange).toBe(JSON.stringify(searchParams.dateRange))
    })
  })

  describe('Batch Image Loading', () => {
    it('should have batch image loading endpoint', () => {
      const api = createGalleryApi()

      expect(api.endpoints.batchGetGalleryImages).toBeDefined()
      expect(api.endpoints.batchGetGalleryImages.query).toBeDefined()
    })

    it('should create correct batch query', () => {
      const api = createGalleryApi()
      const endpoint = api.endpoints.batchGetGalleryImages
      const imageIds = ['img1', 'img2', 'img3']

      const queryConfig = endpoint.query(imageIds)
      expect(queryConfig.url).toContain('/batch')
      expect(queryConfig.method).toBe('POST')
      expect(queryConfig.body).toEqual({ imageIds, operation: 'get' })
    })
  })

  describe('Batch Operations', () => {
    it('should have enhanced batch operation endpoint', () => {
      const api = createGalleryApi()

      expect(api.endpoints.enhancedBatchGalleryOperation).toBeDefined()
      expect(api.endpoints.enhancedBatchGalleryOperation.query).toBeDefined()
    })

    it('should handle batch operation parameters', () => {
      const api = createGalleryApi()
      const endpoint = api.endpoints.enhancedBatchGalleryOperation

      const batchParams = {
        operation: 'updateTags' as const,
        imageIds: ['img1', 'img2'],
        data: { tags: ['new-tag'] },
      }

      const queryConfig = endpoint.query(batchParams)
      expect(queryConfig.url).toContain('/batch')
      expect(queryConfig.method).toBe('POST')
      expect(queryConfig.body.operation).toBe('updateTags')
      expect(queryConfig.body.imageIds).toEqual(['img1', 'img2'])
    })
  })

  describe('Gallery Statistics', () => {
    it('should have enhanced statistics endpoint', () => {
      const api = createGalleryApi()

      expect(api.endpoints.getEnhancedGalleryStats).toBeDefined()
      expect(api.endpoints.getEnhancedGalleryStats.query).toBeDefined()
    })

    it('should create statistics query with request ID', () => {
      const api = createGalleryApi()
      const endpoint = api.endpoints.getEnhancedGalleryStats

      const queryConfig = endpoint.query()
      expect(queryConfig.url).toContain('/stats')
      expect(queryConfig.params._requestId).toBeDefined()
    })
  })
})
