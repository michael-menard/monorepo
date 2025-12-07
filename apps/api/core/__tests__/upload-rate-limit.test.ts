/**
 * Upload Rate Limit Service Unit Tests
 *
 * Story 3.1.6: Rate Limiting and Observability
 *
 * Tests:
 * - Increments under limit
 * - Returns not allowed at limit
 * - Correct nextAllowedAt at UTC midnight rollover
 * - Concurrency-safe behavior (sequential calls)
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'

// Mock the database client
const mockExecute = vi.fn()
const mockSelect = vi.fn()
const mockFrom = vi.fn()
const mockWhere = vi.fn()
const mockLimit = vi.fn()

vi.mock('@/core/database/client', () => ({
  getDbAsync: vi.fn(() =>
    Promise.resolve({
      execute: mockExecute,
      select: mockSelect,
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

describe('Upload Rate Limit Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Setup default mock chain for select
    mockSelect.mockReturnValue({ from: mockFrom })
    mockFrom.mockReturnValue({ where: mockWhere })
    mockWhere.mockReturnValue({ limit: mockLimit })
  })

  describe('checkAndIncrementDailyLimit', () => {
    it('allows and increments when under limit', async () => {
      // Mock successful UPDATE (row was updated)
      mockExecute.mockResolvedValueOnce({ rows: [{ count: 5 }] })

      const { checkAndIncrementDailyLimit } = await import('../rate-limit/upload-rate-limit')
      const result = await checkAndIncrementDailyLimit('user-123', 100)

      expect(result.allowed).toBe(true)
      expect(result.currentCount).toBe(5)
      expect(result.remaining).toBe(95)
      expect(result.retryAfterSeconds).toBe(0)
    })

    it('allows first upload of the day via INSERT', async () => {
      // Mock UPDATE returns no rows (no existing record)
      mockExecute.mockResolvedValueOnce({ rows: [] })
      // Mock INSERT succeeds
      mockExecute.mockResolvedValueOnce({ rows: [{ count: 1 }] })

      const { checkAndIncrementDailyLimit } = await import('../rate-limit/upload-rate-limit')
      const result = await checkAndIncrementDailyLimit('user-456', 100)

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

      const { checkAndIncrementDailyLimit } = await import('../rate-limit/upload-rate-limit')
      const result = await checkAndIncrementDailyLimit('user-789', 100)

      expect(result.allowed).toBe(false)
      expect(result.currentCount).toBe(100)
      expect(result.remaining).toBe(0)
      expect(result.retryAfterSeconds).toBeGreaterThan(0)
    })

    it('returns correct nextAllowedAt as next UTC midnight', async () => {
      // Mock limit exceeded
      mockExecute.mockResolvedValueOnce({ rows: [] })
      mockExecute.mockResolvedValueOnce({ rows: [] })
      mockLimit.mockResolvedValueOnce([{ count: 50 }])

      const { checkAndIncrementDailyLimit } = await import('../rate-limit/upload-rate-limit')
      const result = await checkAndIncrementDailyLimit('user-test', 50)

      expect(result.allowed).toBe(false)
      // nextAllowedAt should be at midnight UTC
      expect(result.nextAllowedAt.getUTCHours()).toBe(0)
      expect(result.nextAllowedAt.getUTCMinutes()).toBe(0)
      expect(result.nextAllowedAt.getUTCSeconds()).toBe(0)
    })

    it('handles concurrent calls safely via atomic operations', async () => {
      // First call succeeds
      mockExecute.mockResolvedValueOnce({ rows: [{ count: 99 }] })

      const { checkAndIncrementDailyLimit } = await import('../rate-limit/upload-rate-limit')
      const result1 = await checkAndIncrementDailyLimit('user-concurrent', 100)

      expect(result1.allowed).toBe(true)
      expect(result1.remaining).toBe(1)

      // Second call hits limit
      mockExecute.mockResolvedValueOnce({ rows: [] })
      mockExecute.mockResolvedValueOnce({ rows: [] })
      mockLimit.mockResolvedValueOnce([{ count: 100 }])

      const result2 = await checkAndIncrementDailyLimit('user-concurrent', 100)

      expect(result2.allowed).toBe(false)
      expect(result2.remaining).toBe(0)
    })

    it('throws on database error', async () => {
      mockExecute.mockRejectedValueOnce(new Error('Database connection failed'))

      const { checkAndIncrementDailyLimit } = await import('../rate-limit/upload-rate-limit')

      await expect(checkAndIncrementDailyLimit('user-error', 100)).rejects.toThrow(
        'Database connection failed',
      )
    })
  })
})

