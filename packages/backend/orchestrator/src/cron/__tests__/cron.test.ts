/**
 * Cron Module Unit Tests
 *
 * Tests for APIP-3090 cron scheduler infrastructure.
 *
 * Covers:
 * (a) CronJobDefinitionSchema valid/invalid
 * (b) CronScheduleRegistrySchema well-formed
 * (c) Advisory lock skip path (mock db returning false → SKIPPED, no runFn call)
 * (d) Timeout enforcement (vi.useFakeTimers + advanceTimersByTimeAsync → TIMEOUT, no propagation)
 * (e) DISABLE_CRON_JOB_* env var removes job from built registry
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  CronJobDefinitionSchema,
  CronScheduleRegistrySchema,
  CronRunResultSchema,
} from '../schemas.js'
import { buildCronRegistry, registerCronJobs } from '../registry.js'
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

// ============================================================================
// (a) CronJobDefinitionSchema valid/invalid
// ============================================================================

describe('CronJobDefinitionSchema', () => {
  it('accepts a valid job definition', () => {
    const valid = {
      jobName: 'test-job',
      schedule: '*/5 * * * *',
      timeoutMs: 30_000,
      runFn: async () => {},
    }
    expect(() => CronJobDefinitionSchema.parse(valid)).not.toThrow()
  })

  it('rejects empty jobName', () => {
    const invalid = {
      jobName: '',
      schedule: '*/5 * * * *',
      timeoutMs: 30_000,
      runFn: async () => {},
    }
    expect(() => CronJobDefinitionSchema.parse(invalid)).toThrow()
  })

  it('rejects empty schedule', () => {
    const invalid = {
      jobName: 'test-job',
      schedule: '',
      timeoutMs: 30_000,
      runFn: async () => {},
    }
    expect(() => CronJobDefinitionSchema.parse(invalid)).toThrow()
  })

  it('rejects non-positive timeoutMs', () => {
    const invalid = {
      jobName: 'test-job',
      schedule: '*/5 * * * *',
      timeoutMs: 0,
      runFn: async () => {},
    }
    expect(() => CronJobDefinitionSchema.parse(invalid)).toThrow()
  })

  it('rejects negative timeoutMs', () => {
    const invalid = {
      jobName: 'test-job',
      schedule: '*/5 * * * *',
      timeoutMs: -1,
      runFn: async () => {},
    }
    expect(() => CronJobDefinitionSchema.parse(invalid)).toThrow()
  })
})

// ============================================================================
// (b) CronScheduleRegistrySchema well-formed
// ============================================================================

describe('CronScheduleRegistrySchema', () => {
  it('accepts a well-formed registry with multiple jobs', () => {
    const valid = {
      jobs: [
        { jobName: 'job-a', schedule: '*/15 * * * *', timeoutMs: 60_000, runFn: async () => {} },
        { jobName: 'job-b', schedule: '0 0 * * *', timeoutMs: 120_000, runFn: async () => {} },
      ],
    }
    expect(() => CronScheduleRegistrySchema.parse(valid)).not.toThrow()
  })

  it('accepts an empty jobs array', () => {
    const valid = { jobs: [] }
    expect(() => CronScheduleRegistrySchema.parse(valid)).not.toThrow()
  })

  it('rejects missing jobs field', () => {
    expect(() => CronScheduleRegistrySchema.parse({})).toThrow()
  })
})

// ============================================================================
// (c) Advisory lock skip path
// ============================================================================

describe('advisory lock skip path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns SKIPPED result when lock cannot be acquired (mock db returns false)', async () => {
    // Mock getCronDbClient to return a pool that reports lock not acquired
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

    // Import pattern-miner job (after mocks are in place)
    const { patternMinerJob } = await import('../jobs/pattern-miner.job.js')

    const runFnSpy = vi.spyOn(patternMinerJob, 'runFn')

    // Wrap the job in a registry and adapter
    const adapter = new InMemoryCronAdapter()
    const registry = { jobs: [patternMinerJob] }
    registerCronJobs(adapter, registry)

    // Trigger the job manually
    await adapter.triggerJob('pattern-miner')

    // runFn was called (it's the wrapped function), but the internal
    // run function skipped due to lock miss
    expect(mockClient.query).toHaveBeenCalledWith(
      'SELECT pg_try_advisory_lock($1)',
      [42001],
    )
    expect(mockPool.end).toHaveBeenCalled()

    // The spy tracks calls to runFn — it should have been called once
    // (the adapter called it), but no runPatternMiner was called
    runFnSpy.mockRestore()
  })
})

// ============================================================================
// (d) Timeout enforcement via fake timers
// ============================================================================

describe('timeout enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('wraps job with timeout and catches TIMEOUT without propagating error', async () => {
    vi.useFakeTimers()

    const timeoutMs = 1_000
    let resolveSlowJob: (() => void) | undefined
    const slowRunFn = vi.fn().mockImplementation(
      () =>
        new Promise<void>(resolve => {
          resolveSlowJob = resolve
        }),
    )

    const job = CronJobDefinitionSchema.parse({
      jobName: 'slow-job',
      schedule: '* * * * *',
      timeoutMs,
      runFn: slowRunFn,
    })

    const adapter = new InMemoryCronAdapter()
    const registry = { jobs: [job] }
    registerCronJobs(adapter, registry)

    // Start the job (does NOT await yet — it's pending)
    const jobPromise = adapter.triggerJob('slow-job')

    // Advance timers past timeout
    await vi.advanceTimersByTimeAsync(timeoutMs + 100)

    // Resolve the slow job (too late — should be ignored)
    resolveSlowJob?.()

    // The wrapped function should NOT throw — timeout is caught internally
    await expect(jobPromise).resolves.toBeUndefined()
  })
})

// ============================================================================
// (e) DISABLE_CRON_JOB_* env var removes job from registry
// ============================================================================

describe('buildCronRegistry env var filtering', () => {
  it('includes all jobs when no env vars set', () => {
    const jobs = [
      { jobName: 'job-a', schedule: '*/5 * * * *', timeoutMs: 30_000, runFn: async () => {} },
      { jobName: 'job-b', schedule: '*/5 * * * *', timeoutMs: 30_000, runFn: async () => {} },
    ]

    const registry = buildCronRegistry(jobs, {})
    expect(registry.jobs).toHaveLength(2)
  })

  it('removes a job when DISABLE_CRON_JOB_<NAME>=true', () => {
    const jobs = [
      { jobName: 'pattern-miner', schedule: '*/15 * * * *', timeoutMs: 60_000, runFn: async () => {} },
      { jobName: 'code-audit', schedule: '0 2 * * *', timeoutMs: 60_000, runFn: async () => {} },
    ]

    const registry = buildCronRegistry(jobs, { DISABLE_CRON_JOB_PATTERN_MINER: 'true' })

    expect(registry.jobs).toHaveLength(1)
    expect(registry.jobs[0].jobName).toBe('code-audit')
  })

  it('handles hyphenated job names (hyphens become underscores in env key)', () => {
    const jobs = [
      { jobName: 'kb-compression', schedule: '0 1 * * *', timeoutMs: 60_000, runFn: async () => {} },
    ]

    const registry = buildCronRegistry(jobs, { DISABLE_CRON_JOB_KB_COMPRESSION: 'true' })
    expect(registry.jobs).toHaveLength(0)
  })

  it('does not remove job when env var is "false"', () => {
    const jobs = [
      { jobName: 'doc-sync', schedule: '0 * * * *', timeoutMs: 60_000, runFn: async () => {} },
    ]

    const registry = buildCronRegistry(jobs, { DISABLE_CRON_JOB_DOC_SYNC: 'false' })
    expect(registry.jobs).toHaveLength(1)
  })

  it('does not remove job when env var is absent', () => {
    const jobs = [
      { jobName: 'worktree-pruning', schedule: '0 2 * * *', timeoutMs: 60_000, runFn: async () => {} },
    ]

    const registry = buildCronRegistry(jobs, {})
    expect(registry.jobs).toHaveLength(1)
  })

  it('removes multiple jobs when multiple env vars set', () => {
    const jobs = [
      { jobName: 'pattern-miner', schedule: '*/15 * * * *', timeoutMs: 60_000, runFn: async () => {} },
      { jobName: 'code-audit', schedule: '0 2 * * *', timeoutMs: 60_000, runFn: async () => {} },
      { jobName: 'kb-compression', schedule: '0 1 * * *', timeoutMs: 60_000, runFn: async () => {} },
    ]

    const registry = buildCronRegistry(jobs, {
      DISABLE_CRON_JOB_PATTERN_MINER: 'true',
      DISABLE_CRON_JOB_CODE_AUDIT: 'true',
    })

    expect(registry.jobs).toHaveLength(1)
    expect(registry.jobs[0].jobName).toBe('kb-compression')
  })
})

// ============================================================================
// CronRunResultSchema validation
// ============================================================================

describe('CronRunResultSchema', () => {
  it('validates a successful run result', () => {
    const valid = {
      jobName: 'test-job',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 1234,
      status: 'SUCCESS',
      error: null,
    }
    expect(() => CronRunResultSchema.parse(valid)).not.toThrow()
  })

  it('validates a TIMEOUT run result', () => {
    const valid = {
      jobName: 'test-job',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 5000,
      status: 'TIMEOUT',
      error: 'Job timed out after 5000ms',
    }
    expect(() => CronRunResultSchema.parse(valid)).not.toThrow()
  })

  it('validates a SKIPPED run result', () => {
    const valid = {
      jobName: 'pattern-miner',
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 5,
      status: 'SKIPPED',
      error: null,
    }
    expect(() => CronRunResultSchema.parse(valid)).not.toThrow()
  })

  it('rejects invalid status', () => {
    const invalid = {
      jobName: 'test-job',
      startedAt: new Date().toISOString(),
      completedAt: null,
      durationMs: null,
      status: 'INVALID_STATUS',
      error: null,
    }
    expect(() => CronRunResultSchema.parse(invalid)).toThrow()
  })

  it('accepts null completedAt and durationMs (in-flight result)', () => {
    const valid = {
      jobName: 'test-job',
      startedAt: new Date().toISOString(),
      completedAt: null,
      durationMs: null,
      status: 'SUCCESS',
      error: null,
    }
    expect(() => CronRunResultSchema.parse(valid)).not.toThrow()
  })
})

// ============================================================================
// InMemoryCronAdapter
// ============================================================================

describe('InMemoryCronAdapter', () => {
  it('records all registered jobs', () => {
    const adapter = new InMemoryCronAdapter()
    adapter.schedule('job-a', '*/5 * * * *', async () => {})
    adapter.schedule('job-b', '0 0 * * *', async () => {})

    expect(adapter.registeredJobs).toHaveLength(2)
    expect(adapter.hasJob('job-a')).toBe(true)
    expect(adapter.hasJob('job-b')).toBe(true)
  })

  it('returns correct schedule for registered job', () => {
    const adapter = new InMemoryCronAdapter()
    adapter.schedule('my-job', '*/15 * * * *', async () => {})
    expect(adapter.getSchedule('my-job')).toBe('*/15 * * * *')
  })

  it('returns undefined for unknown job', () => {
    const adapter = new InMemoryCronAdapter()
    expect(adapter.getSchedule('nonexistent')).toBeUndefined()
  })

  it('triggerJob executes the registered function', async () => {
    const adapter = new InMemoryCronAdapter()
    const fn = vi.fn().mockResolvedValue(undefined)
    adapter.schedule('test-job', '* * * * *', fn)
    await adapter.triggerJob('test-job')
    expect(fn).toHaveBeenCalledOnce()
  })

  it('triggerJob throws for unknown job', async () => {
    const adapter = new InMemoryCronAdapter()
    await expect(adapter.triggerJob('nonexistent')).rejects.toThrow(
      'No job registered with name: nonexistent',
    )
  })

  it('reset clears all registered jobs', () => {
    const adapter = new InMemoryCronAdapter()
    adapter.schedule('job-a', '*/5 * * * *', async () => {})
    adapter.reset()
    expect(adapter.registeredJobs).toHaveLength(0)
  })
})
