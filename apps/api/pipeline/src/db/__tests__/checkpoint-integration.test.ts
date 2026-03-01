/**
 * Checkpoint Integration Tests
 * Story APIP-5001: Test Database Setup for LangGraph Checkpoint Schema
 *
 * Full lifecycle integration test:
 * 1. Connect to the test database
 * 2. Apply schema migrations
 * 3. Insert a checkpoint record
 * 4. Read back and verify the checkpoint
 * 5. Clean up
 *
 * PREREQUISITES:
 *   Start the test database first:
 *   pnpm db:test:start   (starts postgres:15 on port 5434)
 *   pnpm db:migrate:test (applies migrations)
 *
 * These tests are SKIPPED automatically when the database is not available.
 * They run in CI with the test DB container running.
 *
 * @see APIP-5001 AC-7, AC-9
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Pool } from 'pg'
import { testConnection, closePool } from '../client.js'

// ============================================================================
// Test DB Pool (direct pg.Pool — does not use the module singleton)
// ============================================================================

let testPool: Pool | null = null

async function getTestPool(): Promise<Pool> {
  if (!testPool) {
    testPool = new Pool({
      host: process.env.PIPELINE_DB_HOST || 'localhost',
      port: parseInt(process.env.PIPELINE_DB_PORT || '5434', 10),
      database: process.env.PIPELINE_DB_NAME || 'pipeline_test',
      user: process.env.PIPELINE_DB_USER || 'pipelineuser',
      password: process.env.PIPELINE_DB_PASSWORD || 'TestPassword123!',
      max: 2,
      connectionTimeoutMillis: 5000,
    })
  }
  return testPool
}

// ============================================================================
// Database availability check
// ============================================================================

let dbAvailable = false

beforeAll(async () => {
  const result = await testConnection()
  dbAvailable = result.success

  if (!dbAvailable) {
    console.warn(
      '[integration] Test DB unavailable — skipping integration tests.\n' +
        'Start it with: pnpm db:test:start && pnpm db:migrate:test\n' +
        `Reason: ${result.error}`,
    )
  }
})

afterAll(async () => {
  if (testPool) {
    await testPool.end()
    testPool = null
  }
  await closePool()
})

// ============================================================================
// Helper: cleanup test data
// ============================================================================

async function cleanupTestData(threadId: string): Promise<void> {
  const pool = await getTestPool()
  await pool.query('DELETE FROM checkpoint_writes WHERE thread_id = $1', [threadId])
  await pool.query('DELETE FROM checkpoint_blobs WHERE thread_id = $1', [threadId])
  await pool.query('DELETE FROM checkpoints WHERE thread_id = $1', [threadId])
}

// ============================================================================
// Tests
// ============================================================================

describe('APIP-5001 - AC-7: Database Connectivity', () => {
  it('should connect to the test database', async () => {
    if (!dbAvailable) {
      console.log('SKIP: DB not available')
      return
    }

    const result = await testConnection()
    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })
})

describe('APIP-5001 - AC-7: Schema Migration Verification', () => {
  it('should have all required tables after migration', async () => {
    if (!dbAvailable) {
      console.log('SKIP: DB not available')
      return
    }

    const pool = await getTestPool()

    // Query information_schema to verify tables exist
    const result = await pool.query<{ table_name: string }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('checkpoints', 'checkpoint_blobs', 'checkpoint_writes', 'checkpoint_migrations')
      ORDER BY table_name
    `)

    const tables = result.rows.map(r => r.table_name)
    expect(tables).toContain('checkpoints')
    expect(tables).toContain('checkpoint_blobs')
    expect(tables).toContain('checkpoint_writes')
    expect(tables).toContain('checkpoint_migrations')
  })

  it('should have migration version 1 recorded', async () => {
    if (!dbAvailable) {
      console.log('SKIP: DB not available')
      return
    }

    const pool = await getTestPool()
    const result = await pool.query<{ v: number }>(
      'SELECT v FROM checkpoint_migrations WHERE v = 1',
    )
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].v).toBe(1)
  })
})

describe('APIP-5001 - AC-9: Checkpoint Lifecycle (Insert → Read)', () => {
  const TEST_THREAD_ID = 'apip-5001-integration-test-thread'

  afterAll(async () => {
    if (dbAvailable) {
      await cleanupTestData(TEST_THREAD_ID)
    }
  })

  it('should insert a checkpoint record', async () => {
    if (!dbAvailable) {
      console.log('SKIP: DB not available')
      return
    }

    const pool = await getTestPool()

    await pool.query(
      `INSERT INTO checkpoints
         (thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id, type, checkpoint, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (thread_id, checkpoint_ns, checkpoint_id) DO NOTHING`,
      [
        TEST_THREAD_ID,
        '',
        'ckpt-integration-001',
        null,
        'json',
        JSON.stringify({ v: 1, ts: '2026-01-01T00:00:00Z', id: 'ckpt-integration-001', channel_values: { messages: [] } }),
        JSON.stringify({ source: 'input', step: 0, writes: {} }),
      ],
    )

    // Verify row exists
    const result = await pool.query<{ checkpoint_id: string }>(
      'SELECT checkpoint_id FROM checkpoints WHERE thread_id = $1 AND checkpoint_id = $2',
      [TEST_THREAD_ID, 'ckpt-integration-001'],
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].checkpoint_id).toBe('ckpt-integration-001')
  })

  it('should read back the checkpoint with correct data', async () => {
    if (!dbAvailable) {
      console.log('SKIP: DB not available')
      return
    }

    const pool = await getTestPool()

    const result = await pool.query<{
      thread_id: string
      checkpoint_ns: string
      checkpoint_id: string
      parent_checkpoint_id: string | null
      type: string
      checkpoint: object
      metadata: object
    }>(
      `SELECT thread_id, checkpoint_ns, checkpoint_id, parent_checkpoint_id,
              type, checkpoint, metadata
       FROM checkpoints
       WHERE thread_id = $1 AND checkpoint_id = $2`,
      [TEST_THREAD_ID, 'ckpt-integration-001'],
    )

    expect(result.rows).toHaveLength(1)

    const row = result.rows[0]
    expect(row.thread_id).toBe(TEST_THREAD_ID)
    expect(row.checkpoint_ns).toBe('')
    expect(row.checkpoint_id).toBe('ckpt-integration-001')
    expect(row.parent_checkpoint_id).toBeNull()
    expect(row.type).toBe('json')
    expect(row.checkpoint).toMatchObject({ v: 1 })
    expect(row.metadata).toMatchObject({ source: 'input', step: 0 })
  })

  it('should insert and read a checkpoint blob', async () => {
    if (!dbAvailable) {
      console.log('SKIP: DB not available')
      return
    }

    const pool = await getTestPool()
    const blobData = Buffer.from('test-blob-payload')

    await pool.query(
      `INSERT INTO checkpoint_blobs
         (thread_id, checkpoint_ns, channel, version, type, blob)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (thread_id, checkpoint_ns, channel, version) DO NOTHING`,
      [TEST_THREAD_ID, '', 'messages', 'v1', 'msgpack', blobData],
    )

    const result = await pool.query<{ channel: string; version: string; type: string }>(
      'SELECT channel, version, type FROM checkpoint_blobs WHERE thread_id = $1 AND channel = $2',
      [TEST_THREAD_ID, 'messages'],
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].channel).toBe('messages')
    expect(result.rows[0].version).toBe('v1')
    expect(result.rows[0].type).toBe('msgpack')
  })

  it('should insert and read a checkpoint write', async () => {
    if (!dbAvailable) {
      console.log('SKIP: DB not available')
      return
    }

    const pool = await getTestPool()
    const blobData = Buffer.from('pending-write-data')

    await pool.query(
      `INSERT INTO checkpoint_writes
         (thread_id, checkpoint_ns, checkpoint_id, task_id, idx, channel, type, blob)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (thread_id, checkpoint_ns, checkpoint_id, task_id, idx) DO NOTHING`,
      [TEST_THREAD_ID, '', 'ckpt-integration-001', 'task-abc', 0, 'messages', 'json', blobData],
    )

    const result = await pool.query<{ task_id: string; idx: number }>(
      `SELECT task_id, idx FROM checkpoint_writes
       WHERE thread_id = $1 AND checkpoint_id = $2`,
      [TEST_THREAD_ID, 'ckpt-integration-001'],
    )

    expect(result.rows).toHaveLength(1)
    expect(result.rows[0].task_id).toBe('task-abc')
    expect(result.rows[0].idx).toBe(0)
  })
})

describe('APIP-5001 - AC-9: Idempotency (Double-apply safety)', () => {
  it('should not error on duplicate checkpoint insert with ON CONFLICT', async () => {
    if (!dbAvailable) {
      console.log('SKIP: DB not available')
      return
    }

    const pool = await getTestPool()
    const THREAD = 'apip-5001-idempotency-test'

    try {
      // First insert
      await pool.query(
        `INSERT INTO checkpoints
           (thread_id, checkpoint_ns, checkpoint_id, checkpoint, metadata)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (thread_id, checkpoint_ns, checkpoint_id) DO NOTHING`,
        [THREAD, '', 'ckpt-idem-001', JSON.stringify({ v: 1 }), JSON.stringify({})],
      )

      // Second insert of same key — should not throw
      await expect(
        pool.query(
          `INSERT INTO checkpoints
             (thread_id, checkpoint_ns, checkpoint_id, checkpoint, metadata)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (thread_id, checkpoint_ns, checkpoint_id) DO NOTHING`,
          [THREAD, '', 'ckpt-idem-001', JSON.stringify({ v: 2 }), JSON.stringify({})],
        ),
      ).resolves.not.toThrow()
    } finally {
      await cleanupTestData(THREAD)
    }
  })
})
