import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler, calculateNextRetryAt } from '../process-flag-schedules.js'
import { ok, err } from '@repo/api-core'

// Mock dependencies
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock the database query function - will be populated by mocks
let mockDbExecute: any = null
let mockDbSelect: any = null

vi.mock('../../composition/index.js', () => ({
  db: new Proxy({}, {
    get(target, prop) {
      if (prop === 'execute') return mockDbExecute
      if (prop === 'select') return mockDbSelect
      return () => ({
        from: () => ({
          where: () => []
        })
      })
    }
  }),
  schema: {
    featureFlags: {},
  },
}))

vi.mock('../../core/cache/index.js', () => ({
  getRedisClient: vi.fn(() => null),
}))

// Repository mocks
const mockScheduleRepo = {
  findPendingWithLock: vi.fn(),
  updateStatus: vi.fn(),
  updateRetryMetadata: vi.fn(),
}

const mockFlagRepo = {
  update: vi.fn(),
}

const mockCache = {
  invalidate: vi.fn(),
}

vi.mock('../../domains/config/adapters/schedule-repository.js', () => ({
  createScheduleRepository: vi.fn(() => mockScheduleRepo),
}))

vi.mock('../../domains/config/adapters/repositories.js', () => ({
  createFeatureFlagRepository: vi.fn(() => mockFlagRepo),
}))

vi.mock('../../domains/config/adapters/cache.js', () => ({
  createInMemoryCache: vi.fn(() => mockCache),
}))

const mockAuditLogger = {
  logEvent: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
}

vi.mock('../../core/audit/audit-logger.js', () => ({
  createAuditLogger: vi.fn(() => mockAuditLogger),
}))

/**
 * Integration tests for cron job retry logic (WISH-20260: AC9)
 */
describe('Process Flag Schedules - Integration Tests (AC9)', () => {
  const mockEvent = {
    'detail-type': 'Scheduled Event' as const,
    source: 'aws.events' as const,
    time: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCache.invalidate.mockResolvedValue(undefined)
    mockAuditLogger.logEvent.mockClear()
  })

  it('AC9.1: should increment retry_count and set next_retry_at on first failure', async () => {
    const mockSchedule = {
      id: 'schedule-123',
      flagId: 'flag-123',
      scheduledAt: new Date(),
      status: 'pending',
      updates: { enabled: true },
      appliedAt: null,
      errorMessage: null,
      retryCount: 0,
      maxRetries: 3,
      nextRetryAt: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Mock the db.select().from().where() chain for flag lookup
    const mockSelectChain = {
      from: vi.fn(() => mockSelectChain),
      where: vi.fn(() => Promise.resolve([
        {
          id: 'flag-123',
          flagKey: 'test-flag',
          enabled: false,
          environment: 'production',
        }
      ])),
    }
    mockDbSelect = vi.fn(() => mockSelectChain)

    mockScheduleRepo.findPendingWithLock.mockResolvedValue([mockSchedule])
    mockFlagRepo.update.mockResolvedValue(err('DB_ERROR'))
    mockScheduleRepo.updateRetryMetadata.mockResolvedValue(ok(undefined))

    const result = await handler(mockEvent)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body.failed).toBe(1)

    // Verify retry metadata was updated
    expect(mockScheduleRepo.updateRetryMetadata).toHaveBeenCalledWith(
      'schedule-123',
      1, // retry_count incremented to 1
      expect.any(Date), // next_retry_at set
      expect.stringContaining('Flag update failed'),
    )

    // Verify next_retry_at is approximately 2 minutes in future (backoff for retry 0)
    const callArgs = mockScheduleRepo.updateRetryMetadata.mock.calls[0]
    const nextRetryAt = callArgs[2] as Date
    const now = Date.now()
    const diff = nextRetryAt.getTime() - now

    // Should be ~2 minutes (120000ms) + jitter (0-30000ms)
    expect(diff).toBeGreaterThanOrEqual(120000)
    expect(diff).toBeLessThan(150000)
  })

  it('AC9.2: should clear next_retry_at and set status=applied on successful retry', async () => {
    const mockSchedule = {
      id: 'schedule-456',
      flagId: 'flag-456',
      scheduledAt: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago
      status: 'failed',
      updates: { enabled: true },
      appliedAt: null,
      errorMessage: 'Previous failure',
      retryCount: 1, // This is a retry
      maxRetries: 3,
      nextRetryAt: new Date(Date.now() - 1000), // Ready for retry
      lastError: 'Flag update failed: DB_ERROR',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockSelectChain = {
      from: vi.fn(() => mockSelectChain),
      where: vi.fn(() => Promise.resolve([
        {
          id: 'flag-456',
          flagKey: 'retry-flag',
          enabled: false,
          environment: 'production',
        }
      ])),
    }
    mockDbSelect = vi.fn(() => mockSelectChain)

    mockScheduleRepo.findPendingWithLock.mockResolvedValue([mockSchedule])
    mockFlagRepo.update.mockResolvedValue(ok(undefined)) // Success this time
    mockScheduleRepo.updateStatus.mockResolvedValue(ok(undefined))

    const result = await handler(mockEvent)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body.processed).toBe(1)
    expect(body.failed).toBe(0)

    // Verify status updated to 'applied'
    expect(mockScheduleRepo.updateStatus).toHaveBeenCalledWith(
      'schedule-456',
      'applied',
      { appliedAt: expect.any(Date) },
    )

    // Verify retry metadata was NOT updated (success clears retry state via status update)
    expect(mockScheduleRepo.updateRetryMetadata).not.toHaveBeenCalled()
  })

  it('AC9.3: should set status=failed permanently after max retries exceeded', async () => {
    const mockSchedule = {
      id: 'schedule-789',
      flagId: 'flag-789',
      scheduledAt: new Date(Date.now() - 20 * 60 * 1000),
      status: 'failed',
      updates: { rolloutPercentage: 50 },
      appliedAt: null,
      errorMessage: 'Previous failure',
      retryCount: 3, // Already at max retries (3)
      maxRetries: 3,
      nextRetryAt: new Date(Date.now() - 1000),
      lastError: 'Flag update failed: DB_ERROR',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockSelectChain = {
      from: vi.fn(() => mockSelectChain),
      where: vi.fn(() => Promise.resolve([
        {
          id: 'flag-789',
          flagKey: 'max-retry-flag',
          enabled: true,
          environment: 'production',
        }
      ])),
    }
    mockDbSelect = vi.fn(() => mockSelectChain)

    mockScheduleRepo.findPendingWithLock.mockResolvedValue([mockSchedule])
    mockFlagRepo.update.mockResolvedValue(err('DB_ERROR')) // Fails again
    mockScheduleRepo.updateRetryMetadata.mockResolvedValue(ok(undefined))

    const result = await handler(mockEvent)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body.failed).toBe(1)

    // Verify retry metadata updated with null next_retry_at (permanent failure)
    // When retry_count (3) >= max_retries (3), no more retries
    expect(mockScheduleRepo.updateRetryMetadata).toHaveBeenCalledWith(
      'schedule-789',
      3, // retry_count stays at 3 (not incremented when at max)
      null, // next_retry_at cleared (no more retries)
      expect.stringContaining('Flag update failed'),
    )
  })
})

/**
 * Edge case tests (WISH-20260: AC10)
 */
describe('Process Flag Schedules - Edge Cases (AC10)', () => {
  const mockEvent = {
    'detail-type': 'Scheduled Event' as const,
    source: 'aws.events' as const,
    time: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCache.invalidate.mockResolvedValue(undefined)
    mockAuditLogger.logEvent.mockClear()
  })

  it('AC10.1: should handle concurrent retries with row locking (SKIP LOCKED)', async () => {
    // Simulate concurrent execution: findPendingWithLock returns empty due to SKIP LOCKED
    mockScheduleRepo.findPendingWithLock.mockResolvedValue([])

    const result = await handler(mockEvent)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body.processed).toBe(0)
    expect(body.failed).toBe(0)

    // Verify findPendingWithLock was called with limit
    expect(mockScheduleRepo.findPendingWithLock).toHaveBeenCalledWith(100)
  })

  it('AC10.2: should calculate correct backoff for retry_count=2 (8 minutes)', async () => {
    const mockSchedule = {
      id: 'schedule-backoff',
      flagId: 'flag-backoff',
      scheduledAt: new Date(Date.now() - 15 * 60 * 1000),
      status: 'failed',
      updates: { enabled: false },
      appliedAt: null,
      errorMessage: null,
      retryCount: 2, // Third attempt (0, 1, 2)
      maxRetries: 3,
      nextRetryAt: new Date(Date.now() - 1000),
      lastError: 'Previous error',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockSelectChain = {
      from: vi.fn(() => mockSelectChain),
      where: vi.fn(() => Promise.resolve([
        {
          id: 'flag-backoff',
          flagKey: 'backoff-flag',
          enabled: true,
          environment: 'production',
        }
      ])),
    }
    mockDbSelect = vi.fn(() => mockSelectChain)

    mockScheduleRepo.findPendingWithLock.mockResolvedValue([mockSchedule])
    mockFlagRepo.update.mockResolvedValue(err('TRANSIENT_ERROR'))
    mockScheduleRepo.updateRetryMetadata.mockResolvedValue(ok(undefined))

    const result = await handler(mockEvent)

    expect(result.statusCode).toBe(200)

    // When retry_count=2, it will increment to 3
    // But the backoff calculation uses the CURRENT retry_count (2) for the delay
    const callArgs = mockScheduleRepo.updateRetryMetadata.mock.calls[0]
    const nextRetryAt = callArgs[2] as Date
    const now = Date.now()
    const diff = nextRetryAt.getTime() - now

    // Should be ~8 minutes (480000ms) + jitter (0-30000ms)
    expect(diff).toBeGreaterThanOrEqual(480000)
    expect(diff).toBeLessThan(510000)
  })

  it('AC10.3: should respect custom max_retries=5 for schedule', async () => {
    const mockSchedule = {
      id: 'schedule-custom',
      flagId: 'flag-custom',
      scheduledAt: new Date(),
      status: 'pending',
      updates: { rolloutPercentage: 100 },
      appliedAt: null,
      errorMessage: null,
      retryCount: 0,
      maxRetries: 5, // Custom max_retries
      nextRetryAt: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockSelectChain = {
      from: vi.fn(() => mockSelectChain),
      where: vi.fn(() => Promise.resolve([
        {
          id: 'flag-custom',
          flagKey: 'custom-retry-flag',
          enabled: false,
          environment: 'production',
        }
      ])),
    }
    mockDbSelect = vi.fn(() => mockSelectChain)

    mockScheduleRepo.findPendingWithLock.mockResolvedValue([mockSchedule])
    mockFlagRepo.update.mockResolvedValue(err('DB_ERROR'))
    mockScheduleRepo.updateRetryMetadata.mockResolvedValue(ok(undefined))

    const result = await handler(mockEvent)

    expect(result.statusCode).toBe(200)

    // Should schedule retry (since retry_count=0 < max_retries=5)
    expect(mockScheduleRepo.updateRetryMetadata).toHaveBeenCalledWith(
      'schedule-custom',
      1,
      expect.any(Date),
      expect.any(String),
    )
  })

  it('AC10.4: should not retry when flag is deleted (permanent failure)', async () => {
    const mockSchedule = {
      id: 'schedule-deleted',
      flagId: 'flag-deleted',
      scheduledAt: new Date(),
      status: 'pending',
      updates: { enabled: true },
      appliedAt: null,
      errorMessage: null,
      retryCount: 0,
      maxRetries: 3,
      nextRetryAt: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockSelectChain = {
      from: vi.fn(() => mockSelectChain),
      where: vi.fn(() => Promise.resolve([])), // Flag not found
    }
    mockDbSelect = vi.fn(() => mockSelectChain)

    mockScheduleRepo.findPendingWithLock.mockResolvedValue([mockSchedule])
    mockScheduleRepo.updateRetryMetadata.mockResolvedValue(ok(undefined))

    const result = await handler(mockEvent)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body.failed).toBe(1)

    // Verify retry metadata updated with null next_retry_at (no retry for deleted flag)
    expect(mockScheduleRepo.updateRetryMetadata).toHaveBeenCalledWith(
      'schedule-deleted',
      0, // retry_count not incremented
      null, // No retry
      'Flag not found (may have been deleted)',
    )
  })

  it('AC10.5: should handle exception during processing and schedule retry', async () => {
    const mockSchedule = {
      id: 'schedule-exception',
      flagId: 'flag-exception',
      scheduledAt: new Date(),
      status: 'pending',
      updates: { enabled: true },
      appliedAt: null,
      errorMessage: null,
      retryCount: 0,
      maxRetries: 3,
      nextRetryAt: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Mock throws exception
    const mockSelectChain = {
      from: vi.fn(() => mockSelectChain),
      where: vi.fn(() => Promise.reject(new Error('Database connection lost'))),
    }
    mockDbSelect = vi.fn(() => mockSelectChain)

    mockScheduleRepo.findPendingWithLock.mockResolvedValue([mockSchedule])
    mockScheduleRepo.updateRetryMetadata.mockResolvedValue(ok(undefined))

    const result = await handler(mockEvent)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body.failed).toBe(1)

    // Verify retry scheduled despite exception
    expect(mockScheduleRepo.updateRetryMetadata).toHaveBeenCalledWith(
      'schedule-exception',
      1,
      expect.any(Date),
      'Database connection lost',
    )
  })

  it('AC10.6: should handle schedule with retry_count=4 and max_retries=5', async () => {
    const mockSchedule = {
      id: 'schedule-last-retry',
      flagId: 'flag-last-retry',
      scheduledAt: new Date(Date.now() - 30 * 60 * 1000),
      status: 'failed',
      updates: { enabled: true },
      appliedAt: null,
      errorMessage: null,
      retryCount: 4, // One retry left
      maxRetries: 5,
      nextRetryAt: new Date(Date.now() - 1000),
      lastError: 'Previous error',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockSelectChain = {
      from: vi.fn(() => mockSelectChain),
      where: vi.fn(() => Promise.resolve([
        {
          id: 'flag-last-retry',
          flagKey: 'last-retry-flag',
          enabled: false,
          environment: 'production',
        }
      ])),
    }
    mockDbSelect = vi.fn(() => mockSelectChain)

    mockScheduleRepo.findPendingWithLock.mockResolvedValue([mockSchedule])
    mockFlagRepo.update.mockResolvedValue(err('DB_ERROR'))
    mockScheduleRepo.updateRetryMetadata.mockResolvedValue(ok(undefined))

    const result = await handler(mockEvent)

    expect(result.statusCode).toBe(200)

    // Should schedule one more retry (4 < 5, so increment to 5)
    expect(mockScheduleRepo.updateRetryMetadata).toHaveBeenCalledWith(
      'schedule-last-retry',
      5, // Incremented to max
      expect.any(Date), // Still gets a retry scheduled
      expect.stringContaining('Flag update failed'),
    )
  })
})

/**
 * Basic handler tests (existing coverage)
 */
describe('Process Flag Schedules - Handler Basics', () => {
  const mockEvent = {
    'detail-type': 'Scheduled Event' as const,
    source: 'aws.events' as const,
    time: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockAuditLogger.logEvent.mockClear()
  })

  it('should return success when no pending schedules', async () => {
    mockScheduleRepo.findPendingWithLock.mockResolvedValue([])

    const result = await handler(mockEvent)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body.processed).toBe(0)
    expect(body.failed).toBe(0)
    expect(body.duration).toBeGreaterThanOrEqual(0)
  })

  it('should handle critical errors gracefully', async () => {
    mockScheduleRepo.findPendingWithLock.mockRejectedValue(new Error('Critical DB error'))

    const result = await handler(mockEvent)

    expect(result.statusCode).toBe(500)
    const body = JSON.parse(result.body)
    expect(body.error).toBe('Cron job failed')
    expect(body.message).toBe('Critical DB error')
  })
})

/**
 * Audit Logging tests (WISH-20280)
 */
describe('Process Flag Schedules - Audit Logging (WISH-20280)', () => {
  const mockEvent = {
    'detail-type': 'Scheduled Event' as const,
    source: 'aws.events' as const,
    time: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCache.invalidate.mockResolvedValue(undefined)
    mockAuditLogger.logEvent.mockClear()
    mockAuditLogger.logEvent.mockResolvedValue({ ok: true, data: undefined })
  })

  it('should log flag_schedule.applied event on successful schedule application', async () => {
    const mockSchedule = {
      id: 'schedule-audit-success',
      flagId: 'flag-audit-success',
      scheduledAt: new Date(),
      status: 'pending',
      updates: { enabled: true, rolloutPercentage: 50 },
      appliedAt: null,
      errorMessage: null,
      retryCount: 0,
      maxRetries: 3,
      nextRetryAt: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockSelectChain = {
      from: vi.fn(() => mockSelectChain),
      where: vi.fn(() => Promise.resolve([
        {
          id: 'flag-audit-success',
          flagKey: 'audit-flag',
          enabled: false,
          rolloutPercentage: 0,
          environment: 'production',
        }
      ])),
    }
    mockDbSelect = vi.fn(() => mockSelectChain)

    mockScheduleRepo.findPendingWithLock.mockResolvedValue([mockSchedule])
    mockFlagRepo.update.mockResolvedValue(ok({ enabled: true, rolloutPercentage: 50 }))
    mockScheduleRepo.updateStatus.mockResolvedValue(ok(undefined))

    const result = await handler(mockEvent)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body.processed).toBe(1)

    // Verify audit logging was called with correct event and metadata
    expect(mockAuditLogger.logEvent).toHaveBeenCalledWith('flag_schedule.applied', {
      scheduleId: 'schedule-audit-success',
      flagKey: 'audit-flag',
      updates: { enabled: true, rolloutPercentage: 50 },
      appliedAt: expect.any(String),
      flagState: {
        enabled: true,
        rolloutPercentage: 50,
      },
    })
  })

  it('should log flag_schedule.failed event on permanent failure', async () => {
    const mockSchedule = {
      id: 'schedule-audit-failed',
      flagId: 'flag-audit-failed',
      scheduledAt: new Date(Date.now() - 20 * 60 * 1000),
      status: 'failed',
      updates: { rolloutPercentage: 50 },
      appliedAt: null,
      errorMessage: 'Previous failure',
      retryCount: 3, // At max retries
      maxRetries: 3,
      nextRetryAt: new Date(Date.now() - 1000),
      lastError: 'Flag update failed: DB_ERROR',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockSelectChain = {
      from: vi.fn(() => mockSelectChain),
      where: vi.fn(() => Promise.resolve([
        {
          id: 'flag-audit-failed',
          flagKey: 'failed-flag',
          enabled: true,
          environment: 'production',
        }
      ])),
    }
    mockDbSelect = vi.fn(() => mockSelectChain)

    mockScheduleRepo.findPendingWithLock.mockResolvedValue([mockSchedule])
    mockFlagRepo.update.mockResolvedValue(err('DB_ERROR'))
    mockScheduleRepo.updateRetryMetadata.mockResolvedValue(ok(undefined))

    const result = await handler(mockEvent)

    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body.failed).toBe(1)

    // Verify audit logging was called with correct event and metadata
    expect(mockAuditLogger.logEvent).toHaveBeenCalledWith('flag_schedule.failed', {
      scheduleId: 'schedule-audit-failed',
      flagKey: 'failed-flag',
      errorMessage: 'Flag update failed: DB_ERROR',
      failedAt: expect.any(String),
    })
  })

  it('should not fail schedule processing if audit logging throws', async () => {
    const mockSchedule = {
      id: 'schedule-audit-error',
      flagId: 'flag-audit-error',
      scheduledAt: new Date(),
      status: 'pending',
      updates: { enabled: true },
      appliedAt: null,
      errorMessage: null,
      retryCount: 0,
      maxRetries: 3,
      nextRetryAt: null,
      lastError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockSelectChain = {
      from: vi.fn(() => mockSelectChain),
      where: vi.fn(() => Promise.resolve([
        {
          id: 'flag-audit-error',
          flagKey: 'error-flag',
          enabled: false,
          environment: 'production',
        }
      ])),
    }
    mockDbSelect = vi.fn(() => mockSelectChain)

    mockScheduleRepo.findPendingWithLock.mockResolvedValue([mockSchedule])
    mockFlagRepo.update.mockResolvedValue(ok({ enabled: true, rolloutPercentage: 0 }))
    mockScheduleRepo.updateStatus.mockResolvedValue(ok(undefined))
    mockAuditLogger.logEvent.mockRejectedValue(new Error('CloudWatch error'))

    const result = await handler(mockEvent)

    // Handler should still succeed despite audit logging failure
    expect(result.statusCode).toBe(200)
    const body = JSON.parse(result.body)
    expect(body.processed).toBe(1)
    expect(body.failed).toBe(0)

    // Verify the schedule was still marked as applied
    expect(mockScheduleRepo.updateStatus).toHaveBeenCalledWith(
      'schedule-audit-error',
      'applied',
      { appliedAt: expect.any(Date) },
    )
  })
})
