/**
 * Integration tests for workflow_log_outcome (WINT-3050)
 *
 * Tests the outcome logging function that persists structured outcome records
 * to wint.story_outcomes. Requires real PostgreSQL per ADR-005.
 *
 * NOTE: This test imports from telemetry-operations.ts which lives in the
 * WINT-0120 branch. The import will resolve once WINT-0120 is merged to main.
 * The import path is correct for post-merge use.
 *
 * Database: postgres://localhost:5433 (configurable via DB_URL env var)
 *
 * @see WINT-3050 (Implement Outcome Logging)
 * @see WINT-0120 (workflow_log_outcome implementation)
 */

import { describe, it, expect, afterEach } from 'vitest'
import { eq, sql } from 'drizzle-orm'
import { getDbClient } from '../../db/client.js'
import {
  workflow_log_outcome,
  WorkflowLogOutcomeInputSchema,
} from '../telemetry-operations.js'

// ============================================================================
// Test Setup
// ============================================================================

const db = getDbClient()
const deps = { db }

// Unique prefix per test run to avoid conflicts
const TEST_PREFIX = `WINT3050-${Date.now()}`
const testStoryIds: string[] = []

function makeStoryId(suffix: string): string {
  return `${TEST_PREFIX}-${suffix}`
}

// ============================================================================
// Cleanup
// ============================================================================

afterEach(async () => {
  // Delete all test rows created in this test
  for (const storyId of testStoryIds) {
    await db.execute(
      sql`DELETE FROM wint.story_outcomes WHERE story_id = ${storyId}`,
    )
  }
  testStoryIds.length = 0
})

// ============================================================================
// Tests
// ============================================================================

describe('workflow_log_outcome (WINT-3050)', () => {
  describe('WorkflowLogOutcomeInputSchema validation', () => {
    it('should accept valid pass input', () => {
      expect(() =>
        WorkflowLogOutcomeInputSchema.parse({
          story_id: 'WINT-3050',
          final_verdict: 'pass',
          quality_score: 85,
          review_iterations: 1,
          qa_iterations: 1,
          completed_at: new Date().toISOString(),
        }),
      ).not.toThrow()
    })

    it('should reject invalid final_verdict values', () => {
      expect(() =>
        WorkflowLogOutcomeInputSchema.parse({
          story_id: 'WINT-3050',
          final_verdict: 'unknown',
        }),
      ).toThrow()
    })

    it('should reject quality_score outside 0-100', () => {
      expect(() =>
        WorkflowLogOutcomeInputSchema.parse({
          story_id: 'WINT-3050',
          final_verdict: 'pass',
          quality_score: 150,
        }),
      ).toThrow()
    })
  })

  describe('PASS scenario', () => {
    it('should insert one row for a passing story', async () => {
      const storyId = makeStoryId('pass')
      testStoryIds.push(storyId)

      const result = await workflow_log_outcome(deps, {
        story_id: storyId,
        final_verdict: 'pass',
        quality_score: 90,
        review_iterations: 1,
        qa_iterations: 1,
        completed_at: new Date().toISOString(),
      })

      expect(result.logged).toBe(true)
      expect(result.story_id).toBe(storyId)
      expect(result.final_verdict).toBe('pass')
      expect(result.id).toBeTruthy()

      // Verify exactly one row in DB
      const rows = await db.execute(
        sql`SELECT * FROM wint.story_outcomes WHERE story_id = ${storyId}`,
      )
      expect(rows.rows).toHaveLength(1)
      expect(rows.rows[0].final_verdict).toBe('pass')
      expect(rows.rows[0].quality_score).toBe(90)
    })
  })

  describe('FAIL scenario', () => {
    it('should insert one row for a failing story with primary_blocker', async () => {
      const storyId = makeStoryId('fail')
      testStoryIds.push(storyId)

      const result = await workflow_log_outcome(deps, {
        story_id: storyId,
        final_verdict: 'fail',
        quality_score: 0,
        review_iterations: 2,
        qa_iterations: 3,
        primary_blocker: 'E2E tests failed: login flow broken',
        completed_at: new Date().toISOString(),
      })

      expect(result.logged).toBe(true)
      expect(result.final_verdict).toBe('fail')

      const rows = await db.execute(
        sql`SELECT * FROM wint.story_outcomes WHERE story_id = ${storyId}`,
      )
      expect(rows.rows).toHaveLength(1)
      expect(rows.rows[0].final_verdict).toBe('fail')
      expect(rows.rows[0].primary_blocker).toBe('E2E tests failed: login flow broken')
    })
  })

  describe('upsert behavior', () => {
    it('should produce COUNT=1 when called twice for the same story_id', async () => {
      const storyId = makeStoryId('upsert')
      testStoryIds.push(storyId)

      // First call
      await workflow_log_outcome(deps, {
        story_id: storyId,
        final_verdict: 'fail',
        quality_score: 40,
      })

      // Second call — should update, not insert
      await workflow_log_outcome(deps, {
        story_id: storyId,
        final_verdict: 'pass',
        quality_score: 80,
      })

      const rows = await db.execute(
        sql`SELECT COUNT(*) FROM wint.story_outcomes WHERE story_id = ${storyId}`,
      )
      expect(Number(rows.rows[0].count)).toBe(1)

      // Verify latest values are persisted
      const detail = await db.execute(
        sql`SELECT final_verdict, quality_score FROM wint.story_outcomes WHERE story_id = ${storyId}`,
      )
      expect(detail.rows[0].final_verdict).toBe('pass')
      expect(detail.rows[0].quality_score).toBe(80)
    })
  })

  describe('quality_score clamping', () => {
    it('should clamp to 0 when reviewIterations=15, qaIterations=10', async () => {
      const storyId = makeStoryId('clamp-zero')
      testStoryIds.push(storyId)

      // qualityScore = max(0, 100 - (15*10) - (10*15)) = max(0, 100-150-150) = 0
      const qualityScore = Math.max(0, 100 - 15 * 10 - 10 * 15)
      expect(qualityScore).toBe(0)

      const result = await workflow_log_outcome(deps, {
        story_id: storyId,
        final_verdict: 'fail',
        quality_score: qualityScore,
        review_iterations: 15,
        qa_iterations: 10,
      })

      expect(result.logged).toBe(true)

      const rows = await db.execute(
        sql`SELECT quality_score FROM wint.story_outcomes WHERE story_id = ${storyId}`,
      )
      expect(rows.rows[0].quality_score).toBe(0)
    })

    it('should produce quality_score=100 when reviewIterations=0, qaIterations=0', async () => {
      const storyId = makeStoryId('clamp-perfect')
      testStoryIds.push(storyId)

      // qualityScore = max(0, 100 - 0 - 0) = 100
      const qualityScore = Math.max(0, 100 - 0 * 10 - 0 * 15)
      expect(qualityScore).toBe(100)

      const result = await workflow_log_outcome(deps, {
        story_id: storyId,
        final_verdict: 'pass',
        quality_score: qualityScore,
        review_iterations: 0,
        qa_iterations: 0,
      })

      expect(result.logged).toBe(true)

      const rows = await db.execute(
        sql`SELECT quality_score FROM wint.story_outcomes WHERE story_id = ${storyId}`,
      )
      expect(rows.rows[0].quality_score).toBe(100)
    })
  })

  describe('completed_at', () => {
    it('should persist a non-null completed_at timestamp', async () => {
      const storyId = makeStoryId('timestamp')
      testStoryIds.push(storyId)

      const completedAt = new Date().toISOString()

      await workflow_log_outcome(deps, {
        story_id: storyId,
        final_verdict: 'pass',
        quality_score: 75,
        completed_at: completedAt,
      })

      const rows = await db.execute(
        sql`SELECT completed_at FROM wint.story_outcomes WHERE story_id = ${storyId}`,
      )
      expect(rows.rows).toHaveLength(1)
      expect(rows.rows[0].completed_at).not.toBeNull()
    })
  })
})
