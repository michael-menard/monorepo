/**
 * Doc Sync Cron Job — Phase 4 Stub
 *
 * Syncs documentation on a configurable hourly schedule.
 * Real implementation pending Phase 4.
 *
 * APIP-3090: Cron Scheduler Infrastructure
 */

import { logger } from '@repo/logger'
import type { CronJobDefinition } from '../schemas.js'

/**
 * Doc sync cron job definition.
 *
 * Schedule: configurable hourly (default: at the top of every hour)
 * Timeout: 2 minutes
 *
 * Phase 4 stub: logs intent and returns.
 */
export const docSyncJob: CronJobDefinition = {
  jobName: 'doc-sync',
  schedule: process.env.CRON_DOC_SYNC_SCHEDULE ?? '0 * * * *',
  timeoutMs: 2 * 60 * 1000,
  runFn: async () => {
    logger.info('cron.job.stub', {
      jobName: 'doc-sync',
      reason: 'Phase 4 stub — real implementation pending',
    })
  },
}
