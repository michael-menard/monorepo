/**
 * integration.test.ts
 *
 * Integration tests for the model-selector module:
 * - write → reload → update → reload cycle
 * - Sequential writes (2 tasks both present after writes)
 * - Atomic rename leaves no .tmp files in tmpdir after write
 * - LeaderboardSchema.safeParse success on each load
 * - round-trip data integrity
 *
 * Uses os.tmpdir() for all filesystem operations.
 * No production filesystem access.
 *
 * MODL-0040: Model Leaderboard
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as os from 'os'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'yaml'
import { recordRun, loadLeaderboard, saveLeaderboard } from '../leaderboard.js'
import { generateSummaryReport } from '../reports.js'
import { LeaderboardSchema } from '../__types__/index.js'
import type { RunRecord } from '../__types__/index.js'
import { createTaskContract } from '../../models/__types__/task-contract.js'

// Mock @repo/logger to avoid import resolution issues
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

function makeTmpPath(): string {
  return path.join(os.tmpdir(), `leaderboard-integration-${Math.random().toString(36).substring(2, 8)}.yaml`)
}

function makeRun(overrides: Partial<RunRecord> = {}): RunRecord {
  return {
    taskContract: createTaskContract({ taskType: 'code_generation' }),
    selectedTier: 'tier-1',
    modelUsed: 'anthropic/claude-sonnet-4.5',
    qualityScore: 82.0,
    qualityDimensions: [],
    contractMismatch: false,
    timestamp: new Date().toISOString(),
    cost_usd: 0.002,
    latency_ms: 1200,
    task_id: 'code_generation_medium',
    ...overrides,
  }
}

// ============================================================================
// Integration: write → reload → update → reload
// ============================================================================

describe('Integration: write → reload → update → reload cycle', () => {
  let tmpFile: string

  beforeEach(() => {
    tmpFile = makeTmpPath()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    try { await fs.unlink(tmpFile) } catch { /* ignore */ }
  })

  it('should persist run data across load cycles', async () => {
    // Write 3 runs
    await recordRun(tmpFile, makeRun({ qualityScore: 80.0 }))
    await recordRun(tmpFile, makeRun({ qualityScore: 85.0 }))
    await recordRun(tmpFile, makeRun({ qualityScore: 90.0 }))

    // Reload
    const loaded = await loadLeaderboard(tmpFile)
    expect(loaded.entries).toHaveLength(1)
    expect(loaded.entries[0].runs_count).toBe(3)
    expect(loaded.entries[0].avg_quality).toBeCloseTo(85.0, 0)
  })

  it('should allow updating existing entry after reload', async () => {
    // Initial write
    await recordRun(tmpFile, makeRun({ qualityScore: 80.0 }))

    // Reload & update
    await recordRun(tmpFile, makeRun({ qualityScore: 90.0 }))

    // Reload again
    const final = await loadLeaderboard(tmpFile)
    expect(final.entries[0].runs_count).toBe(2)
    expect(final.entries[0].avg_quality).toBeCloseTo(85.0, 1)
  })

  it('should have LeaderboardSchema.safeParse succeed on each load', async () => {
    await recordRun(tmpFile, makeRun())

    const content = await fs.readFile(tmpFile, 'utf-8')
    const parsed = yaml.parse(content)
    const result = LeaderboardSchema.safeParse(parsed)

    expect(result.success).toBe(true)
  })

  it('should have LeaderboardSchema.safeParse succeed after multiple updates', async () => {
    await recordRun(tmpFile, makeRun({ qualityScore: 80 }))
    await recordRun(tmpFile, makeRun({ qualityScore: 90 }))
    await recordRun(tmpFile, makeRun({ qualityScore: 85 }))

    const content = await fs.readFile(tmpFile, 'utf-8')
    const parsed = yaml.parse(content)
    const result = LeaderboardSchema.safeParse(parsed)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.entries[0].runs_count).toBe(3)
    }
  })
})

// ============================================================================
// Integration: Sequential writes (2 tasks both present)
// ============================================================================

describe('Integration: sequential writes with multiple tasks', () => {
  let tmpFile: string

  beforeEach(() => {
    tmpFile = makeTmpPath()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    try { await fs.unlink(tmpFile) } catch { /* ignore */ }
  })

  it('should have both task entries after sequential writes', async () => {
    // Write for task-1
    await recordRun(tmpFile, makeRun({ task_id: 'task-1', modelUsed: 'model-a', qualityScore: 80 }))
    await recordRun(tmpFile, makeRun({ task_id: 'task-1', modelUsed: 'model-a', qualityScore: 85 }))

    // Write for task-2
    await recordRun(tmpFile, makeRun({ task_id: 'task-2', modelUsed: 'model-b', qualityScore: 70 }))

    const loaded = await loadLeaderboard(tmpFile)
    const taskIds = loaded.entries.map(e => e.task_id)

    expect(taskIds).toContain('task-1')
    expect(taskIds).toContain('task-2')
    expect(loaded.entries).toHaveLength(2)
  })

  it('should preserve task-1 data after task-2 is written', async () => {
    await recordRun(tmpFile, makeRun({ task_id: 'task-1', modelUsed: 'model-a', qualityScore: 80 }))
    await recordRun(tmpFile, makeRun({ task_id: 'task-2', modelUsed: 'model-b', qualityScore: 90 }))

    const loaded = await loadLeaderboard(tmpFile)
    const task1 = loaded.entries.find(e => e.task_id === 'task-1')
    const task2 = loaded.entries.find(e => e.task_id === 'task-2')

    expect(task1).toBeDefined()
    expect(task2).toBeDefined()
    expect(task1!.avg_quality).toBeCloseTo(80, 1)
    expect(task2!.avg_quality).toBeCloseTo(90, 1)
  })

  it('should allow multiple models for the same task', async () => {
    await recordRun(tmpFile, makeRun({ task_id: 'task-1', modelUsed: 'model-a', qualityScore: 85 }))
    await recordRun(tmpFile, makeRun({ task_id: 'task-1', modelUsed: 'model-b', qualityScore: 70 }))

    const loaded = await loadLeaderboard(tmpFile)
    expect(loaded.entries).toHaveLength(2)

    const modelA = loaded.entries.find(e => e.model === 'model-a')
    const modelB = loaded.entries.find(e => e.model === 'model-b')

    expect(modelA).toBeDefined()
    expect(modelB).toBeDefined()
  })
})

// ============================================================================
// Integration: Atomic write - no .tmp files left after write
// ============================================================================

describe('Integration: atomic write leaves no .tmp files', () => {
  it('should leave no .tmp files after saveLeaderboard', async () => {
    const dir = path.join(os.tmpdir(), `lb-atomic-test-${Math.random().toString(36).substring(2, 8)}`)
    await fs.mkdir(dir, { recursive: true })
    const filePath = path.join(dir, 'leaderboard.yaml')

    await saveLeaderboard(filePath, {
      schema: 1,
      story_id: 'MODL-0040',
      updated_at: new Date().toISOString(),
      entries: [],
    })

    const files = await fs.readdir(dir)
    const tmpFiles = files.filter(f => f.includes('.tmp'))
    expect(tmpFiles).toHaveLength(0)

    await fs.rm(dir, { recursive: true })
  })

  it('should leave no .tmp files after multiple sequential recordRun calls', async () => {
    const dir = path.join(os.tmpdir(), `lb-atomic-multi-${Math.random().toString(36).substring(2, 8)}`)
    await fs.mkdir(dir, { recursive: true })
    const filePath = path.join(dir, 'leaderboard.yaml')

    for (let i = 0; i < 5; i++) {
      await recordRun(filePath, makeRun({ qualityScore: 80 + i }))
    }

    const files = await fs.readdir(dir)
    const tmpFiles = files.filter(f => f.includes('.tmp'))
    expect(tmpFiles).toHaveLength(0)

    await fs.rm(dir, { recursive: true })
  })
})

// ============================================================================
// Integration: reports work on loaded leaderboard
// ============================================================================

describe('Integration: generateSummaryReport on loaded leaderboard', () => {
  let tmpFile: string

  beforeEach(() => {
    tmpFile = makeTmpPath()
    vi.clearAllMocks()
  })

  afterEach(async () => {
    try { await fs.unlink(tmpFile) } catch { /* ignore */ }
  })

  it('should generate a valid report from a written and reloaded leaderboard', async () => {
    await recordRun(tmpFile, makeRun({ task_id: 'task-a', modelUsed: 'model-x', qualityScore: 85 }))
    await recordRun(tmpFile, makeRun({ task_id: 'task-b', modelUsed: 'model-y', qualityScore: 75 }))

    const leaderboard = await loadLeaderboard(tmpFile)
    const report = generateSummaryReport(leaderboard)

    expect(report).toContain('Model Leaderboard Summary')
    expect(report).toContain('task-a')
    expect(report).toContain('task-b')
  })
})
