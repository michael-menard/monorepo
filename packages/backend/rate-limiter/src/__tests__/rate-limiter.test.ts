/**
 * @repo/rate-limiter Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkRateLimit, RATE_LIMIT_CONFIGS, RateLimitConfig } from '../index.js'

// Mock Redis client
const mockRedis = {
  zRemRangeByScore: vi.fn(),
  zCard: vi.fn(),
  zAdd: vi.fn(),
  expire: vi.fn(),
  zRange: vi.fn(),
}

describe('Rate Limiter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedis.zRemRangeByScore.mockResolvedValue(0)
    mockRedis.zCard.mockResolvedValue(0)
    mockRedis.zAdd.mockResolvedValue(1)
    mockRedis.expire.mockResolvedValue(true)
    mockRedis.zRange.mockResolvedValue([])
  })

  describe('checkRateLimit', () => {
    const testConfig: RateLimitConfig = {
      maxRequests: 10,
      windowSeconds: 60,
      keyPrefix: 'test:ratelimit',
    }

    it('should allow request when under rate limit', async () => {
      mockRedis.zCard.mockResolvedValue(5) // 5 requests already made

      const result = await checkRateLimit(mockRedis as any, 'user-123', testConfig)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4) // 10 - 5 - 1 = 4
      expect(result.resetAt).toBeInstanceOf(Date)
    })

    it('should deny request when rate limit exceeded', async () => {
      mockRedis.zCard.mockResolvedValue(10) // At max requests
      mockRedis.zRange.mockResolvedValue([String(Date.now() - 30000)])

      const result = await checkRateLimit(mockRedis as any, 'user-123', testConfig)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should clean up old entries outside the window', async () => {
      await checkRateLimit(mockRedis as any, 'user-123', testConfig)

      expect(mockRedis.zRemRangeByScore).toHaveBeenCalledWith(
        'test:ratelimit:user-123',
        0,
        expect.any(Number),
      )
    })

    it('should add current request to the sorted set when allowed', async () => {
      mockRedis.zCard.mockResolvedValue(0)

      await checkRateLimit(mockRedis as any, 'user-123', testConfig)

      expect(mockRedis.zAdd).toHaveBeenCalledWith('test:ratelimit:user-123', {
        score: expect.any(Number),
        value: expect.any(String),
      })
    })

    it('should set expiry on the key', async () => {
      mockRedis.zCard.mockResolvedValue(0)

      await checkRateLimit(mockRedis as any, 'user-123', testConfig)

      expect(mockRedis.expire).toHaveBeenCalledWith('test:ratelimit:user-123', 60)
    })

    it('should fail open when Redis throws an error', async () => {
      mockRedis.zRemRangeByScore.mockRejectedValue(new Error('Redis connection failed'))

      const result = await checkRateLimit(mockRedis as any, 'user-123', testConfig)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
    })

    it('should use custom logger when provided', async () => {
      const mockLogger = {
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      }

      await checkRateLimit(mockRedis as any, 'user-123', testConfig, mockLogger)

      expect(mockLogger.debug).toHaveBeenCalled()
    })
  })

  describe('RATE_LIMIT_CONFIGS', () => {
    it('should have profile config', () => {
      expect(RATE_LIMIT_CONFIGS.profile).toEqual({
        maxRequests: 60,
        windowSeconds: 60,
        keyPrefix: 'ratelimit:profile',
      })
    })

    it('should have strict config', () => {
      expect(RATE_LIMIT_CONFIGS.strict).toEqual({
        maxRequests: 10,
        windowSeconds: 60,
        keyPrefix: 'ratelimit:strict',
      })
    })

    it('should have lenient config', () => {
      expect(RATE_LIMIT_CONFIGS.lenient).toEqual({
        maxRequests: 120,
        windowSeconds: 60,
        keyPrefix: 'ratelimit:lenient',
      })
    })
  })
})

