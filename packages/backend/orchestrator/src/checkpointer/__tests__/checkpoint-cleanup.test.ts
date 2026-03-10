/**
 * Checkpoint Cleanup Unit Tests
 *
 * HP-5: Rows older than TTL have status='archived' (not deleted).
 * ED-2: CHECKPOINT_TTL_DAYS=1 archives 2-day-old rows.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { archiveExpiredCheckpoints, getCheckpointTtlDays, DEFAULT_TTL_DAYS } from '../checkpoint-cleanup.js'
import type { DbPool, DbClient } from '../checkpoint-repository.js'

// ============================================================================
// Mock DB Factory
// ============================================================================

function createMockPool(archivedCount = 3): { pool: DbPool; mockClient: DbClient } {
  const mockClient: DbClient = {
    release: vi.fn(),
    query: vi.fn().mockResolvedValue({
      rows: [{ count: String(archivedCount) }],
      rowCount: 1,
    }),
  }
  const pool: DbPool = {
    connect: vi.fn().mockResolvedValue(mockClient),
    query: vi.fn(),
  }
  return { pool, mockClient }
}

// ============================================================================
// Tests
// ============================================================================

describe('getCheckpointTtlDays', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns DEFAULT_TTL_DAYS (7) when CHECKPOINT_TTL_DAYS is not set', () => {
    delete process.env['CHECKPOINT_TTL_DAYS']
    expect(getCheckpointTtlDays()).toBe(DEFAULT_TTL_DAYS)
    expect(getCheckpointTtlDays()).toBe(7)
  })

  it('ED-2: returns custom TTL when CHECKPOINT_TTL_DAYS is set', () => {
    process.env['CHECKPOINT_TTL_DAYS'] = '1'
    expect(getCheckpointTtlDays()).toBe(1)
  })

  it('returns DEFAULT_TTL_DAYS for invalid env var value', () => {
    process.env['CHECKPOINT_TTL_DAYS'] = 'not-a-number'
    expect(getCheckpointTtlDays()).toBe(DEFAULT_TTL_DAYS)
  })

  it('returns DEFAULT_TTL_DAYS for 0 TTL (invalid)', () => {
    process.env['CHECKPOINT_TTL_DAYS'] = '0'
    expect(getCheckpointTtlDays()).toBe(DEFAULT_TTL_DAYS)
  })

  it('returns 30 for CHECKPOINT_TTL_DAYS=30', () => {
    process.env['CHECKPOINT_TTL_DAYS'] = '30'
    expect(getCheckpointTtlDays()).toBe(30)
  })
})

describe('archiveExpiredCheckpoints', () => {
  it('HP-5: archives rows older than TTL using status=archived', async () => {
    const { pool, mockClient } = createMockPool(5)
    const result = await archiveExpiredCheckpoints(pool, 7)

    expect(result.archivedCount).toBe(5)

    // Verify the SQL uses status='archived' and interval logic
    const queryFn = mockClient.query as ReturnType<typeof vi.fn>
    const queryCall = queryFn.mock.calls[0]
    const sql = String(queryCall?.[0] ?? '')
    const params = queryCall?.[1] as unknown[]

    expect(sql).toContain('archived')
    expect(sql).toContain('UPDATE wint.workflow_checkpoints')
    expect(sql).toContain("SET status = 'archived'")
    expect(params?.[0]).toBe(7)
  })

  it('HP-5: rows are not deleted — only status is changed to archived', async () => {
    const { pool, mockClient } = createMockPool(2)
    const result = await archiveExpiredCheckpoints(pool, 7)

    expect(result.archivedCount).toBe(2)

    // SQL should NOT contain DELETE — only UPDATE
    const queryFn = mockClient.query as ReturnType<typeof vi.fn>
    const sql = String(queryFn.mock.calls[0]?.[0] ?? '')
    expect(sql).not.toContain('DELETE')
    expect(sql).toContain('UPDATE')
  })

  it('ED-2: CHECKPOINT_TTL_DAYS=1 — archives rows by passing 1-day interval', async () => {
    const { pool, mockClient } = createMockPool(1)
    const result = await archiveExpiredCheckpoints(pool, 1)

    expect(result.archivedCount).toBe(1)

    const queryFn = mockClient.query as ReturnType<typeof vi.fn>
    const params = queryFn.mock.calls[0]?.[1] as unknown[]
    expect(params?.[0]).toBe(1)
  })

  it('returns 0 when no checkpoints are old enough to archive', async () => {
    const { pool } = createMockPool(0)
    const result = await archiveExpiredCheckpoints(pool, 7)

    expect(result.archivedCount).toBe(0)
  })

  it('reads TTL from env var when no override provided', async () => {
    const originalEnv = process.env['CHECKPOINT_TTL_DAYS']
    process.env['CHECKPOINT_TTL_DAYS'] = '14'

    const { pool, mockClient } = createMockPool(3)
    await archiveExpiredCheckpoints(pool)

    const queryFn = mockClient.query as ReturnType<typeof vi.fn>
    const params = queryFn.mock.calls[0]?.[1] as unknown[]
    expect(params?.[0]).toBe(14)

    // Restore
    if (originalEnv !== undefined) {
      process.env['CHECKPOINT_TTL_DAYS'] = originalEnv
    } else {
      delete process.env['CHECKPOINT_TTL_DAYS']
    }
  })

  it('throws error when DB unavailable — not silently dropped', async () => {
    const pool: DbPool = {
      connect: vi.fn().mockRejectedValue(new Error('Connection refused')),
      query: vi.fn(),
    }

    await expect(archiveExpiredCheckpoints(pool, 7)).rejects.toThrow('Connection refused')
  })

  it('releases client after successful query', async () => {
    const { pool, mockClient } = createMockPool(2)
    await archiveExpiredCheckpoints(pool, 7)

    expect(mockClient.release).toHaveBeenCalledOnce()
  })

  it('releases client even after query error', async () => {
    const mockClient: DbClient = {
      release: vi.fn(),
      query: vi.fn().mockRejectedValue(new Error('DB error')),
    }
    const pool: DbPool = {
      connect: vi.fn().mockResolvedValue(mockClient),
      query: vi.fn(),
    }

    await expect(archiveExpiredCheckpoints(pool, 7)).rejects.toThrow('DB error')
    expect(mockClient.release).toHaveBeenCalledOnce()
  })
})
