/**
 * Checkpoint TTL Cleanup
 *
 * Archives checkpoints older than CHECKPOINT_TTL_DAYS by setting status='archived'.
 * Uses wint.workflow_checkpoints.status column (accepts text values per ARCH-001).
 * No separate cold-store table needed — archived rows remain queryable via WHERE status='archived'.
 *
 * AC-006: Checkpoints older than 7 days auto-archived. Configurable via CHECKPOINT_TTL_DAYS env var.
 * HP-5: Rows older than TTL have status='archived' (not deleted).
 * ED-2: CHECKPOINT_TTL_DAYS=1 archives 2-day-old rows.
 *
 * ARCH-001 decision: status='archived' on active table avoids new table/migration.
 */

import { logger } from '@repo/logger'
import type { DbPool } from './checkpoint-repository.js'

/**
 * Default TTL in days if CHECKPOINT_TTL_DAYS env var is not set.
 */
export const DEFAULT_TTL_DAYS = 7

/**
 * Reads the configured TTL from environment variable.
 * Falls back to DEFAULT_TTL_DAYS (7) if not set or invalid.
 *
 * @returns TTL in days
 */
export function getCheckpointTtlDays(): number {
  const envValue = process.env.CHECKPOINT_TTL_DAYS
  if (!envValue) {
    return DEFAULT_TTL_DAYS
  }

  const parsed = parseInt(envValue, 10)
  if (isNaN(parsed) || parsed < 1) {
    logger.warn('Invalid CHECKPOINT_TTL_DAYS, using default', {
      envValue,
      default: DEFAULT_TTL_DAYS,
    })
    return DEFAULT_TTL_DAYS
  }

  return parsed
}

/**
 * Archives checkpoints older than the configured TTL by setting status='archived'.
 *
 * Does NOT delete rows — archived rows remain in the active table for audit purposes.
 * Query for active checkpoints: WHERE status != 'archived'
 * Query for archived checkpoints: WHERE status = 'archived'
 *
 * AC-006: Auto-archives rows older than CHECKPOINT_TTL_DAYS.
 * HP-5: Active table has 0 rows older than TTL after cleanup.
 * ED-2: Respects custom CHECKPOINT_TTL_DAYS values.
 *
 * @param pool - DB pool from @repo/db getPool()
 * @param ttlDaysOverride - Optional TTL override (default: reads from CHECKPOINT_TTL_DAYS env)
 * @returns Count of archived checkpoints
 */
export async function archiveExpiredCheckpoints(
  pool: DbPool,
  ttlDaysOverride?: number,
): Promise<{ archivedCount: number }> {
  const ttlDays = ttlDaysOverride ?? getCheckpointTtlDays()

  const client = await pool.connect()
  try {
    const result = await client.query<{ count: string }>(
      `WITH archived AS (
         UPDATE wint.workflow_checkpoints
         SET status = 'archived'
         WHERE created_at < NOW() - INTERVAL '1 day' * $1
           AND status NOT IN ('archived')
         RETURNING id
       )
       SELECT COUNT(*)::text as count FROM archived`,
      [ttlDays],
    )

    const archivedCount = parseInt(result.rows[0]?.count ?? '0', 10)

    logger.info('Archived expired checkpoints', { ttlDays, archivedCount })

    return { archivedCount }
  } catch (error) {
    logger.error('Checkpoint archive cleanup failed', {
      ttlDays,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  } finally {
    client.release?.()
  }
}
