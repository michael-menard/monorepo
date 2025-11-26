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
    it('should handle basic wishlist parameters', () => {
      const api = createWishlistApi()
      const endpoint = api.endpoints.enhancedWishlistQuery
      
      const params = {
        priority: 'high' as const,
        category: 'lego-sets',
        page: 1,
        limit: 20,
      }
      
      const queryConfig = endpoint.query(params)
      expect(queryConfig.url).toBeDefined()
      expect(queryConfig.params).toBeDefined()
      expect(queryConfig.params.priority).toBe('high')
      expect(queryConfig.params.category).toBe('lego-sets')
    })

    it('should handle LEGO-specific filtering parameters', () => {
      const api = createWishlistApi()
      const endpoint = api.endpoints.enhancedWishlistQuery
      
      const params = {
        themes: ['Technic', 'Creator'],
        setNumbers: ['42143', '10294'],
        availability: ['available', 'upcoming'] as const,
        condition: ['new', 'sealed'] as const,
        priorityLevels: ['high', 'urgent'] as const,
        priceAlerts: true,
      }
      
      const queryConfig = endpoint.query(params)
      expect(queryConfig.params.themes).toBe(JSON.stringify(params.themes))
      expect(queryConfig.params.setNumbers).toBe(JSON.stringify(params.setNumbers))
      expect(queryConfig.params.priceAlerts).toBe(true)
    })

    it('should serialize complex parameters correctly', () => {
      const api = createWishlistApi()
      const endpoint = api.endpoints.enhancedWishlistQuery
      
      const params = {
        costRange: { min: 50, max: 500 },
        partCountRange: { min: 100, max: 1000 },
        dateRange: { from: '2023-01-01', to: '2023-12-31' },
      }
      
      const queryConfig = endpoint.query(params)
      expect(queryConfig.params.costRange).toBe(JSON.stringify(params.costRange))
      expect(queryConfig.params.partCountRange).toBe(JSON.stringify(params.partCountRange))
      expect(queryConfig.params.dateRange).toBe(JSON.stringify(params.dateRange))
    })
  })

  describe('Batch Wishlist Operations', () => {
    it('should have enhanced batch operation endpoint', () => {
      const api = createWishlistApi()
      
      expect(api.endpoints.enhancedBatchWishlistOperation).toBeDefined()
      expect(api.endpoints.enhancedBatchWishlistOperation.query).toBeDefined()
    })

    it('should handle batch operation parameters', () => {
      const api = createWishlistApi()
      const endpoint = api.endpoints.enhancedBatchWishlistOperation
      
      const batchParams = {
        operation: 'updatePriority' as const,
        itemIds: ['item1', 'item2'],
        data: { priority: 'high' as const },
      }
      
      const queryConfig = endpoint.query(batchParams)
      expect(queryConfig.url).toContain('/batch')
      expect(queryConfig.method).toBe('POST')
      expect(queryConfig.body.operation).toBe('updatePriority')
      expect(queryConfig.body.itemIds).toEqual(['item1', 'item2'])
    })
  })

  describe('Price Tracking and Alerts', () => {
    it('should have enhanced price estimates endpoint', () => {
      const api = createWishlistApi()
      
      expect(api.endpoints.getEnhancedPriceEstimates).toBeDefined()
      expect(api.endpoints.getEnhancedPriceEstimates.query).toBeDefined()
    })

    it('should handle price alert management', () => {
      const api = createWishlistApi()
      const endpoint = api.endpoints.managePriceAlerts
      
      const alertParams = {
        itemIds: ['item1', 'item2'],
        operation: 'enable' as const,
        alertThreshold: 100,
      }
      
      const queryConfig = endpoint.query(alertParams)
      expect(queryConfig.url).toContain('/price-alerts')
      expect(queryConfig.method).toBe('POST')
      expect(queryConfig.body.operation).toBe('enable')
      expect(queryConfig.body.alertThreshold).toBe(100)
    })
  })

  describe('Wishlist Statistics', () => {
    it('should have enhanced statistics endpoint', () => {
      const api = createWishlistApi()
      
      expect(api.endpoints.getEnhancedWishlistStats).toBeDefined()
      expect(api.endpoints.getEnhancedWishlistStats.query).toBeDefined()
    })

    it('should create statistics query with request ID', () => {
      const api = createWishlistApi()
      const endpoint = api.endpoints.getEnhancedWishlistStats
      
      const queryConfig = endpoint.query()
      expect(queryConfig.url).toContain('/stats')
      expect(queryConfig.params._requestId).toBeDefined()
    })
  })
})
