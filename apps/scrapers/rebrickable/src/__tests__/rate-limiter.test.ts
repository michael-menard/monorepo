import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TokenBucketRateLimiter } from '../middleware/rate-limiter.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('TokenBucketRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates with default config', () => {
    const limiter = new TokenBucketRateLimiter()
    expect(limiter.getRequestCount()).toBe(0)
  })

  it('creates with custom config', () => {
    const limiter = new TokenBucketRateLimiter({
      requestsPerMinute: 5,
      minDelayMs: 1000,
      burstSize: 2,
    })
    expect(limiter.getRequestCount()).toBe(0)
  })

  it('allows burst requests', async () => {
    const limiter = new TokenBucketRateLimiter({
      requestsPerMinute: 60,
      minDelayMs: 0,
      burstSize: 3,
      jitter: 0,
    })

    // First three should consume burst tokens
    await limiter.acquire()
    await limiter.acquire()
    await limiter.acquire()

    expect(limiter.getRequestCount()).toBe(3)
  })

  it('tracks request count', async () => {
    const limiter = new TokenBucketRateLimiter({
      requestsPerMinute: 60,
      minDelayMs: 0,
      burstSize: 5,
      jitter: 0,
    })

    await limiter.acquire()
    expect(limiter.getRequestCount()).toBe(1)

    await limiter.acquire()
    expect(limiter.getRequestCount()).toBe(2)
  })

  it('reports available tokens', () => {
    const limiter = new TokenBucketRateLimiter({
      burstSize: 3,
    })

    expect(limiter.getAvailableTokens()).toBe(3)
  })
})
