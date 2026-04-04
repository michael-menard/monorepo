import { createHmac, timingSafeEqual } from 'node:crypto'
import type { MiddlewareHandler } from 'hono'
import { logger } from '@repo/logger'
import { env } from '../env'

export const hmacMiddleware: MiddlewareHandler = async (c, next) => {
  const secret = env.NOTIFICATIONS_HMAC_SECRET

  if (!secret) {
    if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
      logger.warn('HMAC validation skipped: NOTIFICATIONS_HMAC_SECRET not set')
      await next()
      return
    }
    return c.json({ error: 'Server misconfiguration: HMAC secret not set' }, 500)
  }

  const signature = c.req.header('X-Signature')
  if (!signature) {
    return c.json({ error: 'Missing X-Signature header' }, 401)
  }

  const body = await c.req.text()
  // Store raw body so downstream handlers can re-parse it
  c.set('rawBody', body)

  const expected = createHmac('sha256', secret).update(body).digest('hex')

  const sigBuffer = Buffer.from(signature, 'hex')
  const expectedBuffer = Buffer.from(expected, 'hex')

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return c.json({ error: 'Invalid HMAC signature' }, 401)
  }

  await next()
}
