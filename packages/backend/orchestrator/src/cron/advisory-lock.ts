/**
 * Shared PostgreSQL advisory lock utility for cron jobs.
 *
 * Extracted from pattern-miner.job.ts and dead-code-reaper.job.ts to avoid
 * code duplication. Each cron job calls tryAcquireAdvisoryLock() with its
 * own LOCK_KEYS constant.
 *
 * APIP-4050: Dead Code Reaper — extracted shared utility
 * ARCH-002: Lock keys are plain integers from LOCK_KEYS (not hashtext())
 */

import { getCronDbClient } from './db.js'

/**
 * Attempt to acquire a PostgreSQL session-level advisory lock.
 *
 * pg_try_advisory_lock() returns true if the lock was acquired,
 * false if another session already holds it.
 * The lock is automatically released when the client disconnects.
 *
 * @param lockKey - Integer advisory lock key (from LOCK_KEYS constants)
 * @returns Object with acquired flag and pool reference (null if not acquired)
 */
export async function tryAcquireAdvisoryLock(lockKey: number): Promise<{
  acquired: boolean
  pool: ReturnType<typeof getCronDbClient> | null
}> {
  const pool = getCronDbClient()
  const client = await pool.connect()

  try {
    const result = await client.query<{ pg_try_advisory_lock: boolean }>(
      'SELECT pg_try_advisory_lock($1)',
      [lockKey],
    )

    const acquired = result.rows[0]?.pg_try_advisory_lock ?? false

    if (!acquired) {
      client.release()
      await pool.end()
      return { acquired: false, pool: null }
    }

    // Release connection back to pool (lock stays on the session until pool ends)
    client.release()
    return { acquired: true, pool }
  } catch (err) {
    client.release()
    await pool.end()
    throw err
  }
}
