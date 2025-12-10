/**
 * Rate Limiter Tests
 *
 * Story 3.1.31: Extract Rate Limit Package
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRateLimiter, generateDailyKey, RATE_LIMIT_WINDOWS } from '../limiter'
import { createInMemoryStore } from '../memory-store'
import type { RateLimitStore, RateLimitResult } from '../types'

describe('createRateLimiter', () => {
  describe('with mock store', () => {
    it('should delegate checkLimit to store.checkAndIncrement', async () => {
      const mockResult: RateLimitResult = {
        allowed: true,
        remaining: 99,
        currentCount: 1,
        resetAt: new Date(),
        retryAfterSeconds: 0,
      }

      const mockStore: RateLimitStore = {
        checkAndIncrement: vi.fn().mockResolvedValue(mockResult),
        reset: vi.fn().mockResolvedValue(undefined),
        getCount: vi.fn().mockResolvedValue(0),
      }

      const limiter = createRateLimiter(mockStore)
      const result = await limiter.checkLimit('test-key', {
        maxRequests: 100,
        windowMs: RATE_LIMIT_WINDOWS.DAY,
      })

      expect(mockStore.checkAndIncrement).toHaveBeenCalledWith('test-key', 100)
      expect(result).toEqual(mockResult)
    })

    it('should delegate reset to store.reset', async () => {
      const mockStore: RateLimitStore = {
        checkAndIncrement: vi.fn(),
        reset: vi.fn().mockResolvedValue(undefined),
        getCount: vi.fn().mockResolvedValue(0),
      }

      const limiter = createRateLimiter(mockStore)
      await limiter.reset('test-key')

      expect(mockStore.reset).toHaveBeenCalledWith('test-key')
    })

    it('should delegate getCount to store.getCount', async () => {
      const mockStore: RateLimitStore = {
        checkAndIncrement: vi.fn(),
        reset: vi.fn(),
        getCount: vi.fn().mockResolvedValue(42),
      }

      const limiter = createRateLimiter(mockStore)
      const count = await limiter.getCount('test-key')

      expect(mockStore.getCount).toHaveBeenCalledWith('test-key')
      expect(count).toBe(42)
    })
  })

  describe('with in-memory store', () => {
    let limiter: ReturnType<typeof createRateLimiter>

    beforeEach(() => {
      const store = createInMemoryStore()
      limiter = createRateLimiter(store)
    })

    it('should allow requests under the limit', async () => {
      const config = { maxRequests: 3, windowMs: RATE_LIMIT_WINDOWS.DAY }

      const result1 = await limiter.checkLimit('user:123', config)
      expect(result1.allowed).toBe(true)
      expect(result1.remaining).toBe(2)
      expect(result1.currentCount).toBe(1)

      const result2 = await limiter.checkLimit('user:123', config)
      expect(result2.allowed).toBe(true)
      expect(result2.remaining).toBe(1)
      expect(result2.currentCount).toBe(2)

      const result3 = await limiter.checkLimit('user:123', config)
      expect(result3.allowed).toBe(true)
      expect(result3.remaining).toBe(0)
      expect(result3.currentCount).toBe(3)
    })

    it('should block requests over the limit', async () => {
      const config = { maxRequests: 2, windowMs: RATE_LIMIT_WINDOWS.DAY }

      await limiter.checkLimit('user:456', config)
      await limiter.checkLimit('user:456', config)

      const result = await limiter.checkLimit('user:456', config)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.currentCount).toBe(2)
      expect(result.retryAfterSeconds).toBeGreaterThan(0)
    })

    it('should track different keys separately', async () => {
      const config = { maxRequests: 2, windowMs: RATE_LIMIT_WINDOWS.DAY }

      await limiter.checkLimit('user:A', config)
      await limiter.checkLimit('user:A', config)

      const resultA = await limiter.checkLimit('user:A', config)
      expect(resultA.allowed).toBe(false)

      const resultB = await limiter.checkLimit('user:B', config)
      expect(resultB.allowed).toBe(true)
      expect(resultB.currentCount).toBe(1)
    })

    it('should reset counter when requested', async () => {
      const config = { maxRequests: 1, windowMs: RATE_LIMIT_WINDOWS.DAY }

      await limiter.checkLimit('user:reset', config)
      const blocked = await limiter.checkLimit('user:reset', config)
      expect(blocked.allowed).toBe(false)

      await limiter.reset('user:reset')

      const afterReset = await limiter.checkLimit('user:reset', config)
      expect(afterReset.allowed).toBe(true)
      expect(afterReset.currentCount).toBe(1)
    })

    it('should return correct count via getCount', async () => {
      const config = { maxRequests: 10, windowMs: RATE_LIMIT_WINDOWS.DAY }

      expect(await limiter.getCount('user:count')).toBe(0)

      await limiter.checkLimit('user:count', config)
      expect(await limiter.getCount('user:count')).toBe(1)

      await limiter.checkLimit('user:count', config)
      await limiter.checkLimit('user:count', config)
      expect(await limiter.getCount('user:count')).toBe(3)
    })
  })
})

describe('generateDailyKey', () => {
  it('should generate key with current date by default', () => {
    const key = generateDailyKey('moc-upload', 'user-123')
    const today = new Date().toISOString().split('T')[0]

    expect(key).toBe(`moc-upload:user-123:${today}`)
  })

  it('should generate key with provided date', () => {
    const date = new Date('2024-06-15T12:00:00Z')
    const key = generateDailyKey('api-call', 'user-456', date)

    expect(key).toBe('api-call:user-456:2024-06-15')
  })

  it('should handle different features', () => {
    const date = new Date('2024-01-01T00:00:00Z')

    expect(generateDailyKey('upload', 'u1', date)).toBe('upload:u1:2024-01-01')
    expect(generateDailyKey('download', 'u1', date)).toBe('download:u1:2024-01-01')
    expect(generateDailyKey('moc-create', 'u1', date)).toBe('moc-create:u1:2024-01-01')
  })
})

describe('RATE_LIMIT_WINDOWS', () => {
  it('should have correct values', () => {
    expect(RATE_LIMIT_WINDOWS.MINUTE).toBe(60 * 1000)
    expect(RATE_LIMIT_WINDOWS.HOUR).toBe(60 * 60 * 1000)
    expect(RATE_LIMIT_WINDOWS.DAY).toBe(24 * 60 * 60 * 1000)
    expect(RATE_LIMIT_WINDOWS.WEEK).toBe(7 * 24 * 60 * 60 * 1000)
  })
})
