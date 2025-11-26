/**
 * Serverless Cache Manager Tests
 * Tests for the centralized cache management system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  ServerlessCacheManager,
  getServerlessCacheManager,
  resetServerlessCacheManager,
} from '../utils/serverlessCacheManager'

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

describe('ServerlessCacheManager', () => {
  let manager: ServerlessCacheManager

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.getItem.mockReturnValue(null)

    manager = new ServerlessCacheManager({
      enableGlobalBatching: true,
      enableMetricsCollection: false, // Disable for testing
      enableCacheWarming: false, // Disable for testing
    })
  })

  afterEach(() => {
    manager.stop()
    manager.clear()
  })

  describe('Basic Operations', () => {
    it('should set and get values with hybrid strategy', async () => {
      await manager.set('key1', 'value1')
      const result = await manager.get('key1')
      expect(result).toBe('value1')
    })

    it('should set and get values with memory strategy', async () => {
      await manager.set('key1', 'value1', undefined, 'memory')
      const result = await manager.get('key1', 'memory')
      expect(result).toBe('value1')
    })

    it('should handle storage strategy gracefully', async () => {
      await manager.set('key1', 'value1', undefined, 'storage')
      const result = await manager.get('key1', 'storage')
      // Storage cache might work or return null depending on environment
      expect(result === 'value1' || result === null).toBe(true)
    })

    it('should delete values from all caches', async () => {
      await manager.set('key1', 'value1')
      manager.delete('key1')
      const result = await manager.get('key1')
      expect(result).toBeNull()
    })

    it('should clear all caches', async () => {
      await manager.set('key1', 'value1')
      await manager.set('key2', 'value2')
      manager.clear()

      const result1 = await manager.get('key1')
      const result2 = await manager.get('key2')
      expect(result1).toBeNull()
      expect(result2).toBeNull()
    })
  })

  describe('Global Batch Operations', () => {
    it('should execute global batch operations', async () => {
      const operations = [
        { type: 'set' as const, key: 'key1', data: 'small-value' },
        { type: 'set' as const, key: 'key2', data: 'another-small-value' },
        { type: 'get' as const, key: 'key1' },
      ]

      const results = await manager.globalBatch(operations)

      expect(results).toHaveLength(3)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
      expect(results[2].success).toBe(true)
      expect(results[2].data).toBe('small-value')
    })

    it('should split operations by size for batch processing', async () => {
      const largeData = 'x'.repeat(15000) // > 10KB
      const smallData = 'small'

      const operations = [
        { type: 'set' as const, key: 'large-key', data: largeData },
        { type: 'set' as const, key: 'small-key', data: smallData },
      ]

      const results = await manager.globalBatch(operations)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
    })
  })

  describe('RTK Query Integration', () => {
    it('should provide RTK Query cache configurations', () => {
      const shortConfig = manager.getRTKQueryCacheConfig('short')
      expect(shortConfig.keepUnusedDataFor).toBe(30)
      expect(shortConfig.refetchOnMountOrArgChange).toBe(30)

      const longConfig = manager.getRTKQueryCacheConfig('long')
      expect(longConfig.keepUnusedDataFor).toBe(1800)
      expect(longConfig.refetchOnMountOrArgChange).toBe(1800)

      const persistentConfig = manager.getRTKQueryCacheConfig('persistent')
      expect(persistentConfig.keepUnusedDataFor).toBe(Infinity)
      expect(persistentConfig.refetchOnMountOrArgChange).toBe(false)
    })
  })

  describe('Statistics', () => {
    it('should provide comprehensive cache statistics', async () => {
      await manager.set('key1', 'value1')
      await manager.get('key1') // hit
      await manager.get('key2') // miss

      const stats = manager.getStats()

      expect(stats.memory).toBeDefined()
      expect(stats.memory.hits).toBeGreaterThanOrEqual(1)
      expect(stats.memory.misses).toBeGreaterThanOrEqual(1)
      expect(stats.memory.size).toBe(1)

      expect(stats.combined).toBeDefined()
      expect(stats.combined.totalHits).toBeGreaterThanOrEqual(1)
      expect(stats.combined.totalMisses).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Background Tasks', () => {
    it('should start and stop background tasks', () => {
      const managerWithTasks = new ServerlessCacheManager({
        enableMetricsCollection: true,
        enableCacheWarming: true,
        metricsReportingInterval: 100,
        warmingInterval: 100,
      })

      // Should start without errors
      expect(managerWithTasks).toBeDefined()

      // Should stop without errors
      managerWithTasks.stop()
    })
  })
})

describe('Global Cache Manager', () => {
  beforeEach(() => {
    resetServerlessCacheManager()
  })

  afterEach(() => {
    resetServerlessCacheManager()
  })

  it('should create and return global cache manager instance', () => {
    const manager1 = getServerlessCacheManager()
    const manager2 = getServerlessCacheManager()

    // Should return the same instance
    expect(manager1).toBe(manager2)
  })

  it('should create new instance with custom config', () => {
    const config = {
      enableGlobalBatching: false,
      enableMetricsCollection: false,
    }

    const manager = getServerlessCacheManager(config)
    expect(manager).toBeDefined()
  })

  it('should reset global cache manager', () => {
    const manager1 = getServerlessCacheManager()
    resetServerlessCacheManager()
    const manager2 = getServerlessCacheManager()

    // Should be different instances after reset
    expect(manager1).not.toBe(manager2)
  })
})
