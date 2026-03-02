/**
 * Pattern Miner Cron Job
 *
 * Runs the pattern miner graph on a 15-minute schedule.
 * Uses a PostgreSQL session-level advisory lock to prevent concurrent runs.
 * Lock is auto-released on pg client disconnect — no manual cleanup needed.
 *
 * APIP-3090: Cron Scheduler Infrastructure
 * ARCH-001: withTimeout uses TimeoutOptions object { timeoutMs, nodeName }
 * ARCH-002: LOCK_KEYS.PATTERN_MINER = 42001 (integer constant, not hashtext())
 */

import { logger } from '@repo/logger'
import type { CronJobDefinition } from '../schemas.js'
import { LOCK_KEYS } from '../constants.js'
import { tryAcquireAdvisoryLock } from '../advisory-lock.js'

/**
 * Pattern miner job run function.
 *
 * 1. Acquire session-level advisory lock (skip if held by another instance)
 * 2. Lazy-import runPatternMiner from APIP-3020
 * 3. Run with the pool as dbClient
 */
async function runPatternMinerJob(): Promise<void> {
  const { acquired, pool } = await tryAcquireAdvisoryLock(LOCK_KEYS.PATTERN_MINER)

  if (!acquired || !pool) {
    logger.info('cron.pattern-miner.skipped', {
      reason: 'Advisory lock held by another instance',
      lockKey: LOCK_KEYS.PATTERN_MINER,
    })
    return
  }

  logger.info('cron.pattern-miner.starting', { lockKey: LOCK_KEYS.PATTERN_MINER })

  try {
    // Lazy-import to avoid circular dependencies and allow mocking in tests
    const { runPatternMiner } = await import('../../graphs/pattern-miner.js')
    await runPatternMiner(pool)
    logger.info('cron.pattern-miner.completed')
  } finally {
    await pool.end()
  }
}

/**
 * Pattern miner cron job definition.
 *
 * Schedule: every 15 minutes
 * Timeout: 5 minutes
 * Lock: PostgreSQL advisory lock (LOCK_KEYS.PATTERN_MINER = 42001)
 */
export const patternMinerJob: CronJobDefinition = {
  jobName: 'pattern-miner',
  schedule: '*/15 * * * *',
  timeoutMs: 5 * 60 * 1000,
  runFn: async () => runPatternMinerJob(),
}
