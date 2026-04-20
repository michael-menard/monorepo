/**
 * Scraper Queue Events
 *
 * Emits WebSocket events via the notifications server HTTP endpoint.
 * Events are broadcast to clients subscribed to the 'scraper-queue' channel.
 */

import { logger } from '@repo/logger'
import { createHmac } from 'crypto'

const NOTIFICATIONS_URL = process.env.NOTIFICATIONS_SERVER_URL || 'http://localhost:3098'
const HMAC_SECRET = process.env.NOTIFICATIONS_HMAC_SECRET || ''
const CHANNEL = 'scraper-queue'

interface ScraperEvent {
  type: string
  title: string
  message?: string
  severity?: 'info' | 'warning' | 'critical'
  data?: Record<string, unknown>
}

function sign(body: string): string {
  if (!HMAC_SECRET) return ''
  return createHmac('sha256', HMAC_SECRET).update(body).digest('hex')
}

async function emit(event: ScraperEvent): Promise<void> {
  const payload = {
    channel: CHANNEL,
    ...event,
    severity: event.severity ?? 'info',
  }

  const body = JSON.stringify(payload)

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const signature = sign(body)
    if (signature) headers['X-Signature'] = signature

    const res = await fetch(`${NOTIFICATIONS_URL}/events`, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok) {
      logger.warn('[events] Failed to emit event', { status: res.status, type: event.type })
    }
  } catch (error) {
    // Never throw on event emission failure — it's non-critical
    logger.warn('[events] Could not reach notifications server', {
      type: event.type,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Scraper Queue Event Emitters
// ─────────────────────────────────────────────────────────────────────────

export const scraperEvents = {
  jobStarted(jobId: string, type: string, data: Record<string, unknown>) {
    return emit({
      type: 'job_started',
      title: 'Job Started',
      message: `${type} job started`,
      data: { jobId, jobType: type, ...data },
    })
  },

  jobCompleted(jobId: string, type: string, data: Record<string, unknown>) {
    return emit({
      type: 'job_completed',
      title: 'Job Completed',
      message: `${type} job completed`,
      data: { jobId, jobType: type, ...data },
    })
  },

  jobFailed(jobId: string, type: string, error: string, attempt: number) {
    return emit({
      type: 'job_failed',
      title: 'Job Failed',
      message: `${type} job failed: ${error}`,
      severity: 'warning',
      data: { jobId, jobType: type, error, attempt },
    })
  },

  circuitBreakerTripped(queueName: string, reason: string, resumesAt: string) {
    return emit({
      type: 'circuit_breaker_tripped',
      title: 'Circuit Breaker Tripped',
      message: `Queue ${queueName} paused: ${reason}`,
      severity: 'critical',
      data: { queueName, reason, resumesAt },
    })
  },

  circuitBreakerReset(queueName: string) {
    return emit({
      type: 'circuit_breaker_reset',
      title: 'Circuit Breaker Reset',
      message: `Queue ${queueName} resumed`,
      data: { queueName },
    })
  },

  catalogExpanded(jobId: string, itemsFound: number, jobsEnqueued: number) {
    return emit({
      type: 'catalog_expanded',
      title: 'Catalog Expanded',
      message: `Found ${itemsFound} items, enqueued ${jobsEnqueued} jobs`,
      data: { jobId, itemsFound, jobsEnqueued },
    })
  },
}
