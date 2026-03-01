/**
 * Code Audit Cron Job — Phase 4 Stub
 *
 * Runs the code audit graph on a configurable daily schedule.
 * Real implementation pending Phase 4.
 *
 * APIP-3090: Cron Scheduler Infrastructure
 */

import { logger } from '@repo/logger'
import type { CronJobDefinition } from '../schemas.js'

/**
 * Code audit cron job definition.
 *
 * Schedule: configurable daily (default: 2am)
 * Timeout: 10 minutes
 *
 * Phase 4 stub: logs intent and returns.
 */
export const codeAuditJob: CronJobDefinition = {
  jobName: 'code-audit',
  schedule: process.env.CRON_CODE_AUDIT_SCHEDULE ?? '0 2 * * *',
  timeoutMs: 10 * 60 * 1000,
  runFn: async () => {
    logger.info('cron.job.stub', {
      jobName: 'code-audit',
      reason: 'Phase 4 stub — real implementation pending',
    })
  },
}
