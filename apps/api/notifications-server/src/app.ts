import { Hono } from 'hono'
import { logger } from '@repo/logger'

const startTime = Date.now()

export function createApp() {
  const app = new Hono()

  app.get('/health', c => {
    const uptime = (Date.now() - startTime) / 1000
    logger.info('Health check', { uptime })
    return c.json({ status: 'ok', uptime })
  })

  app.get('/', c => {
    return c.json({
      message: 'Notifications Server',
      version: '1.0.0',
      endpoints: ['/health'],
    })
  })

  return app
}
