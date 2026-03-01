/**
 * Monitor Domain Routes
 *
 * Hono routes for the pipeline monitoring domain.
 * Applies Cognito auth middleware (ARCH-001: reuse existing auth middleware).
 * Registered in server.ts: app.route('/monitor', monitor)
 *
 * Story: APIP-2020
 */

import { Hono } from 'hono'
import { logger } from '@repo/logger'
import { auth } from '../../middleware/auth.js'
import { db } from '../../composition/index.js'
import { createMonitorRepository } from './adapters/repositories.js'
import { createMonitorService } from './application/services.js'

const monitor = new Hono()

// Apply Cognito auth middleware to all monitor routes (AC-11, ARCH-001)
// dev bypass handled by auth middleware when AUTH_BYPASS=true
monitor.use('*', auth)

// ─────────────────────────────────────────────────────────────────────────
// GET /monitor/pipeline
//
// Returns the full pipeline dashboard: pipeline_view, cost_summary, blocked_queue.
// AC-4: Valid Bearer token -> 200; no auth -> 401 (handled by auth middleware).
// ─────────────────────────────────────────────────────────────────────────

monitor.get('/pipeline', async c => {
  const repository = createMonitorRepository(db)
  const service = createMonitorService(repository)

  try {
    const dashboard = await service.getPipelineDashboard()
    return c.json(dashboard, 200)
  } catch (error) {
    logger.error('GET /monitor/pipeline failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default monitor
