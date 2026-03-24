/**
 * BlockerNotificationModule
 *
 * Handles persistence of pipeline blockers to workflow.story_blockers and optional
 * webhook notification on PERMANENT failure, wall-clock timeout, and circuit OPEN.
 *
 * APIP-2010:
 *   AC-1: PERMANENT failure → insert blocker_type='technical', severity='high'
 *   AC-2: WallClockTimeoutError → blocker_description includes threadId
 *   AC-4: Worker 'completed' → resolveBlocker() called → resolved_at set via UPDATE
 *   AC-5: Idempotency guard — SELECT-before-INSERT prevents duplicate rows
 *   AC-6: Structured @repo/logger events on insert and resolve
 *   AC-7: Webhook HTTP POST with 2000ms AbortController timeout; failure is warn+continue
 *
 * Architecture:
 *   ARCH-001: Accepts NodePgDatabase instance (factory parameter, testable via mock)
 *   ARCH-002: Module-level Map<string, string> cache for storyId→UUID resolution
 */

import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { logger } from '@repo/logger'
import type { PipelineSupervisorConfig } from '../__types__/index.js'
import { WallClockTimeoutError } from '../wall-clock-timeout.js'

// ─────────────────────────────────────────────────────────────────────────────
// ARCH-002: Module-level storyId→UUID resolution cache
// Singleton within this module; session-scoped (acceptable at Phase 2 scale <50 stories)
// ─────────────────────────────────────────────────────────────────────────────

const _storyUuidCache = new Map<string, string>()

/**
 * Reset the UUID cache (for testing only).
 */
export function resetStoryUuidCache(): void {
  _storyUuidCache.clear()
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BlockerNotificationModule {
  insertBlocker(storyId: string, error: unknown, jobData?: unknown): Promise<void>
  insertDependencyBlocker(storyId: string, stage: string): Promise<void>
  resolveBlocker(storyId: string): Promise<void>
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory function (ARCH-001: testable via mocked db)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a BlockerNotificationModule backed by the given database connection.
 *
 * @param db - Drizzle NodePgDatabase instance (wint schema accessible)
 * @param config - Supervisor config (webhookUrl for notification)
 */

export function createBlockerNotificationModule(
  db: NodePgDatabase<any>,
  config: Pick<PipelineSupervisorConfig, 'webhookUrl'>,
): BlockerNotificationModule {
  return {
    /**
     * Insert a blocker row for a PERMANENT failure or wall-clock timeout.
     *
     * AC-1: blocker_type='technical', severity='high' for PERMANENT failures
     * AC-2: WallClockTimeoutError → description includes checkpointThreadId
     * AC-5: SELECT-before-INSERT idempotency guard
     * AC-6: Structured log events
     * AC-7: Optional webhook notification
     */
    async insertBlocker(storyId: string, error: unknown, jobData?: unknown): Promise<void> {
      const storyUuid = await resolveStoryUuid(db, storyId)
      if (!storyUuid) {
        logger.warn('blocker_insert_skipped_no_uuid', {
          event: 'blocker_insert_skipped_no_uuid',
          storyId,
          reason: 'storyId not found in workflow.stories — skipping blocker insert',
        })
        return
      }

      // Determine blocker description
      let blockerDescription: string
      if (error instanceof WallClockTimeoutError) {
        // AC-2: Include threadId from job data for checkpoint inspection
        const threadId = extractThreadId(jobData, storyId)
        blockerDescription = `Wall-clock timeout exceeded ${error.timeoutMs}ms. Checkpoint thread: ${threadId}`
      } else {
        const message = error instanceof Error ? error.message : String(error)
        blockerDescription = `Permanent failure: ${message}`
      }

      // AC-5: Idempotency guard — check for existing unresolved blocker
      const existing = await db.execute(sql`
        SELECT id FROM workflow.story_blockers
        WHERE story_id = ${storyUuid}::uuid
          AND blocker_type = 'technical'
          AND resolved_at IS NULL
        LIMIT 1
      `)

      if (existing.rows.length > 0) {
        logger.info('blocker_insert_skipped_idempotent', {
          event: 'blocker_insert_skipped_idempotent',
          storyId,
          reason: 'existing unresolved technical blocker found — skipping duplicate insert',
        })
        return
      }

      // Insert blocker row
      await db.execute(sql`
        INSERT INTO workflow.story_blockers (story_id, blocker_type, blocker_description, severity)
        VALUES (
          ${storyUuid}::uuid,
          'technical',
          ${blockerDescription},
          'high'
        )
      `)

      // AC-6: Structured log event
      logger.info('blocker_inserted', {
        event: 'blocker_inserted',
        storyId,
        blockerType: 'technical',
        severity: 'high',
        blockerDescription,
      })

      // AC-7: Optional webhook notification (fire-and-forget, non-blocking)
      if (config.webhookUrl) {
        sendWebhookNotification(config.webhookUrl, {
          event: 'blocker_inserted',
          storyId,
          blockerType: 'technical',
          severity: 'high',
          blockerDescription,
        }).catch(err => {
          logger.warn('webhook_notification_failed', {
            event: 'webhook_notification_failed',
            storyId,
            error: err instanceof Error ? err.message : String(err),
          })
        })
      }
    },

    /**
     * Insert a dependency blocker when a circuit breaker transitions to OPEN.
     *
     * AC-3: circuit OPEN → insert blocker_type='dependency'
     * AC-5: SELECT-before-INSERT idempotency guard
     * AC-6: Structured log events
     * AC-7: Optional webhook notification
     */
    async insertDependencyBlocker(storyId: string, stage: string): Promise<void> {
      const storyUuid = await resolveStoryUuid(db, storyId)
      if (!storyUuid) {
        logger.warn('dependency_blocker_insert_skipped_no_uuid', {
          event: 'dependency_blocker_insert_skipped_no_uuid',
          storyId,
          stage,
          reason: 'storyId not found in workflow.stories — skipping blocker insert',
        })
        return
      }

      const blockerDescription = `Circuit breaker OPEN for stage '${stage}' — dispatching blocked until circuit recovers`

      // AC-5: Idempotency guard — check for existing unresolved dependency blocker
      const existing = await db.execute(sql`
        SELECT id FROM workflow.story_blockers
        WHERE story_id = ${storyUuid}::uuid
          AND blocker_type = 'dependency'
          AND resolved_at IS NULL
        LIMIT 1
      `)

      if (existing.rows.length > 0) {
        logger.info('dependency_blocker_insert_skipped_idempotent', {
          event: 'dependency_blocker_insert_skipped_idempotent',
          storyId,
          stage,
          reason: 'existing unresolved dependency blocker found — skipping duplicate insert',
        })
        return
      }

      await db.execute(sql`
        INSERT INTO workflow.story_blockers (story_id, blocker_type, blocker_description, severity)
        VALUES (
          ${storyUuid}::uuid,
          'dependency',
          ${blockerDescription},
          'high'
        )
      `)

      // AC-6: Structured log event
      logger.info('dependency_blocker_inserted', {
        event: 'dependency_blocker_inserted',
        storyId,
        stage,
        blockerType: 'dependency',
        severity: 'high',
        blockerDescription,
      })

      // AC-7: Optional webhook notification (fire-and-forget)
      if (config.webhookUrl) {
        sendWebhookNotification(config.webhookUrl, {
          event: 'dependency_blocker_inserted',
          storyId,
          stage,
          blockerType: 'dependency',
          severity: 'high',
          blockerDescription,
        }).catch(err => {
          logger.warn('webhook_notification_failed', {
            event: 'webhook_notification_failed',
            storyId,
            error: err instanceof Error ? err.message : String(err),
          })
        })
      }
    },

    /**
     * Resolve all active blockers for a story (sets resolved_at = NOW()).
     *
     * AC-4: Worker 'completed' → resolveBlocker() → resolved_at set via UPDATE
     * AC-6: Structured log events
     */
    async resolveBlocker(storyId: string): Promise<void> {
      const storyUuid = await resolveStoryUuid(db, storyId)
      if (!storyUuid) {
        // Silently skip if storyId not found — completed jobs may not have blockers
        logger.debug('blocker_resolve_skipped_no_uuid', {
          event: 'blocker_resolve_skipped_no_uuid',
          storyId,
        })
        return
      }

      const result = await db.execute(sql`
        UPDATE workflow.story_blockers
        SET resolved_at = NOW(), updated_at = NOW()
        WHERE story_id = ${storyUuid}::uuid
          AND resolved_at IS NULL
      `)

      const rowCount = result.rowCount ?? 0
      if (rowCount > 0) {
        // AC-6: Structured log event
        logger.info('blocker_resolved', {
          event: 'blocker_resolved',
          storyId,
          resolvedAt: new Date().toISOString(),
          rowsUpdated: rowCount,
        })
      }
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a storyId (e.g. 'APIP-001') to a workflow.stories UUID.
 *
 * ARCH-002: Uses module-level Map cache for O(1) lookups after first resolution.
 * Returns null if the storyId is not found in workflow.stories (skip with warning).
 */

async function resolveStoryUuid(db: NodePgDatabase<any>, storyId: string): Promise<string | null> {
  const cached = _storyUuidCache.get(storyId)
  if (cached !== undefined) {
    return cached
  }

  try {
    const result = await db.execute(sql`
      SELECT id FROM workflow.stories WHERE story_id = ${storyId} LIMIT 1
    `)

    if (result.rows.length === 0) {
      return null
    }

    const row = result.rows[0] as Record<string, unknown>
    const uuid = String(row['id'])
    _storyUuidCache.set(storyId, uuid)
    return uuid
  } catch (err) {
    logger.warn('story_uuid_resolution_failed', {
      event: 'story_uuid_resolution_failed',
      storyId,
      error: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

/**
 * Extract the thread ID from job data for use in blocker descriptions.
 * Falls back to a derived format if job data is not available.
 */
function extractThreadId(jobData: unknown, storyId: string): string {
  if (jobData && typeof jobData === 'object') {
    const data = jobData as Record<string, unknown>
    const stage = data['stage'] as string | undefined
    const attemptNumber = data['attemptNumber'] as number | undefined
    if (stage && attemptNumber !== undefined) {
      return `${storyId}:${stage}:${attemptNumber}`
    }
  }
  return `${storyId}:unknown:0`
}

/**
 * Send a webhook notification with a 2000ms AbortController timeout.
 *
 * AC-7: webhook HTTP POST with 2000ms timeout; non-blocking (caller does not await)
 *
 * Throws on:
 * - HTTP error status (≥ 400)
 * - Timeout (AbortError after 2000ms)
 * - Network failure
 */
export async function sendWebhookNotification(
  webhookUrl: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 2000)

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Webhook returned HTTP ${response.status}: ${response.statusText}`)
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
