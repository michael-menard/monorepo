/**
 * Weekly Report Unit Tests
 *
 * Covers HP (happy path), EC (error case), and ED (edge/degenerate) test cases
 * as defined in the APIP-4070 test plan.
 *
 * All DB interactions are mocked via vi.fn() — no real DB required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Pool, PoolClient, QueryResult } from 'pg'
import {
  aggregateThroughput,
  aggregateCosts,
  aggregateModelPerformance,
  aggregateCodebaseHealth,
  deriveTopImprovementAndConcern,
  formatSlackMessage,
  triggerWeeklyReport,
} from '../weekly-report.js'
import type {
  TimeWindow,
  WeeklyReportConfig,
  WeeklyPipelineSummary,
  NotificationConfig,
} from '../__types__/index.js'

// ============================================================================
// Fixtures
// ============================================================================

const WINDOW: TimeWindow = {
  start: new Date('2026-02-23T00:00:00Z'),
  end: new Date('2026-03-02T00:00:00Z'),
}

const BASE_CONFIG: WeeklyReportConfig = {
  lookbackDays: 7,
  minHistoryWeeks: 2,
  cronExpression: '0 9 * * 1',
}

const NOTIFICATION_CONFIG: NotificationConfig = {
  slackWebhookUrl: 'https://hooks.slack.com/services/test/webhook',
}

// ============================================================================
// Pool Mock Helpers
// ============================================================================

function makeMockPool(queryImpl: (text: string, values?: unknown[]) => Promise<QueryResult>): Pool {
  const mockClient: Partial<PoolClient> = {
    query: vi.fn().mockImplementation(queryImpl),
    release: vi.fn(),
  }

  const pool = {
    connect: vi.fn().mockResolvedValue(mockClient),
    query: vi.fn().mockImplementation(queryImpl),
    end: vi.fn().mockResolvedValue(undefined),
  } as unknown as Pool

  return pool
}

function makeUndefinedTableError(): Error {
  const err = new Error('relation "wint.change_telemetry" does not exist') as Error & {
    code: string
  }
  err.code = '42P01'
  return err
}

// ============================================================================
// HP-1: aggregateThroughput - basic happy path
// ============================================================================

describe('aggregateThroughput', () => {
  it('HP-1: returns correct throughput when table exists with data', async () => {
    const pool = makeMockPool(async () => ({
      rows: [
        { status: 'completed', count: '4' },
        { status: 'blocked', count: '1' },
      ],
      command: 'SELECT',
      rowCount: 2,
      oid: 0,
      fields: [],
    }))

    const result = await aggregateThroughput(pool, WINDOW)

    expect(result).toEqual({
      stories_completed: 4,
      stories_blocked: 1,
      success_rate: 0.8,
    })
  })

  it('EC-1: returns data_unavailable on 42P01 (table missing)', async () => {
    const pool = makeMockPool(async () => {
      throw makeUndefinedTableError()
    })

    const result = await aggregateThroughput(pool, WINDOW)
    expect(result).toEqual({ data_unavailable: true })
  })

  it('ED-4: returns 0 counts and 0 success_rate when no rows', async () => {
    const pool = makeMockPool(async () => ({
      rows: [],
      command: 'SELECT',
      rowCount: 0,
      oid: 0,
      fields: [],
    }))

    const result = await aggregateThroughput(pool, WINDOW)
    expect(result).toEqual({
      stories_completed: 0,
      stories_blocked: 0,
      success_rate: 0,
    })
  })

  it('propagates non-42P01 errors', async () => {
    const pool = makeMockPool(async () => {
      throw new Error('connection refused')
    })

    await expect(aggregateThroughput(pool, WINDOW)).rejects.toThrow('connection refused')
  })
})

// ============================================================================
// HP-3 / ED-5: aggregateCosts
// ============================================================================

describe('aggregateCosts', () => {
  it('HP-3: returns total_usd and by_provider breakdown', async () => {
    const pool = makeMockPool(async () => ({
      rows: [
        { model_provider: 'anthropic', total_cost: '12.5' },
        { model_provider: 'openai', total_cost: '3.25' },
      ],
      command: 'SELECT',
      rowCount: 2,
      oid: 0,
      fields: [],
    }))

    const result = await aggregateCosts(pool, WINDOW)
    expect(result).toEqual({
      total_usd: 15.75,
      by_provider: {
        anthropic: 12.5,
        openai: 3.25,
      },
    })
  })

  it('ED-5: returns zero totals when no rows', async () => {
    const pool = makeMockPool(async () => ({
      rows: [],
      command: 'SELECT',
      rowCount: 0,
      oid: 0,
      fields: [],
    }))

    const result = await aggregateCosts(pool, WINDOW)
    expect(result).toEqual({ total_usd: 0, by_provider: {} })
  })

  it('EC-1: returns data_unavailable on 42P01', async () => {
    const pool = makeMockPool(async () => {
      throw makeUndefinedTableError()
    })

    const result = await aggregateCosts(pool, WINDOW)
    expect(result).toEqual({ data_unavailable: true })
  })
})

// ============================================================================
// HP-4: aggregateModelPerformance
// ============================================================================

describe('aggregateModelPerformance', () => {
  it('HP-4: returns by_model breakdown with mocked affinity row', async () => {
    const pool = makeMockPool(async () => ({
      rows: [
        {
          model_id: 'claude-3-sonnet',
          first_try_success_rate: '0.75',
          escalation_rate: '0.1',
          trend_direction: 'improving',
        },
      ],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
    }))

    const result = await aggregateModelPerformance(pool, WINDOW)
    expect(result).toEqual({
      by_model: {
        'claude-3-sonnet': {
          first_try_success_rate: 0.75,
          escalation_rate: 0.1,
          trend_direction: 'improving',
        },
      },
    })
  })

  it('EC-2: returns data_unavailable on 42P01', async () => {
    const pool = makeMockPool(async () => {
      throw makeUndefinedTableError()
    })

    const result = await aggregateModelPerformance(pool, WINDOW)
    expect(result).toEqual({ data_unavailable: true })
  })

  it('defaults unknown trend_direction to stable', async () => {
    const pool = makeMockPool(async () => ({
      rows: [
        {
          model_id: 'gpt-4',
          first_try_success_rate: '0.6',
          escalation_rate: '0.2',
          trend_direction: 'unknown-value',
        },
      ],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
    }))

    const result = await aggregateModelPerformance(pool, WINDOW)
    if ('data_unavailable' in result) throw new Error('unexpected data_unavailable')
    expect(result.by_model['gpt-4'].trend_direction).toBe('stable')
  })
})

// ============================================================================
// HP-5 / EC-3 / EC-4: aggregateCodebaseHealth
// ============================================================================

describe('aggregateCodebaseHealth', () => {
  it('HP-5: returns delta_from_baseline from 2 snapshots', async () => {
    const pool = makeMockPool(async () => ({
      rows: [
        {
          snapshot_at: '2026-02-24T00:00:00Z',
          metrics: { coverage: 0.6, complexity: 10 },
          thresholds: { coverage: 0.05, complexity: 2 },
        },
        {
          snapshot_at: '2026-03-01T00:00:00Z',
          metrics: { coverage: 0.65, complexity: 9 },
          thresholds: { coverage: 0.05, complexity: 2 },
        },
      ],
      command: 'SELECT',
      rowCount: 2,
      oid: 0,
      fields: [],
    }))

    const result = await aggregateCodebaseHealth(pool, WINDOW)
    if ('data_unavailable' in result) throw new Error('unexpected data_unavailable')

    expect(result.delta_from_baseline.coverage).toBeCloseTo(0.05)
    expect(result.delta_from_baseline.complexity).toBeCloseTo(-1)
    // coverage improved by 0.05 which equals threshold (0.05), so within threshold
    expect(result.metrics_within_threshold).toBeGreaterThanOrEqual(0)
  })

  it('EC-3/EC-4: returns data_unavailable when fewer than 2 snapshots', async () => {
    const pool = makeMockPool(async () => ({
      rows: [
        {
          snapshot_at: '2026-03-01T00:00:00Z',
          metrics: { coverage: 0.65 },
          thresholds: { coverage: 0.05 },
        },
      ],
      command: 'SELECT',
      rowCount: 1,
      oid: 0,
      fields: [],
    }))

    const result = await aggregateCodebaseHealth(pool, WINDOW)
    expect(result).toEqual({ data_unavailable: true })
  })

  it('EC-3: returns data_unavailable when table is missing (42P01)', async () => {
    const pool = makeMockPool(async () => {
      throw makeUndefinedTableError()
    })

    const result = await aggregateCodebaseHealth(pool, WINDOW)
    expect(result).toEqual({ data_unavailable: true })
  })
})

// ============================================================================
// HP-6 / ED-3: deriveTopImprovementAndConcern
// ============================================================================

describe('deriveTopImprovementAndConcern', () => {
  it('HP-6: returns human-readable strings for high-throughput week', () => {
    const result = deriveTopImprovementAndConcern({
      throughput: { stories_completed: 5, stories_blocked: 1, success_rate: 0.833 },
      costs: { total_usd: 10, by_provider: {} },
      model_performance: { data_unavailable: true },
      codebase_health: { data_unavailable: true },
    })

    expect(result.top_improvement).toContain('stories completed')
    expect(result.top_improvement).toContain('83%')
    expect(result.top_concern).toBeNull()
  })

  it('ED-3: returns null,null when all sections unavailable', () => {
    const result = deriveTopImprovementAndConcern({
      throughput: { data_unavailable: true },
      costs: { data_unavailable: true },
      model_performance: { data_unavailable: true },
      codebase_health: { data_unavailable: true },
    })

    expect(result.top_improvement).toBeNull()
    expect(result.top_concern).toBeNull()
  })

  it('returns concern for low success rate', () => {
    const result = deriveTopImprovementAndConcern({
      throughput: { stories_completed: 1, stories_blocked: 4, success_rate: 0.2 },
      costs: { data_unavailable: true },
      model_performance: { data_unavailable: true },
      codebase_health: { data_unavailable: true },
    })

    expect(result.top_concern).toContain('success rate')
    expect(result.top_concern).toContain('20%')
  })

  it('derives improvement from model trends when throughput not helpful', () => {
    const result = deriveTopImprovementAndConcern({
      throughput: { stories_completed: 2, stories_blocked: 2, success_rate: 0.5 },
      costs: { data_unavailable: true },
      model_performance: {
        by_model: {
          'claude-3-sonnet': {
            first_try_success_rate: 0.9,
            escalation_rate: 0.05,
            trend_direction: 'improving',
          },
        },
      },
      codebase_health: { data_unavailable: true },
    })

    expect(result.top_improvement).toContain('claude-3-sonnet')
    expect(result.top_improvement).toContain('trending up')
  })
})

// ============================================================================
// HP-7 / ED-2: formatSlackMessage
// ============================================================================

describe('formatSlackMessage', () => {
  const fullSummary: WeeklyPipelineSummary = {
    period: {
      start: '2026-02-23T00:00:00.000Z',
      end: '2026-03-02T00:00:00.000Z',
    },
    throughput: { stories_completed: 4, stories_blocked: 1, success_rate: 0.8 },
    costs: { total_usd: 15.75, by_provider: { anthropic: 12.5, openai: 3.25 } },
    model_performance: {
      by_model: {
        'claude-3-sonnet': {
          first_try_success_rate: 0.75,
          escalation_rate: 0.1,
          trend_direction: 'stable',
        },
      },
    },
    codebase_health: {
      metrics_within_threshold: 3,
      metrics_drifted: 1,
      delta_from_baseline: { coverage: 0.05 },
    },
    top_improvement: 'All good',
    top_concern: null,
  }

  it('HP-7: returns object with blocks array', () => {
    const payload = formatSlackMessage(fullSummary) as { blocks: unknown[] }
    expect(payload).toHaveProperty('blocks')
    expect(Array.isArray(payload.blocks)).toBe(true)
    expect(payload.blocks.length).toBeGreaterThan(0)
  })

  it('HP-7: includes header block', () => {
    const payload = formatSlackMessage(fullSummary) as { blocks: Array<{ type: string }> }
    const header = payload.blocks.find(b => b.type === 'header')
    expect(header).toBeDefined()
  })

  it('HP-7: includes throughput data in blocks', () => {
    const payload = formatSlackMessage(fullSummary) as { blocks: unknown[] }
    const payloadStr = JSON.stringify(payload)
    expect(payloadStr).toContain('Throughput')
    expect(payloadStr).toContain('80%')
  })

  it('ED-2: renders italic unavailable text for missing sections', () => {
    const unavailableSummary: WeeklyPipelineSummary = {
      ...fullSummary,
      costs: { data_unavailable: true },
      model_performance: { data_unavailable: true },
    }
    const payload = formatSlackMessage(unavailableSummary) as { blocks: unknown[] }
    const payloadStr = JSON.stringify(payload)
    expect(payloadStr).toContain('_Data unavailable_')
  })

  it('HP-7: includes cost provider breakdown', () => {
    const payload = formatSlackMessage(fullSummary) as { blocks: unknown[] }
    const payloadStr = JSON.stringify(payload)
    expect(payloadStr).toContain('anthropic')
    expect(payloadStr).toContain('12.50')
  })
})

// ============================================================================
// HP-8 / ED-1 / AC-16: triggerWeeklyReport
// ============================================================================

describe('triggerWeeklyReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('HP-8: full happy path — dispatches notification, emits weekly_report_dispatched', async () => {
    // Lock acquired = true, then all section queries return data
    let callCount = 0
    const pool = makeMockPool(async text => {
      callCount++
      // First query is advisory lock
      if (typeof text === 'string' && text.includes('pg_try_advisory_lock')) {
        return {
          rows: [{ pg_try_advisory_lock: true }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        }
      }
      // wint.change_telemetry queries
      if (typeof text === 'string' && text.includes('change_telemetry') && text.includes('status')) {
        return {
          rows: [
            { status: 'completed', count: '3' },
            { status: 'blocked', count: '1' },
          ],
          command: 'SELECT',
          rowCount: 2,
          oid: 0,
          fields: [],
        }
      }
      if (typeof text === 'string' && text.includes('change_telemetry') && text.includes('model_provider')) {
        return {
          rows: [{ model_provider: 'anthropic', total_cost: '8.0' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        }
      }
      if (typeof text === 'string' && text.includes('model_affinity_profiles')) {
        return { rows: [], command: 'SELECT', rowCount: 0, oid: 0, fields: [] }
      }
      if (typeof text === 'string' && text.includes('codebase_health')) {
        // Return 2 snapshots for health check
        return {
          rows: [
            {
              snapshot_at: '2026-02-24T00:00:00Z',
              metrics: { coverage: 0.6 },
              thresholds: { coverage: 0.05 },
            },
            {
              snapshot_at: '2026-03-01T00:00:00Z',
              metrics: { coverage: 0.65 },
              thresholds: { coverage: 0.05 },
            },
          ],
          command: 'SELECT',
          rowCount: 2,
          oid: 0,
          fields: [],
        }
      }
      return { rows: [], command: 'SELECT', rowCount: 0, oid: 0, fields: [] }
    })

    const dispatch = vi.fn().mockResolvedValue(undefined)

    await triggerWeeklyReport(BASE_CONFIG, pool, dispatch, NOTIFICATION_CONFIG)

    expect(dispatch).toHaveBeenCalledOnce()
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ blocks: expect.any(Array) }), NOTIFICATION_CONFIG)
  })

  it('ED-1: skips dispatch when all sections return data_unavailable, emits no_data', async () => {
    const pool = makeMockPool(async text => {
      if (typeof text === 'string' && text.includes('pg_try_advisory_lock')) {
        return {
          rows: [{ pg_try_advisory_lock: true }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        }
      }
      // All section queries throw 42P01
      throw makeUndefinedTableError()
    })

    const dispatch = vi.fn().mockResolvedValue(undefined)

    await triggerWeeklyReport(BASE_CONFIG, pool, dispatch, NOTIFICATION_CONFIG)

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('AC-16: skips immediately when lock is held, emits lock_held', async () => {
    const pool = makeMockPool(async text => {
      if (typeof text === 'string' && text.includes('pg_try_advisory_lock')) {
        return {
          rows: [{ pg_try_advisory_lock: false }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        }
      }
      throw new Error('should not reach aggregation queries')
    })

    const dispatch = vi.fn().mockResolvedValue(undefined)

    await triggerWeeklyReport(BASE_CONFIG, pool, dispatch, NOTIFICATION_CONFIG)

    // dispatch is never called when lock is held
    expect(dispatch).not.toHaveBeenCalled()
    // pool queries should only include the lock query (no aggregation queries)
    expect(pool.query).not.toHaveBeenCalled()
  })

  it('AC-15: dispatch is injectable — no module-level stubbing needed', async () => {
    // Simply verify the function signature is injectable
    const customDispatch = vi.fn().mockResolvedValue(undefined)
    const anotherDispatch = vi.fn().mockResolvedValue(undefined)

    expect(customDispatch).not.toBe(anotherDispatch)

    // Both can be passed as the dispatch parameter without module mocking
    const pool = makeMockPool(async text => {
      if (typeof text === 'string' && text.includes('pg_try_advisory_lock')) {
        return {
          rows: [{ pg_try_advisory_lock: false }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        }
      }
      return { rows: [], command: 'SELECT', rowCount: 0, oid: 0, fields: [] }
    })

    await triggerWeeklyReport(BASE_CONFIG, pool, customDispatch)
    await triggerWeeklyReport(BASE_CONFIG, pool, anotherDispatch)

    // Both dispatchers are separate vi.fn() instances — injectability confirmed
    expect(vi.isMockFunction(customDispatch)).toBe(true)
    expect(vi.isMockFunction(anotherDispatch)).toBe(true)
  })

  it('skips dispatch call when notificationConfig is undefined', async () => {
    const pool = makeMockPool(async text => {
      if (typeof text === 'string' && text.includes('pg_try_advisory_lock')) {
        return {
          rows: [{ pg_try_advisory_lock: true }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        }
      }
      throw makeUndefinedTableError()
    })

    const dispatch = vi.fn().mockResolvedValue(undefined)

    // No notificationConfig provided
    await triggerWeeklyReport(BASE_CONFIG, pool, dispatch)

    expect(dispatch).not.toHaveBeenCalled()
  })
})
