/**
 * PostgreSQL Rate Limit Store Tests
 *
 * Story 3.1.31: Extract Rate Limit Package
 *
 * Tests the PostgresRateLimitStore implementation.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { createRateLimiter, generateDailyKey, RATE_LIMIT_WINDOWS } from '@repo/rate-limit'

// Mock the database client
const mockExecute = vi.fn()
const mockSelect = vi.fn()
const mockFrom = vi.fn()
const mockWhere = vi.fn()
const mockLimit = vi.fn()
const mockDelete = vi.fn()
const mockDeleteWhere = vi.fn()

vi.mock('@/core/database/client', () => ({
  getDbAsync: vi.fn(() =>
    Promise.resolve({
      execute: mockExecute,
      select: mockSelect,
      delete: mockDelete,
    }),
  ),
}))

// Mock the logger
vi.mock('@/core/observability/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Mock the schema
vi.mock('@/core/database/schema', () => ({
  userDailyUploads: {
    userId: 'user_id',
    day: 'day',
    count: 'count',
  },
}))

describe('PostgreSQL Rate Limit Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup default mock chain for select
    mockSelect.mockReturnValue({ from: mockFrom })
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ limit: mockLimit })
    // Setup mock chain for delete
    mockDelete.mockReturnValue({ where: mockDeleteWhere })
    mockDeleteWhere.mockResolvedValue(undefined)
  })

  describe('createPostgresRateLimitStore', () => {
    it('allows and increments when under limit', async () => {
      // Mock successful UPDATE (row was updated)
      mockExecute.mockResolvedValueOnce({ rows: [{ count: 5 }] })

      const { createPostgresRateLimitStore } = await import('../postgres-store')
      const store = createPostgresRateLimitStore()
      const limiter = createRateLimiter(store)

      const key = generateDailyKey('moc-upload', 'user-123')
      const result = await limiter.checkLimit(key, {
        maxRequests: 100,
        windowMs: RATE_LIMIT_WINDOWS.DAY,
      })

      expect(result.allowed).toBe(true)
      expect(result.currentCount).toBe(5)
      expect(result.remaining).toBe(95)
      expect(result.retryAfterSeconds).toBe(0)
    })

    it('allows first request of the day via INSERT', async () => {
      // Mock UPDATE returns no rows (no existing record)
      mockExecute.mockResolvedValueOnce({ rows: [] })
      // Mock INSERT succeeds
      mockExecute.mockResolvedValueOnce({ rows: [{ count: 1 }] })

      const { createPostgresRateLimitStore } = await import('../postgres-store')
      const store = createPostgresRateLimitStore()
      const limiter = createRateLimiter(store)

      const key = generateDailyKey('moc-upload', 'user-456')
      const result = await limiter.checkLimit(key, {
        maxRequests: 100,
        windowMs: RATE_LIMIT_WINDOWS.DAY,
      })

      expect(result.allowed).toBe(true)
      expect(result.currentCount).toBe(1)
      expect(result.remaining).toBe(99)
    })

    it('denies when limit is reached', async () => {
      // Mock UPDATE returns no rows (limit reached)
      mockExecute.mockResolvedValueOnce({ rows: [] })
      // Mock INSERT fails due to conflict (row exists)
      mockExecute.mockResolvedValueOnce({ rows: [] })
      // Mock SELECT to get current count
      mockLimit.mockResolvedValueOnce([{ count: 100 }])

      const { createPostgresRateLimitStore } = await import('../postgres-store')
      const store = createPostgresRateLimitStore()
      const limiter = createRateLimiter(store)

      const key = generateDailyKey('moc-upload', 'user-789')
      const result = await limiter.checkLimit(key, {
        maxRequests: 100,
        windowMs: RATE_LIMIT_WINDOWS.DAY,
      })

      expect(result.allowed).toBe(false)
      expect(result.currentCount).toBe(100)
      expect(result.remaining).toBe(0)
      expect(result.retryAfterSeconds).toBeGreaterThan(0)
    })

    it('returns correct resetAt as next UTC midnight', async () => {
      // Mock limit exceeded
      mockExecute.mockResolvedValueOnce({ rows: [] })
      mockExecute.mockResolvedValueOnce({ rows: [] })
      mockLimit.mockResolvedValueOnce([{ count: 50 }])

      const { createPostgresRateLimitStore } = await import('../postgres-store')
      const store = createPostgresRateLimitStore()
      const limiter = createRateLimiter(store)

      const key = generateDailyKey('moc-upload', 'user-test')
      const result = await limiter.checkLimit(key, {
        maxRequests: 50,
        windowMs: RATE_LIMIT_WINDOWS.DAY,
      })

      expect(result.allowed).toBe(false)
      // resetAt should be at midnight UTC
      expect(result.resetAt.getUTCHours()).toBe(0)
      expect(result.resetAt.getUTCMinutes()).toBe(0)
      expect(result.resetAt.getUTCSeconds()).toBe(0)
      // nextAllowedAt should be same as resetAt (backwards compat)
      expect(result.nextAllowedAt.getTime()).toBe(result.resetAt.getTime())
    })

    it('throws on invalid key format', async () => {
      const { createPostgresRateLimitStore } = await import('../postgres-store')
      const store = createPostgresRateLimitStore()
      const limiter = createRateLimiter(store)

      await expect(
        limiter.checkLimit('invalid-key', {
          maxRequests: 100,
          windowMs: RATE_LIMIT_WINDOWS.DAY,
        }),
      ).rejects.toThrow('Invalid rate limit key format')
    })

    it('throws on database error', async () => {
      mockExecute.mockRejectedValueOnce(new Error('Database connection failed'))

      const { createPostgresRateLimitStore } = await import('../postgres-store')
      const store = createPostgresRateLimitStore()
      const limiter = createRateLimiter(store)

      const key = generateDailyKey('moc-upload', 'user-error')
      await expect(
        limiter.checkLimit(key, {
          maxRequests: 100,
          windowMs: RATE_LIMIT_WINDOWS.DAY,
        }),
      ).rejects.toThrow('Database connection failed')
    })
  })

  describe('generateDailyKey', () => {
    it('generates correct key format', () => {
      const date = new Date('2024-06-15T12:00:00Z')
      const key = generateDailyKey('moc-upload', 'user-123', date)

      expect(key).toBe('moc-upload:user-123:2024-06-15')
    })

    it('uses current date by default', () => {
      const key = generateDailyKey('moc-upload', 'user-123')
      const today = new Date().toISOString().split('T')[0]

      expect(key).toBe(`moc-upload:user-123:${today}`)
    })
  })
})
