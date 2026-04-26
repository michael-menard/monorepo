/**
 * StepTracker — Emits granular step-level progress events from the scraper pipeline.
 *
 * Dual-writes:
 *   1. POST to notifications server (real-time WebSocket broadcast)
 *   2. INSERT into scrape_step_events table (persistent audit trail)
 *
 * Fire-and-forget on the notification side — never blocks or throws on emit failure.
 */

import { createHmac } from 'crypto'
import { logger } from '@repo/logger'
import { scrapeStepEvents } from '../db/schema.js'
import type { getDbClient } from '../db/client.js'

type DbClient = ReturnType<typeof getDbClient>

const CHANNEL = 'scraper-queue'

export interface StepDefinition {
  id: string
  label: string
}

export interface StepTrackerOptions {
  jobId?: string
  scrapeRunId: string
  mocNumber: string
  scraperType: string
  notificationsUrl: string
  hmacSecret?: string
  db: DbClient
}

export class StepTracker {
  private seq = 0
  private readonly startTime: number
  private readonly opts: StepTrackerOptions

  constructor(opts: StepTrackerOptions) {
    this.opts = opts
    this.startTime = Date.now()
  }

  async plan(steps: StepDefinition[]): Promise<void> {
    const seq = this.nextSeq()
    const data = {
      jobId: this.opts.jobId ?? null,
      scrapeRunId: this.opts.scrapeRunId,
      mocNumber: this.opts.mocNumber,
      scraperType: this.opts.scraperType,
      seq,
      steps,
    }

    await Promise.all([
      this.emitNotification({
        type: 'step_plan',
        title: `${this.opts.mocNumber} scrape started`,
        data,
      }),
      this.writeDb({
        eventType: 'step_plan',
        seq,
        detail: { steps },
      }),
    ])
  }

  async start(stepId: string): Promise<void> {
    await this.emitStep(stepId, 'running')
  }

  async complete(stepId: string, detail?: Record<string, unknown>): Promise<void> {
    await this.emitStep(stepId, 'completed', detail)
  }

  async skip(stepId: string): Promise<void> {
    await this.emitStep(stepId, 'skipped')
  }

  async fail(stepId: string, error: string): Promise<void> {
    await this.emitStep(stepId, 'failed', undefined, error)
  }

  private async emitStep(
    stepId: string,
    status: 'running' | 'completed' | 'skipped' | 'failed',
    detail?: Record<string, unknown>,
    error?: string,
  ): Promise<void> {
    const seq = this.nextSeq()
    const elapsed = Date.now() - this.startTime

    const data = {
      jobId: this.opts.jobId ?? null,
      scrapeRunId: this.opts.scrapeRunId,
      mocNumber: this.opts.mocNumber,
      step: stepId,
      status,
      seq,
      detail: detail ?? null,
      error: error ?? null,
      elapsed,
    }

    await Promise.all([
      this.emitNotification({
        type: 'step_progress',
        title: stepId,
        severity: status === 'failed' ? 'warning' : 'info',
        data,
      }),
      this.writeDb({
        eventType: 'step_progress',
        stepId,
        status,
        seq,
        detail: detail ?? null,
        error: error ?? null,
      }),
    ])
  }

  private nextSeq(): number {
    return this.seq++
  }

  private async emitNotification(event: {
    type: string
    title: string
    severity?: 'info' | 'warning' | 'critical'
    data: Record<string, unknown>
  }): Promise<void> {
    const payload = {
      channel: CHANNEL,
      ...event,
      severity: event.severity ?? 'info',
    }

    const body = JSON.stringify(payload)

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const signature = this.sign(body)
      if (signature) headers['X-Signature'] = signature

      const res = await fetch(`${this.opts.notificationsUrl}/events`, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(5000),
      })

      if (!res.ok) {
        logger.warn('[step-tracker] Failed to emit event', { status: res.status, type: event.type })
      }
    } catch (error) {
      logger.warn('[step-tracker] Could not reach notifications server', {
        type: event.type,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private async writeDb(row: {
    eventType: string
    stepId?: string
    status?: string
    seq: number
    detail?: unknown
    error?: string | null
  }): Promise<void> {
    try {
      await this.opts.db.insert(scrapeStepEvents).values({
        jobId: this.opts.jobId ?? null,
        scrapeRunId: this.opts.scrapeRunId,
        mocNumber: this.opts.mocNumber,
        scraperType: this.opts.scraperType,
        eventType: row.eventType,
        stepId: row.stepId ?? null,
        status: row.status ?? null,
        seq: row.seq,
        detail: row.detail ?? null,
        error: row.error ?? null,
      })
    } catch (error) {
      logger.warn('[step-tracker] Failed to write step event to DB', {
        eventType: row.eventType,
        stepId: row.stepId,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private sign(body: string): string {
    if (!this.opts.hmacSecret) return ''
    return createHmac('sha256', this.opts.hmacSecret).update(body).digest('hex')
  }
}
