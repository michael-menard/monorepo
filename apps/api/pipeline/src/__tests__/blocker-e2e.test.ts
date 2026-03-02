/**
 * Integration test: PERMANENT failure → story_blockers write → GET /monitor/pipeline
 *
 * APIP-2010 AC-10:
 * - Inject PERMANENT failure via supervisor module
 * - Verify wint.story_blockers row is written
 * - Call GET /monitor/pipeline via monitor repository
 * - Verify blocked_queue contains the story
 * - Validates with PipelineDashboardResponseSchema
 *
 * @integration
 *
 * Prerequisites:
 *   - Docker Compose PostgreSQL running with wint schema
 *   - PIPELINE_DB_PASSWORD=pipelinepassword (real password, not test default)
 *   - Start with: docker compose -f infra/compose.lego-app.yaml up wint-db
 *
 * Run with:
 *   PIPELINE_DB_PASSWORD=pipelinepassword pnpm test:integration --filter @repo/pipeline
 *
 * NOTE: This test is skipped in standard vitest runs (unit CI).
 * The APIP_INTEGRATION_TESTS=true env var explicitly enables it.
 * Per ADR-005: real PostgreSQL wint schema required; no in-memory fakes.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import {
  createBlockerNotificationModule,
  resetStoryUuidCache,
} from '../supervisor/blocker-notification/index.js'
import {
  PipelineDashboardResponseSchema,
  createMonitorRepository,
} from '../../../lego-api/domains/monitor/adapters/repositories.js'
import { PipelineSupervisorConfigSchema } from '../supervisor/__types__/index.js'

// ─────────────────────────────────────────────────────────────────────────────
// Integration test gate: only run when explicitly enabled
// The test setup file sets PIPELINE_DB_PASSWORD='TestPassword123!' (fake).
// APIP_INTEGRATION_TESTS=true opt-in gate ensures this only runs with real DB.
// ─────────────────────────────────────────────────────────────────────────────

const INTEGRATION_ENABLED = process.env.APIP_INTEGRATION_TESTS === 'true'
const describeIntegration = INTEGRATION_ENABLED ? describe : describe.skip

describeIntegration('Blocker E2E integration test (real PostgreSQL — @integration)', () => {
  let pool: Pool
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let db: ReturnType<typeof drizzle<any>>
  const TEST_STORY_ID = `APIP-TEST-E2E-${Date.now()}`

  beforeAll(async () => {
    const password = process.env.PIPELINE_DB_PASSWORD
    if (!password) {
      throw new Error('PIPELINE_DB_PASSWORD must be set for integration tests')
    }

    pool = new Pool({
      host: process.env.PIPELINE_DB_HOST || 'localhost',
      port: parseInt(process.env.PIPELINE_DB_PORT || '5434', 10),
      database: process.env.PIPELINE_DB_NAME || 'pipeline_test',
      user: process.env.PIPELINE_DB_USER || 'pipelineuser',
      password,
      max: 3,
    })

    db = drizzle(pool)

    // Insert a test story into wint.stories for the test
    await pool.query(
      `
      INSERT INTO wint.stories (story_id, title, state, priority)
      VALUES ($1, $2, 'in_progress', 'P1')
      ON CONFLICT (story_id) DO NOTHING
      `,
      [TEST_STORY_ID, `E2E Test Story ${TEST_STORY_ID}`],
    )
  })

  afterAll(async () => {
    // Clean up test data
    if (pool) {
      await pool
        .query(
          `
        DELETE FROM wint.story_blockers
        WHERE story_id = (SELECT id FROM wint.stories WHERE story_id = $1)
        `,
          [TEST_STORY_ID],
        )
        .catch(() => {})
      await pool.query('DELETE FROM wint.stories WHERE story_id = $1', [TEST_STORY_ID]).catch(() => {})
      await pool.end()
    }
    resetStoryUuidCache()
  })

  /**
   * AC-10: PERMANENT failure → story_blockers row written → GET /monitor/pipeline returns blocked_queue entry.
   */
  it('AC-10: PERMANENT failure → story_blockers insert → blocked_queue populated', async () => {
    const config = PipelineSupervisorConfigSchema.parse({ queueName: 'test' })
    const module = createBlockerNotificationModule(db, config)

    // Inject PERMANENT failure via insertBlocker
    const permanentError = new TypeError('E2E: Permanent failure for integration test')
    await module.insertBlocker(TEST_STORY_ID, permanentError)

    // Verify story_blockers row was written
    const blockerResult = await pool.query(
      `
      SELECT sb.blocker_type, sb.severity, sb.blocker_description, sb.resolved_at
      FROM wint.story_blockers sb
      JOIN wint.stories s ON sb.story_id = s.id
      WHERE s.story_id = $1 AND sb.resolved_at IS NULL
      `,
      [TEST_STORY_ID],
    )

    expect(blockerResult.rows).toHaveLength(1)
    expect(blockerResult.rows[0].blocker_type).toBe('technical')
    expect(blockerResult.rows[0].severity).toBe('high')
    expect(blockerResult.rows[0].resolved_at).toBeNull()

    // Call GET /monitor/pipeline via repository and verify blocked_queue
    const monitorRepo = createMonitorRepository(db)
    const dashboard = await monitorRepo.getPipelineDashboard()

    // Validate response with PipelineDashboardResponseSchema (AC-10)
    const parsed = PipelineDashboardResponseSchema.safeParse(dashboard)
    expect(parsed.success).toBe(true)

    // Verify blocked_queue contains the test story
    const blockedEntry = dashboard.blocked_queue.find(entry => entry.story_id === TEST_STORY_ID)
    expect(blockedEntry).toBeDefined()
    expect(blockedEntry!.story_id).toBe(TEST_STORY_ID)
    expect(blockedEntry!.blocked_by).toBeTruthy()
  }, 30_000)

  /**
   * AC-10: resolveBlocker() → story removed from blocked_queue.
   */
  it('AC-10: resolveBlocker() → story removed from blocked_queue', async () => {
    const config = PipelineSupervisorConfigSchema.parse({ queueName: 'test' })
    const module = createBlockerNotificationModule(db, config)

    // Resolve the blocker
    await module.resolveBlocker(TEST_STORY_ID)

    // Verify resolved_at is set
    const blockerResult = await pool.query(
      `
      SELECT resolved_at
      FROM wint.story_blockers sb
      JOIN wint.stories s ON sb.story_id = s.id
      WHERE s.story_id = $1
      ORDER BY sb.created_at DESC
      LIMIT 1
      `,
      [TEST_STORY_ID],
    )

    expect(blockerResult.rows).toHaveLength(1)
    expect(blockerResult.rows[0].resolved_at).toBeTruthy()

    // Verify story no longer appears in blocked_queue
    const monitorRepo = createMonitorRepository(db)
    const dashboard = await monitorRepo.getPipelineDashboard()

    const parsedDashboard = PipelineDashboardResponseSchema.safeParse(dashboard)
    expect(parsedDashboard.success).toBe(true)

    const blockedEntry = dashboard.blocked_queue.find(entry => entry.story_id === TEST_STORY_ID)
    expect(blockedEntry).toBeUndefined()
  }, 30_000)
})
