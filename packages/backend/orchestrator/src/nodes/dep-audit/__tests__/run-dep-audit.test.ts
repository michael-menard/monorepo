/**
 * Unit tests for runDepAudit() orchestrator
 *
 * Story: APIP-4030 - Dependency Auditor
 * Covers: HP-6, EC-1 (DB failure), EC-7 (advisory lock), ED-2, ED-3
 */

import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  runDepAudit,
  DepAuditThresholdsSchema,
  type DepAuditConfig,
  type DepAuditDbClient,
} from '../run-dep-audit.js'
import { logger } from '@repo/logger'

vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}))

// ── Fixtures ──────────────────────────────────────────────────────────────────

const REAL_EQUIV_CONFIG_PATH = new URL(
  '../../../config/dep-equivalences.yaml',
  import.meta.url,
).pathname

function makeConfig(overrides: Partial<DepAuditConfig> = {}): DepAuditConfig {
  return {
    storyId: 'APIP-4030',
    commitSha: 'abc123',
    prevSnapshot: { lodash: '4.0.0' },
    currentSnapshot: { lodash: '4.17.21', dayjs: '1.11.0' },
    workspaceRoot: '/workspace',
    equivalenceConfigPath: REAL_EQUIV_CONFIG_PATH,
    ...overrides,
  }
}

function makeDb(overrides: Partial<DepAuditDbClient> = {}): DepAuditDbClient {
  return {
    tryAdvisoryLock: vi.fn().mockResolvedValue(true),
    insertRun: vi.fn().mockResolvedValue({ id: '00000000-0000-0000-0000-000000000001' }),
    insertFinding: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('runDepAudit', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('HP-6: happy path — persists run row and returns summary', async () => {
    const db = makeDb()
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    })
    const mockRunner = vi.fn().mockResolvedValue(
      JSON.stringify({ vulnerabilities: {}, metadata: {} }),
    )

    const result = await runDepAudit(
      makeConfig({
        prevSnapshot: { lodash: '4.0.0' },
        currentSnapshot: { lodash: '4.17.21', dayjs: '1.11.0' },
      }),
      db,
      { fetchFn: mockFetch, toolRunner: mockRunner },
    )

    expect(result.storyId).toBe('APIP-4030')
    expect(result.runId).toBe('00000000-0000-0000-0000-000000000001')
    expect(result.packagesAdded).toContain('dayjs@1.11.0')
    expect(result.packagesUpdated).toContain('lodash@4.17.21')
    expect(result.skippedReason).toBeNull()
    expect(vi.mocked(db.insertRun)).toHaveBeenCalledOnce()
  })

  it('EC-7: returns early with skippedReason when advisory lock is held', async () => {
    const db = makeDb({
      tryAdvisoryLock: vi.fn().mockResolvedValue(false),
    })

    const result = await runDepAudit(makeConfig(), db)

    expect(result.skippedReason).toBe('advisory_lock_held')
    expect(result.runId).toBeNull()
    expect(vi.mocked(db.insertRun)).not.toHaveBeenCalled()
  })

  it('EC-7: only one run persisted when lock prevents concurrent execution', async () => {
    const db = makeDb()
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })
    const mockRunner = vi.fn().mockResolvedValue(JSON.stringify({ vulnerabilities: {} }))

    // First call acquires lock, second is blocked
    vi.mocked(db.tryAdvisoryLock)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)

    const [result1, result2] = await Promise.all([
      runDepAudit(makeConfig(), db, { fetchFn: mockFetch, toolRunner: mockRunner }),
      runDepAudit(makeConfig(), db, { fetchFn: mockFetch, toolRunner: mockRunner }),
    ])

    // Exactly one run was persisted
    expect(vi.mocked(db.insertRun)).toHaveBeenCalledTimes(1)
    const skipped = [result1, result2].filter(r => r.skippedReason === 'advisory_lock_held')
    expect(skipped).toHaveLength(1)
  })

  it('EC-1: DB insert failure warns without throwing', async () => {
    const failingDb = makeDb({
      insertRun: vi.fn().mockRejectedValue(new Error('connection refused')),
    })
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })
    const mockRunner = vi.fn().mockResolvedValue(JSON.stringify({ vulnerabilities: {} }))

    const result = await runDepAudit(makeConfig(), failingDb, {
      fetchFn: mockFetch,
      toolRunner: mockRunner,
    })

    // Should not throw
    expect(result.storyId).toBe('APIP-4030')
    expect(result.runId).toBeNull() // No run was persisted
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining('DB persistence failed'),
      expect.any(Object),
    )
  })

  it('ED-2: no high-severity findings → blockedQueueItemsCreated = 0', async () => {
    const db = makeDb()
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })
    const mockRunner = vi.fn().mockResolvedValue(JSON.stringify({ vulnerabilities: {} }))

    const result = await runDepAudit(
      makeConfig({
        prevSnapshot: {},
        currentSnapshot: {},
      }),
      db,
      { fetchFn: mockFetch, toolRunner: mockRunner },
    )

    expect(result.blockedQueueItemsCreated).toBe(0)
  })

  it('ED-3: DepAuditThresholdsSchema parses valid config', () => {
    const validConfig = {
      blockingThreshold: 'high',
      maxBundleDeltaBytes: 102400,
      unmaintainedAgeDays: 365,
    }

    const parsed = DepAuditThresholdsSchema.parse(validConfig)

    expect(parsed.blockingThreshold).toBe('high')
    expect(parsed.maxBundleDeltaBytes).toBe(102400)
    expect(parsed.unmaintainedAgeDays).toBe(365)
  })

  it('ED-3: DepAuditThresholdsSchema applies defaults', () => {
    const parsed = DepAuditThresholdsSchema.parse({})

    expect(parsed.blockingThreshold).toBe('high')
    expect(parsed.maxBundleDeltaBytes).toBe(102400)
    expect(parsed.unmaintainedAgeDays).toBe(365)
  })

  it('returns correct package change summary', async () => {
    const db = makeDb()
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) })
    const mockRunner = vi.fn().mockResolvedValue(JSON.stringify({ vulnerabilities: {} }))

    const result = await runDepAudit(
      makeConfig({
        prevSnapshot: { lodash: '4.0.0', 'date-fns': '2.0.0' },
        currentSnapshot: { lodash: '4.17.21', dayjs: '1.11.0' },
        equivalenceConfigPath: REAL_EQUIV_CONFIG_PATH,
      }),
      db,
      { fetchFn: mockFetch, toolRunner: mockRunner },
    )

    expect(result.packagesAdded).toContain('dayjs@1.11.0')
    expect(result.packagesUpdated).toContain('lodash@4.17.21')
    expect(result.packagesRemoved).toContain('date-fns')
  })
})
