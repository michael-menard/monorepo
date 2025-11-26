/**
 * Enhanced RTK Query Tests
 * Tests for serverless patterns, performance monitoring, and advanced caching
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import {
  createServerlessBaseQuery,
  getServerlessCacheConfig,
  createAdaptiveCacheConfig,
  getPerformanceOptimizedCacheConfig,
  SERVERLESS_CACHE_CONFIGS,
} from '../rtk/base-query'
import {
  rtkQueryPerformanceMiddleware,
  getRTKQueryMetrics,
  resetRTKQueryMetrics,
} from '../rtk/performance-monitoring'
import {
  createServerlessStore,
  createServerlessStoreWithPreset,
  STORE_PRESETS,
} from '../rtk/store-config'

// Mock the performance monitor
vi.mock('../lib/performance', () => ({
  performanceMonitor: {
    trackComponentRender: vi.fn(),
  },
}))

// Mock the config
vi.mock('../config/environments', () => ({
  getServerlessApiConfig: vi.fn(() => ({
    baseUrl: 'https://api.example.com',
    timeout: 5000,
    retryAttempts: 3,
    retryDelay: 1000,
    maxRetryDelay: 10000,
  })),
}))

// Mock retry logic
vi.mock('../retry/retry-logic', () => ({
  withRetry: vi.fn((fn) => fn()),
  withPriorityRetry: vi.fn((fn) => fn()),
  getRetryMetrics: vi.fn(() => ({
    totalAttempts: 0,
    successfulAttempts: 0,
    failedAttempts: 0,
    coldStartRetries: 0,
    timeoutRetries: 0,
    circuitBreakerTrips: 0,
  })),
  getCircuitBreakerStates: vi.fn(() => ({})),
}))

// Mock error handling
vi.mock('../retry/error-handling', () => ({
  handleServerlessError: vi.fn((error) => ({ error })),
}))

// Mock connection warming
vi.mock('../retry/connection-warming', () => ({
  getConnectionWarmer: vi.fn(() => ({
    updateConfig: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
}))

describe('Enhanced RTK Query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetRTKQueryMetrics()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Serverless Cache Configurations', () => {
    it('should provide all cache strategy configurations', () => {
      expect(SERVERLESS_CACHE_CONFIGS).toHaveProperty('none')
      expect(SERVERLESS_CACHE_CONFIGS).toHaveProperty('short')
      expect(SERVERLESS_CACHE_CONFIGS).toHaveProperty('medium')
      expect(SERVERLESS_CACHE_CONFIGS).toHaveProperty('long')
      expect(SERVERLESS_CACHE_CONFIGS).toHaveProperty('persistent')
      expect(SERVERLESS_CACHE_CONFIGS).toHaveProperty('adaptive')
      expect(SERVERLESS_CACHE_CONFIGS).toHaveProperty('backgroundRefresh')
    })

    it('should return correct cache config for strategy', () => {
      const shortConfig = getServerlessCacheConfig('short')
      expect(shortConfig.keepUnusedDataFor).toBe(30)
      expect(shortConfig.refetchOnMountOrArgChange).toBe(30)

      const longConfig = getServerlessCacheConfig('long')
      expect(longConfig.keepUnusedDataFor).toBe(1800)
      expect(longConfig.refetchOnMountOrArgChange).toBe(1800)
    })

    it('should create adaptive cache config based on usage patterns', () => {
      const config = createAdaptiveCacheConfig({
        usageFrequency: 'high',
        dataVolatility: 'stable',
        baseKeepTime: 600,
      })

      expect(config.keepUnusedDataFor).toBeGreaterThan(600) // Should be increased for high usage + stable data
      expect(config.refetchOnFocus).toBe(false) // Stable data shouldn't refetch on focus
    })

    it('should provide performance-optimized cache for specific endpoints', () => {
      const healthConfig = getPerformanceOptimizedCacheConfig('/api/health')
      expect(healthConfig.keepUnusedDataFor).toBe(0) // Health checks should not be cached

      const galleryConfig = getPerformanceOptimizedCacheConfig('/api/gallery/123')
      expect(galleryConfig.keepUnusedDataFor).toBe(1800) // Gallery items should be cached long-term
    })
  })

  describe('Serverless Base Query', () => {
    it('should create base query with default options', () => {
      const baseQuery = createServerlessBaseQuery()
      expect(baseQuery).toBeDefined()
      expect(typeof baseQuery).toBe('function')
    })

    it('should create base query with performance monitoring enabled', () => {
      const baseQuery = createServerlessBaseQuery({
        enablePerformanceMonitoring: true,
        priority: 'high',
      })
      expect(baseQuery).toBeDefined()
    })

    it('should handle authentication token injection', () => {
      const mockToken = 'test-token-123'
      const getAuthToken = vi.fn().mockReturnValue(mockToken)
      
      const baseQuery = createServerlessBaseQuery({
        getAuthToken,
        customHeaders: {
          'X-Custom-Header': 'test-value',
        },
      })
      
      expect(baseQuery).toBeDefined()
      expect(getAuthToken).not.toHaveBeenCalled() // Should only be called when making requests
    })
  })

  describe('Performance Monitoring Middleware', () => {
    it('should track query performance metrics', () => {
      const store = configureStore({
        reducer: {
          test: (state = {}) => state,
        },
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware().concat(rtkQueryPerformanceMiddleware),
      })

      // Simulate RTK Query actions
      store.dispatch({
        type: 'api/testQuery/pending',
        meta: { requestId: 'test-request-1' },
      })

      store.dispatch({
        type: 'api/testQuery/fulfilled',
        meta: { requestId: 'test-request-1' },
        payload: { data: 'test' },
      })

      const metrics = getRTKQueryMetrics()
      expect(metrics.totalQueries).toBe(1)
      expect(metrics.successfulQueries).toBe(1)
    })

    it('should track failed queries', () => {
      const store = configureStore({
        reducer: {
          test: (state = {}) => state,
        },
        middleware: (getDefaultMiddleware) =>
          getDefaultMiddleware().concat(rtkQueryPerformanceMiddleware),
      })

      store.dispatch({
        type: 'api/testQuery/pending',
        meta: { requestId: 'test-request-2' },
      })

      store.dispatch({
        type: 'api/testQuery/rejected',
        meta: { requestId: 'test-request-2' },
        error: { message: 'Test error' },
      })

      const metrics = getRTKQueryMetrics()
      expect(metrics.totalQueries).toBe(1)
      expect(metrics.failedQueries).toBe(1)
    })
  })

  describe('Store Configuration', () => {
    it('should create serverless store with minimal configuration', () => {
      const testApi = createApi({
        reducerPath: 'testApi',
        baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
        endpoints: () => ({}),
      })

      const store = createServerlessStore({
        apis: [testApi],
        enablePerformanceMonitoring: false,
        enableConnectionWarming: false,
      })

      expect(store).toBeDefined()
      expect(store.getState()).toHaveProperty('testApi')
    })

    it('should create store with preset configurations', () => {
      const testApi = createApi({
        reducerPath: 'testApi',
        baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
        endpoints: () => ({}),
      })

      const devStore = createServerlessStoreWithPreset('development', [testApi])
      expect(devStore).toBeDefined()

      const prodStore = createServerlessStoreWithPreset('production', [testApi])
      expect(prodStore).toBeDefined()

      const testStore = createServerlessStoreWithPreset('testing', [testApi])
      expect(testStore).toBeDefined()
    })

    it('should provide all store presets', () => {
      expect(STORE_PRESETS).toHaveProperty('minimal')
      expect(STORE_PRESETS).toHaveProperty('development')
      expect(STORE_PRESETS).toHaveProperty('production')
      expect(STORE_PRESETS).toHaveProperty('testing')
    })
  })
})
