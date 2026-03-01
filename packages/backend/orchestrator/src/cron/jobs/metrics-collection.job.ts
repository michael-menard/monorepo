/**
 * Metrics Collection Cron Job — STUB
 *
 * Phase 4 stub: deferred to APIP-4070.
 * runMetricsCollection(storyId, hygieneResult, config) requires story-execution
 * context unavailable in a standalone cron job.
 *
 * APIP-3090: Cron Scheduler Infrastructure
 * GAP-4 resolution: ship as stub, defer real impl to APIP-4070
 */

import { logger } from '@repo/logger'
import type { CronJobDefinition } from '../schemas.js'

/**
 * Metrics collection cron job definition.
 *
 * Schedule: daily at midnight
 * Timeout: N/A — stub logs and returns immediately
 *
 * STUB: Real implementation deferred to APIP-4070.
 */
export const metricsCollectionJob: CronJobDefinition = {
  jobName: 'metrics-collection',
  schedule: '0 0 * * *',
  timeoutMs: 5 * 60 * 1000,
  runFn: async () => {
    logger.info('cron.job.stub', {
      jobName: 'metrics-collection',
      reason: 'Deferred to APIP-4070 — requires story-execution context',
    })
  },
}
