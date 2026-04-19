import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'
import type { Server as SocketIOServer } from 'socket.io'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { NotificationEventSchema } from './__types__'
import { hmacMiddleware } from './middleware/hmac'
import * as db from './db'

const startTime = Date.now()

const PreferenceSchema = z.object({
  channel: z.string().min(1),
  enabled: z.boolean().optional(),
  min_severity: z.enum(['info', 'warning', 'critical']).optional(),
})

const PreferencesBodySchema = z.array(PreferenceSchema)

function requireUser(c: any): string | null {
  const userId = c.req.header('X-User-Id')
  if (!userId) {
    return null
  }
  return userId
}

export function createApp(io?: SocketIOServer) {
  const app = new Hono<{ Variables: { rawBody: string } }>()

  app.get('/health', c => {
    const uptime = (Date.now() - startTime) / 1000
    logger.info('Health check', { uptime })
    return c.json({ status: 'ok', uptime, db: db.isDbConnected() ? 'connected' : 'disconnected' })
  })

  app.get('/', c => {
    return c.json({
      message: 'Notifications Server',
      version: '1.0.0',
      endpoints: [
        '/health',
        '/events',
        '/users/:userId/notifications',
        '/users/:userId/preferences',
      ],
    })
  })

  app.post('/events', hmacMiddleware, async c => {
    let body: unknown
    const rawBody = c.get('rawBody')
    if (rawBody) {
      body = JSON.parse(rawBody)
    } else {
      body = await c.req.json()
    }

    const result = NotificationEventSchema.safeParse(body)

    if (!result.success) {
      return c.json(
        {
          error: 'Validation failed',
          details: result.error.flatten(),
        },
        400,
      )
    }

    const event = {
      ...result.data,
      id: result.data.id ?? randomUUID(),
      timestamp: result.data.timestamp ?? new Date().toISOString(),
    }

    if (io) {
      io.to(event.channel).emit('notification', event)
      logger.info('Event emitted to channel', { channel: event.channel, eventId: event.id })
    } else {
      logger.warn('Socket.io not available, event not emitted', { eventId: event.id })
    }

    // Persist to DB if userId is present
    if (event.userId) {
      try {
        await db.persistNotification(event.userId, event)
      } catch (err) {
        logger.warn('Failed to persist notification to DB', {
          err: err instanceof Error ? err.message : String(err),
        })
      }
    }

    return c.json(event, 201)
  })

  // --- User-scoped notification endpoints ---

  app.get('/users/:userId/notifications', async c => {
    const userId = requireUser(c)
    if (!userId) {
      return c.json({ error: 'Missing X-User-Id header' }, 401)
    }

    const paramUserId = c.req.param('userId')
    if (userId !== paramUserId) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const page = parseInt(c.req.query('page') ?? '1', 10)
    const limit = parseInt(c.req.query('limit') ?? '20', 10)

    if (page < 1 || isNaN(page)) {
      return c.json({ error: 'Invalid page param' }, 400)
    }
    if (limit < 1 || limit > 100 || isNaN(limit)) {
      return c.json({ error: 'Invalid limit param' }, 400)
    }

    const result = await db.getUserNotifications(userId, page, limit)
    return c.json(result)
  })

  app.patch('/users/:userId/notifications/:id', async c => {
    const userId = requireUser(c)
    if (!userId) {
      return c.json({ error: 'Missing X-User-Id header' }, 401)
    }

    const paramUserId = c.req.param('userId')
    if (userId !== paramUserId) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const notificationId = c.req.param('id')
    const success = await db.markNotificationAsRead(userId, notificationId)

    if (!success) {
      return c.json({ error: 'Failed to mark as read' }, 500)
    }

    return c.json({ success: true })
  })

  app.get('/users/:userId/preferences', async c => {
    const userId = requireUser(c)
    if (!userId) {
      return c.json({ error: 'Missing X-User-Id header' }, 401)
    }

    const paramUserId = c.req.param('userId')
    if (userId !== paramUserId) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const prefs = await db.getUserPreferences(userId)
    return c.json(prefs)
  })

  app.put('/users/:userId/preferences', async c => {
    const userId = requireUser(c)
    if (!userId) {
      return c.json({ error: 'Missing X-User-Id header' }, 401)
    }

    const paramUserId = c.req.param('userId')
    if (userId !== paramUserId) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    const body = await c.req.json()
    const parsed = PreferencesBodySchema.safeParse(body)

    if (!parsed.success) {
      return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400)
    }

    const success = await db.setUserPreferences(userId, parsed.data)

    if (!success) {
      return c.json({ error: 'Failed to update preferences' }, 500)
    }

    return c.json({ success: true })
  })

  return app
}
