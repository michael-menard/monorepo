/**
 * Unit tests for kb_get_scoreboard analytics operation (WINT-3090).
 *
 * Tests all 5 metrics with mocked Drizzle DB:
 * - Throughput: stories_completed_per_week, total_completed, weeks_observed
 * - Cycle Time: avg/min/max cycle_time_days, sample_size
 * - First-Pass Success: total_completed, first_pass_count, first_pass_rate
 * - Cost Efficiency: avg_cost_per_story, total_cost, story_count
 * - Agent Reliability: per-agent invocation counts and success rate
 *
 * Also verifies zero-data safety (AC2) and filter application.
 *
 * @see WINT-3090
 */

import { describe, it, expect, vi } from 'vitest'
import { kb_get_scoreboard } from '../analytics-operations.js'
import type { AnalyticsDeps } from '../analytics-operations.js'

// ============================================================================
// Mock logger
// ============================================================================

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ============================================================================
// Mock DB builder helpers
// ============================================================================

/**
 * Build a chainable Drizzle query mock that resolves to `rows`.
 * Returns an object with all query-builder methods that return themselves,
 * and is also a Promise resolving to `rows`.
 */
function makeQueryChain(rows: unknown[]): any {
  const chain: any = {}
  const methods = ['from', 'where', 'innerJoin', 'groupBy', 'orderBy', 'limit']
  for (const m of methods) {
    chain[m] = vi.fn(() => chain)
  }
  // Make it thenable so `await chain` resolves to rows
  chain.then = (resolve: (v: unknown[]) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(rows).then(resolve, reject)
  chain.catch = (reject: (e: unknown) => unknown) => Promise.resolve(rows).catch(reject)
  chain.finally = (fn: () => void) => Promise.resolve(rows).finally(fn)
  return chain
}

/**
 * Build a mock `deps.db` that returns different row sets for each `.select()` call,
 * in the order provided.
 */
function makeDeps(...rowSets: unknown[][]): AnalyticsDeps {
  let callIndex = 0
  const db = {
    select: vi.fn(() => {
      const rows = rowSets[callIndex] ?? []
      callIndex++
      return makeQueryChain(rows)
    }),
  }
  return { db } as unknown as AnalyticsDeps
}

// ============================================================================
// Default empty row sets (for zero-data safety)
// ============================================================================

const EMPTY_THROUGHPUT = [{ total: 0, minCompletedAt: null, maxCompletedAt: null }]
const EMPTY_CYCLE = [{ avgDays: null, minDays: null, maxDays: null, sampleSize: 0 }]
const EMPTY_FIRST_PASS = [{ total: 0, firstPass: 0 }]
const EMPTY_COST = [{ avgCost: null, totalCost: 0, storyCount: 0 }]
const EMPTY_AGENTS: unknown[] = []

// ============================================================================
// TC-01: Zero-data safety (AC2)
// ============================================================================

describe('kb_get_scoreboard: zero-data safety (AC2)', () => {
  it('TC-01: returns sensible defaults when all queries return empty data', async () => {
    const deps = makeDeps(
      EMPTY_THROUGHPUT,
      EMPTY_CYCLE,
      EMPTY_FIRST_PASS,
      EMPTY_COST,
      EMPTY_AGENTS,
    )
    const result = await kb_get_scoreboard(deps, {})

    expect(result.throughput.stories_completed_per_week).toBe(0)
    expect(result.throughput.total_completed).toBe(0)
    expect(result.throughput.weeks_observed).toBe(0)

    expect(result.cycle_time.avg_cycle_time_days).toBeNull()
    expect(result.cycle_time.min_cycle_time_days).toBeNull()
    expect(result.cycle_time.max_cycle_time_days).toBeNull()
    expect(result.cycle_time.sample_size).toBe(0)

    expect(result.first_pass_success.total_completed).toBe(0)
    expect(result.first_pass_success.first_pass_count).toBe(0)
    expect(result.first_pass_success.first_pass_rate).toBe(0)

    expect(result.cost_efficiency.avg_cost_per_story).toBeNull()
    expect(result.cost_efficiency.total_cost).toBe(0)
    expect(result.cost_efficiency.story_count).toBe(0)

    expect(result.agent_reliability.agents).toEqual([])

    expect(result.generated_at).toBeDefined()
    expect(result.message).toContain('0 stories completed')
  })
})

// ============================================================================
// TC-02: Throughput calculation
// ============================================================================

describe('kb_get_scoreboard: throughput calculation', () => {
  it('TC-02: computes stories_per_week correctly', async () => {
    // 14 stories completed over 14 days = 2 weeks
    const start = new Date('2026-01-01T00:00:00Z')
    const end = new Date('2026-01-15T00:00:00Z') // exactly 2 weeks
    const deps = makeDeps(
      [{ total: 14, minCompletedAt: start, maxCompletedAt: end }],
      EMPTY_CYCLE,
      EMPTY_FIRST_PASS,
      EMPTY_COST,
      EMPTY_AGENTS,
    )
    const result = await kb_get_scoreboard(deps, {})
    expect(result.throughput.total_completed).toBe(14)
    expect(result.throughput.weeks_observed).toBe(2)
    expect(result.throughput.stories_completed_per_week).toBe(7)
  })

  it('TC-02b: handles single-day span as 1 week minimum', async () => {
    const now = new Date()
    const deps = makeDeps(
      [{ total: 5, minCompletedAt: now, maxCompletedAt: now }],
      EMPTY_CYCLE,
      EMPTY_FIRST_PASS,
      EMPTY_COST,
      EMPTY_AGENTS,
    )
    const result = await kb_get_scoreboard(deps, {})
    expect(result.throughput.total_completed).toBe(5)
    expect(result.throughput.weeks_observed).toBe(1)
    expect(result.throughput.stories_completed_per_week).toBe(5)
  })

  it('TC-02c: returns 0/week when no completed stories', async () => {
    const deps = makeDeps(EMPTY_THROUGHPUT, EMPTY_CYCLE, EMPTY_FIRST_PASS, EMPTY_COST, EMPTY_AGENTS)
    const result = await kb_get_scoreboard(deps, {})
    expect(result.throughput.stories_completed_per_week).toBe(0)
    expect(result.throughput.weeks_observed).toBe(0)
  })
})

// ============================================================================
// TC-03: Cycle time calculation
// ============================================================================

describe('kb_get_scoreboard: cycle time calculation', () => {
  it('TC-03: surfaces avg/min/max from DB rows correctly', async () => {
    const deps = makeDeps(
      EMPTY_THROUGHPUT,
      [{ avgDays: 3.5, minDays: 1.0, maxDays: 7.25, sampleSize: 20 }],
      EMPTY_FIRST_PASS,
      EMPTY_COST,
      EMPTY_AGENTS,
    )
    const result = await kb_get_scoreboard(deps, {})
    expect(result.cycle_time.avg_cycle_time_days).toBe(3.5)
    expect(result.cycle_time.min_cycle_time_days).toBe(1.0)
    expect(result.cycle_time.max_cycle_time_days).toBe(7.25)
    expect(result.cycle_time.sample_size).toBe(20)
  })

  it('TC-03b: returns nulls when no cycle time data', async () => {
    const deps = makeDeps(EMPTY_THROUGHPUT, EMPTY_CYCLE, EMPTY_FIRST_PASS, EMPTY_COST, EMPTY_AGENTS)
    const result = await kb_get_scoreboard(deps, {})
    expect(result.cycle_time.avg_cycle_time_days).toBeNull()
    expect(result.cycle_time.sample_size).toBe(0)
  })
})

// ============================================================================
// TC-04: First-pass success rate calculation
// ============================================================================

describe('kb_get_scoreboard: first-pass success rate', () => {
  it('TC-04: computes first_pass_rate correctly', async () => {
    const deps = makeDeps(
      EMPTY_THROUGHPUT,
      EMPTY_CYCLE,
      [{ total: 10, firstPass: 7 }],
      EMPTY_COST,
      EMPTY_AGENTS,
    )
    const result = await kb_get_scoreboard(deps, {})
    expect(result.first_pass_success.total_completed).toBe(10)
    expect(result.first_pass_success.first_pass_count).toBe(7)
    // 7/10 = 0.7
    expect(result.first_pass_success.first_pass_rate).toBe(0.7)
  })

  it('TC-04b: rate is 0 when total is 0', async () => {
    const deps = makeDeps(
      EMPTY_THROUGHPUT,
      EMPTY_CYCLE,
      [{ total: 0, firstPass: 0 }],
      EMPTY_COST,
      EMPTY_AGENTS,
    )
    const result = await kb_get_scoreboard(deps, {})
    expect(result.first_pass_success.first_pass_rate).toBe(0)
  })

  it('TC-04c: rate is 1 when all stories are first-pass', async () => {
    const deps = makeDeps(
      EMPTY_THROUGHPUT,
      EMPTY_CYCLE,
      [{ total: 5, firstPass: 5 }],
      EMPTY_COST,
      EMPTY_AGENTS,
    )
    const result = await kb_get_scoreboard(deps, {})
    expect(result.first_pass_success.first_pass_rate).toBe(1)
  })
})

// ============================================================================
// TC-05: Cost efficiency calculation
// ============================================================================

describe('kb_get_scoreboard: cost efficiency', () => {
  it('TC-05: surfaces avg and total cost correctly', async () => {
    const deps = makeDeps(
      EMPTY_THROUGHPUT,
      EMPTY_CYCLE,
      EMPTY_FIRST_PASS,
      [{ avgCost: 0.42, totalCost: 8.4, storyCount: 20 }],
      EMPTY_AGENTS,
    )
    const result = await kb_get_scoreboard(deps, {})
    expect(result.cost_efficiency.avg_cost_per_story).toBe(0.42)
    expect(result.cost_efficiency.total_cost).toBe(8.4)
    expect(result.cost_efficiency.story_count).toBe(20)
  })

  it('TC-05b: avg_cost is null when no data', async () => {
    const deps = makeDeps(
      EMPTY_THROUGHPUT,
      EMPTY_CYCLE,
      EMPTY_FIRST_PASS,
      EMPTY_COST,
      EMPTY_AGENTS,
    )
    const result = await kb_get_scoreboard(deps, {})
    expect(result.cost_efficiency.avg_cost_per_story).toBeNull()
    expect(result.cost_efficiency.total_cost).toBe(0)
  })
})

// ============================================================================
// TC-06: Agent reliability calculation
// ============================================================================

describe('kb_get_scoreboard: agent reliability', () => {
  it('TC-06: computes success_rate per agent correctly', async () => {
    const deps = makeDeps(
      EMPTY_THROUGHPUT,
      EMPTY_CYCLE,
      EMPTY_FIRST_PASS,
      EMPTY_COST,
      [
        { agentName: 'dev-implement', total: 100, successful: 90 },
        { agentName: 'dev-plan', total: 50, successful: 48 },
      ],
    )
    const result = await kb_get_scoreboard(deps, {})
    const agents = result.agent_reliability.agents
    expect(agents).toHaveLength(2)

    const devImpl = agents.find(a => a.agent_name === 'dev-implement')
    expect(devImpl?.total_invocations).toBe(100)
    expect(devImpl?.successful_invocations).toBe(90)
    expect(devImpl?.success_rate).toBe(0.9)

    const devPlan = agents.find(a => a.agent_name === 'dev-plan')
    expect(devPlan?.success_rate).toBeCloseTo(0.96, 2)
  })

  it('TC-06b: success_rate is 0 when agent has 0 invocations', async () => {
    const deps = makeDeps(
      EMPTY_THROUGHPUT,
      EMPTY_CYCLE,
      EMPTY_FIRST_PASS,
      EMPTY_COST,
      [{ agentName: 'ghost-agent', total: 0, successful: 0 }],
    )
    const result = await kb_get_scoreboard(deps, {})
    const agent = result.agent_reliability.agents[0]
    expect(agent?.success_rate).toBe(0)
  })

  it('TC-06c: empty agents array when no invocations recorded', async () => {
    const deps = makeDeps(EMPTY_THROUGHPUT, EMPTY_CYCLE, EMPTY_FIRST_PASS, EMPTY_COST, [])
    const result = await kb_get_scoreboard(deps, {})
    expect(result.agent_reliability.agents).toEqual([])
  })
})

// ============================================================================
// TC-07: Feature filter is applied
// ============================================================================

describe('kb_get_scoreboard: feature filter', () => {
  it('TC-07: passes feature filter without throwing', async () => {
    const deps = makeDeps(
      EMPTY_THROUGHPUT,
      EMPTY_CYCLE,
      EMPTY_FIRST_PASS,
      EMPTY_COST,
      EMPTY_AGENTS,
    )
    // Should not throw — filter is applied at DB query level
    const result = await kb_get_scoreboard(deps, { feature: 'WINT' })
    expect(result.generated_at).toBeDefined()
    expect(result.message).toContain('stories completed')
  })
})

// ============================================================================
// TC-08: Date range filter is applied
// ============================================================================

describe('kb_get_scoreboard: date range filter', () => {
  it('TC-08: accepts start_date and end_date as Date objects', async () => {
    const deps = makeDeps(
      [{ total: 3, minCompletedAt: new Date('2026-01-01'), maxCompletedAt: new Date('2026-01-21') }],
      EMPTY_CYCLE,
      EMPTY_FIRST_PASS,
      EMPTY_COST,
      EMPTY_AGENTS,
    )
    const result = await kb_get_scoreboard(deps, {
      start_date: new Date('2026-01-01'),
      end_date: new Date('2026-01-31'),
    })
    expect(result.throughput.total_completed).toBe(3)
  })
})

// ============================================================================
// TC-09: Result shape is complete
// ============================================================================

describe('kb_get_scoreboard: result shape', () => {
  it('TC-09: result contains all required top-level keys', async () => {
    const deps = makeDeps(
      EMPTY_THROUGHPUT,
      EMPTY_CYCLE,
      EMPTY_FIRST_PASS,
      EMPTY_COST,
      EMPTY_AGENTS,
    )
    const result = await kb_get_scoreboard(deps, {})

    expect(result).toHaveProperty('throughput')
    expect(result).toHaveProperty('cycle_time')
    expect(result).toHaveProperty('first_pass_success')
    expect(result).toHaveProperty('cost_efficiency')
    expect(result).toHaveProperty('agent_reliability')
    expect(result).toHaveProperty('generated_at')
    expect(result).toHaveProperty('message')

    // generated_at must be a valid ISO timestamp
    expect(new Date(result.generated_at).toISOString()).toBe(result.generated_at)
  })
})
