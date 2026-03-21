/**
 * Partition Manager Unit Tests
 *
 * CDBE-5020: Partition workflow_events Table and Partition Management Job
 *
 * Covers:
 * (a) partitionManagerJob validates against CronJobDefinitionSchema
 * (b) Advisory lock skip path (mock db returns false → runPartitionManager never called)
 * (c) December → January year rollover generates workflow_events_y2027m01 with correct range
 * (d) February boundary correct date range
 * (e) Idempotency (IF NOT EXISTS guard logs skip, no error on second run)
 * (f) DB error caught and logged, does not crash
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { CronJobDefinitionSchema } from '../schemas.js'
import { buildCronRegistry } from '../registry.js'
import { InMemoryCronAdapter } from '../adapter.js'

// Mock @repo/logger to avoid noise in tests
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock cron/db so tests don't need a real PostgreSQL connection
vi.mock('../db.js', () => ({
  getCronDbClient: vi.fn(),
}))

// =============================================================================
// (a) partitionManagerJob validates against CronJobDefinitionSchema
// =============================================================================

describe('partitionManagerJob schema validation', () => {
  it('validates against CronJobDefinitionSchema without throwing', async () => {
    const { partitionManagerJob } = await import('../jobs/partition-manager.job.js')
    expect(() => CronJobDefinitionSchema.parse(partitionManagerJob)).not.toThrow()
  })

  it('has jobName "partition-manager"', async () => {
    const { partitionManagerJob } = await import('../jobs/partition-manager.job.js')
    expect(partitionManagerJob.jobName).toBe('partition-manager')
  })

  it('has schedule "0 5 1 * *" (5 minutes past midnight on 1st of each month)', async () => {
    const { partitionManagerJob } = await import('../jobs/partition-manager.job.js')
    expect(partitionManagerJob.schedule).toBe('0 5 1 * *')
  })

  it('has positive timeoutMs', async () => {
    const { partitionManagerJob } = await import('../jobs/partition-manager.job.js')
    expect(partitionManagerJob.timeoutMs).toBeGreaterThan(0)
  })
})

// =============================================================================
// (b) Advisory lock skip path
// =============================================================================

describe('advisory lock skip path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips runPartitionManager when advisory lock is not acquired', async () => {
    const { getCronDbClient } = await import('../db.js')
    const mockClient = {
      query: vi.fn().mockResolvedValue({
        rows: [{ pg_try_advisory_lock: false }],
      }),
      release: vi.fn(),
    }
    const mockPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
      end: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(getCronDbClient).mockReturnValue(mockPool as any)

    // Track whether runPartitionManager was called via its logger
    const { logger } = await import('@repo/logger')
    const { partitionManagerJob } = await import('../jobs/partition-manager.job.js')

    const adapter = new InMemoryCronAdapter()
    const registry = { jobs: [partitionManagerJob] }

    // registerCronJobs wraps with timeout — call directly via adapter
    adapter.schedule('partition-manager', partitionManagerJob.schedule, partitionManagerJob.runFn)
    await adapter.triggerJob('partition-manager')

    // Verify advisory lock was queried
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT pg_try_advisory_lock($1)',
      [42_005],
    )

    // Pool should be ended (lock cleanup on skip)
    expect(mockPool.end).toHaveBeenCalled()

    // Skip log should be present
    expect(logger.info).toHaveBeenCalledWith(
      'cron.partition-manager.skipped',
      expect.objectContaining({ lockKey: 42_005 }),
    )

    // runPartitionManager.starting should NOT have been called
    expect(logger.info).not.toHaveBeenCalledWith(
      'cron.partition-manager.starting',
      expect.anything(),
    )
  })
})

// =============================================================================
// (c) December → January year rollover
// (d) February boundary
// (e) Idempotency
// (f) DB error handling
// =============================================================================

describe('runPartitionManager date arithmetic and SQL generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function makeMockPool(queryImpl?: (sql: string) => Promise<void>) {
    return {
      query: vi.fn().mockImplementation(async (sql: string) => {
        if (queryImpl) await queryImpl(sql)
        return { rows: [] }
      }),
      connect: vi.fn(),
      end: vi.fn().mockResolvedValue(undefined),
    }
  }

  it('generates workflow_events_y2027m01 with range 2027-01-01 to 2027-02-01 on December 1', async () => {
    // Simulate running on 2026-12-01: upcoming months are Jan 2027, Feb 2027
    vi.setSystemTime(new Date('2026-12-01T00:05:00Z'))

    const capturedSql: string[] = []
    const mockPool = makeMockPool(async sql => {
      capturedSql.push(sql)
    })

    const { runPartitionManager } = await import('../partition-manager.js')
    await runPartitionManager(mockPool as any, { monthsAhead: 2 })

    // Should have 2 partition SQL calls
    expect(mockPool.query).toHaveBeenCalledTimes(2)

    // First call: January 2027
    expect(capturedSql[0]).toContain('workflow_events_y2027m01')
    expect(capturedSql[0]).toContain('FROM (\'2027-01-01\')')
    expect(capturedSql[0]).toContain('TO (\'2027-02-01\')')

    // Second call: February 2027
    expect(capturedSql[1]).toContain('workflow_events_y2027m02')
    expect(capturedSql[1]).toContain('FROM (\'2027-02-01\')')
    expect(capturedSql[1]).toContain('TO (\'2027-03-01\')')

    vi.useRealTimers()
  })

  it('generates correct February boundary (TO 2026-03-01)', async () => {
    // Simulate running on 2026-01-01: upcoming month 1 ahead is February
    vi.setSystemTime(new Date('2026-01-01T00:05:00Z'))

    const capturedSql: string[] = []
    const mockPool = makeMockPool(async sql => {
      capturedSql.push(sql)
    })

    const { runPartitionManager } = await import('../partition-manager.js')
    await runPartitionManager(mockPool as any, { monthsAhead: 1 })

    expect(mockPool.query).toHaveBeenCalledTimes(1)
    expect(capturedSql[0]).toContain('workflow_events_y2026m02')
    expect(capturedSql[0]).toContain('FROM (\'2026-02-01\')')
    expect(capturedSql[0]).toContain('TO (\'2026-03-01\')')

    vi.useRealTimers()
  })

  it('uses IF NOT EXISTS guard for idempotency (no error on second run)', async () => {
    vi.setSystemTime(new Date('2026-03-01T00:05:00Z'))

    const mockPool = makeMockPool()
    const { runPartitionManager } = await import('../partition-manager.js')

    // First run — succeeds
    await runPartitionManager(mockPool as any, { monthsAhead: 1 })

    // Second run — should also succeed (IF NOT EXISTS prevents error)
    await expect(runPartitionManager(mockPool as any, { monthsAhead: 1 })).resolves.not.toThrow()

    expect(mockPool.query).toHaveBeenCalledTimes(2) // once per run

    vi.useRealTimers()
  })

  it('SQL contains CREATE TABLE IF NOT EXISTS for idempotency', async () => {
    vi.setSystemTime(new Date('2026-03-01T00:05:00Z'))

    const capturedSql: string[] = []
    const mockPool = makeMockPool(async sql => {
      capturedSql.push(sql)
    })

    const { runPartitionManager } = await import('../partition-manager.js')
    await runPartitionManager(mockPool as any, { monthsAhead: 1 })

    expect(capturedSql[0]).toMatch(/CREATE TABLE IF NOT EXISTS/i)

    vi.useRealTimers()
  })

  it('catches DB error and logs it without crashing (AC-6)', async () => {
    vi.setSystemTime(new Date('2026-03-01T00:05:00Z'))

    const dbError = new Error('deadlock detected')
    const mockPool = {
      query: vi.fn().mockRejectedValue(dbError),
      connect: vi.fn(),
      end: vi.fn().mockResolvedValue(undefined),
    }

    const { logger } = await import('@repo/logger')
    const { runPartitionManager } = await import('../partition-manager.js')

    // Should NOT throw
    await expect(runPartitionManager(mockPool as any, { monthsAhead: 1 })).resolves.not.toThrow()

    // Should log the error
    expect(logger.error).toHaveBeenCalledWith(
      'cron.partition-manager.partition-failed',
      expect.objectContaining({
        error: 'deadlock detected',
      }),
    )

    vi.useRealTimers()
  })

  it('logs partition-ensured on successful creation', async () => {
    vi.setSystemTime(new Date('2026-03-01T00:05:00Z'))

    const mockPool = makeMockPool()
    const { logger } = await import('@repo/logger')
    const { runPartitionManager } = await import('../partition-manager.js')

    await runPartitionManager(mockPool as any, { monthsAhead: 1 })

    expect(logger.info).toHaveBeenCalledWith(
      'cron.partition-manager.partition-ensured',
      expect.objectContaining({
        partitionName: 'workflow_events_y2026m04',
      }),
    )

    vi.useRealTimers()
  })
})

// =============================================================================
// PartitionManagerConfigSchema
// =============================================================================

describe('PartitionManagerConfigSchema', () => {
  it('defaults monthsAhead to 2 when not provided', async () => {
    const { PartitionManagerConfigSchema } = await import('../partition-manager.js')
    const config = PartitionManagerConfigSchema.parse({})
    expect(config.monthsAhead).toBe(2)
  })

  it('accepts custom monthsAhead value', async () => {
    const { PartitionManagerConfigSchema } = await import('../partition-manager.js')
    const config = PartitionManagerConfigSchema.parse({ monthsAhead: 3 })
    expect(config.monthsAhead).toBe(3)
  })

  it('rejects non-positive monthsAhead', async () => {
    const { PartitionManagerConfigSchema } = await import('../partition-manager.js')
    expect(() => PartitionManagerConfigSchema.parse({ monthsAhead: 0 })).toThrow()
    expect(() => PartitionManagerConfigSchema.parse({ monthsAhead: -1 })).toThrow()
  })
})

// =============================================================================
// DISABLE_CRON_JOB_PARTITION_MANAGER env var support (AC-7)
// =============================================================================

describe('DISABLE_CRON_JOB_PARTITION_MANAGER env var filtering', () => {
  it('excludes partition-manager when DISABLE_CRON_JOB_PARTITION_MANAGER=true', async () => {
    const { partitionManagerJob } = await import('../jobs/partition-manager.job.js')

    const registry = buildCronRegistry(
      [partitionManagerJob],
      { DISABLE_CRON_JOB_PARTITION_MANAGER: 'true' },
    )

    expect(registry.jobs).toHaveLength(0)
  })

  it('includes partition-manager when DISABLE_CRON_JOB_PARTITION_MANAGER is absent', async () => {
    const { partitionManagerJob } = await import('../jobs/partition-manager.job.js')

    const registry = buildCronRegistry([partitionManagerJob], {})

    expect(registry.jobs).toHaveLength(1)
    expect(registry.jobs[0].jobName).toBe('partition-manager')
  })

  it('includes partition-manager when DISABLE_CRON_JOB_PARTITION_MANAGER=false', async () => {
    const { partitionManagerJob } = await import('../jobs/partition-manager.job.js')

    const registry = buildCronRegistry(
      [partitionManagerJob],
      { DISABLE_CRON_JOB_PARTITION_MANAGER: 'false' },
    )

    expect(registry.jobs).toHaveLength(1)
  })
})
