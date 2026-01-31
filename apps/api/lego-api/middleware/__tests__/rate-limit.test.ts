import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { rateLimit, __testing } from '../rate-limit.js'

const {
  rateLimitStore,
  isRateLimited,
  recordFailure,
  getRetryAfterSeconds,
  cleanupExpiredEntries,
  getClientIp,
  MAX_FAILURES_PER_WINDOW,
  RATE_LIMIT_WINDOW_MS,
} = __testing

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

/**
 * Rate Limiting Middleware Tests (AC24)
 *
 * Tests for brute-force protection via rate limiting.
 * Validates:
 * - Counter increments on 401/403 responses
 * - Counter does NOT increment on 200/201/204 responses
 * - 429 returned after 10 failures in 5 minutes
 * - Retry-After header included
 * - Window slides correctly (old failures expire)
 * - Different IPs tracked independently
 */
describe('Rate Limiting Middleware', () => {
  beforeEach(() => {
    // Clear the rate limit store before each test
    rateLimitStore.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    rateLimitStore.clear()
  })

  describe('recordFailure', () => {
    // Test 1: Counter increments on failure
    it('increments counter when failure is recorded', () => {
      recordFailure('192.168.1.1')

      const entry = rateLimitStore.get('192.168.1.1')
      expect(entry?.timestamps).toHaveLength(1)
    })

    // Test 2: Multiple failures accumulate
    it('accumulates multiple failures for same IP', () => {
      recordFailure('192.168.1.1')
      recordFailure('192.168.1.1')
      recordFailure('192.168.1.1')

      const entry = rateLimitStore.get('192.168.1.1')
      expect(entry?.timestamps).toHaveLength(3)
    })

    // Test 3: Different IPs tracked independently
    it('tracks different IPs independently', () => {
      recordFailure('192.168.1.1')
      recordFailure('192.168.1.2')
      recordFailure('192.168.1.1')

      expect(rateLimitStore.get('192.168.1.1')?.timestamps).toHaveLength(2)
      expect(rateLimitStore.get('192.168.1.2')?.timestamps).toHaveLength(1)
    })
  })

  describe('isRateLimited', () => {
    // Test 4: Not rate limited with no failures
    it('returns false when no failures recorded', () => {
      expect(isRateLimited('192.168.1.1')).toBe(false)
    })

    // Test 5: Not rate limited below threshold
    it('returns false when failures below threshold', () => {
      for (let i = 0; i < MAX_FAILURES_PER_WINDOW - 1; i++) {
        recordFailure('192.168.1.1')
      }

      expect(isRateLimited('192.168.1.1')).toBe(false)
    })

    // Test 6: Rate limited at threshold
    it('returns true when failures reach threshold', () => {
      for (let i = 0; i < MAX_FAILURES_PER_WINDOW; i++) {
        recordFailure('192.168.1.1')
      }

      expect(isRateLimited('192.168.1.1')).toBe(true)
    })

    // Test 7: Rate limited above threshold
    it('returns true when failures exceed threshold', () => {
      for (let i = 0; i < MAX_FAILURES_PER_WINDOW + 5; i++) {
        recordFailure('192.168.1.1')
      }

      expect(isRateLimited('192.168.1.1')).toBe(true)
    })
  })

  describe('getRetryAfterSeconds', () => {
    // Test 8: Returns 0 when no failures
    it('returns 0 when no failures recorded', () => {
      expect(getRetryAfterSeconds('192.168.1.1')).toBe(0)
    })

    // Test 9: Returns positive value when rate limited
    it('returns positive retry-after when failures exist', () => {
      recordFailure('192.168.1.1')

      const retryAfter = getRetryAfterSeconds('192.168.1.1')

      // Should be approximately 5 minutes (300 seconds)
      expect(retryAfter).toBeGreaterThan(290)
      expect(retryAfter).toBeLessThanOrEqual(300)
    })
  })

  describe('cleanupExpiredEntries', () => {
    // Test 10: Removes expired entries
    it('removes timestamps outside the window', () => {
      // Manually add an old timestamp
      const oldTimestamp = Date.now() - RATE_LIMIT_WINDOW_MS - 1000
      rateLimitStore.set('192.168.1.1', { timestamps: [oldTimestamp] })

      cleanupExpiredEntries()

      // Entry should be removed because timestamp is outside window
      expect(rateLimitStore.has('192.168.1.1')).toBe(false)
    })

    // Test 11: Keeps recent entries
    it('keeps timestamps within the window', () => {
      const recentTimestamp = Date.now() - 1000 // 1 second ago
      rateLimitStore.set('192.168.1.1', { timestamps: [recentTimestamp] })

      cleanupExpiredEntries()

      expect(rateLimitStore.has('192.168.1.1')).toBe(true)
      expect(rateLimitStore.get('192.168.1.1')?.timestamps).toHaveLength(1)
    })

    // Test 12: Removes old, keeps recent
    it('removes old timestamps but keeps recent ones', () => {
      const oldTimestamp = Date.now() - RATE_LIMIT_WINDOW_MS - 1000
      const recentTimestamp = Date.now() - 1000
      rateLimitStore.set('192.168.1.1', { timestamps: [oldTimestamp, recentTimestamp] })

      cleanupExpiredEntries()

      expect(rateLimitStore.get('192.168.1.1')?.timestamps).toHaveLength(1)
    })
  })

  describe('getClientIp', () => {
    // Test 13: Extracts IP from X-Forwarded-For
    it('extracts IP from X-Forwarded-For header', () => {
      const request = new Request('http://localhost/test', {
        headers: { 'X-Forwarded-For': '203.0.113.195, 70.41.3.18, 150.172.238.178' },
      })

      expect(getClientIp(request)).toBe('203.0.113.195')
    })

    // Test 14: Extracts IP from X-Real-IP
    it('extracts IP from X-Real-IP header', () => {
      const request = new Request('http://localhost/test', {
        headers: { 'X-Real-IP': '203.0.113.195' },
      })

      expect(getClientIp(request)).toBe('203.0.113.195')
    })

    // Test 15: Returns unknown when no headers
    it('returns unknown when no IP headers present', () => {
      const request = new Request('http://localhost/test')

      expect(getClientIp(request)).toBe('unknown')
    })

    // Test 16: X-Forwarded-For takes precedence over X-Real-IP
    it('prefers X-Forwarded-For over X-Real-IP', () => {
      const request = new Request('http://localhost/test', {
        headers: {
          'X-Forwarded-For': '1.2.3.4',
          'X-Real-IP': '5.6.7.8',
        },
      })

      expect(getClientIp(request)).toBe('1.2.3.4')
    })
  })

  describe('Middleware Integration', () => {
    let app: Hono

    beforeEach(() => {
      rateLimitStore.clear()

      app = new Hono()
      app.use('*', rateLimit)

      // Test routes
      app.get('/success', c => c.json({ ok: true }))
      app.get('/unauthorized', c => c.json({ error: 'Unauthorized' }, 401))
      app.get('/forbidden', c => c.json({ error: 'Forbidden' }, 403))
      app.post('/created', c => c.json({ id: '123' }, 201))
      app.delete('/deleted', c => c.body(null, 204))
    })

    // Test 17: 200 response does NOT increment counter
    it('does not record failure for 200 response', async () => {
      await app.request('/success', {
        headers: { 'X-Forwarded-For': '10.0.0.1' },
      })

      expect(rateLimitStore.has('10.0.0.1')).toBe(false)
    })

    // Test 18: 201 response does NOT increment counter
    it('does not record failure for 201 response', async () => {
      await app.request('/created', {
        method: 'POST',
        headers: { 'X-Forwarded-For': '10.0.0.1' },
      })

      expect(rateLimitStore.has('10.0.0.1')).toBe(false)
    })

    // Test 19: 204 response does NOT increment counter
    it('does not record failure for 204 response', async () => {
      await app.request('/deleted', {
        method: 'DELETE',
        headers: { 'X-Forwarded-For': '10.0.0.1' },
      })

      expect(rateLimitStore.has('10.0.0.1')).toBe(false)
    })

    // Test 20: 401 response increments counter
    it('records failure for 401 response', async () => {
      await app.request('/unauthorized', {
        headers: { 'X-Forwarded-For': '10.0.0.1' },
      })

      expect(rateLimitStore.get('10.0.0.1')?.timestamps).toHaveLength(1)
    })

    // Test 21: 403 response increments counter
    it('records failure for 403 response', async () => {
      await app.request('/forbidden', {
        headers: { 'X-Forwarded-For': '10.0.0.1' },
      })

      expect(rateLimitStore.get('10.0.0.1')?.timestamps).toHaveLength(1)
    })

    // Test 22: Returns 429 after threshold exceeded
    it('returns 429 when rate limit exceeded', async () => {
      const ip = '10.0.0.2'

      // Trigger MAX_FAILURES_PER_WINDOW failures
      for (let i = 0; i < MAX_FAILURES_PER_WINDOW; i++) {
        await app.request('/unauthorized', {
          headers: { 'X-Forwarded-For': ip },
        })
      }

      // Next request should be rate limited
      const res = await app.request('/success', {
        headers: { 'X-Forwarded-For': ip },
      })

      expect(res.status).toBe(429)
    })

    // Test 23: 429 response includes Retry-After header
    it('includes Retry-After header in 429 response', async () => {
      const ip = '10.0.0.3'

      // Trigger rate limit
      for (let i = 0; i < MAX_FAILURES_PER_WINDOW; i++) {
        await app.request('/unauthorized', {
          headers: { 'X-Forwarded-For': ip },
        })
      }

      const res = await app.request('/success', {
        headers: { 'X-Forwarded-For': ip },
      })

      expect(res.headers.get('Retry-After')).toBeTruthy()
      const retryAfter = parseInt(res.headers.get('Retry-After') || '0')
      expect(retryAfter).toBeGreaterThan(0)
      expect(retryAfter).toBeLessThanOrEqual(300)
    })

    // Test 24: 429 response body contains error details
    it('returns proper error body for 429 response', async () => {
      const ip = '10.0.0.4'

      // Trigger rate limit
      for (let i = 0; i < MAX_FAILURES_PER_WINDOW; i++) {
        await app.request('/unauthorized', {
          headers: { 'X-Forwarded-For': ip },
        })
      }

      const res = await app.request('/success', {
        headers: { 'X-Forwarded-For': ip },
      })

      const body = (await res.json()) as { error: string; message: string; retryAfter: number }
      expect(body.error).toBe('Too Many Requests')
      expect(body.message).toContain('Rate limit exceeded')
      expect(body.retryAfter).toBeGreaterThan(0)
    })

    // Test 25: Different IPs have separate limits
    it('tracks rate limits per IP independently', async () => {
      const ip1 = '10.0.0.5'
      const ip2 = '10.0.0.6'

      // Trigger rate limit for ip1 only
      for (let i = 0; i < MAX_FAILURES_PER_WINDOW; i++) {
        await app.request('/unauthorized', {
          headers: { 'X-Forwarded-For': ip1 },
        })
      }

      // ip1 should be rate limited
      const res1 = await app.request('/success', {
        headers: { 'X-Forwarded-For': ip1 },
      })
      expect(res1.status).toBe(429)

      // ip2 should NOT be rate limited
      const res2 = await app.request('/success', {
        headers: { 'X-Forwarded-For': ip2 },
      })
      expect(res2.status).toBe(200)
    })
  })
})
