/**
 * Unit Tests for Rate Limiter Middleware
 *
 * Tests the Redis-based rate limiting functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '../rate-limiter'
import * as redisClient from '@/lib/cache/redis-client'

// Mock dependencies
vi.mock('@/lib/cache/redis-client')
vi.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('Rate Limiter Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkRateLimit', () => {
    it('should allow request when under rate limit', async () => {
      const mockRedis = {
        zRemRangeByScore: vi.fn(),
        zCard: vi.fn().mockResolvedValue(5), // 5 requests already
        zAdd: vi.fn(),
        expire: vi.fn(),
        zRange: vi.fn(),
      }

      vi.mocked(redisClient.getRedisClient).mockResolvedValue(mockRedis as any)

      const config = {
        maxRequests: 10,
        windowSeconds: 60,
        keyPrefix: 'test',
      }

      const result = await checkRateLimit('user-123', config)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4) // 10 - 5 - 1 = 4
      expect(mockRedis.zAdd).toHaveBeenCalled()
      expect(mockRedis.expire).toHaveBeenCalledWith('test:user-123', 60)
    })

    it('should deny request when rate limit exceeded', async () => {
      const now = Date.now()
      const mockRedis = {
        zRemRangeByScore: vi.fn(),
        zCard: vi.fn().mockResolvedValue(10), // Already at max
        zAdd: vi.fn(),
        expire: vi.fn(),
        zRange: vi.fn().mockResolvedValue([`${now - 50000}`]), // Oldest request 50s ago
      }

      vi.mocked(redisClient.getRedisClient).mockResolvedValue(mockRedis as any)

      const config = {
        maxRequests: 10,
        windowSeconds: 60,
        keyPrefix: 'test',
      }

      const result = await checkRateLimit('user-123', config)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
      expect(mockRedis.zAdd).not.toHaveBeenCalled()
    })

    it('should remove old entries from sliding window', async () => {
      const mockRedis = {
        zRemRangeByScore: vi.fn(),
        zCard: vi.fn().mockResolvedValue(3),
        zAdd: vi.fn(),
        expire: vi.fn(),
        zRange: vi.fn(),
      }

      vi.mocked(redisClient.getRedisClient).mockResolvedValue(mockRedis as any)

      const config = {
        maxRequests: 10,
        windowSeconds: 60,
        keyPrefix: 'test',
      }

      await checkRateLimit('user-123', config)

      expect(mockRedis.zRemRangeByScore).toHaveBeenCalled()
      const call = mockRedis.zRemRangeByScore.mock.calls[0]
      expect(call[0]).toBe('test:user-123')
      expect(call[1]).toBe(0)
      expect(call[2]).toBeLessThanOrEqual(Date.now())
    })

    it('should fail open when Redis is unavailable', async () => {
      vi.mocked(redisClient.getRedisClient).mockRejectedValue(
        new Error('Redis connection failed'),
      )

      const config = {
        maxRequests: 10,
        windowSeconds: 60,
        keyPrefix: 'test',
      }

      const result = await checkRateLimit('user-123', config)

      // Should allow request when rate limiting system is down
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBeGreaterThan(0)
    })
  })

  describe('Standard Rate Limit Configs', () => {
    it('should have profile rate limit config', () => {
      expect(RATE_LIMIT_CONFIGS.profile).toBeDefined()
      expect(RATE_LIMIT_CONFIGS.profile.maxRequests).toBe(60)
      expect(RATE_LIMIT_CONFIGS.profile.windowSeconds).toBe(60)
      expect(RATE_LIMIT_CONFIGS.profile.keyPrefix).toBe('ratelimit:profile')
    })

    it('should have strict rate limit config', () => {
      expect(RATE_LIMIT_CONFIGS.strict).toBeDefined()
      expect(RATE_LIMIT_CONFIGS.strict.maxRequests).toBe(10)
      expect(RATE_LIMIT_CONFIGS.strict.windowSeconds).toBe(60)
    })

    it('should have lenient rate limit config', () => {
      expect(RATE_LIMIT_CONFIGS.lenient).toBeDefined()
      expect(RATE_LIMIT_CONFIGS.lenient.maxRequests).toBe(120)
      expect(RATE_LIMIT_CONFIGS.lenient.windowSeconds).toBe(60)
    })
  })
})
