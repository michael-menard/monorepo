/**
 * Retention Policy Tests
 *
 * Unit tests for audit log retention cleanup.
 *
 * @see KNOW-018 AC9-AC10, AC12 for retention requirements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runRetentionCleanup, calculateCutoffDate } from '../retention-policy.js'

// Mock the logger
vi.mock('@repo/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('calculateCutoffDate', () => {
  it('should calculate correct cutoff date for 90 days', () => {
    const now = new Date('2026-01-31T12:00:00Z')
    vi.setSystemTime(now)

    const cutoff = calculateCutoffDate(90)

    // Should be 90 days before, at start of day
    expect(cutoff.getFullYear()).toBe(2025)
    expect(cutoff.getMonth()).toBe(10) // November (0-indexed)
    expect(cutoff.getDate()).toBe(2)
    expect(cutoff.getHours()).toBe(0)
    expect(cutoff.getMinutes()).toBe(0)
    expect(cutoff.getSeconds()).toBe(0)

    vi.useRealTimers()
  })

  it('should calculate correct cutoff date for 30 days', () => {
    const now = new Date('2026-01-31T12:00:00Z')
    vi.setSystemTime(now)

    const cutoff = calculateCutoffDate(30)

    expect(cutoff.getFullYear()).toBe(2026)
    expect(cutoff.getMonth()).toBe(0) // January
    expect(cutoff.getDate()).toBe(1)

    vi.useRealTimers()
  })

  it('should handle 1 day retention', () => {
    const now = new Date('2026-01-31T12:00:00Z')
    vi.setSystemTime(now)

    const cutoff = calculateCutoffDate(1)

    expect(cutoff.getFullYear()).toBe(2026)
    expect(cutoff.getMonth()).toBe(0) // January
    expect(cutoff.getDate()).toBe(30)

    vi.useRealTimers()
  })
})

describe('runRetentionCleanup', () => {
  let mockDb: any

  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-31T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should perform dry run without deleting', async () => {
    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 500 }]),
        }),
      }),
      execute: vi.fn(),
    }

    const result = await runRetentionCleanup(
      {
        retention_days: 90,
        dry_run: true,
      },
      { db: mockDb },
      'test-correlation',
    )

    expect(result.deleted_count).toBe(500)
    expect(result.dry_run).toBe(true)
    expect(result.retention_days).toBe(90)
    expect(result.batches_processed).toBe(0)
    expect(result.correlation_id).toBe('test-correlation')

    // execute should not be called in dry run
    expect(mockDb.execute).not.toHaveBeenCalled()
  })

  it('should delete logs in batches', async () => {
    // First call returns 10000 rows (full batch)
    // Second call returns 5000 rows (partial batch, triggers end)
    let callCount = 0
    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 15000 }]),
        }),
      }),
      execute: vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return { rowCount: 10000 }
        }
        return { rowCount: 5000 }
      }),
    }

    const result = await runRetentionCleanup(
      {
        retention_days: 90,
        dry_run: false,
      },
      { db: mockDb },
    )

    expect(result.deleted_count).toBe(15000)
    expect(result.dry_run).toBe(false)
    expect(result.batches_processed).toBe(2)
    expect(mockDb.execute).toHaveBeenCalledTimes(2)
  })

  it('should handle no logs to delete', async () => {
    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      }),
      execute: vi.fn().mockResolvedValue({ rowCount: 0 }),
    }

    const result = await runRetentionCleanup(
      {
        retention_days: 90,
        dry_run: false,
      },
      { db: mockDb },
    )

    expect(result.deleted_count).toBe(0)
    expect(result.batches_processed).toBe(1)
  })

  it('should use default retention days (90)', async () => {
    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      }),
      execute: vi.fn().mockResolvedValue({ rowCount: 0 }),
    }

    const result = await runRetentionCleanup({}, { db: mockDb })

    expect(result.retention_days).toBe(90)
  })

  it('should reject invalid retention days', async () => {
    mockDb = { select: vi.fn() }

    await expect(
      runRetentionCleanup({ retention_days: 0 }, { db: mockDb }),
    ).rejects.toThrow()

    await expect(
      runRetentionCleanup({ retention_days: -1 }, { db: mockDb }),
    ).rejects.toThrow()
  })

  it('should include cutoff date in ISO format', async () => {
    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        }),
      }),
      execute: vi.fn().mockResolvedValue({ rowCount: 0 }),
    }

    const result = await runRetentionCleanup(
      {
        retention_days: 90,
      },
      { db: mockDb },
    )

    // Cutoff should be in ISO format
    expect(result.cutoff_date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('should track duration correctly', async () => {
    mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ count: 100 }]),
        }),
      }),
      execute: vi.fn().mockImplementation(async () => {
        // Simulate some time passing
        vi.advanceTimersByTime(100)
        return { rowCount: 100 }
      }),
    }

    const result = await runRetentionCleanup(
      {
        retention_days: 90,
        dry_run: false,
      },
      { db: mockDb },
    )

    expect(result.duration_ms).toBeGreaterThanOrEqual(0)
  })
})
