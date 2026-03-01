/**
 * Worktree Pruning Cron Job — Phase 4 Stub
 *
 * Prunes stale git worktrees on a daily schedule.
 * TTL is configurable via CRON_WORKTREE_PRUNING_TTL_DAYS.
 * Real implementation pending Phase 4.
 *
 * APIP-3090: Cron Scheduler Infrastructure
 */

import { logger } from '@repo/logger'
import type { CronJobDefinition } from '../schemas.js'

/**
 * Worktree pruning cron job definition.
 *
 * Schedule: daily at 2am
 * Timeout: 3 minutes
 * TTL: CRON_WORKTREE_PRUNING_TTL_DAYS env var (default: 7 days)
 *
 * Phase 4 stub: logs intent and returns.
 */
export const worktreePruningJob: CronJobDefinition = {
  jobName: 'worktree-pruning',
  schedule: '0 2 * * *',
  timeoutMs: 3 * 60 * 1000,
  runFn: async () => {
    const ttlDays = parseInt(process.env.CRON_WORKTREE_PRUNING_TTL_DAYS ?? '7', 10)

    logger.info('cron.job.stub', {
      jobName: 'worktree-pruning',
      ttlDays,
      reason: 'Phase 4 stub — real implementation pending',
    })
  },
}
