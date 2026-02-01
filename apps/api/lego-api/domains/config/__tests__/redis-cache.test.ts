import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRedisCacheAdapter } from '../adapters/redis-cache.js'
import type { FeatureFlag } from '../types.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

/**
 * Redis Cache Adapter Tests (WISH-2019)
 *
 * Tests for RedisCacheAdapter functionality:
 * - AC 2: get/set/delete operations
 * - AC 3: Graceful error handling
 * - AC 15: Cache key patterns
 */

// Mock feature flags for testing
const mockFlags: FeatureFlag[] = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    flagKey: 'test-flag-1',
    enabled: true,
    rolloutPercentage: 100,
    description: 'Test flag 1',
    environment: 'production',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
  {
    id: '223e4567-e89b-12d3-a456-426614174001',
    flagKey: 'test-flag-2',
    enabled: false,
    rolloutPercentage: 50,
    description: 'Test flag 2',
    environment: 'production',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  },
]

// Mock Redis client
function createMockRedis() {
  const store = new Map<string, string>()

  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    setex: vi.fn(async (key: string, _ttl: number, value: string) => {
      store.set(key, value)
      return 'OK'
    }),
    del: vi.fn(async (...keys: string[]) => {
      let deleted = 0
      for (const key of keys) {
        if (store.delete(key)) deleted++
      }
      return deleted
    }),
    scan: vi.fn(async (cursor: string, _match: string, _pattern: string, _count: string, _num: number) => {
      // Return all keys matching pattern on first call, then empty on subsequent
      if (cursor === '0') {
        const keys = Array.from(store.keys()).filter(k => k.startsWith('feature_flags:'))
        return ['0', keys]
      }
      return ['0', []]
    }),
    _store: store,
  }
}

describe('createRedisCacheAdapter', () => {
  describe('with null Redis client', () => {
    it('should return null from get when Redis is null', async () => {
      const adapter = createRedisCacheAdapter(null)
      const result = await adapter.get('production')
      expect(result).toBeNull()
    })

    it('should not throw from set when Redis is null', async () => {
      const adapter = createRedisCacheAdapter(null)
      await expect(adapter.set('production', mockFlags, 300000)).resolves.toBeUndefined()
    })

    it('should return null from getFlag when Redis is null', async () => {
      const adapter = createRedisCacheAdapter(null)
      const result = await adapter.getFlag('production', 'test-flag-1')
      expect(result).toBeNull()
    })

    it('should not throw from invalidate when Redis is null', async () => {
      const adapter = createRedisCacheAdapter(null)
      await expect(adapter.invalidate('production')).resolves.toBeUndefined()
    })

    it('should not throw from invalidateAll when Redis is null', async () => {
      const adapter = createRedisCacheAdapter(null)
      await expect(adapter.invalidateAll()).resolves.toBeUndefined()
    })
  })

  describe('with mock Redis client', () => {
    let mockRedis: ReturnType<typeof createMockRedis>
    let adapter: ReturnType<typeof createRedisCacheAdapter>

    beforeEach(() => {
      mockRedis = createMockRedis()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      adapter = createRedisCacheAdapter(mockRedis as any)
    })

    describe('set()', () => {
      it('should store flags with correct key pattern (AC 15)', async () => {
        await adapter.set('production', mockFlags, 300000)

        expect(mockRedis.setex).toHaveBeenCalledWith(
          'feature_flags:production',
          300, // 300000ms = 300s
          expect.any(String),
        )
      })

      it('should serialize flags correctly', async () => {
        await adapter.set('production', mockFlags, 300000)

        const storedData = mockRedis._store.get('feature_flags:production')
        expect(storedData).toBeDefined()

        const parsed = JSON.parse(storedData!)
        expect(parsed.flags).toBeDefined()
        expect(parsed.flags['test-flag-1']).toBeDefined()
        expect(parsed.flags['test-flag-1'].enabled).toBe(true)
      })

      it('should handle different environments', async () => {
        await adapter.set('staging', mockFlags, 300000)

        expect(mockRedis.setex).toHaveBeenCalledWith(
          'feature_flags:staging',
          300,
          expect.any(String),
        )
      })
    })

    describe('get()', () => {
      it('should return null on cache miss', async () => {
        const result = await adapter.get('production')
        expect(result).toBeNull()
      })

      it('should return cached flags on cache hit', async () => {
        await adapter.set('production', mockFlags, 300000)
        const result = await adapter.get('production')

        expect(result).not.toBeNull()
        expect(result!.flags.size).toBe(2)
        expect(result!.flags.get('test-flag-1')?.enabled).toBe(true)
      })

      it('should reconstruct Date objects from JSON', async () => {
        await adapter.set('production', mockFlags, 300000)
        const result = await adapter.get('production')

        const flag = result!.flags.get('test-flag-1')
        expect(flag?.createdAt).toBeInstanceOf(Date)
        expect(flag?.updatedAt).toBeInstanceOf(Date)
      })
    })

    describe('getFlag()', () => {
      it('should return null on cache miss', async () => {
        const result = await adapter.getFlag('production', 'test-flag-1')
        expect(result).toBeNull()
      })

      it('should return specific flag on cache hit', async () => {
        await adapter.set('production', mockFlags, 300000)
        const result = await adapter.getFlag('production', 'test-flag-1')

        expect(result).not.toBeNull()
        expect(result!.flagKey).toBe('test-flag-1')
        expect(result!.enabled).toBe(true)
      })

      it('should return null for non-existent flag', async () => {
        await adapter.set('production', mockFlags, 300000)
        const result = await adapter.getFlag('production', 'non-existent')
        expect(result).toBeNull()
      })
    })

    describe('invalidate()', () => {
      it('should delete cache for environment (AC 8)', async () => {
        await adapter.set('production', mockFlags, 300000)
        await adapter.invalidate('production')

        expect(mockRedis.del).toHaveBeenCalledWith('feature_flags:production')
      })

      it('should not affect other environments', async () => {
        await adapter.set('production', mockFlags, 300000)
        await adapter.set('staging', mockFlags, 300000)

        await adapter.invalidate('production')

        const productionResult = await adapter.get('production')
        const stagingResult = await adapter.get('staging')

        expect(productionResult).toBeNull()
        expect(stagingResult).not.toBeNull()
      })
    })

    describe('invalidateAll()', () => {
      it('should delete all feature flag caches', async () => {
        await adapter.set('production', mockFlags, 300000)
        await adapter.set('staging', mockFlags, 300000)

        await adapter.invalidateAll()

        expect(mockRedis.del).toHaveBeenCalled()
      })
    })
  })

  describe('error handling (AC 3)', () => {
    it('should return null on get() error', async () => {
      const mockRedis = {
        get: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adapter = createRedisCacheAdapter(mockRedis as any)

      const result = await adapter.get('production')
      expect(result).toBeNull()
    })

    it('should not throw on set() error', async () => {
      const mockRedis = {
        setex: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adapter = createRedisCacheAdapter(mockRedis as any)

      await expect(adapter.set('production', mockFlags, 300000)).resolves.toBeUndefined()
    })

    it('should return null on getFlag() error', async () => {
      const mockRedis = {
        get: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adapter = createRedisCacheAdapter(mockRedis as any)

      const result = await adapter.getFlag('production', 'test-flag')
      expect(result).toBeNull()
    })

    it('should not throw on invalidate() error', async () => {
      const mockRedis = {
        del: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const adapter = createRedisCacheAdapter(mockRedis as any)

      await expect(adapter.invalidate('production')).resolves.toBeUndefined()
    })
  })
})
