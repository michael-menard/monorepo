import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'
import type { Server as SocketIOServer } from 'socket.io'
import { logger } from '@repo/logger'
import { NotificationEventSchema } from './__types__'
import { hmacMiddleware } from './middleware/hmac'

const startTime = Date.now()

export function createApp(io?: SocketIOServer) {
  const app = new Hono<{ Variables: { rawBody: string } }>()

  app.get('/health', c => {
    const uptime = (Date.now() - startTime) / 1000
    logger.info('Health check', { uptime })
    return c.json({ status: 'ok', uptime })
  })

  app.get('/', c => {
    return c.json({
      message: 'Notifications Server',
      version: '1.0.0',
      endpoints: ['/health', '/events'],
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

    return c.json(event, 201)
  })

  return app
}
