/**
 * Partition Manager Cron Job
 *
 * Runs the partition manager on a monthly schedule to pre-create
 * upcoming monthly partitions for telemetry.workflow_events.
 * Uses a PostgreSQL session-level advisory lock to prevent concurrent runs.
 * Lock is auto-released on pg client disconnect — no manual cleanup needed.
 *
 * CDBE-5020: Partition workflow_events Table and Partition Management Job
 * ARCH-003: Orchestrator cron job (patternMinerJob pattern) — no new infrastructure
 */

import { logger } from '@repo/logger'
import type { CronJobDefinition } from '../schemas.js'
import { LOCK_KEYS } from '../constants.js'
import { tryAcquireAdvisoryLock } from '../advisory-lock.js'

/**
 * Partition manager job run function.
 *
 * 1. Acquire session-level advisory lock (skip if held by another instance)
 * 2. Lazy-import runPartitionManager from CDBE-5020 implementation
 * 3. Run with the pool as dbClient
 */
async function runPartitionManagerJob(): Promise<void> {
  const { acquired, pool } = await tryAcquireAdvisoryLock(LOCK_KEYS.PARTITION_MANAGER)

  if (!acquired || !pool) {
    logger.info('cron.partition-manager.skipped', {
      reason: 'Advisory lock held by another instance',
      lockKey: LOCK_KEYS.PARTITION_MANAGER,
    })
    return
  }

  logger.info('cron.partition-manager.lock-acquired', { lockKey: LOCK_KEYS.PARTITION_MANAGER })

  try {
    // Lazy-import to avoid circular dependencies and allow mocking in tests
    const { runPartitionManager } = await import('../partition-manager.js')
    await runPartitionManager(pool)
  } finally {
    await pool.end()
  }
}

/**
 * Partition manager cron job definition.
 *
 * Schedule: 0 5 1 * * — 5 minutes past midnight on the 1st of each month
 * Timeout: 10 minutes (partition DDL may be slow on large tables)
 * Lock: PostgreSQL advisory lock (LOCK_KEYS.PARTITION_MANAGER = 42_005)
 */
export const partitionManagerJob: CronJobDefinition = {
  jobName: 'partition-manager',
  schedule: '0 5 1 * *',
  timeoutMs: 10 * 60 * 1000,
  runFn: async () => runPartitionManagerJob(),
}
