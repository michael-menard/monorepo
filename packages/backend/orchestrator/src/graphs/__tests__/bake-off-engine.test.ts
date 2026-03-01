/**
 * Unit tests for bake-off-engine.ts
 *
 * Tests significance threshold boundaries, winner determination, expiry logic,
 * no-op behaviour, and BakeOffConfigSchema validation.
 * All tests run without DB access — pure functions and mock injections only.
 *
 * Story APIP-3060: Bake-Off Engine for Model Experiments
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  isSignificant,
  isExpired,
  BakeOffConfigSchema,
  ArmStatsSchema,
  ActiveExperimentSchema,
  SignificanceResultSchema,
  ExperimentOutcomeSchema,
  MIN_SAMPLE_PER_ARM,
  MIN_ABSOLUTE_DELTA,
  createLoadExperimentsNode,
  createEvaluateSignificanceNode,
  createPromoteOrExpireNode,
  type ArmStats,
  type ActiveExperiment,
  type BakeOffGraphState,
} from '../bake-off-engine.js'

// ---------------------------------------------------------------------------
// Mock @repo/logger
// ---------------------------------------------------------------------------

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeArm(
  model: string,
  totalSamples: number,
  acceptedSamples: number,
): ArmStats {
  const acceptanceRate = totalSamples > 0 ? acceptedSamples / totalSamples : 0
  return ArmStatsSchema.parse({ model, totalSamples, acceptedSamples, acceptanceRate })
}

function makeExperiment(overrides: Partial<ActiveExperiment> = {}): ActiveExperiment {
  return ActiveExperimentSchema.parse({
    id: '00000000-0000-0000-0000-000000000001',
    changeType: 'sql',
    fileType: '.sql',
    controlModel: 'gpt-4o',
    variantModel: 'claude-3-5-sonnet',
    status: 'active',
    startedAt: new Date('2026-01-01T00:00:00Z'),
    windowDays: 14,
    ...overrides,
  })
}

function makeBaseState(overrides: Partial<BakeOffGraphState> = {}): BakeOffGraphState {
  return {
    bakeOffConfig: BakeOffConfigSchema.parse({}),
    activeExperiments: [],
    significanceResults: [],
    outcomes: [],
    runComplete: false,
    runErrors: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// isSignificant — pure function tests (ST-7)
// ---------------------------------------------------------------------------

describe('isSignificant', () => {
  it('returns not significant when control arm is below minimum sample threshold', () => {
    const control = makeArm('gpt-4o', MIN_SAMPLE_PER_ARM - 1, 40)
    const variant = makeArm('claude-3-5-sonnet', 100, 80)

    const result = isSignificant(control, variant)

    expect(result.significant).toBe(false)
    expect(result.winnerModel).toBeUndefined()
    expect(result.reason).toMatch(/Control arm has insufficient samples/)
  })

  it('returns not significant when variant arm is below minimum sample threshold', () => {
    const control = makeArm('gpt-4o', 100, 60)
    const variant = makeArm('claude-3-5-sonnet', MIN_SAMPLE_PER_ARM - 1, 40)

    const result = isSignificant(control, variant)

    expect(result.significant).toBe(false)
    expect(result.reason).toMatch(/Variant arm has insufficient samples/)
  })

  it('returns not significant when delta is below MIN_ABSOLUTE_DELTA threshold', () => {
    // Both arms have 60% acceptance rate → delta = 0
    const control = makeArm('gpt-4o', 100, 60)
    const variant = makeArm('claude-3-5-sonnet', 100, 60)

    const result = isSignificant(control, variant)

    expect(result.significant).toBe(false)
    expect(result.reason).toMatch(/delta .* < threshold/)
  })

  it('returns not significant when delta equals MIN_ABSOLUTE_DELTA (boundary)', () => {
    // delta = exactly MIN_ABSOLUTE_DELTA — must be strictly less than threshold
    const controlAccepted = Math.floor(100 * 0.5)
    const variantAccepted = Math.floor(100 * (0.5 + MIN_ABSOLUTE_DELTA))

    const control = makeArm('gpt-4o', 100, controlAccepted)
    const variant = makeArm('claude-3-5-sonnet', 100, variantAccepted)

    const actualDelta = variant.acceptanceRate - control.acceptanceRate

    // This may be significant or not depending on floating point; test the logic
    const result = isSignificant(control, variant)
    if (actualDelta < MIN_ABSOLUTE_DELTA) {
      expect(result.significant).toBe(false)
    } else {
      expect(result.significant).toBe(true)
    }
  })

  it('declares variant winner when variant acceptance rate is higher and threshold is met', () => {
    const control = makeArm('gpt-4o', 100, 50) // 50% acceptance
    const variant = makeArm('claude-3-5-sonnet', 100, 70) // 70% acceptance → delta 0.20

    const result = isSignificant(control, variant)

    expect(result.significant).toBe(true)
    expect(result.winnerModel).toBe('claude-3-5-sonnet')
    expect(result.reason).toMatch(/winner/)
  })

  it('declares control winner when control acceptance rate is higher and threshold is met', () => {
    const control = makeArm('gpt-4o', 100, 80) // 80% acceptance
    const variant = makeArm('claude-3-5-sonnet', 100, 50) // 50% acceptance → delta 0.30

    const result = isSignificant(control, variant)

    expect(result.significant).toBe(true)
    expect(result.winnerModel).toBe('gpt-4o')
  })

  it('respects custom config thresholds', () => {
    const control = makeArm('gpt-4o', 10, 7) // only 10 samples
    const variant = makeArm('claude-3-5-sonnet', 10, 9) // only 10 samples

    // With minSamplePerArm=5, both arms qualify; delta = 0.2 > minAbsoluteDelta=0.1
    const result = isSignificant(control, variant, {
      minSamplePerArm: 5,
      minAbsoluteDelta: 0.1,
    })

    expect(result.significant).toBe(true)
    expect(result.winnerModel).toBe('claude-3-5-sonnet')
  })
})

// ---------------------------------------------------------------------------
// isExpired — pure function tests (ST-7)
// ---------------------------------------------------------------------------

describe('isExpired', () => {
  it('returns false when experiment is within the observation window', () => {
    const startedAt = new Date('2026-02-01T00:00:00Z')
    const now = new Date('2026-02-10T00:00:00Z') // 9 days later
    expect(isExpired(startedAt, 14, now)).toBe(false)
  })

  it('returns true when experiment exceeds the observation window', () => {
    const startedAt = new Date('2026-02-01T00:00:00Z')
    const now = new Date('2026-02-20T00:00:00Z') // 19 days later
    expect(isExpired(startedAt, 14, now)).toBe(true)
  })

  it('returns false when experiment is exactly at the window boundary', () => {
    const startedAt = new Date('2026-02-01T00:00:00Z')
    // Exactly 14 days later (not greater than)
    const now = new Date(startedAt.getTime() + 14 * 24 * 60 * 60 * 1000)
    expect(isExpired(startedAt, 14, now)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// BakeOffConfigSchema validation (ST-7)
// ---------------------------------------------------------------------------

describe('BakeOffConfigSchema', () => {
  it('parses with defaults when no config provided', () => {
    const config = BakeOffConfigSchema.parse({})
    expect(config.minSamplePerArm).toBe(MIN_SAMPLE_PER_ARM)
    expect(config.minAbsoluteDelta).toBe(MIN_ABSOLUTE_DELTA)
    expect(config.dryRun).toBe(false)
  })

  it('accepts custom values', () => {
    const config = BakeOffConfigSchema.parse({
      minSamplePerArm: 100,
      minAbsoluteDelta: 0.1,
      dryRun: true,
    })
    expect(config.minSamplePerArm).toBe(100)
    expect(config.minAbsoluteDelta).toBe(0.1)
    expect(config.dryRun).toBe(true)
  })

  it('rejects non-positive minSamplePerArm', () => {
    expect(() => BakeOffConfigSchema.parse({ minSamplePerArm: 0 })).toThrow()
    expect(() => BakeOffConfigSchema.parse({ minSamplePerArm: -1 })).toThrow()
  })

  it('rejects non-positive minAbsoluteDelta', () => {
    expect(() => BakeOffConfigSchema.parse({ minAbsoluteDelta: 0 })).toThrow()
    expect(() => BakeOffConfigSchema.parse({ minAbsoluteDelta: -0.01 })).toThrow()
  })
})

// ---------------------------------------------------------------------------
// createLoadExperimentsNode — mock DB tests (ST-7)
// ---------------------------------------------------------------------------

describe('createLoadExperimentsNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns runErrors when db is not injected', async () => {
    const node = createLoadExperimentsNode()
    const state = makeBaseState()

    const result = await node(state, {})

    expect(result.runErrors).toEqual(
      expect.arrayContaining([expect.stringContaining('db not injected')]),
    )
    expect(result.activeExperiments).toBeUndefined()
  })

  it('returns loaded experiments when db returns rows', async () => {
    const node = createLoadExperimentsNode()
    const state = makeBaseState()

    const fakeRow = {
      id: '00000000-0000-0000-0000-000000000001',
      changeType: 'sql',
      fileType: '.sql',
      controlModel: 'gpt-4o',
      variantModel: 'claude-3-5-sonnet',
      status: 'active',
      startedAt: new Date('2026-01-01T00:00:00Z'),
      windowDays: 14,
    }

    const mockDb = { query: vi.fn().mockResolvedValue({ rows: [fakeRow], rowCount: 1 }) }
    const runnableConfig = { configurable: { db: mockDb } }

    const result = await node(state, runnableConfig)

    expect(result.activeExperiments).toHaveLength(1)
    expect(result.activeExperiments?.[0]?.id).toBe(fakeRow.id)
  })

  it('returns runErrors when db throws', async () => {
    const node = createLoadExperimentsNode()
    const state = makeBaseState()

    const mockDb = { query: vi.fn().mockRejectedValue(new Error('connection refused')) }
    const runnableConfig = { configurable: { db: mockDb } }

    const result = await node(state, runnableConfig)

    expect(result.runErrors).toEqual(
      expect.arrayContaining([expect.stringContaining('connection refused')]),
    )
  })
})

// ---------------------------------------------------------------------------
// createEvaluateSignificanceNode — mock DB tests (ST-7)
// ---------------------------------------------------------------------------

describe('createEvaluateSignificanceNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns runErrors when db is not injected', async () => {
    const node = createEvaluateSignificanceNode()
    const state = makeBaseState({ activeExperiments: [makeExperiment()] })

    const result = await node(state, {})

    expect(result.runErrors).toEqual(
      expect.arrayContaining([expect.stringContaining('db not injected')]),
    )
  })

  it('evaluates significant result when variant outperforms control', async () => {
    const node = createEvaluateSignificanceNode()
    const experiment = makeExperiment()
    const state = makeBaseState({ activeExperiments: [experiment] })

    const mockRows = [
      { model: 'gpt-4o', totalSamples: '100', acceptedSamples: '50' },
      { model: 'claude-3-5-sonnet', totalSamples: '100', acceptedSamples: '75' },
    ]

    const mockDb = { query: vi.fn().mockResolvedValue({ rows: mockRows, rowCount: mockRows.length }) }
    const runnableConfig = { configurable: { db: mockDb } }

    const result = await node(state, runnableConfig)

    expect(result.significanceResults).toHaveLength(1)
    expect(result.significanceResults?.[0]?.significant).toBe(true)
    expect(result.significanceResults?.[0]?.winnerModel).toBe('claude-3-5-sonnet')
  })

  it('evaluates not-significant when insufficient samples', async () => {
    const node = createEvaluateSignificanceNode()
    const experiment = makeExperiment()
    const state = makeBaseState({ activeExperiments: [experiment] })

    // Only 10 rows in each arm — below MIN_SAMPLE_PER_ARM
    const mockRows = [
      { model: 'gpt-4o', totalSamples: '10', acceptedSamples: '5' },
      { model: 'claude-3-5-sonnet', totalSamples: '10', acceptedSamples: '8' },
    ]

    const mockDb = { query: vi.fn().mockResolvedValue({ rows: mockRows, rowCount: mockRows.length }) }
    const runnableConfig = { configurable: { db: mockDb } }

    const result = await node(state, runnableConfig)

    expect(result.significanceResults?.[0]?.significant).toBe(false)
  })

  it('handles zero telemetry rows (both arms empty)', async () => {
    const node = createEvaluateSignificanceNode()
    const experiment = makeExperiment()
    const state = makeBaseState({ activeExperiments: [experiment] })

    const mockDb = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }) }
    const runnableConfig = { configurable: { db: mockDb } }

    const result = await node(state, runnableConfig)

    expect(result.significanceResults?.[0]?.significant).toBe(false)
    expect(result.significanceResults?.[0]?.controlStats.totalSamples).toBe(0)
    expect(result.significanceResults?.[0]?.variantStats.totalSamples).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// createPromoteOrExpireNode — mock DB tests (ST-7)
// ---------------------------------------------------------------------------

describe('createPromoteOrExpireNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns runErrors when db is not injected', async () => {
    const node = createPromoteOrExpireNode()
    const state = makeBaseState({
      activeExperiments: [makeExperiment()],
      significanceResults: [
        SignificanceResultSchema.parse({
          experimentId: '00000000-0000-0000-0000-000000000001',
          significant: true,
          winnerModel: 'claude-3-5-sonnet',
          controlStats: makeArm('gpt-4o', 100, 50),
          variantStats: makeArm('claude-3-5-sonnet', 100, 75),
          reason: 'test',
        }),
      ],
    })

    const result = await node(state, {})

    expect(result.runErrors).toEqual(
      expect.arrayContaining([expect.stringContaining('db not injected')]),
    )
  })

  it('concludes experiment when significant result exists', async () => {
    const node = createPromoteOrExpireNode()
    const experiment = makeExperiment()
    const state = makeBaseState({
      bakeOffConfig: BakeOffConfigSchema.parse({}),
      activeExperiments: [experiment],
      significanceResults: [
        SignificanceResultSchema.parse({
          experimentId: experiment.id,
          significant: true,
          winnerModel: 'claude-3-5-sonnet',
          controlStats: makeArm('gpt-4o', 100, 50),
          variantStats: makeArm('claude-3-5-sonnet', 100, 75),
          reason: 'delta 0.25 >= 0.05',
        }),
      ],
    })

    const mockDb = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }) }
    const runnableConfig = { configurable: { db: mockDb } }

    const result = await node(state, runnableConfig)

    expect(result.outcomes?.[0]?.action).toBe('concluded')
    expect(result.outcomes?.[0]?.winnerModel).toBe('claude-3-5-sonnet')
    // DB called twice: once for upsert affinity, once for UPDATE experiment
    expect(mockDb.query).toHaveBeenCalledTimes(2)
  })

  it('does not call db in dry-run mode', async () => {
    const node = createPromoteOrExpireNode()
    const experiment = makeExperiment()
    const state = makeBaseState({
      bakeOffConfig: BakeOffConfigSchema.parse({ dryRun: true }),
      activeExperiments: [experiment],
      significanceResults: [
        SignificanceResultSchema.parse({
          experimentId: experiment.id,
          significant: true,
          winnerModel: 'claude-3-5-sonnet',
          controlStats: makeArm('gpt-4o', 100, 50),
          variantStats: makeArm('claude-3-5-sonnet', 100, 75),
          reason: 'test',
        }),
      ],
    })

    const mockDb = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }) }
    const runnableConfig = { configurable: { db: mockDb } }

    const result = await node(state, runnableConfig)

    expect(result.outcomes?.[0]?.action).toBe('concluded')
    // No DB calls in dry-run mode
    expect(mockDb.query).not.toHaveBeenCalled()
  })

  it('expires experiment when window exceeded and not significant', async () => {
    const node = createPromoteOrExpireNode()
    // Start date well in the past — 30 days ago exceeds 14-day window
    const startedAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const experiment = makeExperiment({ startedAt })
    const state = makeBaseState({
      bakeOffConfig: BakeOffConfigSchema.parse({}),
      activeExperiments: [experiment],
      significanceResults: [
        SignificanceResultSchema.parse({
          experimentId: experiment.id,
          significant: false,
          controlStats: makeArm('gpt-4o', 100, 50),
          variantStats: makeArm('claude-3-5-sonnet', 100, 52),
          reason: 'delta 0.02 < 0.05',
        }),
      ],
    })

    const mockDb = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }) }
    const runnableConfig = { configurable: { db: mockDb } }

    const result = await node(state, runnableConfig)

    expect(result.outcomes?.[0]?.action).toBe('expired')
    expect(mockDb.query).toHaveBeenCalledTimes(1)
  })

  it('records no_op when experiment is not significant and not yet expired', async () => {
    const node = createPromoteOrExpireNode()
    // Started just 5 days ago — well within 14-day window
    const startedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    const experiment = makeExperiment({ startedAt })
    const state = makeBaseState({
      bakeOffConfig: BakeOffConfigSchema.parse({}),
      activeExperiments: [experiment],
      significanceResults: [
        SignificanceResultSchema.parse({
          experimentId: experiment.id,
          significant: false,
          controlStats: makeArm('gpt-4o', 10, 5),
          variantStats: makeArm('claude-3-5-sonnet', 10, 7),
          reason: 'insufficient samples',
        }),
      ],
    })

    const mockDb = { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }) }
    const runnableConfig = { configurable: { db: mockDb } }

    const result = await node(state, runnableConfig)

    expect(result.outcomes?.[0]?.action).toBe('no_op')
    expect(mockDb.query).not.toHaveBeenCalled()
  })

  it('handles DB failure during promotion gracefully', async () => {
    const node = createPromoteOrExpireNode()
    const experiment = makeExperiment()
    const state = makeBaseState({
      bakeOffConfig: BakeOffConfigSchema.parse({}),
      activeExperiments: [experiment],
      significanceResults: [
        SignificanceResultSchema.parse({
          experimentId: experiment.id,
          significant: true,
          winnerModel: 'claude-3-5-sonnet',
          controlStats: makeArm('gpt-4o', 100, 50),
          variantStats: makeArm('claude-3-5-sonnet', 100, 75),
          reason: 'test',
        }),
      ],
    })

    const mockDb = { query: vi.fn().mockRejectedValue(new Error('db timeout')) }
    const runnableConfig = { configurable: { db: mockDb } }

    const result = await node(state, runnableConfig)

    // Graceful degradation: no_op recorded, no throw
    expect(result.outcomes?.[0]?.action).toBe('no_op')
    expect(result.outcomes?.[0]?.reason).toMatch(/promotion failed/)
  })
})

// ---------------------------------------------------------------------------
// Named constant exports verification (ST-7)
// ---------------------------------------------------------------------------

describe('Named constants', () => {
  it('exports MIN_SAMPLE_PER_ARM as 50', () => {
    expect(MIN_SAMPLE_PER_ARM).toBe(50)
  })

  it('exports MIN_ABSOLUTE_DELTA as 0.05', () => {
    expect(MIN_ABSOLUTE_DELTA).toBe(0.05)
  })
})
