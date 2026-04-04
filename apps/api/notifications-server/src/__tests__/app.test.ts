import { describe, it, expect } from 'vitest'
import { createApp } from '../app'

describe('notifications-server', () => {
  const app = createApp()

  describe('GET /health', () => {
    it('returns status ok and uptime', async () => {
      const res = await app.request('/health')
      expect(res.status).toBe(200)

      const body = (await res.json()) as Record<string, unknown>
      expect(body.status).toBe('ok')
      expect(typeof body.uptime).toBe('number')
      expect(body.uptime as number).toBeGreaterThanOrEqual(0)
    })
  })

  describe('GET /', () => {
    it('returns service info', async () => {
      const res = await app.request('/')
      expect(res.status).toBe(200)

      const body = (await res.json()) as Record<string, unknown>
      expect(body.message).toBe('Notifications Server')
    })
  })
})
