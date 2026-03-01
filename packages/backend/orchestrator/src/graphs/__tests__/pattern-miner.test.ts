/**
 * Pattern Miner Unit Tests
 *
 * Story: APIP-3020 - Pattern Miner and Model Affinity Profiles
 * Coverage: AC-10 (cold-start), AC-11 (confidence bands, weighted avg, watermark, trend)
 *
 * Test cases:
 *   HP-1–HP-4: confidence band assignment at boundaries
 *   HP-5: fixture aggregation success_rate computation
 *   HP-6: watermark advancement
 *   EC-3: division by zero guard
 *   EC-4: weighted average formula verification
 *   ED-1/ED-2: confidence boundary edge cases
 *   ED-3: trend direction (stable, up, down)
 *   AC-10 (cold-start): empty telemetry -> no error, rows_aggregated=0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  assignConfidenceLevel,
  computeWeightedAverage,
  computeTrend,
  CONFIDENCE_THRESHOLDS,
  TREND_DELTA_THRESHOLD,
  COLD_START_EPOCH,
  createPatternMinerGraph,
  runPatternMiner,
} from '../pattern-miner'

// ============================================================================
// HP-1 through HP-4: Confidence band assignment at key boundaries
// ============================================================================

describe('APIP-3020 - AC-8: assignConfidenceLevel() confidence bands', () => {
  it('HP-1: sample_count=0 returns unknown', () => {
    expect(assignConfidenceLevel(0)).toBe('unknown')
  })

  it('HP-2: sample_count=1 returns low (exactly LOW threshold)', () => {
    expect(assignConfidenceLevel(CONFIDENCE_THRESHOLDS.LOW)).toBe('low')
  })

  it('HP-3: sample_count=9 returns low (below MEDIUM threshold)', () => {
    expect(assignConfidenceLevel(9)).toBe('low')
  })

  it('HP-3b: sample_count=10 returns medium (exactly MEDIUM threshold)', () => {
    expect(assignConfidenceLevel(CONFIDENCE_THRESHOLDS.MEDIUM)).toBe('medium')
  })

  it('HP-4: sample_count=29 returns medium (below HIGH threshold)', () => {
    expect(assignConfidenceLevel(29)).toBe('medium')
  })

  it('HP-4b: sample_count=30 returns high (exactly HIGH threshold)', () => {
    expect(assignConfidenceLevel(CONFIDENCE_THRESHOLDS.HIGH)).toBe('high')
  })

  it('HP-4c: large sample_count returns high', () => {
    expect(assignConfidenceLevel(1000)).toBe('high')
  })
})

// ============================================================================
// ED-1 / ED-2: Confidence boundary edge values
// ============================================================================

describe('APIP-3020 - AC-8: confidence boundary edge cases', () => {
  it('ED-1: sample_count just below MEDIUM (9) -> low', () => {
    expect(assignConfidenceLevel(9)).toBe('low')
  })

  it('ED-2: sample_count just below HIGH (29) -> medium', () => {
    expect(assignConfidenceLevel(29)).toBe('medium')
  })
})

// ============================================================================
// EC-3: Division by zero guard
// ============================================================================

describe('APIP-3020 - AC-7: computeWeightedAverage() division by zero', () => {
  it('EC-3: both counts are 0 -> returns 0, no exception', () => {
    expect(computeWeightedAverage(0.9, 0, 0.5, 0)).toBe(0)
  })
})

// ============================================================================
// EC-4: Weighted average formula verification
// ============================================================================

describe('APIP-3020 - AC-7: computeWeightedAverage() formula correctness', () => {
  it('EC-4: (100 * 0.9 + 10 * 0.5) / 110 = 0.8545...', () => {
    const result = computeWeightedAverage(0.9, 100, 0.5, 10)
    // (0.9 * 100 + 0.5 * 10) / 110 = (90 + 5) / 110 = 95 / 110 ≈ 0.86363...
    expect(result).toBeCloseTo((0.9 * 100 + 0.5 * 10) / 110, 5)
  })

  it('HP-5: new-only (old_count=0) returns new_val exactly', () => {
    const result = computeWeightedAverage(0, 0, 0.75, 20)
    expect(result).toBeCloseTo(0.75, 10)
  })

  it('HP-5b: old-only (new_count=0) returns old_val exactly', () => {
    const result = computeWeightedAverage(0.6, 50, 0, 0)
    expect(result).toBeCloseTo(0.6, 10)
  })

  it('EC-4b: equal weights average correctly', () => {
    const result = computeWeightedAverage(0.4, 10, 0.6, 10)
    expect(result).toBeCloseTo(0.5, 10)
  })
})

// ============================================================================
// ED-3: Trend direction computation
// ============================================================================

describe('APIP-3020 - AC-9: computeTrend() direction classification', () => {
  it('ED-3a: delta = 0 -> stable', () => {
    const trend = computeTrend(0.5, 0.5)
    expect(trend.direction).toBe('stable')
    expect(trend.delta).toBe(0)
  })

  it('ED-3b: delta just below threshold -> stable', () => {
    // TREND_DELTA_THRESHOLD = 0.02
    const trend = computeTrend(0.5, 0.5 + TREND_DELTA_THRESHOLD - 0.001)
    expect(trend.direction).toBe('stable')
  })

  it('ED-3c: delta above threshold -> up', () => {
    const trend = computeTrend(0.5, 0.5 + TREND_DELTA_THRESHOLD + 0.001)
    expect(trend.direction).toBe('up')
    expect(trend.delta).toBeGreaterThan(TREND_DELTA_THRESHOLD)
  })

  it('ED-3d: delta below -threshold -> down', () => {
    const trend = computeTrend(0.8, 0.8 - TREND_DELTA_THRESHOLD - 0.001)
    expect(trend.direction).toBe('down')
    expect(trend.delta).toBeLessThan(-TREND_DELTA_THRESHOLD)
  })

  it('ED-3e: trend has computed_at ISO string', () => {
    const trend = computeTrend(0.5, 0.6)
    expect(trend.computed_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

// ============================================================================
// HP-6: Watermark advancement
// AC-10: Cold-start behavior (empty change_telemetry -> no error, rows_aggregated=0)
// ============================================================================

describe('APIP-3020 - AC-6/AC-10: cold-start and watermark behavior', () => {
  it('HP-6 / AC-10: empty change_telemetry -> success, rows_aggregated=0', async () => {
    // Mock db client
    const mockDb = {
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('MAX(last_aggregated_at)')) {
          // No existing model_affinity rows
          return Promise.resolve({ rows: [{ watermark: null }], rowCount: 1 })
        }
        if (sql.includes('FROM wint.change_telemetry')) {
          // No telemetry rows
          return Promise.resolve({ rows: [], rowCount: 0 })
        }
        return Promise.resolve({ rows: [], rowCount: 0 })
      }),
    }

    const result = await runPatternMiner(mockDb)

    expect(result.success).toBe(true)
    expect(result.rowsAggregated).toBe(0)
    expect(result.rowsUpserted).toBe(0)
    expect(result.watermarkUsed).toBe(COLD_START_EPOCH)
    expect(result.error).toBeUndefined()
  })

  it('HP-6: watermark comes from MAX(last_aggregated_at) when rows exist', async () => {
    const watermark = '2026-02-01T00:00:00.000Z'
    const mockDb = {
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('MAX(last_aggregated_at)')) {
          return Promise.resolve({ rows: [{ watermark }], rowCount: 1 })
        }
        if (sql.includes('FROM wint.change_telemetry')) {
          return Promise.resolve({ rows: [], rowCount: 0 })
        }
        return Promise.resolve({ rows: [], rowCount: 0 })
      }),
    }

    const result = await runPatternMiner(mockDb)

    expect(result.watermarkUsed).toBe(watermark)
    expect(result.rowsAggregated).toBe(0)
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// HP-5: Fixture aggregation - non-zero rows
// ============================================================================

describe('APIP-3020 - AC-5: createPatternMinerGraph() factory', () => {
  it('should export createPatternMinerGraph as function', () => {
    expect(createPatternMinerGraph).toBeDefined()
    expect(typeof createPatternMinerGraph).toBe('function')
  })

  it('should create a compiled graph', () => {
    const graph = createPatternMinerGraph()
    expect(graph).toBeDefined()
    expect(typeof graph.invoke).toBe('function')
  })
})

describe('APIP-3020 - AC-5: runPatternMiner() entry point', () => {
  it('should export runPatternMiner as function', () => {
    expect(runPatternMiner).toBeDefined()
    expect(typeof runPatternMiner).toBe('function')
  })
})

describe('APIP-3020 - AC-6: dry-run mode skips upsert', async () => {
  it('dryRun=true: rows computed but not upserted', async () => {
    const mockDb = {
      query: vi.fn().mockImplementation((sql: string) => {
        if (sql.includes('MAX(last_aggregated_at)')) {
          return Promise.resolve({ rows: [{ watermark: null }], rowCount: 1 })
        }
        if (sql.includes('FROM wint.change_telemetry')) {
          // Return one aggregated row
          return Promise.resolve({
            rows: [
              {
                model_id: 'claude-sonnet',
                change_type: 'modify',
                file_type: 'ts',
                total_count: '5',
                success_count: '4',
                avg_tokens: '1000',
                avg_retry_count: '0.2',
                min_created_at: '2026-01-01T00:00:00Z',
                max_created_at: '2026-01-05T00:00:00Z',
              },
            ],
            rowCount: 1,
          })
        }
        if (sql.includes('FROM wint.model_affinity')) {
          // No existing rows for this combination
          return Promise.resolve({ rows: [], rowCount: 0 })
        }
        return Promise.resolve({ rows: [], rowCount: 0 })
      }),
    }

    const result = await runPatternMiner(mockDb, { dryRun: true })

    expect(result.dryRun).toBe(true)
    expect(result.rowsAggregated).toBe(1)
    expect(result.rowsUpserted).toBe(0)
    expect(result.success).toBe(true)
    // INSERT should NOT have been called
    const insertCalled = mockDb.query.mock.calls.some(
      (call: string[]) => typeof call[0] === 'string' && call[0].includes('INSERT'),
    )
    expect(insertCalled).toBe(false)
  })
})

describe('APIP-3020 - AC-8: CONFIDENCE_THRESHOLDS constants', () => {
  it('should define HIGH=30, MEDIUM=10, LOW=1', () => {
    expect(CONFIDENCE_THRESHOLDS.HIGH).toBe(30)
    expect(CONFIDENCE_THRESHOLDS.MEDIUM).toBe(10)
    expect(CONFIDENCE_THRESHOLDS.LOW).toBe(1)
  })
})

describe('APIP-3020 - COLD_START_EPOCH', () => {
  it('should be epoch 0 ISO string', () => {
    expect(COLD_START_EPOCH).toBe(new Date(0).toISOString())
  })
})
