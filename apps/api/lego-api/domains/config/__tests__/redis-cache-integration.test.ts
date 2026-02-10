import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { createRedisClient, disconnectRedis } from '../../../core/cache/redis-client.js'
import { createRedisCacheAdapter } from '../adapters/redis-cache.js'
import type { FeatureFlag } from '../types.js'
import type { RedisClient } from '../../../core/cache/index.js'

/**
 * Redis Cache Integration Tests (WISH-2124 AC 11)
 *
 * Tests against live Docker Redis:
 * - AC 2: get/set/delete operations
 * - AC 7: TTL expiration
 * - AC 11: Docker Redis integration
 *
 * Prerequisites:
 * - Docker Redis running: `docker-compose up -d redis`
 * - REDIS_URL=redis://localhost:6379 in environment
 */

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
const TEST_TIMEOUT = 10000 // 10 seconds

// Mock feature flags for testing
const mockFlags: FeatureFlag[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    flagKey: 'integration-test-flag-1',
    enabled: true,
    rolloutPercentage: 100,
    description: 'Integration test flag 1',
    environment: 'test',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    flagKey: 'integration-test-flag-2',
    enabled: false,
    rolloutPercentage: 50,
    description: 'Integration test flag 2',
    environment: 'test',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
]

describe('Redis Cache Integration Tests', () => {
  let redisClient: RedisClient
  let adapter: ReturnType<typeof createRedisCacheAdapter>

  beforeAll(async () => {
    // Connect to Docker Redis
    redisClient = createRedisClient({ url: REDIS_URL })
    adapter = createRedisCacheAdapter(redisClient)

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 500))
  }, TEST_TIMEOUT)

  afterAll(async () => {
    // Cleanup and disconnect
    await redisClient.del('feature_flags:test')
    await disconnectRedis()
  }, TEST_TIMEOUT)

  beforeEach(async () => {
    // Clear test keys before each test
    await redisClient.del('feature_flags:test')
  })

  describe('Basic Operations (AC 2)', () => {
    it('should set and get flags from live Redis', async () => {
      // Set flags
      await adapter.set('test', mockFlags, 300000) // 5 minutes TTL

      // Get flags
      const result = await adapter.get('test')

      expect(result).not.toBeNull()
      expect(result!.flags.size).toBe(2)
      expect(result!.flags.get('integration-test-flag-1')?.enabled).toBe(true)
      expect(result!.flags.get('integration-test-flag-2')?.enabled).toBe(false)
    })

    it('should return null on cache miss', async () => {
      const result = await adapter.get('non-existent-environment')
      expect(result).toBeNull()
    })

    it('should get single flag from cache', async () => {
      await adapter.set('test', mockFlags, 300000)

      const result = await adapter.getFlag('test', 'integration-test-flag-1')

      expect(result).not.toBeNull()
      expect(result!.flagKey).toBe('integration-test-flag-1')
      expect(result!.enabled).toBe(true)
    })

    it('should invalidate cache for environment (AC 8)', async () => {
      // Set flags
      await adapter.set('test', mockFlags, 300000)

      // Verify cached
      let result = await adapter.get('test')
      expect(result).not.toBeNull()

      // Invalidate
      await adapter.invalidate('test')

      // Verify deleted
      result = await adapter.get('test')
      expect(result).toBeNull()
    })
  })

  describe('Cache Key Pattern (AC 15)', () => {
    it('should use correct cache key pattern feature_flags:{environment}', async () => {
      await adapter.set('test', mockFlags, 300000)

      // Directly check Redis for key
      const exists = await redisClient.exists('feature_flags:test')
      expect(exists).toBe(1)
    })

    it('should isolate different environments', async () => {
      const prodFlags = [
        {
          ...mockFlags[0],
          environment: 'production',
          flagKey: 'prod-flag',
        },
      ]

      await adapter.set('test', mockFlags, 300000)
      await adapter.set('production', prodFlags, 300000)

      // Both should exist independently
      const testExists = await redisClient.exists('feature_flags:test')
      const prodExists = await redisClient.exists('feature_flags:production')

      expect(testExists).toBe(1)
      expect(prodExists).toBe(1)

      // Cleanup
      await redisClient.del('feature_flags:production')
    })
  })

  describe('TTL Expiration (AC 7)', () => {
    it('should set TTL correctly', async () => {
      const ttlMs = 5000 // 5 seconds
      await adapter.set('test', mockFlags, ttlMs)

      // Check TTL in Redis
      const ttl = await redisClient.ttl('feature_flags:test')

      // TTL should be ~5 seconds (allow 1 second tolerance)
      expect(ttl).toBeGreaterThanOrEqual(4)
      expect(ttl).toBeLessThanOrEqual(5)
    })

    it('should expire cache after TTL', async () => {
      const ttlMs = 2000 // 2 seconds
      await adapter.set('test', mockFlags, ttlMs)

      // Verify cached immediately
      let result = await adapter.get('test')
      expect(result).not.toBeNull()

      // Wait for expiration (2s + 500ms buffer)
      await new Promise(resolve => setTimeout(resolve, 2500))

      // Verify expired
      result = await adapter.get('test')
      expect(result).toBeNull()
    }, TEST_TIMEOUT)
  })

  describe('Date Serialization', () => {
    it('should correctly serialize and deserialize Date objects', async () => {
      const testDate = new Date('2026-02-08T12:00:00Z')
      const flagsWithDates: FeatureFlag[] = [
        {
          ...mockFlags[0],
          createdAt: testDate,
          updatedAt: testDate,
        },
      ]

      await adapter.set('test', flagsWithDates, 300000)
      const result = await adapter.get('test')

      const flag = result!.flags.get('integration-test-flag-1')
      expect(flag?.createdAt).toBeInstanceOf(Date)
      expect(flag?.updatedAt).toBeInstanceOf(Date)
      expect(flag?.createdAt.toISOString()).toBe(testDate.toISOString())
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent writes', async () => {
      const writes = Array.from({ length: 10 }, (_, i) =>
        adapter.set(`test-${i}`, mockFlags, 300000),
      )

      await expect(Promise.all(writes)).resolves.toBeDefined()

      // Cleanup
      const deletes = Array.from({ length: 10 }, (_, i) => redisClient.del(`feature_flags:test-${i}`))
      await Promise.all(deletes)
    })

    it('should handle multiple concurrent reads', async () => {
      await adapter.set('test', mockFlags, 300000)

      const reads = Array.from({ length: 10 }, () => adapter.get('test'))

      const results = await Promise.all(reads)
      results.forEach(result => {
        expect(result).not.toBeNull()
        expect(result!.flags.size).toBe(2)
      })
    })
  })

  describe('Error Scenarios (AC 3)', () => {
    it('should handle malformed data gracefully', async () => {
      // Manually set malformed data
      await redisClient.setex('feature_flags:test', 300, 'not valid JSON')

      const result = await adapter.get('test')
      expect(result).toBeNull()
    })

    it('should handle empty cache data', async () => {
      await redisClient.setex('feature_flags:test', 300, '{}')

      const result = await adapter.get('test')
      expect(result).toBeNull()
    })
  })

  describe('invalidateAll()', () => {
    it('should delete all feature flag caches', async () => {
      // Set caches for multiple environments
      await adapter.set('test', mockFlags, 300000)
      await adapter.set('staging', mockFlags, 300000)
      await adapter.set('production', mockFlags, 300000)

      // Verify all exist
      let testExists = await redisClient.exists('feature_flags:test')
      let stagingExists = await redisClient.exists('feature_flags:staging')
      let prodExists = await redisClient.exists('feature_flags:production')

      expect(testExists).toBe(1)
      expect(stagingExists).toBe(1)
      expect(prodExists).toBe(1)

      // Invalidate all
      await adapter.invalidateAll()

      // Verify all deleted
      testExists = await redisClient.exists('feature_flags:test')
      stagingExists = await redisClient.exists('feature_flags:staging')
      prodExists = await redisClient.exists('feature_flags:production')

      expect(testExists).toBe(0)
      expect(stagingExists).toBe(0)
      expect(prodExists).toBe(0)
    })

    it('should handle no keys gracefully', async () => {
      // Call invalidateAll when no keys exist
      await expect(adapter.invalidateAll()).resolves.toBeUndefined()
    })
  })
})
