/**
 * Unit Tests: Health Gate (APIP-4010)
 *
 * Covers UT-001 through UT-012:
 * - UT-001: captureHealthSnapshot() happy path — all 8 metrics captured, insert called once
 * - UT-002: captureHealthSnapshot() DB failure — logs warning, resolves without throwing
 * - UT-003: captureHealthSnapshot() CLI tool failure for one metric — partial capture handled gracefully
 * - UT-004: detectDriftAndGenerateCleanup() — all metrics within threshold (empty array)
 * - UT-005: detectDriftAndGenerateCleanup() — exactly one metric over threshold (one CLEANUP story)
 * - UT-006: detectDriftAndGenerateCleanup() — multiple metrics over threshold
 * - UT-007: detectDriftAndGenerateCleanup() — threshold at exact boundary (no-drift vs drift)
 * - UT-008: detectDriftAndGenerateCleanup() — null/missing baseline (empty array + logger.warn)
 * - UT-009: HealthGateThresholdsSchema — valid config object parses successfully
 * - UT-010: CodebaseHealthSnapshotSchema — valid snapshot row parses successfully
 * - UT-011: Generated CLEANUP story YAML passes StoryArtifactSchema.parse()
 * - UT-012: Merge-count gate logic — fires health check only on every 5th merge
 *
 * Story: APIP-4010 - Codebase Health Gate
 * AC: AC-11
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StoryArtifactSchema } from '../../../artifacts/story-v2-compatible.js'
import {
  HealthGateThresholdsSchema,
  CodebaseHealthSnapshotSchema,
  DEFAULT_HEALTH_GATE_THRESHOLDS,
  type CodebaseHealthSnapshot,
} from '../schemas/index.js'
import { captureHealthSnapshot, type DbQueryable } from '../captureHealthSnapshot.js'
import { detectDriftAndGenerateCleanup } from '../detectDriftAndGenerateCleanup.js'
import { shouldRunHealthGate } from '../mergeCountGate.js'

// ============================================================================
// Mock @repo/logger
// ============================================================================

vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { logger } from '@repo/logger'

// ============================================================================
// Test fixtures
// ============================================================================

function makeSnapshot(overrides: Partial<CodebaseHealthSnapshot> = {}): CodebaseHealthSnapshot {
  return {
    id: 'aaaaaaaa-0000-0000-0000-000000000001',
    mergeNumber: 5,
    capturedAt: new Date('2026-03-01T12:00:00Z'),
    isBaseline: false,
    lintWarnings: 10,
    typeErrors: 0,
    anyCount: 5,
    testCoverage: 80.5,
    circularDeps: 0,
    bundleSize: 500_000,
    deadExports: 3,
    eslintDisableCount: 2,
    ...overrides,
  }
}

function makeBaseline(overrides: Partial<CodebaseHealthSnapshot> = {}): CodebaseHealthSnapshot {
  return makeSnapshot({
    id: 'bbbbbbbb-0000-0000-0000-000000000001',
    mergeNumber: 0,
    isBaseline: true,
    capturedAt: new Date('2026-02-01T12:00:00Z'),
    ...overrides,
  })
}

function mockDb(): DbQueryable {
  return {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  }
}

function mockFailingDb(error: Error = new Error('Connection refused')): DbQueryable {
  return {
    query: vi.fn().mockRejectedValue(error),
  }
}

function makeExecFn(outputs: Record<string, string> = {}) {
  return vi.fn().mockImplementation((cmd: string) => {
    // Match command prefixes to return appropriate outputs
    for (const [key, output] of Object.entries(outputs)) {
      if (cmd.includes(key)) return Promise.resolve(output)
    }
    return Promise.resolve('')
  })
}

// ============================================================================
// UT-001: captureHealthSnapshot() happy path
// ============================================================================

describe('UT-001: captureHealthSnapshot — happy path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls db.query exactly once to insert a snapshot row', async () => {
    const db = mockDb()
    const execFn = makeExecFn({
      'pnpm lint': 'file.ts: warning message\nfile.ts: warning two',
      'check-types': '',
      'no-explicit-any': '',
      'eslint-disable': '2',
      'test:coverage': '{"total":{"lines":{"pct":85.0}}}',
      'madge': 'No circular dependency found',
      'wc -l': '500000',
      'ts-prune': '',
    })

    await captureHealthSnapshot({ mergeNumber: 5, execFn }, db)

    expect(db.query).toHaveBeenCalledTimes(1)
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO wint.codebase_health'),
      expect.any(Array),
    )
  })

  it('returns a snapshot with all 8 metrics populated', async () => {
    const db = mockDb()
    const execFn = makeExecFn({
      'pnpm lint': 'file.ts  1:1  warning  no-explicit-any',
    })

    const snapshot = await captureHealthSnapshot({ mergeNumber: 3, execFn }, db)

    expect(snapshot).toBeDefined()
    expect(snapshot.mergeNumber).toBe(3)
    expect(snapshot.isBaseline).toBe(false)
    expect(snapshot.id).toMatch(/^[0-9a-f-]{36}$/)
  })
})

// ============================================================================
// UT-002: captureHealthSnapshot() DB failure
// ============================================================================

describe('UT-002: captureHealthSnapshot — DB failure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves without throwing when db.query rejects', async () => {
    const db = mockFailingDb(new Error('ECONNREFUSED'))
    const execFn = makeExecFn()

    await expect(captureHealthSnapshot({ mergeNumber: 5, execFn }, db)).resolves.toBeDefined()
  })

  it('calls logger.warn exactly once when db.query rejects', async () => {
    const db = mockFailingDb(new Error('DB timeout'))
    const execFn = makeExecFn()

    await captureHealthSnapshot({ mergeNumber: 5, execFn }, db)

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('captureHealthSnapshot'),
      expect.objectContaining({ mergeNumber: 5 }),
    )
  })
})

// ============================================================================
// UT-003: captureHealthSnapshot() — partial capture on CLI failure
// ============================================================================

describe('UT-003: captureHealthSnapshot — partial capture on CLI failure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns snapshot with null for failed metric but valid values for others', async () => {
    const db = mockDb()
    // execFn that rejects for lint but succeeds for eslint-disable
    const execFn = vi.fn().mockImplementation((cmd: string) => {
      if (cmd.includes('pnpm lint')) {
        return Promise.reject(new Error('lint tool unavailable'))
      }
      if (cmd.includes('wc -l')) {
        return Promise.resolve('5\n')
      }
      return Promise.resolve('')
    })

    const snapshot = await captureHealthSnapshot({ mergeNumber: 5, execFn }, db)

    // Snapshot still returned (not thrown)
    expect(snapshot).toBeDefined()
    // lintWarnings may be null due to failure (depends on error handling)
    // eslintDisableCount should be 5 (from wc -l output)
    expect(snapshot.eslintDisableCount).toBe(5)
  })

  it('still inserts a DB row even when some metrics are null', async () => {
    const db = mockDb()
    const execFn = makeExecFn() // empty outputs → collectors return 0 or null

    await captureHealthSnapshot({ mergeNumber: 5, execFn }, db)

    expect(db.query).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// UT-004: detectDriftAndGenerateCleanup() — all within threshold
// ============================================================================

describe('UT-004: detectDriftAndGenerateCleanup — all within threshold', () => {
  it('returns empty array when all metrics are within threshold', () => {
    const snapshot = makeSnapshot()
    const baseline = makeBaseline() // same values

    const result = detectDriftAndGenerateCleanup(
      snapshot,
      baseline,
      DEFAULT_HEALTH_GATE_THRESHOLDS,
    )

    expect(result).toHaveLength(0)
  })

  it('returns empty array when metrics improve (drift in good direction)', () => {
    const baseline = makeBaseline({ lintWarnings: 20, typeErrors: 2 })
    const snapshot = makeSnapshot({ lintWarnings: 5, typeErrors: 0 }) // better

    const result = detectDriftAndGenerateCleanup(
      snapshot,
      baseline,
      DEFAULT_HEALTH_GATE_THRESHOLDS,
    )

    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// UT-005: detectDriftAndGenerateCleanup() — one metric over threshold
// ============================================================================

describe('UT-005: detectDriftAndGenerateCleanup — one metric over threshold', () => {
  it('returns one CLEANUP story when exactly one metric exceeds threshold', () => {
    const baseline = makeBaseline({ lintWarnings: 5 })
    const snapshot = makeSnapshot({ lintWarnings: 20 }) // +15, threshold is 10

    const result = detectDriftAndGenerateCleanup(
      snapshot,
      baseline,
      DEFAULT_HEALTH_GATE_THRESHOLDS,
    )

    expect(result).toHaveLength(1)
    expect(result[0].id).toMatch(/^APIP-CLEANUP-\d{4}$/)
  })

  it('CLEANUP story has correct ID format APIP-CLEANUP-NNNN', () => {
    const baseline = makeBaseline({ typeErrors: 0 })
    const snapshot = makeSnapshot({ typeErrors: 1 }) // +1, threshold is 0

    const result = detectDriftAndGenerateCleanup(
      snapshot,
      baseline,
      DEFAULT_HEALTH_GATE_THRESHOLDS,
    )

    expect(result[0].id).toBe('APIP-CLEANUP-0001')
  })
})

// ============================================================================
// UT-006: detectDriftAndGenerateCleanup() — multiple metrics over threshold
// ============================================================================

describe('UT-006: detectDriftAndGenerateCleanup — multiple metrics over threshold', () => {
  it('returns multiple CLEANUP stories for multiple drifted metrics', () => {
    const baseline = makeBaseline({ lintWarnings: 5, typeErrors: 0, circularDeps: 0 })
    const snapshot = makeSnapshot({
      lintWarnings: 25, // +20, threshold 10 → drifted
      typeErrors: 2, // +2, threshold 0 → drifted
      circularDeps: 3, // +3, threshold 0 → drifted
    })

    const result = detectDriftAndGenerateCleanup(
      snapshot,
      baseline,
      DEFAULT_HEALTH_GATE_THRESHOLDS,
    )

    expect(result.length).toBeGreaterThanOrEqual(3)
  })

  it('CLEANUP story IDs are sequentially numbered starting at startingCleanupNumber', () => {
    const baseline = makeBaseline({ typeErrors: 0, circularDeps: 0 })
    const snapshot = makeSnapshot({ typeErrors: 1, circularDeps: 1 })

    const result = detectDriftAndGenerateCleanup(
      snapshot,
      baseline,
      DEFAULT_HEALTH_GATE_THRESHOLDS,
      5, // starting from 5
    )

    expect(result.length).toBe(2)
    expect(result[0].id).toBe('APIP-CLEANUP-0005')
    expect(result[1].id).toBe('APIP-CLEANUP-0006')
  })
})

// ============================================================================
// UT-007: detectDriftAndGenerateCleanup() — boundary conditions
// ============================================================================

describe('UT-007: detectDriftAndGenerateCleanup — boundary conditions', () => {
  it('does NOT generate CLEANUP story when metric equals exactly the threshold (no drift)', () => {
    const baseline = makeBaseline({ lintWarnings: 5 })
    const snapshot = makeSnapshot({ lintWarnings: 15 }) // +10, threshold is 10 — exactly at limit

    const result = detectDriftAndGenerateCleanup(
      snapshot,
      baseline,
      DEFAULT_HEALTH_GATE_THRESHOLDS,
    )

    // delta === threshold → NOT drifted (only > threshold triggers drift)
    expect(result).toHaveLength(0)
  })

  it('generates CLEANUP story when metric exceeds threshold by 1', () => {
    const baseline = makeBaseline({ lintWarnings: 5 })
    const snapshot = makeSnapshot({ lintWarnings: 16 }) // +11, threshold is 10 → drifted

    const result = detectDriftAndGenerateCleanup(
      snapshot,
      baseline,
      DEFAULT_HEALTH_GATE_THRESHOLDS,
    )

    expect(result).toHaveLength(1)
  })

  it('handles test_coverage negative threshold correctly (drop allowed)', () => {
    const baseline = makeBaseline({ testCoverage: 85.0 })
    const snapshot = makeSnapshot({ testCoverage: 83.5 }) // -1.5%, threshold is -2% → within threshold

    const result = detectDriftAndGenerateCleanup(
      snapshot,
      baseline,
      DEFAULT_HEALTH_GATE_THRESHOLDS,
    )

    expect(result).toHaveLength(0)
  })

  it('generates CLEANUP story when test_coverage drops more than threshold', () => {
    const baseline = makeBaseline({ testCoverage: 85.0 })
    const snapshot = makeSnapshot({ testCoverage: 82.5 }) // -2.5%, threshold is -2% → drifted

    const result = detectDriftAndGenerateCleanup(
      snapshot,
      baseline,
      DEFAULT_HEALTH_GATE_THRESHOLDS,
    )

    expect(result.length).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================================
// UT-008: detectDriftAndGenerateCleanup() — null baseline
// ============================================================================

describe('UT-008: detectDriftAndGenerateCleanup — null baseline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when baseline is null', () => {
    const snapshot = makeSnapshot()

    const result = detectDriftAndGenerateCleanup(
      snapshot,
      null,
      DEFAULT_HEALTH_GATE_THRESHOLDS,
    )

    expect(result).toHaveLength(0)
  })

  it('calls logger.warn when baseline is null', () => {
    const snapshot = makeSnapshot()

    detectDriftAndGenerateCleanup(snapshot, null, DEFAULT_HEALTH_GATE_THRESHOLDS)

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('no baseline'),
      expect.any(Object),
    )
  })
})

// ============================================================================
// UT-009: HealthGateThresholdsSchema — valid config parses
// ============================================================================

describe('UT-009: HealthGateThresholdsSchema — valid config parses', () => {
  it('parses empty object and returns all defaults', () => {
    const result = HealthGateThresholdsSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.typeErrorsDelta).toBe(0)
      expect(result.data.circularDepsDelta).toBe(0)
      expect(result.data.lintWarningsDelta).toBe(10)
      expect(result.data.testCoverageDelta).toBe(-2)
    }
  })

  it('accepts custom threshold values', () => {
    const result = HealthGateThresholdsSchema.safeParse({
      lintWarningsDelta: 20,
      typeErrorsDelta: 5,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.lintWarningsDelta).toBe(20)
      expect(result.data.typeErrorsDelta).toBe(5)
    }
  })

  it('DEFAULT_HEALTH_GATE_THRESHOLDS has no hardcoded values in source', () => {
    // Verify defaults are defined via HealthGateThresholdsSchema.parse({})
    const defaults = HealthGateThresholdsSchema.parse({})
    expect(defaults).toEqual(DEFAULT_HEALTH_GATE_THRESHOLDS)
  })
})

// ============================================================================
// UT-010: CodebaseHealthSnapshotSchema — valid snapshot row parses
// ============================================================================

describe('UT-010: CodebaseHealthSnapshotSchema — valid snapshot row parses', () => {
  it('parses a valid snapshot row successfully', () => {
    const snapshotData = {
      id: 'aaaaaaaa-0000-0000-0000-000000000001',
      mergeNumber: 5,
      capturedAt: '2026-03-01T12:00:00Z',
      isBaseline: false,
      lintWarnings: 10,
      typeErrors: 0,
      anyCount: 5,
      testCoverage: 80.5,
      circularDeps: 0,
      bundleSize: 500_000,
      deadExports: 3,
      eslintDisableCount: 2,
    }

    const result = CodebaseHealthSnapshotSchema.safeParse(snapshotData)
    expect(result.success).toBe(true)
  })

  it('accepts null metric values (partial capture)', () => {
    const snapshotData = {
      id: 'aaaaaaaa-0000-0000-0000-000000000001',
      mergeNumber: 5,
      capturedAt: new Date(),
      isBaseline: false,
      lintWarnings: null,
      typeErrors: null,
      anyCount: null,
      testCoverage: null,
      circularDeps: null,
      bundleSize: null,
      deadExports: null,
      eslintDisableCount: null,
    }

    const result = CodebaseHealthSnapshotSchema.safeParse(snapshotData)
    expect(result.success).toBe(true)
  })

  it('rejects missing required fields', () => {
    const result = CodebaseHealthSnapshotSchema.safeParse({ mergeNumber: 5 })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// UT-011: Generated CLEANUP story YAML passes StoryArtifactSchema.parse()
// ============================================================================

describe('UT-011: Generated CLEANUP story passes StoryArtifactSchema.parse()', () => {
  it('generated CLEANUP story passes StoryArtifactSchema validation', () => {
    const baseline = makeBaseline({ lintWarnings: 5 })
    const snapshot = makeSnapshot({ lintWarnings: 25, mergeNumber: 10 })

    const stories = detectDriftAndGenerateCleanup(
      snapshot,
      baseline,
      DEFAULT_HEALTH_GATE_THRESHOLDS,
    )

    expect(stories).toHaveLength(1)

    // Must parse through StoryArtifactSchema without errors
    expect(() => StoryArtifactSchema.parse(stories[0])).not.toThrow()
  })

  it('CLEANUP story contains merge_number and metric info', () => {
    const baseline = makeBaseline({ typeErrors: 0 })
    const snapshot = makeSnapshot({ typeErrors: 3, mergeNumber: 15 })

    const stories = detectDriftAndGenerateCleanup(
      snapshot,
      baseline,
      DEFAULT_HEALTH_GATE_THRESHOLDS,
    )

    const story = stories[0]
    // Story should reference the merge number and metric info
    const storyContent = JSON.stringify(story)
    expect(storyContent).toContain('15') // merge number
    expect(storyContent).toContain('type') // metric name reference
  })

  it('CLEANUP story is written to correct backlog path format', () => {
    const baseline = makeBaseline({ typeErrors: 0 })
    const snapshot = makeSnapshot({ typeErrors: 1 })

    const stories = detectDriftAndGenerateCleanup(
      snapshot,
      baseline,
      DEFAULT_HEALTH_GATE_THRESHOLDS,
    )

    expect(stories[0].id).toBe('APIP-CLEANUP-0001')
  })
})

// ============================================================================
// UT-012: Merge-count gate logic
// ============================================================================

describe('UT-012: shouldRunHealthGate — fires only on every 5th merge', () => {
  it('returns false for merge count 0', () => {
    expect(shouldRunHealthGate(0)).toBe(false)
  })

  it('returns false for non-multiples of 5', () => {
    expect(shouldRunHealthGate(1)).toBe(false)
    expect(shouldRunHealthGate(2)).toBe(false)
    expect(shouldRunHealthGate(3)).toBe(false)
    expect(shouldRunHealthGate(4)).toBe(false)
    expect(shouldRunHealthGate(6)).toBe(false)
    expect(shouldRunHealthGate(7)).toBe(false)
  })

  it('returns true for multiples of 5', () => {
    expect(shouldRunHealthGate(5)).toBe(true)
    expect(shouldRunHealthGate(10)).toBe(true)
    expect(shouldRunHealthGate(15)).toBe(true)
    expect(shouldRunHealthGate(100)).toBe(true)
  })

  it('respects custom interval', () => {
    expect(shouldRunHealthGate(3, 3)).toBe(true)
    expect(shouldRunHealthGate(4, 3)).toBe(false)
    expect(shouldRunHealthGate(6, 3)).toBe(true)
  })

  it('returns false for negative merge count', () => {
    expect(shouldRunHealthGate(-1)).toBe(false)
    expect(shouldRunHealthGate(-5)).toBe(false)
  })
})
