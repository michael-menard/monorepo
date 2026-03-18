/**
 * Integration tests for story outcome logging (WINT-3050).
 *
 * Verifies that the workflow.story_outcomes table correctly stores outcome records
 * with upsert semantics, quality score clamping, and correct field values.
 *
 * These tests exercise the DB layer directly (INSERT ... ON CONFLICT DO UPDATE)
 * since workflow_log_outcome MCP tool implementation is gated on WINT-0120 merge.
 * Once WINT-0120 is merged, these tests can be updated to invoke the MCP tool
 * handler instead.
 *
 * Prerequisites:
 * - workflow schema migration applied (creates workflow.story_outcomes table)
 * - Real postgres-knowledgebase on port 5433 (ADR-005: no mocks in integration tests)
 *
 * @see WINT-3050 AC-7, AC-8
 * @see workflow schema for workflow.story_outcomes table schema
 * @see WINT-0120 for workflow_log_outcome MCP tool (pending merge)
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { getDbClient } from '../../db/client.js'

// ============================================================================
// Test Setup
// ============================================================================

const db = getDbClient()

// Unique prefix to avoid conflicts with real data
const TEST_PREFIX = `WINT-3050-TEST-${Date.now()}`
const createdStoryIds: string[] = []

function makeStoryId(suffix: string): string {
  return `${TEST_PREFIX}-${suffix}`
}

/**
 * Compute quality score using the AC-1 formula.
 * qualityScore = max(0, 100 - (reviewIterations * 10) - (qaIterations * 15))
 */
function computeQualityScore(reviewIterations: number, qaIterations: number): number {
  return Math.max(0, 100 - reviewIterations * 10 - qaIterations * 15)
}

// ============================================================================
// Pre-check: Verify workflow.story_outcomes table exists (WINT-0040 migration gate)
// ============================================================================

let storyOutcomesTableExists = false

beforeAll(async () => {
  const result = await db.execute(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'workflow'
      AND table_name = 'story_outcomes'
  ` as any)
  storyOutcomesTableExists = (result.rows as { table_name: string }[]).length > 0

  if (!storyOutcomesTableExists) {
    logger.warn(
      'SKIP: workflow.story_outcomes table not found — apply workflow schema migration before running these tests',
    )
  }
})

afterEach(async () => {
  if (!storyOutcomesTableExists) return
  // Clean up test rows
  for (const storyId of createdStoryIds) {
    await db.execute(
      `DELETE FROM workflow.story_outcomes WHERE story_id = $1` as any,
      [storyId] as any,
    )
  }
  createdStoryIds.length = 0
})

afterAll(async () => {
  if (!storyOutcomesTableExists) return
  // Final safety cleanup
  for (const storyId of createdStoryIds) {
    await db.execute(
      `DELETE FROM workflow.story_outcomes WHERE story_id = $1` as any,
      [storyId] as any,
    )
  }
})

// ============================================================================
// Helper: upsert a story outcome row (mirrors workflow_log_outcome internals)
// ============================================================================

const UpsertStoryOutcomeInputSchema = z.object({
  storyId: z.string(),
  finalVerdict: z.enum(['pass', 'fail', 'blocked', 'cancelled']),
  qualityScore: z.number().int().min(0).max(100),
  reviewIterations: z.number().int().min(0).optional(),
  qaIterations: z.number().int().min(0).optional(),
  primaryBlocker: z.string().optional(),
  completedAt: z.date().optional(),
})

type UpsertStoryOutcomeInput = z.infer<typeof UpsertStoryOutcomeInputSchema>

async function upsertStoryOutcome(input: UpsertStoryOutcomeInput): Promise<{ id: string }> {
  const {
    storyId,
    finalVerdict,
    qualityScore,
    reviewIterations = 0,
    qaIterations = 0,
    primaryBlocker = null,
    completedAt = new Date(),
  } = input

  const result = await db.execute(
    `INSERT INTO workflow.story_outcomes
       (story_id, final_verdict, quality_score, review_iterations, qa_iterations, primary_blocker, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (story_id) DO UPDATE SET
       final_verdict     = EXCLUDED.final_verdict,
       quality_score     = EXCLUDED.quality_score,
       review_iterations = EXCLUDED.review_iterations,
       qa_iterations     = EXCLUDED.qa_iterations,
       primary_blocker   = EXCLUDED.primary_blocker,
       completed_at      = EXCLUDED.completed_at
     RETURNING id` as any,
    [storyId, finalVerdict, qualityScore, reviewIterations, qaIterations, primaryBlocker, completedAt] as any,
  )

  const rows = result.rows as { id: string }[]
  if (rows.length === 0) throw new Error('Upsert returned no rows')
  return { id: rows[0].id }
}

// ============================================================================
// HP-1: QA PASS flow writes outcome row with final_verdict='pass' (AC-7)
// ============================================================================

describe('WINT-3050: story outcome — PASS flow (HP-1)', () => {
  it('AC-7: PASS scenario inserts 1 row with correct final_verdict and quality_score', async () => {
    if (!storyOutcomesTableExists) {
      logger.warn('SKIP HP-1: workflow.story_outcomes table not present')
      return
    }

    const storyId = makeStoryId('HP-1')
    createdStoryIds.push(storyId)

    const reviewIterations = 0
    const qaIterations = 1
    const qualityScore = computeQualityScore(reviewIterations, qaIterations)
    // qualityScore = max(0, 100 - 0 - 15) = 85

    await upsertStoryOutcome({
      storyId,
      finalVerdict: 'pass',
      qualityScore,
      reviewIterations,
      qaIterations,
    })

    const rows = await db.execute(
      `SELECT story_id, final_verdict, quality_score, review_iterations, qa_iterations
       FROM workflow.story_outcomes
       WHERE story_id = $1` as any,
      [storyId] as any,
    )
    const result = (rows.rows as Record<string, unknown>[])[0]

    expect(rows.rows).toHaveLength(1)
    expect(result.story_id).toBe(storyId)
    expect(result.final_verdict).toBe('pass')
    expect(Number(result.quality_score)).toBe(85)
    expect(Number(result.review_iterations)).toBe(0)
    expect(Number(result.qa_iterations)).toBe(1)
  })
})

// ============================================================================
// HP-2: QA FAIL flow writes outcome row with final_verdict='fail' (AC-7)
// ============================================================================

describe('WINT-3050: story outcome — FAIL flow (HP-2)', () => {
  it('AC-7: FAIL scenario inserts 1 row with final_verdict=fail and primary_blocker', async () => {
    if (!storyOutcomesTableExists) {
      logger.warn('SKIP HP-2: workflow.story_outcomes table not present')
      return
    }

    const storyId = makeStoryId('HP-2')
    createdStoryIds.push(storyId)

    const reviewIterations = 3
    const qaIterations = 2
    const qualityScore = computeQualityScore(reviewIterations, qaIterations)
    // qualityScore = max(0, 100 - 30 - 30) = 40
    const primaryBlocker = 'AC-3 missing implementation'

    await upsertStoryOutcome({
      storyId,
      finalVerdict: 'fail',
      qualityScore,
      reviewIterations,
      qaIterations,
      primaryBlocker,
    })

    const rows = await db.execute(
      `SELECT story_id, final_verdict, quality_score, primary_blocker
       FROM workflow.story_outcomes
       WHERE story_id = $1` as any,
      [storyId] as any,
    )
    const result = (rows.rows as Record<string, unknown>[])[0]

    expect(rows.rows).toHaveLength(1)
    expect(result.story_id).toBe(storyId)
    expect(result.final_verdict).toBe('fail')
    expect(Number(result.quality_score)).toBe(40)
    expect(result.primary_blocker).toBe(primaryBlocker)
  })
})

// ============================================================================
// HP-3: Upsert semantics — second call updates, no duplicate (AC-8)
// ============================================================================

describe('WINT-3050: story outcome — upsert semantics (HP-3)', () => {
  it('AC-8: second call for same story_id updates existing row, no duplicate', async () => {
    if (!storyOutcomesTableExists) {
      logger.warn('SKIP HP-3: workflow.story_outcomes table not present')
      return
    }

    const storyId = makeStoryId('HP-3')
    createdStoryIds.push(storyId)

    // First call: FAIL verdict
    await upsertStoryOutcome({
      storyId,
      finalVerdict: 'fail',
      qualityScore: 0,
      primaryBlocker: 'Initial blocker',
    })

    // Second call: PASS verdict (simulates re-run / correction)
    await upsertStoryOutcome({
      storyId,
      finalVerdict: 'pass',
      qualityScore: 85,
      qaIterations: 1,
    })

    const countResult = await db.execute(
      `SELECT COUNT(*) AS cnt FROM workflow.story_outcomes WHERE story_id = $1` as any,
      [storyId] as any,
    )
    const count = Number((countResult.rows as { cnt: string }[])[0].cnt)

    const rowResult = await db.execute(
      `SELECT final_verdict, quality_score, primary_blocker
       FROM workflow.story_outcomes
       WHERE story_id = $1` as any,
      [storyId] as any,
    )
    const row = (rowResult.rows as Record<string, unknown>[])[0]

    // Upsert: still exactly 1 row
    expect(count).toBe(1)
    // Updated to latest values
    expect(row.final_verdict).toBe('pass')
    expect(Number(row.quality_score)).toBe(85)
    // primary_blocker replaced by PASS call (null because omitted in second call)
    expect(row.primary_blocker).toBeNull()
  })
})

// ============================================================================
// ED-1: quality_score clamp — many iterations never produces negative score (AC-8)
// ============================================================================

describe('WINT-3050: quality score edge cases (ED-1, ED-2)', () => {
  it('ED-1: quality_score clamped to 0 when iterations are very high', async () => {
    if (!storyOutcomesTableExists) {
      logger.warn('SKIP ED-1: workflow.story_outcomes table not present')
      return
    }

    const storyId = makeStoryId('ED-1')
    createdStoryIds.push(storyId)

    const reviewIterations = 15
    const qaIterations = 10
    const qualityScore = computeQualityScore(reviewIterations, qaIterations)
    // max(0, 100 - 150 - 150) = max(0, -200) = 0

    expect(qualityScore).toBe(0)

    await upsertStoryOutcome({
      storyId,
      finalVerdict: 'fail',
      qualityScore,
      reviewIterations,
      qaIterations,
    })

    const rows = await db.execute(
      `SELECT quality_score FROM workflow.story_outcomes WHERE story_id = $1` as any,
      [storyId] as any,
    )
    const result = (rows.rows as Record<string, unknown>[])[0]

    expect(Number(result.quality_score)).toBe(0)
  })

  it('ED-2: quality_score = 100 when reviewIterations=0 and qaIterations=0', async () => {
    if (!storyOutcomesTableExists) {
      logger.warn('SKIP ED-2: workflow.story_outcomes table not present')
      return
    }

    const storyId = makeStoryId('ED-2')
    createdStoryIds.push(storyId)

    const qualityScore = computeQualityScore(0, 0)
    // max(0, 100 - 0 - 0) = 100

    expect(qualityScore).toBe(100)

    await upsertStoryOutcome({
      storyId,
      finalVerdict: 'pass',
      qualityScore,
      reviewIterations: 0,
      qaIterations: 0,
    })

    const rows = await db.execute(
      `SELECT quality_score FROM workflow.story_outcomes WHERE story_id = $1` as any,
      [storyId] as any,
    )
    const result = (rows.rows as Record<string, unknown>[])[0]

    expect(Number(result.quality_score)).toBe(100)
  })
})

// ============================================================================
// ED-3: completedAt is populated with a non-null timestamp (AC-8)
// ============================================================================

describe('WINT-3050: completedAt population (ED-3)', () => {
  it('ED-3: completed_at is non-null and approximately current time after upsert', async () => {
    if (!storyOutcomesTableExists) {
      logger.warn('SKIP ED-3: workflow.story_outcomes table not present')
      return
    }

    const storyId = makeStoryId('ED-3')
    createdStoryIds.push(storyId)

    const before = new Date()

    await upsertStoryOutcome({
      storyId,
      finalVerdict: 'pass',
      qualityScore: 100,
    })

    const after = new Date()

    const rows = await db.execute(
      `SELECT completed_at FROM workflow.story_outcomes WHERE story_id = $1` as any,
      [storyId] as any,
    )
    const result = (rows.rows as Record<string, unknown>[])[0]

    expect(result.completed_at).not.toBeNull()

    const completedAt = new Date(result.completed_at as string)
    expect(completedAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000)
    expect(completedAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000)
  })
})
