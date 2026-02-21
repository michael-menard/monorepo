/**
 * reports.test.ts
 *
 * Unit tests for reports.ts:
 * - generateSummaryReport: sorted by value_score desc, ALERT prefix for degrading
 * - generateByTaskReport: filters by task_id, sorted by avg_quality desc
 * - generateByModelReport: filters by model, sorted by avg_quality desc
 * - Empty state messages for all three modes
 *
 * MODL-0040: Model Leaderboard
 */

import { describe, it, expect } from 'vitest'
import { generateSummaryReport, generateByTaskReport, generateByModelReport } from '../reports.js'
import type { Leaderboard, LeaderboardEntry } from '../__types__/index.js'

// ============================================================================
// Test Helpers
// ============================================================================

function makeEntry(overrides: Partial<LeaderboardEntry> = {}): LeaderboardEntry {
  return {
    task_id: 'code_generation_medium',
    model: 'anthropic/claude-sonnet-4.5',
    runs_count: 10,
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

function makeLeaderboard(entries: LeaderboardEntry[]): Leaderboard {
  return {
    schema: 1,
    story_id: 'MODL-0040',
    updated_at: '2026-02-18T10:00:00.000Z',
    entries,
  }
}

// ============================================================================
// generateSummaryReport
// ============================================================================

describe('generateSummaryReport()', () => {
  it('should return empty-state message when no entries', () => {
    const report = generateSummaryReport(makeLeaderboard([]))
    expect(report).toContain('No leaderboard entries found')
  })

  it('should include model leaderboard heading', () => {
    const leaderboard = makeLeaderboard([makeEntry()])
    const report = generateSummaryReport(leaderboard)
    expect(report).toContain('Model Leaderboard Summary')
  })

  it('should include table header columns', () => {
    const report = generateSummaryReport(makeLeaderboard([makeEntry()]))
    expect(report).toContain('Task ID')
    expect(report).toContain('Model')
    expect(report).toContain('Value Score')
    expect(report).toContain('Convergence')
    expect(report).toContain('Trend')
  })

  it('should sort entries by value_score descending', () => {
    const entries = [
      makeEntry({ task_id: 'task-a', value_score: 1000.0 }),
      makeEntry({ task_id: 'task-b', value_score: 5000.0 }),
      makeEntry({ task_id: 'task-c', value_score: 2500.0 }),
    ]
    const report = generateSummaryReport(makeLeaderboard(entries))
    const lines = report.split('\n').filter(l => l.startsWith('|') && !l.includes('Task ID') && !l.includes('---'))

    // First row should be task-b (highest value_score)
    expect(lines[0]).toContain('task-b')
    expect(lines[1]).toContain('task-c')
    expect(lines[2]).toContain('task-a')
  })

  it('should prefix degrading entries with [ALERT]', () => {
    const entry = makeEntry({ quality_trend: 'degrading' })
    const report = generateSummaryReport(makeLeaderboard([entry]))
    expect(report).toContain('[ALERT]')
  })

  it('should NOT prefix stable entries with [ALERT]', () => {
    const entry = makeEntry({ quality_trend: 'stable' })
    const report = generateSummaryReport(makeLeaderboard([entry]))
    expect(report).not.toContain('[ALERT]')
  })

  it('should NOT prefix improving entries with [ALERT]', () => {
    const entry = makeEntry({ quality_trend: 'improving' })
    const report = generateSummaryReport(makeLeaderboard([entry]))
    expect(report).not.toContain('[ALERT]')
  })

  it('should display CONVERGED (95%) for converged entries', () => {
    const entry = makeEntry({
      convergence_status: 'converged',
      convergence_confidence: 0.95,
    })
    const report = generateSummaryReport(makeLeaderboard([entry]))
    expect(report).toContain('CONVERGED (95%)')
  })

  it('should display "exploring" for exploring entries', () => {
    const entry = makeEntry({
      convergence_status: 'exploring',
      convergence_confidence: 0,
    })
    const report = generateSummaryReport(makeLeaderboard([entry]))
    expect(report).toContain('exploring')
  })

  it('should display "converging" for converging entries', () => {
    const entry = makeEntry({
      convergence_status: 'converging',
      convergence_confidence: 0,
    })
    const report = generateSummaryReport(makeLeaderboard([entry]))
    expect(report).toContain('converging')
  })

  it('should include updated_at timestamp', () => {
    const leaderboard = makeLeaderboard([makeEntry()])
    const report = generateSummaryReport(leaderboard)
    expect(report).toContain('2026-02-18T10:00:00.000Z')
  })
})

// ============================================================================
// generateByTaskReport
// ============================================================================

describe('generateByTaskReport()', () => {
  it('should return empty-state message when no entries for task', () => {
    const report = generateByTaskReport(makeLeaderboard([]), 'nonexistent-task')
    expect(report).toContain("No entries found for task 'nonexistent-task'")
  })

  it('should filter to only the specified task_id', () => {
    const entries = [
      makeEntry({ task_id: 'task-a', model: 'model-x' }),
      makeEntry({ task_id: 'task-b', model: 'model-y' }),
      makeEntry({ task_id: 'task-a', model: 'model-z' }),
    ]
    const report = generateByTaskReport(makeLeaderboard(entries), 'task-a')

    expect(report).toContain('task-a')
    expect(report).toContain('model-x')
    expect(report).toContain('model-z')
    expect(report).not.toContain('task-b')
    expect(report).not.toContain('model-y')
  })

  it('should sort filtered entries by avg_quality descending', () => {
    const entries = [
      makeEntry({ task_id: 'task-a', model: 'model-x', avg_quality: 70.0 }),
      makeEntry({ task_id: 'task-a', model: 'model-y', avg_quality: 90.0 }),
      makeEntry({ task_id: 'task-a', model: 'model-z', avg_quality: 80.0 }),
    ]
    const report = generateByTaskReport(makeLeaderboard(entries), 'task-a')
    const lines = report.split('\n').filter(l => l.startsWith('|') && !l.includes('Task ID') && !l.includes('---'))

    expect(lines[0]).toContain('model-y')  // 90.0
    expect(lines[1]).toContain('model-z')  // 80.0
    expect(lines[2]).toContain('model-x')  // 70.0
  })

  it('should include task ID in the heading', () => {
    const entry = makeEntry({ task_id: 'security_analysis' })
    const report = generateByTaskReport(makeLeaderboard([entry]), 'security_analysis')
    expect(report).toContain('security_analysis')
  })

  it('should prefix degrading entries with [ALERT]', () => {
    const entry = makeEntry({ quality_trend: 'degrading' })
    const report = generateByTaskReport(makeLeaderboard([entry]), entry.task_id)
    expect(report).toContain('[ALERT]')
  })

  it('should display CONVERGED (95%) for converged entries', () => {
    const entry = makeEntry({
      convergence_status: 'converged',
      convergence_confidence: 0.95,
    })
    const report = generateByTaskReport(makeLeaderboard([entry]), entry.task_id)
    expect(report).toContain('CONVERGED (95%)')
  })
})

// ============================================================================
// generateByModelReport
// ============================================================================

describe('generateByModelReport()', () => {
  it('should return empty-state message when no entries for model', () => {
    const report = generateByModelReport(makeLeaderboard([]), 'nonexistent/model')
    expect(report).toContain("No entries found for model 'nonexistent/model'")
  })

  it('should filter to only the specified model', () => {
    const entries = [
      makeEntry({ model: 'model-x', task_id: 'task-1' }),
      makeEntry({ model: 'model-y', task_id: 'task-2' }),
      makeEntry({ model: 'model-x', task_id: 'task-3' }),
    ]
    const report = generateByModelReport(makeLeaderboard(entries), 'model-x')

    expect(report).toContain('task-1')
    expect(report).toContain('task-3')
    expect(report).not.toContain('task-2')
    expect(report).not.toContain('model-y')
  })

  it('should sort filtered entries by avg_quality descending', () => {
    const entries = [
      makeEntry({ model: 'model-x', task_id: 'task-1', avg_quality: 60.0 }),
      makeEntry({ model: 'model-x', task_id: 'task-2', avg_quality: 85.0 }),
      makeEntry({ model: 'model-x', task_id: 'task-3', avg_quality: 75.0 }),
    ]
    const report = generateByModelReport(makeLeaderboard(entries), 'model-x')
    const lines = report.split('\n').filter(l => l.startsWith('|') && !l.includes('Task ID') && !l.includes('---'))

    expect(lines[0]).toContain('task-2')  // 85.0
    expect(lines[1]).toContain('task-3')  // 75.0
    expect(lines[2]).toContain('task-1')  // 60.0
  })

  it('should include model name in the heading', () => {
    const entry = makeEntry({ model: 'anthropic/claude-opus-4-5' })
    const report = generateByModelReport(makeLeaderboard([entry]), 'anthropic/claude-opus-4-5')
    expect(report).toContain('anthropic/claude-opus-4-5')
  })

  it('should prefix degrading entries with [ALERT]', () => {
    const entry = makeEntry({ quality_trend: 'degrading' })
    const report = generateByModelReport(makeLeaderboard([entry]), entry.model)
    expect(report).toContain('[ALERT]')
  })

  it('should display CONVERGED (95%) for converged entries', () => {
    const entry = makeEntry({
      convergence_status: 'converged',
      convergence_confidence: 0.95,
    })
    const report = generateByModelReport(makeLeaderboard([entry]), entry.model)
    expect(report).toContain('CONVERGED (95%)')
  })
})
