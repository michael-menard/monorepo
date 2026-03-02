/**
 * Dead Code Reaper Cron Job
 *
 * Runs the dead code reaper on a monthly schedule (1st of month at 3am).
 * Uses a PostgreSQL session-level advisory lock to prevent concurrent runs.
 * Lock is auto-released on pg client disconnect — no manual cleanup needed.
 *
 * APIP-4050: Dead Code Reaper — Monthly Cron Analysis and CLEANUP Story Generation
 * ARCH-001: withTimeout uses TimeoutOptions object { timeoutMs, nodeName }
 * ARCH-002: LOCK_KEYS.DEAD_CODE_REAPER = 42_002 (integer constant, not hashtext())
 */

import { logger } from '@repo/logger'
import type { CronJobDefinition } from '../schemas.js'
import { LOCK_KEYS } from '../constants.js'
import { getCronDbClient } from '../db.js'

/**
 * Attempt to acquire a PostgreSQL session-level advisory lock.
 *
 * pg_try_advisory_lock() returns true if the lock was acquired,
 * false if another session already holds it.
 * The lock is automatically released when the client disconnects.
 *
 * @param lockKey - Integer advisory lock key
 * @returns true if lock acquired, false if lock is held by another session
 */
async function tryAcquireAdvisoryLock(lockKey: number): Promise<{
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
      logger.info('cron.dead-code-reaper.lock.skipped', {
        lockKey,
        reason: 'Another instance holds the advisory lock',
      })
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

/**
 * Dead Code Reaper job run function.
 *
 * 1. Acquire session-level advisory lock (skip if held by another instance)
 * 2. Lazy-import runDeadCodeReaper from nodes/dead-code/runner
 * 3. Run and optionally generate cleanup story
 */
async function runDeadCodeReaperJob(): Promise<void> {
  const { acquired, pool } = await tryAcquireAdvisoryLock(LOCK_KEYS.DEAD_CODE_REAPER)

  if (!acquired || !pool) {
    logger.info('cron.dead-code-reaper.skipped', {
      reason: 'Advisory lock held by another instance',
      lockKey: LOCK_KEYS.DEAD_CODE_REAPER,
    })
    return
  }

  logger.info('cron.dead-code-reaper.starting', {
    lockKey: LOCK_KEYS.DEAD_CODE_REAPER,
  })

  try {
    // Lazy-import to avoid circular dependencies and allow mocking in tests
    const { runDeadCodeReaper } = await import('../../nodes/dead-code/runner.js')
    const result = await runDeadCodeReaper()

    if (result.status === 'success' && result.summary.verifiedDeletions > 0) {
      // Generate cleanup story if there are verified deletions
      const { generateCleanupStory } =
        await import('../../nodes/dead-code/cleanup-story-generator.js')
      const storyPath = generateCleanupStory(result)

      logger.info('cron.dead-code-reaper.story-generated', {
        storyPath,
        verifiedDeletions: result.summary.verifiedDeletions,
      })
    }

    logger.info('cron.dead-code-reaper.finished', {
      status: result.status,
      summary: result.summary,
    })
  } finally {
    await pool.end()
  }
}

/**
 * Dead Code Reaper cron job definition.
 *
 * Schedule: monthly at 3am on the 1st (0 3 1 * *)
 * Timeout: 15 minutes
 * Lock: PostgreSQL advisory lock (LOCK_KEYS.DEAD_CODE_REAPER = 42_002)
 */
export const deadCodeReaperJob: CronJobDefinition = {
  jobName: 'dead-code-reaper',
  schedule: '0 3 1 * *',
  timeoutMs: 15 * 60 * 1000,
  runFn: async () => runDeadCodeReaperJob(),
}
