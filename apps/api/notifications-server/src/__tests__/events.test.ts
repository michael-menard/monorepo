import { createHmac } from 'node:crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { env } from '../env'
import { createApp } from '../app'

const TEST_SECRET = 'test-hmac-secret-key'

function sign(body: string, secret = TEST_SECRET): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}

function makeRequest(
  app: ReturnType<typeof createApp>,
  body: object,
  headers: Record<string, string> = {},
) {
  const bodyStr = JSON.stringify(body)
  return app.request('/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: bodyStr,
  })
}

function makeSignedRequest(
  app: ReturnType<typeof createApp>,
  body: object,
  secret = TEST_SECRET,
) {
  const bodyStr = JSON.stringify(body)
  return app.request('/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': sign(bodyStr, secret),
    },
    body: bodyStr,
  })
}

const validEvent = {
  channel: 'pipeline',
  type: 'build_complete',
  title: 'Build finished',
}

// Helper to cast json response
async function jsonBody(res: Response): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>
}

describe('POST /events', () => {
  const originalSecret = env.NOTIFICATIONS_HMAC_SECRET

  beforeEach(() => {
    // Mutate the already-parsed env object for test control
    env.NOTIFICATIONS_HMAC_SECRET = TEST_SECRET
  })

  describe('HMAC validation', () => {
    it('returns 401 when X-Signature header is missing', async () => {
      const app = createApp()
      const res = await makeRequest(app, validEvent)
      expect(res.status).toBe(401)
      const body = await jsonBody(res)
      expect(body.error).toMatch(/Missing X-Signature/)
    })

    it('returns 401 when signature is invalid', async () => {
      const app = createApp()
      const bodyStr = JSON.stringify(validEvent)
      const res = await app.request('/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': sign(bodyStr, 'wrong-secret'),
        },
        body: bodyStr,
      })
      expect(res.status).toBe(401)
      const body = await jsonBody(res)
      expect(body.error).toMatch(/Invalid HMAC/)
    })

    it('skips HMAC when secret is not set in dev/test', async () => {
      env.NOTIFICATIONS_HMAC_SECRET = undefined

      const app = createApp()
      const res = await makeRequest(app, validEvent)
      // Should pass HMAC check and reach validation (201 for valid event)
      expect(res.status).toBe(201)

      // Restore
      env.NOTIFICATIONS_HMAC_SECRET = originalSecret
    })
  })

  describe('schema validation', () => {
    it('returns 400 when required fields are missing', async () => {
      const app = createApp()
      const res = await makeSignedRequest(app, { channel: 'test' })
      expect(res.status).toBe(400)
      const body = await jsonBody(res)
      expect(body.error).toBe('Validation failed')
      expect(body.details).toBeDefined()
    })

    it('returns 400 when channel is empty', async () => {
      const app = createApp()
      const res = await makeSignedRequest(app, {
        channel: '',
        type: 'test',
        title: 'Test',
      })
      expect(res.status).toBe(400)
    })

    it('returns 400 when type is empty', async () => {
      const app = createApp()
      const res = await makeSignedRequest(app, {
        channel: 'test',
        type: '',
        title: 'Test',
      })
      expect(res.status).toBe(400)
    })

    it('returns 400 when title is empty', async () => {
      const app = createApp()
      const res = await makeSignedRequest(app, {
        channel: 'test',
        type: 'test_event',
        title: '',
      })
      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid severity value', async () => {
      const app = createApp()
      const res = await makeSignedRequest(app, {
        ...validEvent,
        severity: 'urgent',
      })
      expect(res.status).toBe(400)
    })

    it('returns 400 for invalid timestamp format', async () => {
      const app = createApp()
      const res = await makeSignedRequest(app, {
        ...validEvent,
        timestamp: 'not-a-date',
      })
      expect(res.status).toBe(400)
    })
  })

  describe('successful event creation', () => {
    it('returns 201 with valid minimal event', async () => {
      const app = createApp()
      const res = await makeSignedRequest(app, validEvent)
      expect(res.status).toBe(201)
      const body = await jsonBody(res)
      expect(body.channel).toBe('pipeline')
      expect(body.type).toBe('build_complete')
      expect(body.title).toBe('Build finished')
      expect(body.severity).toBe('info')
    })

    it('auto-generates id when not provided', async () => {
      const app = createApp()
      const res = await makeSignedRequest(app, validEvent)
      expect(res.status).toBe(201)
      const body = await jsonBody(res)
      expect(body.id).toBeDefined()
      expect(body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
    })

    it('preserves provided id', async () => {
      const app = createApp()
      const id = '550e8400-e29b-41d4-a716-446655440000'
      const res = await makeSignedRequest(app, { ...validEvent, id })
      expect(res.status).toBe(201)
      const body = await jsonBody(res)
      expect(body.id).toBe(id)
    })

    it('auto-generates timestamp when not provided', async () => {
      const app = createApp()
      const res = await makeSignedRequest(app, validEvent)
      expect(res.status).toBe(201)
      const body = await jsonBody(res)
      expect(body.timestamp).toBeDefined()
      expect(new Date(body.timestamp as string).toISOString()).toBeTruthy()
    })

    it('preserves provided timestamp', async () => {
      const app = createApp()
      const timestamp = '2026-04-04T12:00:00.000Z'
      const res = await makeSignedRequest(app, { ...validEvent, timestamp })
      expect(res.status).toBe(201)
      const body = await jsonBody(res)
      expect(body.timestamp).toBe(timestamp)
    })

    it('includes optional fields in response', async () => {
      const app = createApp()
      const event = {
        ...validEvent,
        severity: 'critical',
        message: 'Something happened',
        data: { buildId: 123, status: 'success' },
        userId: 'user-42',
      }
      const res = await makeSignedRequest(app, event)
      expect(res.status).toBe(201)
      const body = await jsonBody(res)
      expect(body.severity).toBe('critical')
      expect(body.message).toBe('Something happened')
      expect(body.data).toEqual({ buildId: 123, status: 'success' })
      expect(body.userId).toBe('user-42')
    })
  })

  describe('Socket.io emission', () => {
    it('emits event to the correct channel room', async () => {
      const mockTo = vi.fn().mockReturnValue({ emit: vi.fn() })
      const mockIo = { to: mockTo } as unknown as Parameters<typeof createApp>[0]

      const app = createApp(mockIo)
      const res = await makeSignedRequest(app, validEvent)
      expect(res.status).toBe(201)

      expect(mockTo).toHaveBeenCalledWith('pipeline')
      expect(mockTo('pipeline').emit).toHaveBeenCalledWith(
        'notification',
        expect.objectContaining({
          channel: 'pipeline',
          type: 'build_complete',
          title: 'Build finished',
        }),
      )
    })

    it('does not throw when io is not provided', async () => {
      const app = createApp()
      const res = await makeSignedRequest(app, validEvent)
      expect(res.status).toBe(201)
    })
  })
})
