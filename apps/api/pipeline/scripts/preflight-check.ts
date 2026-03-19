/**
 * Pipeline Pre-flight Check Script
 *
 * Validates all integration points before a supervised end-to-end run.
 * Exits non-zero with actionable messages on any failure.
 *
 * Checks:
 *   (a) KB dependency stories in completed state (PIPE-0030, PIPE-3020, PIPE-3010, PIPE-2050)
 *   (b) Redis connectivity
 *   (c) Aurora/KB DB connectivity
 *   (d) Orchestrator graphs module resolves runDevImplement/runReview/runQAVerify
 *   (e) Selected test story is in ready state with valid elaboration artifact
 *
 * Usage:
 *   tsx scripts/preflight-check.ts
 *   tsx scripts/preflight-check.ts --test-story CDBE-1010
 *
 * Environment variables:
 *   REDIS_URL              - Redis connection string (default: redis://localhost:6379)
 *   KB_DB_HOST             - Knowledge base DB host (default: localhost)
 *   KB_DB_PORT             - Knowledge base DB port (default: 5432)
 *   KB_DB_NAME             - Knowledge base DB name (default: knowledge_base)
 *   KB_DB_USER             - Knowledge base DB user (default: postgres)
 *   KB_DB_PASSWORD         - Knowledge base DB password
 *
 * PIPE-4010: AC-1 (dependency gate) and AC-9 (test story selection)
 */

import { createClient } from 'redis'
import pg from 'pg'
import { resolve } from 'path'
import { logger } from '@repo/logger'

const { Pool } = pg

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const DEPENDENCY_STORIES = ['PIPE-0030', 'PIPE-3020', 'PIPE-3010', 'PIPE-2050']
const COMPLETED_STATES = ['completed', 'UAT']
const REQUIRED_GRAPH_RUNNERS = [
  'runElaboration',
  'runStoryCreation',
  'runDevImplement',
  'runReview',
  'runQAVerify',
]

// ─────────────────────────────────────────────────────────────────────────────
// CLI arg parsing
// ─────────────────────────────────────────────────────────────────────────────

function parseArgs(): { testStory: string | null } {
  const args = process.argv.slice(2)
  const idx = args.indexOf('--test-story')
  return {
    testStory: idx !== -1 && args[idx + 1] ? args[idx + 1] : null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check (a): KB dependency stories in completed state
// ─────────────────────────────────────────────────────────────────────────────

async function checkDependencies(pool: pg.Pool): Promise<boolean> {
  logger.info('[preflight] Checking dependency stories...')
  let allPassed = true

  for (const storyId of DEPENDENCY_STORIES) {
    const result = await pool.query(
      `SELECT story_id, state FROM workflow.stories WHERE story_id = $1`,
      [storyId],
    )

    if (result.rows.length === 0) {
      logger.error(`[preflight] FAIL: Dependency story ${storyId} not found in KB`)
      allPassed = false
      continue
    }

    const { state } = result.rows[0]
    if (!COMPLETED_STATES.includes(state)) {
      logger.error(
        `[preflight] FAIL: Dependency story ${storyId} is in state '${state}' — must be one of: ${COMPLETED_STATES.join(', ')}`,
      )
      allPassed = false
    } else {
      logger.info(`[preflight] OK: ${storyId} is ${state}`)
    }
  }

  return allPassed
}

// ─────────────────────────────────────────────────────────────────────────────
// Check (b): Redis connectivity
// ─────────────────────────────────────────────────────────────────────────────

async function checkRedis(): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'
  logger.info(`[preflight] Checking Redis connectivity at ${redisUrl}...`)

  const client = createClient({ url: redisUrl })

  try {
    await client.connect()
    await client.ping()
    await client.disconnect()
    logger.info('[preflight] OK: Redis is reachable')
    return true
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error(`[preflight] FAIL: Redis connection failed — ${msg}`)
    logger.error(`[preflight]   Ensure Redis is running: redis-server`)
    logger.error(
      `[preflight]   Set REDIS_URL env var if not using default (redis://localhost:6379)`,
    )
    try {
      await client.disconnect()
    } catch {
      // ignore disconnect errors
    }
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check (c): Aurora/KB DB connectivity
// ─────────────────────────────────────────────────────────────────────────────

async function connectKbDb(): Promise<pg.Pool | null> {
  const pool = new Pool({
    host: process.env.KB_DB_HOST ?? 'localhost',
    port: Number(process.env.KB_DB_PORT ?? 5432),
    database: process.env.KB_DB_NAME ?? 'knowledge_base',
    user: process.env.KB_DB_USER ?? 'postgres',
    password: process.env.KB_DB_PASSWORD,
    connectionTimeoutMillis: 5000,
  })

  logger.info('[preflight] Checking KB database connectivity...')

  try {
    await pool.query('SELECT 1')
    logger.info('[preflight] OK: KB database is reachable')
    return pool
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error(`[preflight] FAIL: KB database connection failed — ${msg}`)
    logger.error(`[preflight]   Set KB_DB_HOST, KB_DB_PORT, KB_DB_NAME, KB_DB_USER, KB_DB_PASSWORD`)
    await pool.end()
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Check (d): Orchestrator graph runners resolve from dist
// ─────────────────────────────────────────────────────────────────────────────

async function checkGraphRunners(): Promise<boolean> {
  logger.info('[preflight] Checking orchestrator graph runners...')

  let graphsPath: string
  try {
    const orchestratorPath = require.resolve('@repo/orchestrator')
    graphsPath = orchestratorPath.replace('/dist/index.js', '/dist/graphs/index.js')
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error(`[preflight] FAIL: Cannot resolve @repo/orchestrator — ${msg}`)
    logger.error(`[preflight]   Run: pnpm build --filter @repo/orchestrator`)
    return false
  }

  let mod: Record<string, unknown>
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mod = (await import(/* @vite-ignore */ graphsPath)) as Record<string, unknown>
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error(`[preflight] FAIL: Cannot load graphs from ${graphsPath} — ${msg}`)
    logger.error(`[preflight]   Run: pnpm build --filter @repo/orchestrator`)
    return false
  }

  let allPresent = true
  for (const runner of REQUIRED_GRAPH_RUNNERS) {
    if (typeof mod[runner] !== 'function') {
      logger.error(`[preflight] FAIL: mod.${runner} is ${typeof mod[runner]} — expected function`)
      if (runner === 'runReview') {
        logger.error(
          `[preflight]   runReview was missing from graphs/index.ts — ensure PIPE-4010 Step 1 is applied and @repo/orchestrator is rebuilt`,
        )
      }
      allPresent = false
    } else {
      logger.info(`[preflight] OK: ${runner} is loaded`)
    }
  }

  return allPresent
}

// ─────────────────────────────────────────────────────────────────────────────
// Check (e): Test story is in ready state with valid elaboration artifact
// ─────────────────────────────────────────────────────────────────────────────

async function checkTestStory(pool: pg.Pool, storyId: string): Promise<boolean> {
  logger.info(`[preflight] Checking test story ${storyId}...`)

  // Check story state
  const storyResult = await pool.query(
    `SELECT story_id, state FROM workflow.stories WHERE story_id = $1`,
    [storyId],
  )

  if (storyResult.rows.length === 0) {
    logger.error(`[preflight] FAIL: Test story ${storyId} not found in KB`)
    return false
  }

  const { state } = storyResult.rows[0]
  if (state !== 'ready') {
    logger.error(`[preflight] FAIL: Test story ${storyId} is in state '${state}' — must be 'ready'`)
    logger.error(
      `[preflight]   Use kb_update_story_status({ story_id: '${storyId}', state: 'ready' }) to reset`,
    )
    return false
  }

  logger.info(`[preflight] OK: Test story ${storyId} is in 'ready' state`)

  // Check elaboration artifact exists with planContent
  const artifactResult = await pool.query(
    `SELECT id, content FROM workflow.story_artifacts
     WHERE story_id = $1 AND artifact_type = 'elaboration'
     ORDER BY iteration DESC LIMIT 1`,
    [storyId],
  )

  if (artifactResult.rows.length === 0) {
    logger.error(`[preflight] FAIL: Test story ${storyId} has no elaboration artifact`)
    logger.error(`[preflight]   Run elaboration for this story before attempting supervised run`)
    return false
  }

  const content = artifactResult.rows[0].content
  // Validate planContent is present (ChangeSpec[] required by dev-implement graph)
  const hasPlanContent =
    content &&
    typeof content === 'object' &&
    (Array.isArray(content.planContent) ||
      (content.content && Array.isArray(content.content.planContent)))

  if (!hasPlanContent) {
    logger.error(
      `[preflight] FAIL: Test story ${storyId} elaboration artifact is missing planContent (ChangeSpec[])`,
    )
    logger.error(`[preflight]   Re-run elaboration or select a different test story`)
    return false
  }

  logger.info(
    `[preflight] OK: Test story ${storyId} has valid elaboration artifact with planContent`,
  )
  return true
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { testStory } = parseArgs()
  const results: Record<string, boolean> = {}

  logger.info('[preflight] ============================================================')
  logger.info('[preflight] PIPE-4010 Pre-flight Check')
  logger.info('[preflight] ============================================================')

  // (b) Redis — runs in parallel with DB connect
  const [redisOk, pool] = await Promise.all([checkRedis(), connectKbDb()])

  results['redis'] = redisOk

  if (!pool) {
    results['db'] = false
    results['dependencies'] = false
    if (testStory) results['test_story'] = false
  } else {
    // (a) Dependency stories
    results['dependencies'] = await checkDependencies(pool)

    results['db'] = true

    // (e) Test story selection — only if --test-story flag provided
    if (testStory) {
      results['test_story'] = await checkTestStory(pool, testStory)
    }

    await pool.end()
  }

  // (d) Graph runners — independent of DB
  results['graph_runners'] = await checkGraphRunners()

  // ── Summary ──────────────────────────────────────────────────────────────
  logger.info('[preflight] ============================================================')
  logger.info('[preflight] Summary:')

  let anyFailed = false
  for (const [check, passed] of Object.entries(results)) {
    if (passed) {
      logger.info(`[preflight]   OK  ${check}`)
    } else {
      logger.error(`[preflight]   FAIL ${check}`)
      anyFailed = true
    }
  }

  if (!testStory) {
    logger.info('[preflight]   --  test_story (skipped — pass --test-story STORY-ID to check)')
  }

  logger.info('[preflight] ============================================================')

  if (anyFailed) {
    logger.error(
      '[preflight] RESULT: PRE-FLIGHT FAILED — resolve all failures before starting supervised run',
    )
    process.exit(1)
  } else {
    logger.info('[preflight] RESULT: PRE-FLIGHT PASSED — system is ready for supervised run')
    process.exit(0)
  }
}

main().catch(err => {
  logger.error('[preflight] Unexpected error:', err)
  process.exit(1)
})
