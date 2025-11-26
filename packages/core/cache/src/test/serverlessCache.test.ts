/**
 * Serverless Cache Tests
 * Comprehensive tests for serverless caching functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ServerlessCache,
  getServerlessCacheConfig,
  getServerlessBatchConfig,
  getServerlessInvalidationConfig,
  SERVERLESS_CACHE_CONFIGS,
  SERVERLESS_BATCH_CONFIGS,
  SERVERLESS_INVALIDATION_PATTERNS,
} from '../utils/serverlessCache'

// Mock the logger
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Mock browser APIs
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
})

describe('Serverless Cache Configurations', () => {
  it('should provide all cache strategy configurations', () => {
    expect(SERVERLESS_CACHE_CONFIGS).toHaveProperty('none')
    expect(SERVERLESS_CACHE_CONFIGS).toHaveProperty('short')
    expect(SERVERLESS_CACHE_CONFIGS).toHaveProperty('medium')
    expect(SERVERLESS_CACHE_CONFIGS).toHaveProperty('long')
    expect(SERVERLESS_CACHE_CONFIGS).toHaveProperty('persistent')
    expect(SERVERLESS_CACHE_CONFIGS).toHaveProperty('aggressive')
  })

  it('should return correct cache config for strategy', () => {
    const shortConfig = getServerlessCacheConfig('short')
    expect(shortConfig.keepUnusedDataFor).toBe(30)
    expect(shortConfig.refetchOnMountOrArgChange).toBe(30)

    const longConfig = getServerlessCacheConfig('long')
    expect(longConfig.keepUnusedDataFor).toBe(1800)
    expect(longConfig.refetchOnMountOrArgChange).toBe(1800)
  })

  it('should provide batch configurations', () => {
    expect(SERVERLESS_BATCH_CONFIGS).toHaveProperty('small')
    expect(SERVERLESS_BATCH_CONFIGS).toHaveProperty('medium')
    expect(SERVERLESS_BATCH_CONFIGS).toHaveProperty('large')

    const mediumBatch = getServerlessBatchConfig('medium')
    expect(mediumBatch.batchSize).toBe(10)
    expect(mediumBatch.batchDelay).toBe(200)
  })

  it('should provide invalidation patterns', () => {
    expect(SERVERLESS_INVALIDATION_PATTERNS).toHaveProperty('immediate')
    expect(SERVERLESS_INVALIDATION_PATTERNS).toHaveProperty('delayed')
    expect(SERVERLESS_INVALIDATION_PATTERNS).toHaveProperty('background')

    const delayedInvalidation = getServerlessInvalidationConfig('delayed')
    expect(delayedInvalidation.delay).toBe(5000)
    expect(delayedInvalidation.cascade).toBe(false)
  })
})

describe('ServerlessCache', () => {
  let cache: ServerlessCache

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)

    cache = new ServerlessCache({
      maxSize: 10,
      maxAge: 1000,
      enableBatchOperations: true,
      enablePerformanceMonitoring: true,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 3,
    })
  })

  afterEach(() => {
    cache.clear()
  })

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      await cache.set('key1', 'value1')
      const result = await cache.get('key1')
      expect(result).toBe('value1')
    })

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('non-existent')
      expect(result).toBeNull()
    })

    it('should delete values', async () => {
      await cache.set('key1', 'value1')
      cache.delete('key1')
      const result = await cache.get('key1')
      expect(result).toBeNull()
    })

    it('should clear all values', async () => {
      await cache.set('key1', 'value1')
      await cache.set('key2', 'value2')
      cache.clear()

      const result1 = await cache.get('key1')
      const result2 = await cache.get('key2')
      expect(result1).toBeNull()
      expect(result2).toBeNull()
    })
  })

  describe('Batch Operations', () => {
    it('should execute batch operations', async () => {
      const operations = [
        { type: 'set' as const, key: 'key1', data: 'value1' },
        { type: 'set' as const, key: 'key2', data: 'value2' },
        { type: 'get' as const, key: 'key1' },
      ]

      const results = await cache.batch(operations)

      expect(results).toHaveLength(3)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
      expect(results[2].success).toBe(true)
      expect(results[2].data).toBe('value1')
    })

    it('should handle batch operation errors', async () => {
      // Force an error by trying to get from a broken cache
      const brokenCache = new ServerlessCache({
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 1,
      })

      // Simulate circuit breaker opening
      ;(brokenCache as any).circuitBreakerOpen = true

      const operations = [{ type: 'get' as const, key: 'key1' }]

      const results = await brokenCache.batch(operations)
      expect(results[0].data).toBeNull() // Circuit breaker should return null
    })
  })

  describe('Circuit Breaker', () => {
    it('should open circuit breaker after threshold failures', async () => {
      const cache = new ServerlessCache({
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 2,
      })

      // Simulate failures by forcing errors
      ;(cache as any).handleCacheError(new Error('Test error'), 'get', 'key1')
      ;(cache as any).handleCacheError(new Error('Test error'), 'get', 'key2')

      // Circuit breaker should be open now
      expect((cache as any).circuitBreakerOpen).toBe(true)
    })

    it('should reset circuit breaker on successful operation', async () => {
      const cache = new ServerlessCache({
        enableCircuitBreaker: true,
        circuitBreakerThreshold: 2,
      })

      // Simulate a failure
      ;(cache as any).handleCacheError(new Error('Test error'), 'get', 'key1')
      expect((cache as any).circuitBreakerFailures).toBe(1)

      // Successful operation should reset failures
      await cache.set('key1', 'value1')
      expect((cache as any).circuitBreakerFailures).toBe(0)
    })
  })

  describe('Statistics', () => {
    it('should track cache statistics', async () => {
      await cache.set('key1', 'value1')
      await cache.get('key1') // hit
      await cache.get('key2') // miss

      const stats = cache.getStats()
      expect(stats.hits).toBeGreaterThanOrEqual(1)
      expect(stats.misses).toBeGreaterThanOrEqual(1)
      expect(stats.size).toBe(1)
    })

    it('should track batch operations', async () => {
      const operations = [
        { type: 'set' as const, key: 'key1', data: 'value1' },
        { type: 'set' as const, key: 'key2', data: 'value2' },
      ]

      await cache.batch(operations)

      const stats = cache.getStats()
      expect(stats.batchOperations).toBeGreaterThanOrEqual(1)
      expect(stats.batchSuccessRate).toBeGreaterThanOrEqual(0.5) // At least 50% success rate
    })
  })

  describe('Adaptive TTL', () => {
    it('should calculate adaptive TTL based on usage', () => {
      const cache = new ServerlessCache({
        enableAdaptiveTTL: true,
        minTTL: 1000,
        maxTTL: 10000,
        maxAge: 5000,
      })

      // Test adaptive TTL calculation
      const ttl = (cache as any).calculateAdaptiveTTL('test-key')
      expect(ttl).toBeGreaterThanOrEqual(1000)
      expect(ttl).toBeLessThanOrEqual(10000)
    })
  })
})
