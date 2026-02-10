import { describe, it, expect, vi } from 'vitest'

// Mock dependencies BEFORE importing the module
vi.mock('../../composition/index.js', () => ({
  db: {},
  schema: {},
}))

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('../../core/cache/index.js', () => ({
  getRedisClient: vi.fn(() => null),
}))

vi.mock('../../domains/config/adapters/schedule-repository.js', () => ({
  createScheduleRepository: vi.fn(),
}))

vi.mock('../../domains/config/adapters/repositories.js', () => ({
  createFeatureFlagRepository: vi.fn(),
}))

vi.mock('../../domains/config/adapters/cache.js', () => ({
  createInMemoryCache: vi.fn(),
}))

vi.mock('../../domains/config/adapters/redis-cache.js', () => ({
  createRedisCacheAdapter: vi.fn(),
}))

// Now import the function
import { calculateNextRetryAt } from '../process-flag-schedules.js'

/**
 * Unit tests for retry utility functions (WISH-20260: AC8)
 *
 * Tests exponential backoff calculation and jitter distribution.
 */

describe('calculateNextRetryAt', () => {
  it('should return ~2 minutes for retry_count = 0 (AC8)', () => {
    const result = calculateNextRetryAt(0)
    const now = Date.now()
    const diff = result.getTime() - now

    // 2 minutes = 120000ms, jitter adds 0-30000ms
    expect(diff).toBeGreaterThanOrEqual(120000)
    expect(diff).toBeLessThan(150000) // 2:30 max
  })

  it('should return ~4 minutes for retry_count = 1 (AC8)', () => {
    const result = calculateNextRetryAt(1)
    const now = Date.now()
    const diff = result.getTime() - now

    // 4 minutes = 240000ms, jitter adds 0-30000ms
    expect(diff).toBeGreaterThanOrEqual(240000)
    expect(diff).toBeLessThan(270000) // 4:30 max
  })

  it('should return ~8 minutes for retry_count = 2 (AC8)', () => {
    const result = calculateNextRetryAt(2)
    const now = Date.now()
    const diff = result.getTime() - now

    // 8 minutes = 480000ms, jitter adds 0-30000ms
    expect(diff).toBeGreaterThanOrEqual(480000)
    expect(diff).toBeLessThan(510000) // 8:30 max
  })

  it('should add jitter within 0-30 seconds (AC8)', () => {
    const results = []
    for (let i = 0; i < 100; i++) {
      const result = calculateNextRetryAt(0)
      const now = Date.now()
      const diff = result.getTime() - now
      // Extract jitter (diff - base backoff)
      const jitter = diff - 120000
      results.push(jitter)
    }

    // Verify jitter is within range
    results.forEach(jitter => {
      expect(jitter).toBeGreaterThanOrEqual(0)
      expect(jitter).toBeLessThan(30000)
    })

    // Verify jitter is distributed (not always same value)
    const uniqueJitters = new Set(results)
    expect(uniqueJitters.size).toBeGreaterThan(50) // At least 50% unique
  })

  it('should handle large retry_count without overflow (AC8)', () => {
    const result = calculateNextRetryAt(10)
    const now = Date.now()
    const diff = result.getTime() - now

    // 2^11 = 2048 minutes = ~34 hours
    expect(diff).toBeGreaterThan(0)
    expect(result.getTime()).toBeGreaterThan(now)
  })

  it('should return Date object with future timestamp', () => {
    const result = calculateNextRetryAt(0)
    
    expect(result).toBeInstanceOf(Date)
    expect(result.getTime()).toBeGreaterThan(Date.now())
  })
})
