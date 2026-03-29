import { Hono } from 'hono'
import { streamSSE, type SSEStreamingApi } from 'hono/streaming'
import { Client } from 'pg'
import { logger } from '@repo/logger'

const app = new Hono()

let pgClient: Client | null = null
let listeners = new Set<(payload: string) => void>()
let agentActivityListeners = new Set<(payload: string) => void>()

async function ensurePgListener() {
  if (pgClient) return

  // Use DATABASE_URL_DIRECT (bypass PgBouncer) — LISTEN/NOTIFY requires a
  // persistent connection to Postgres directly; PgBouncer in transaction
  // pooling mode does not forward LISTEN/NOTIFY notifications.
  const connStr = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL
  pgClient = new Client({ connectionString: connStr })
  await pgClient.connect()
  await pgClient.query('LISTEN story_state_changed')
  await pgClient.query('LISTEN agent_activity_changed')

  pgClient.on('notification', msg => {
    if (msg.channel === 'story_state_changed' && msg.payload) {
      for (const cb of listeners) {
        cb(msg.payload)
      }
    }
    if (msg.channel === 'agent_activity_changed' && msg.payload) {
      for (const cb of agentActivityListeners) {
        cb(msg.payload)
      }
    }
  })

  pgClient.on('error', err => {
    logger.error('PG listener error, will reconnect', { error: String(err) })
    pgClient = null
    setTimeout(() => ensurePgListener().catch(() => {}), 3000)
  })

  logger.info('PG LISTEN story_state_changed + agent_activity_changed connected')
}

app.get('/api/v1/events/stories', async c => {
  await ensurePgListener()

  return streamSSE(c, async (stream: SSEStreamingApi) => {
    const onStoryNotification = (payload: string) => {
      stream.writeSSE({ event: 'story_state_changed', data: payload }).catch(() => {})
    }

    const onAgentNotification = (payload: string) => {
      stream.writeSSE({ event: 'agent_activity_changed', data: payload }).catch(() => {})
    }

    listeners.add(onStoryNotification)
    agentActivityListeners.add(onAgentNotification)

    // Heartbeat every 30s to keep connection alive through proxies
    const heartbeat = setInterval(() => {
      stream.writeSSE({ event: 'heartbeat', data: '' }).catch(() => {})
    }, 30_000)

    stream.onAbort(() => {
      listeners.delete(onStoryNotification)
      agentActivityListeners.delete(onAgentNotification)
      clearInterval(heartbeat)
    })

    // Keep the stream open until the client disconnects
    await new Promise<void>(resolve => {
      stream.onAbort(() => resolve())
    })
  })
})

/** @internal Reset module state for tests */
export function _resetForTests() {
  pgClient = null
  listeners = new Set()
  agentActivityListeners = new Set()
}

export const sseRoutes = app
