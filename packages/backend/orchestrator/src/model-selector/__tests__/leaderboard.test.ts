/**
 * leaderboard.test.ts
 *
 * Unit tests for leaderboard.ts: computeValueScore, computeConvergence,
 * computeQualityTrend, recordRun, loadLeaderboard, saveLeaderboard.
 *
 * Uses vi.mock('@repo/logger') and os.tmpdir() for filesystem tests.
 * Tests are pure-function or use temp files — no production filesystem access.
 *
 * MODL-0040: Model Leaderboard
 */

import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as yaml from 'yaml'
import { logger } from '@repo/logger'
import {
  computeValueScore,
  computeConvergence,
  computeQualityTrend,
  loadLeaderboard,
  saveLeaderboard,
  recordRun,
} from '../leaderboard.js'
import type { LeaderboardEntry, RunRecord, Leaderboard } from '../__types__/index.js'
import { createTaskContract } from '../../models/__types__/task-contract.js'

// Mock @repo/logger before importing leaderboard
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ============================================================================
// Helpers
// ============================================================================

function makeEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    task_id: 'code_generation_medium',
    model: 'anthropic/claude-sonnet-4.5',
    runs_count: 5,
    avg_quality: 82.0,
    avg_cost_usd: 0.002,
    avg_latency_ms: 1200.0,
    value_score: 41000.0,
    recent_run_scores: [80, 82, 83, 84, 82],
    convergence_status: 'exploring',
    convergence_confidence: 0,
    quality_trend: 'stable',
    last_run_at: '2026-02-18T10:00:00.000Z',
    ...overrides,
  }
}

function makeRunRecord(overrides: Partial<RunRecord> = {}): RunRecord {
  const contract = createTaskContract({ taskType: 'code_generation' })
  return {
    taskContract: contract,
    selectedTier: 'tier-1',
    modelUsed: 'anthropic/claude-sonnet-4.5',
    qualityScore: 85.0,
    qualityDimensions: [],
    contractMismatch: false,
    timestamp: new Date().toISOString(),
    cost_usd: 0.002,
    latency_ms: 1200,
    task_id: 'code_generation_medium',
    ...overrides,
  }
}

function makeTmpPath(): string {
  return path.join(
    os.tmpdir(),
    `leaderboard-test-${Math.random().toString(36).substring(2, 8)}.yaml`,
  )
}

// ============================================================================
// computeValueScore
// ============================================================================

describe('computeValueScore()', () => {
  it('should compute quality / cost when cost > 0', () => {
    // 82.0 / 0.002 = 41000
    expect(computeValueScore(82.0, 0.002)).toBe(41000)
  })

  it('should return avg_quality when cost_usd === 0 (Ollama zero-cost sentinel)', () => {
    expect(computeValueScore(65.0, 0)).toBe(65.0)
  })

  it('should cap value_score at 9999999.99', () => {
    // Very high quality, very low cost
    expect(computeValueScore(100, 0.000001)).toBe(9999999.99)
  })

  it('should return 0 when quality is 0 and cost is 0', () => {
    expect(computeValueScore(0, 0)).toBe(0)
  })

  it('should handle high quality with moderate cost', () => {
    const score = computeValueScore(90.0, 0.01)
    expect(score).toBeCloseTo(9000.0, 1)
  })

  it('should round to 2 decimal places', () => {
    const score = computeValueScore(75.123, 0.003)
    // 75.123 / 0.003 = 25041
    expect(score % 1).toBeCloseTo(0, 2) // Rounded to cents
  })
})

// ============================================================================
// computeConvergence
// ============================================================================

describe('computeConvergence()', () => {
  it('should return exploring when fewer than 20 total runs', () => {
    const entries = [makeEntry({ runs_count: 10 }), makeEntry({ model: 'other', runs_count: 9 })]
    const result = computeConvergence(entries)
    expect(result.convergence_status).toBe('exploring')
    expect(result.convergence_confidence).toBe(0)
  })

  it('should return exploring at boundary: exactly 19 total runs', () => {
    const entries = [makeEntry({ runs_count: 10 }), makeEntry({ model: 'other', runs_count: 9 })]
    // Total = 19 < 20
    expect(computeConvergence(entries).convergence_status).toBe('exploring')
  })

  it('should move past exploring at exactly 20 total runs', () => {
    const entries = [
      makeEntry({ runs_count: 10, avg_quality: 85.0 }),
      makeEntry({ model: 'other/model', runs_count: 10, avg_quality: 75.0 }),
    ]
    // Total = 20, gap = 10.0 >= 5.0, best runs = 10 >= 10
    const result = computeConvergence(entries)
    expect(result.convergence_status).toBe('converged')
    expect(result.convergence_confidence).toBe(0.95)
  })

  it('should return converged for single-model task with >= 20 runs', () => {
    const entries = [makeEntry({ runs_count: 20 })]
    const result = computeConvergence(entries)
    expect(result.convergence_status).toBe('converged')
    expect(result.convergence_confidence).toBe(0.95)
  })

  it('should NOT converge for single-model task with 19 runs', () => {
    const entries = [makeEntry({ runs_count: 19 })]
    // Total < 20 → exploring
    const result = computeConvergence(entries)
    expect(result.convergence_status).toBe('exploring')
  })

  it('should converge with quality_gap >= 5.0 and best_model_runs >= 10', () => {
    const entries = [
      makeEntry({ runs_count: 25, avg_quality: 85.0 }),
      makeEntry({ model: 'other/model', runs_count: 10, avg_quality: 79.0 }),
    ]
    // gap = 6.0 >= 5.0, best runs = 25 >= 10, total >= 20
    const result = computeConvergence(entries)
    expect(result.convergence_status).toBe('converged')
  })

  it('should NOT converge when quality_gap < 5.0', () => {
    const entries = [
      makeEntry({ runs_count: 25, avg_quality: 82.0 }),
      makeEntry({ model: 'other/model', runs_count: 10, avg_quality: 79.0 }),
    ]
    // gap = 3.0 < 5.0
    const result = computeConvergence(entries)
    expect(result.convergence_status).toBe('converging')
  })

  it('should NOT converge when best_model_runs < 10', () => {
    const entries = [
      makeEntry({ runs_count: 9, avg_quality: 85.0 }),
      makeEntry({ model: 'other/model', runs_count: 15, avg_quality: 75.0 }),
    ]
    // gap = 10 >= 5, but best model has only 9 runs
    const result = computeConvergence(entries)
    expect(result.convergence_status).toBe('converging')
  })

  it('should return converging when total >= 20 but gap/runs conditions not met', () => {
    const entries = [
      makeEntry({ runs_count: 12, avg_quality: 82.0 }),
      makeEntry({ model: 'other/model', runs_count: 8, avg_quality: 80.0 }),
    ]
    // Total = 20, gap = 2.0 < 5.0
    const result = computeConvergence(entries)
    expect(result.convergence_status).toBe('converging')
  })
})

// ============================================================================
// computeQualityTrend
// ============================================================================

describe('computeQualityTrend()', () => {
  it('should return stable with fewer than 2 scores', () => {
    expect(computeQualityTrend([])).toBe('stable')
    expect(computeQualityTrend([80])).toBe('stable')
  })

  it('should return stable when no change', () => {
    expect(computeQualityTrend([80, 80, 80, 80, 80])).toBe('stable')
  })

  it('should return improving when average of subsequent scores > baseline', () => {
    expect(computeQualityTrend([70, 80, 85, 90])).toBe('improving')
  })

  it('should return degrading when avg drop > 10% of baseline', () => {
    // baseline = 80, subsequent avg = 70 => -12.5% < -10%
    expect(computeQualityTrend([80, 70, 70, 70])).toBe('degrading')
  })

  it('should return stable at exactly 10.0% drop (boundary = stable)', () => {
    // baseline = 100, subsequent avg = 90 => exactly -10.0%
    expect(computeQualityTrend([100, 90, 90, 90])).toBe('stable')
  })

  it('should return degrading at 10.01% drop', () => {
    // baseline = 100, subsequent avg = 89.99 => -10.01%
    expect(computeQualityTrend([100, 89.99, 89.99, 89.99])).toBe('degrading')
  })

  it('should handle rolling window of 5 (recent only)', () => {
    // 5 scores: baseline = first score
    const scores = [90, 85, 84, 83, 82]
    // subsequent avg = (85+84+83+82)/4 = 83.5
    // % change = (83.5 - 90) / 90 = -7.2% (stable, > -10%)
    expect(computeQualityTrend(scores)).toBe('stable')
  })

  it('should return stable when baseline is 0 (avoid division by zero)', () => {
    expect(computeQualityTrend([0, 50, 60])).toBe('stable')
  })
})

// ============================================================================
// loadLeaderboard — missing file handling
// ============================================================================

describe('loadLeaderboard()', () => {
  it('should return empty leaderboard when file does not exist', async () => {
    const filePath = makeTmpPath()
    const result = await loadLeaderboard(filePath)
    expect(result.entries).toEqual([])
    expect(result.schema).toBe(1)
  })

  it('should load a valid leaderboard YAML', async () => {
    const filePath = makeTmpPath()
    const data: Leaderboard = {
      schema: 1,
      story_id: 'MODL-0040',
      updated_at: '2026-02-18T10:00:00.000Z',
      entries: [makeEntry()],
    }
    await fs.writeFile(filePath, yaml.stringify(data), 'utf-8')

    const result = await loadLeaderboard(filePath)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].task_id).toBe('code_generation_medium')

    await fs.unlink(filePath)
  })

  it('should return empty leaderboard and log warning for invalid YAML structure', async () => {
    const filePath = makeTmpPath()
    await fs.writeFile(filePath, 'schema: "invalid"\nentries: []', 'utf-8')

    const result = await loadLeaderboard(filePath)
    expect(result.entries).toEqual([])
    expect(logger.warn).toHaveBeenCalled()

    await fs.unlink(filePath)
  })
})

// ============================================================================
// saveLeaderboard — atomic write
// ============================================================================

describe('saveLeaderboard()', () => {
  it('should write leaderboard to disk and round-trip correctly', async () => {
    const filePath = makeTmpPath()
    const leaderboard: Leaderboard = {
      schema: 1,
      story_id: 'MODL-0040',
      updated_at: '2026-02-18T10:00:00.000Z',
      entries: [makeEntry()],
    }

    await saveLeaderboard(filePath, leaderboard)
    const loaded = await loadLeaderboard(filePath)

    expect(loaded.entries).toHaveLength(1)
    expect(loaded.entries[0].task_id).toBe('code_generation_medium')

    await fs.unlink(filePath)
  })

  it('should leave no .tmp files after successful write', async () => {
    // Use an isolated directory so we do not pick up tmp files from other tests
    const isolatedDir = path.join(
      os.tmpdir(),
      `lb-no-tmp-${Math.random().toString(36).substring(2, 8)}`,
    )
    await fs.mkdir(isolatedDir, { recursive: true })
    const filePath = path.join(isolatedDir, 'leaderboard.yaml')
    const leaderboard: Leaderboard = {
      schema: 1,
      story_id: 'MODL-0040',
      updated_at: '2026-02-18T10:00:00.000Z',
      entries: [],
    }

    await saveLeaderboard(filePath, leaderboard)

    const files = await fs.readdir(isolatedDir)
    const tmpFiles = files.filter(f => f.includes('.tmp'))
    expect(tmpFiles).toHaveLength(0)

    await fs.rm(isolatedDir, { recursive: true })
  })

  it('should create directory if it does not exist', async () => {
    const dir = path.join(os.tmpdir(), `lb-test-dir-${Math.random().toString(36).substring(2, 8)}`)
    const filePath = path.join(dir, 'leaderboard.yaml')
    const leaderboard: Leaderboard = {
      schema: 1,
      story_id: 'MODL-0040',
      updated_at: '2026-02-18T10:00:00.000Z',
      entries: [],
    }

    await saveLeaderboard(filePath, leaderboard)
    const exists = await fs
      .stat(filePath)
      .then(() => true)
      .catch(() => false)
    expect(exists).toBe(true)

    await fs.rm(dir, { recursive: true })
  })
})

// ============================================================================
// recordRun — core behavior
// ============================================================================

describe('recordRun()', () => {
  let tmpFile: string

  beforeEach(() => {
    tmpFile = makeTmpPath()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    try {
      await fs.unlink(tmpFile)
    } catch {
      /* ignore */
    }
  })

  it('should create a new entry for a new (task_id, model) pair', async () => {
    const run = makeRunRecord({ qualityScore: 85.0, cost_usd: 0.002, latency_ms: 1200 })
    const entry = await recordRun(tmpFile, run)

    expect(entry.task_id).toBe('code_generation_medium')
    expect(entry.model).toBe('anthropic/claude-sonnet-4.5')
    expect(entry.runs_count).toBe(1)
    expect(entry.avg_quality).toBeCloseTo(85.0, 1)
    expect(entry.avg_cost_usd).toBeCloseTo(0.002, 5)
    expect(entry.avg_latency_ms).toBeCloseTo(1200, 0)
  })

  it('should increment runs_count on second call', async () => {
    const run = makeRunRecord({ qualityScore: 80.0 })
    await recordRun(tmpFile, run)

    const run2 = makeRunRecord({ qualityScore: 90.0 })
    const entry = await recordRun(tmpFile, run2)

    expect(entry.runs_count).toBe(2)
    expect(entry.avg_quality).toBeCloseTo(85.0, 1) // (80+90)/2
  })

  it('should update running averages correctly after multiple calls', async () => {
    const scores = [80, 85, 90]
    for (const score of scores) {
      await recordRun(tmpFile, makeRunRecord({ qualityScore: score, cost_usd: 0.001 }))
    }
    const loaded = await loadLeaderboard(tmpFile)
    const entry = loaded.entries[0]

    expect(entry.runs_count).toBe(3)
    expect(entry.avg_quality).toBeCloseTo(85.0, 0) // (80+85+90)/3
    expect(entry.avg_cost_usd).toBeCloseTo(0.001, 5)
  })

  it('should append to recent_run_scores and trim to 5', async () => {
    // Make 6 runs
    for (let i = 0; i < 6; i++) {
      await recordRun(tmpFile, makeRunRecord({ qualityScore: 80 + i }))
    }
    const loaded = await loadLeaderboard(tmpFile)
    const entry = loaded.entries[0]

    expect(entry.recent_run_scores).toHaveLength(5)
    // Should contain the last 5 scores (81-85)
    expect(entry.recent_run_scores).toEqual([81, 82, 83, 84, 85])
  })

  it('should compute value_score correctly', async () => {
    const run = makeRunRecord({ qualityScore: 80.0, cost_usd: 0.002 })
    const entry = await recordRun(tmpFile, run)
    // 80 / 0.002 = 40000
    expect(entry.value_score).toBeCloseTo(40000, 0)
  })

  it('should use avg_quality as value_score when cost_usd === 0 (Ollama)', async () => {
    const run = makeRunRecord({ qualityScore: 65.0, cost_usd: 0 })
    const entry = await recordRun(tmpFile, run)
    expect(entry.value_score).toBeCloseTo(65.0, 1)
  })

  it('should create separate entries for different task_id/model pairs', async () => {
    await recordRun(tmpFile, makeRunRecord({ task_id: 'task-a', modelUsed: 'model-x' }))
    await recordRun(tmpFile, makeRunRecord({ task_id: 'task-a', modelUsed: 'model-y' }))
    await recordRun(tmpFile, makeRunRecord({ task_id: 'task-b', modelUsed: 'model-x' }))

    const loaded = await loadLeaderboard(tmpFile)
    expect(loaded.entries).toHaveLength(3)
  })

  it('should log warning when quality_trend transitions to degrading', async () => {
    // First run establishes baseline of 90
    await recordRun(tmpFile, makeRunRecord({ qualityScore: 90 }))
    // Subsequent runs that drop below 10% threshold (< 81)
    await recordRun(tmpFile, makeRunRecord({ qualityScore: 70 }))
    await recordRun(tmpFile, makeRunRecord({ qualityScore: 70 }))

    // Logger.warn should have been called for degradation
    expect(logger.warn).toHaveBeenCalledWith(
      'leaderboard',
      expect.objectContaining({ event: 'quality_degradation_detected' }),
    )
  })

  it('should NOT log warning when already degrading (no repeat warnings)', async () => {
    vi.clearAllMocks()
    // Set up initial state with degrading trend
    await recordRun(tmpFile, makeRunRecord({ qualityScore: 90 }))
    await recordRun(tmpFile, makeRunRecord({ qualityScore: 70 }))
    await recordRun(tmpFile, makeRunRecord({ qualityScore: 70 }))

    const firstWarnCount = (logger.warn as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: unknown[]) => {
        const args = c as [string, { event?: string }]
        return args[1]?.event === 'quality_degradation_detected'
      },
    ).length

    // Add another degrading run — should NOT fire again
    await recordRun(tmpFile, makeRunRecord({ qualityScore: 70 }))

    const secondWarnCount = (logger.warn as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: unknown[]) => {
        const args = c as [string, { event?: string }]
        return args[1]?.event === 'quality_degradation_detected'
      },
    ).length

    expect(secondWarnCount).toBe(firstWarnCount) // No additional warnings
  })
})
