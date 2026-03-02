/**
 * Weekly Report Integration Tests
 *
 * Tests triggerWeeklyReport against a real PostgreSQL database at
 * localhost:5432/lego_dev (or POSTGRES_* env vars).
 *
 * Strategy (ARCH-002):
 * - Creates a minimal wint.change_telemetry table inline (CREATE TABLE IF NOT EXISTS)
 * - Seeds test rows in beforeAll
 * - Runs the test
 * - Drops the test data in afterAll
 * - This avoids dependency on APIP-3010 being deployed
 *
 * Tag: @integration — run with --testNamePattern='@integration'
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { Pool } from 'pg'
import {
  aggregateThroughput,
  aggregateCosts,
  triggerWeeklyReport,
} from '../weekly-report.js'
import type { TimeWindow, WeeklyReportConfig, NotificationConfig } from '../__types__/index.js'

// ============================================================================
// Test DB Setup
// ============================================================================

function createTestPool(): Pool {
  return new Pool({
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
    database: process.env.POSTGRES_DATABASE ?? 'lego_dev',
    user: process.env.POSTGRES_USER ?? 'postgres',
    password: process.env.POSTGRES_PASSWORD ?? 'postgres',
    connectionTimeoutMillis: 5000,
  })
}

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
// Integration Tests
// ============================================================================

describe('@integration weekly-report integration tests', () => {
  let pool: Pool
  let dbAvailable = false

  beforeAll(async () => {
    pool = createTestPool()

    try {
      // Test DB connectivity
      await pool.query('SELECT 1')
      dbAvailable = true

      // Create test schema and table
      await pool.query(`CREATE SCHEMA IF NOT EXISTS wint`)
      await pool.query(`
        CREATE TABLE IF NOT EXISTS wint.change_telemetry (
          id SERIAL PRIMARY KEY,
          story_id TEXT NOT NULL,
          status TEXT NOT NULL,
          estimated_cost_usd NUMERIC(10, 6),
          model_provider TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)

      // Seed test data — 4 completed, 1 blocked in our test window
      await pool.query(`
        INSERT INTO wint.change_telemetry
          (story_id, status, estimated_cost_usd, model_provider, created_at)
        VALUES
          ('APIP-TEST-001', 'completed', 5.00, 'anthropic', '2026-02-25T10:00:00Z'),
          ('APIP-TEST-002', 'completed', 3.50, 'anthropic', '2026-02-26T10:00:00Z'),
          ('APIP-TEST-003', 'completed', 2.00, 'openai',    '2026-02-27T10:00:00Z'),
          ('APIP-TEST-004', 'completed', 1.25, 'openai',    '2026-02-28T10:00:00Z'),
          ('APIP-TEST-005', 'blocked',   0.50, 'anthropic', '2026-03-01T10:00:00Z')
      `)
    } catch (err) {
      dbAvailable = false
      // DB not available — tests will be skipped
    }
  })

  afterAll(async () => {
    if (dbAvailable && pool) {
      try {
        // Clean up seeded rows
        await pool.query(`
          DELETE FROM wint.change_telemetry
          WHERE story_id LIKE 'APIP-TEST-%'
        `)
      } catch {
        // Best effort cleanup
      }
    }
    if (pool) {
      await pool.end()
    }
  })

  it('@integration: aggregateThroughput matches seed count (4 completed, 1 blocked)', async () => {
    if (!dbAvailable) {
      // DB not available — skip
      return
    }

    const result = await aggregateThroughput(pool, WINDOW)

    expect(result).not.toHaveProperty('data_unavailable')
    if ('data_unavailable' in result) return

    expect(result.stories_completed).toBe(4)
    expect(result.stories_blocked).toBe(1)
    expect(result.success_rate).toBe(0.8)
  })

  it('@integration: aggregateCosts sums expected provider costs', async () => {
    if (!dbAvailable) {
      // DB not available — skip
      return
    }

    const result = await aggregateCosts(pool, WINDOW)

    expect(result).not.toHaveProperty('data_unavailable')
    if ('data_unavailable' in result) return

    // anthropic: 5.00 + 3.50 + 0.50 = 9.00
    // openai: 2.00 + 1.25 = 3.25
    expect(result.by_provider['anthropic']).toBeCloseTo(9.0)
    expect(result.by_provider['openai']).toBeCloseTo(3.25)
    expect(result.total_usd).toBeCloseTo(12.25)
  })

  it('@integration: triggerWeeklyReport calls mocked dispatch with correct payload', async () => {
    if (!dbAvailable) {
      // DB not available — skip
      return
    }

    const dispatch = vi.fn().mockResolvedValue(undefined)

    await triggerWeeklyReport(BASE_CONFIG, pool, dispatch, NOTIFICATION_CONFIG)

    // dispatch should have been called once with a Slack Block Kit payload
    expect(dispatch).toHaveBeenCalledOnce()
    const [payload, config] = dispatch.mock.calls[0]
    expect(payload).toHaveProperty('blocks')
    expect(Array.isArray((payload as { blocks: unknown[] }).blocks)).toBe(true)
    expect(config).toBe(NOTIFICATION_CONFIG)
  })
})
