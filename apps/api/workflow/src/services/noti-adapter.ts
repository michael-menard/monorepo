/**
 * NOTI Server Adapter
 *
 * Injectable adapter for posting events to the NOTI notifications server.
 * Provides three implementations:
 *
 * 1. Production adapter — POSTs to NOTI server with optional HMAC signing
 * 2. Noop adapter — does nothing (for dev/test when no NOTI server needed)
 * 3. Capturing adapter — captures events in memory (for test assertions)
 *
 * Graceful degradation: production adapter never throws. If the NOTI server
 * is unreachable, it logs a warning and continues.
 */

import { createHmac } from 'node:crypto'
import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// Config Schema
// ============================================================================

export const NotiAdapterConfigSchema = z.object({
  /** Base URL of the NOTI server (e.g. http://localhost:3098) */
  baseUrl: z.string().url().default('http://localhost:3098'),
  /** HMAC secret for X-Signature header. If unset, no signature is sent. */
  hmacSecret: z.string().optional(),
  /** Request timeout in milliseconds */
  timeoutMs: z.number().int().min(0).default(5_000),
})

export type NotiAdapterConfig = z.infer<typeof NotiAdapterConfigSchema>

// ============================================================================
// Adapter Types
// ============================================================================

export const NotiEventPayloadSchema = z.object({
  channel: z.string().min(1),
  type: z.string().min(1),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
  title: z.string().min(1),
  message: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  userId: z.string().optional(),
  timestamp: z.string().datetime().optional(),
})

export type NotiEventPayload = z.infer<typeof NotiEventPayloadSchema>

/**
 * NotiAdapter — injectable adapter for emitting events to the NOTI server.
 */
export type NotiAdapter = {
  emit: (event: NotiEventPayload) => Promise<void>
}

// ============================================================================
// Production Adapter
// ============================================================================

/**
 * Creates a production NOTI adapter that POSTs events to the notifications server.
 *
 * - Signs requests with HMAC-SHA256 if hmacSecret is configured
 * - Never throws — logs warnings on failure and continues
 * - Respects timeout configuration
 */
export function createNotiAdapter(config: Partial<NotiAdapterConfig> = {}): NotiAdapter {
  const resolved = NotiAdapterConfigSchema.parse(config)

  return {
    emit: async (event: NotiEventPayload) => {
      const body = JSON.stringify(event)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (resolved.hmacSecret) {
        const signature = createHmac('sha256', resolved.hmacSecret).update(body).digest('hex')
        headers['X-Signature'] = signature
      }

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), resolved.timeoutMs)

        const response = await fetch(`${resolved.baseUrl}/events`, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          logger.warn('noti-adapter: NOTI server returned non-OK status', {
            status: response.status,
            eventType: event.type,
          })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.warn('noti-adapter: failed to emit event to NOTI server', {
          error: msg,
          eventType: event.type,
          baseUrl: resolved.baseUrl,
        })
      }
    },
  }
}

// ============================================================================
// Noop Adapter (dev/test)
// ============================================================================

/**
 * Creates a no-op NOTI adapter that silently discards events.
 * Used in dev/test environments where no NOTI server is running.
 */
export function createNoopNotiAdapter(): NotiAdapter {
  return {
    emit: async () => {},
  }
}

// ============================================================================
// Capturing Adapter (test assertions)
// ============================================================================

export type CapturingNotiAdapter = NotiAdapter & {
  events: NotiEventPayload[]
  clear: () => void
}

/**
 * Creates a capturing NOTI adapter that stores all emitted events in memory.
 * Used in tests to assert that correct events were emitted.
 */
export function createCapturingNotiAdapter(): CapturingNotiAdapter {
  const events: NotiEventPayload[] = []

  return {
    events,
    emit: async (event: NotiEventPayload) => {
      events.push(event)
    },
    clear: () => {
      events.length = 0
    },
  }
}
