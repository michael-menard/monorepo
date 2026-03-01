/**
 * Pattern Miner Integration Tests
 *
 * Story: APIP-3020 - Pattern Miner and Model Affinity Profiles
 * Coverage: AC-12 (integration tests against real PostgreSQL test DB)
 * Tags: @integration
 *
 * GATE: These tests require:
 * 1. A real PostgreSQL test DB with wint schema migrated
 * 2. APIP-3010 change_telemetry table deployed (0028 migration applied)
 * 3. APIP-3020 model_affinity table deployed (0029 migration applied)
 * 4. TEST_DATABASE_URL env var set
 *
 * Until APIP-3010 is merged and deployed to the test DB, these tests
 * are skipped. They are tagged @integration and excluded from normal CI.
 *
 * Test cases:
 *   HP-7: fixture rows -> correct profile aggregation
 *   HP-8: upsert idempotency (run twice -> same result)
 *   HP-9: incremental aggregation (watermark advances)
 *   ED-4: multi-combination profiles
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { runPatternMiner } from '../pattern-miner'

// Integration tests require a real DB connection
const TEST_DB_URL = process.env['TEST_DATABASE_URL']
const SKIP_REASON =
  !TEST_DB_URL
    ? 'TEST_DATABASE_URL not set'
    : 'APIP-3010 change_telemetry table required (pending deployment)'

// Determine if we can run — require both TEST_DATABASE_URL and explicit opt-in
const canRun = !!TEST_DB_URL && process.env['RUN_INTEGRATION_TESTS'] === 'true'

// Helper: create a test db client
async function createTestDbClient(url: string) {
  // Dynamic import to avoid pg dependency at module load time
  const { default: pg } = await import('pg')
  const client = new pg.Client({ connectionString: url })
  await client.connect()
  return {
    query: async <T>(text: string, values?: unknown[]) => {
      const result = await client.query(text, values)
      return { rows: result.rows as T[], rowCount: result.rowCount }
    },
    end: () => client.end(),
  }
}

describe.skipIf(!canRun)(
  `APIP-3020 - AC-12: Integration Tests @integration [SKIP: ${SKIP_REASON}]`,
  () => {
    let db: Awaited<ReturnType<typeof createTestDbClient>>
    let testStoryId: string

    beforeAll(async () => {
      if (!canRun) return
      db = await createTestDbClient(TEST_DB_URL!)
      testStoryId = `test-apip-3020-${Date.now()}`

      // Clean up any previous test data
      await db.query(
        `DELETE FROM wint.model_affinity WHERE model_id LIKE 'test-model-apip3020%'`,
      )
      await db.query(
        `DELETE FROM wint.change_telemetry WHERE story_id = $1`,
        [testStoryId],
      )
    })

    afterAll(async () => {
      if (!canRun || !db) return
      // Clean up test data
      await db.query(
        `DELETE FROM wint.model_affinity WHERE model_id LIKE 'test-model-apip3020%'`,
      )
      await db.query(
        `DELETE FROM wint.change_telemetry WHERE story_id = $1`,
        [testStoryId],
      )
      await db.end()
    })

    it('HP-7: fixture rows produce correct model_affinity profile', async () => {
      // Insert 5 fixture rows: 4 pass, 1 fail for (test-model-apip3020-a, modify, ts)
      const insertSql = `
        INSERT INTO wint.change_telemetry
          (story_id, model_id, affinity_key, change_type, file_type, outcome, tokens_in, tokens_out, retry_count)
        VALUES
          ($1, 'test-model-apip3020-a', 'aff-key-1', 'modify', 'ts', 'pass',  800,  400, 0),
          ($1, 'test-model-apip3020-a', 'aff-key-1', 'modify', 'ts', 'pass',  900,  450, 1),
          ($1, 'test-model-apip3020-a', 'aff-key-1', 'modify', 'ts', 'pass',  700,  350, 0),
          ($1, 'test-model-apip3020-a', 'aff-key-1', 'modify', 'ts', 'pass',  850,  425, 0),
          ($1, 'test-model-apip3020-a', 'aff-key-1', 'modify', 'ts', 'fail',  600,  300, 2)
      `
      await db.query(insertSql, [testStoryId])

      const result = await runPatternMiner(db)

      expect(result.success).toBe(true)
      expect(result.rowsAggregated).toBeGreaterThanOrEqual(1)
      expect(result.rowsUpserted).toBeGreaterThanOrEqual(1)

      // Verify the profile was written correctly
      const profileResult = await db.query<{
        success_rate: string
        sample_count: string
        confidence_level: string
      }>(
        `SELECT success_rate::float AS success_rate, sample_count, confidence_level
         FROM wint.model_affinity
         WHERE model_id = 'test-model-apip3020-a'
           AND change_type = 'modify'
           AND file_type = 'ts'`,
      )
      expect(profileResult.rows).toHaveLength(1)
      const profile = profileResult.rows[0]
      // 4/5 = 0.8 success rate
      expect(Number(profile.success_rate)).toBeCloseTo(0.8, 2)
      expect(Number(profile.sample_count)).toBe(5)
      // 5 samples -> LOW confidence (< 10)
      expect(profile.confidence_level).toBe('low')
    })

    it('HP-8: upsert idempotency (running twice produces same result)', async () => {
      // First run already executed in HP-7.
      // Run again — no new telemetry rows should have been added
      const result2 = await runPatternMiner(db)
      expect(result2.success).toBe(true)
      // No new rows since watermark advanced past test fixture rows
      expect(result2.rowsAggregated).toBe(0)
      expect(result2.rowsUpserted).toBe(0)
    })

    it('HP-9: incremental aggregation — watermark advances on each run', async () => {
      // Insert new fixture rows after the first run's watermark
      const insertSql = `
        INSERT INTO wint.change_telemetry
          (story_id, model_id, affinity_key, change_type, file_type, outcome, tokens_in, tokens_out, retry_count)
        VALUES
          ($1, 'test-model-apip3020-a', 'aff-key-1', 'modify', 'ts', 'pass', 1000, 500, 0),
          ($1, 'test-model-apip3020-a', 'aff-key-1', 'modify', 'ts', 'pass', 1100, 550, 0)
      `
      await db.query(insertSql, [testStoryId])

      const result = await runPatternMiner(db)
      expect(result.success).toBe(true)
      expect(result.rowsAggregated).toBe(1) // 1 combination
      expect(result.rowsUpserted).toBe(1)

      // Verify sample_count increased (from 5 to 7)
      const profileResult = await db.query<{ sample_count: string }>(
        `SELECT sample_count FROM wint.model_affinity
         WHERE model_id = 'test-model-apip3020-a'
           AND change_type = 'modify'
           AND file_type = 'ts'`,
      )
      expect(Number(profileResult.rows[0].sample_count)).toBe(7)
    })

    it('ED-4: multi-combination profiles aggregated in one run', async () => {
      // Insert rows for two different model/change_type/file_type combinations
      const insertSql = `
        INSERT INTO wint.change_telemetry
          (story_id, model_id, affinity_key, change_type, file_type, outcome, tokens_in, tokens_out, retry_count)
        VALUES
          ($1, 'test-model-apip3020-b', 'aff-key-2', 'add', 'tsx', 'pass', 900, 450, 0),
          ($1, 'test-model-apip3020-b', 'aff-key-2', 'add', 'tsx', 'pass', 950, 475, 0),
          ($1, 'test-model-apip3020-c', 'aff-key-3', 'delete', 'yaml', 'fail', 200, 100, 1)
      `
      await db.query(insertSql, [testStoryId])

      const result = await runPatternMiner(db)
      expect(result.success).toBe(true)
      expect(result.rowsAggregated).toBe(2) // 2 new combinations
      expect(result.rowsUpserted).toBe(2)

      // Verify both profiles exist
      const profilesResult = await db.query<{ model_id: string }>(
        `SELECT model_id FROM wint.model_affinity
         WHERE model_id IN ('test-model-apip3020-b', 'test-model-apip3020-c')
         ORDER BY model_id`,
      )
      expect(profilesResult.rows).toHaveLength(2)
    })
  },
)

// Smoke test that always runs — validates the test file itself imports correctly
describe('APIP-3020 - AC-12: Integration test file structure', () => {
  it('runPatternMiner is importable', async () => {
    expect(runPatternMiner).toBeDefined()
    expect(typeof runPatternMiner).toBe('function')
  })
})
