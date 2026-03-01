/**
 * KB Compression Cron Job — Phase 4 Stub
 *
 * Runs knowledge-base compression on a daily schedule.
 * Real implementation pending Phase 4.
 *
 * APIP-3090: Cron Scheduler Infrastructure
 */

import { logger } from '@repo/logger'
import type { CronJobDefinition } from '../schemas.js'

/**
 * KB compression cron job definition.
 *
 * Schedule: daily at 1am
 * Timeout: 15 minutes
 *
 * Phase 4 stub: logs intent and returns.
 */
export const kbCompressionJob: CronJobDefinition = {
  jobName: 'kb-compression',
  schedule: '0 1 * * *',
  timeoutMs: 15 * 60 * 1000,
  runFn: async () => {
    logger.info('cron.job.stub', {
      jobName: 'kb-compression',
      reason: 'Phase 4 stub — real implementation pending',
    })
  },
}
