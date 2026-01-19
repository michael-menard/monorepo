/**
 * Create Upload Session Handler Tests
 *
 * Story 3.1.27: Deploy Multipart Upload Session Endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../handler'
import {
  createMockEvent,
  createUnauthorizedEvent,
  validRequests,
} from '../../_shared/__tests__/fixtures'

// Mock dependencies
vi.mock('@/core/database/client', () => ({
  getDbAsync: vi.fn(() =>
    Promise.resolve({
      insert: vi.fn(() => ({
        values: vi.fn(() => Promise.resolve()),
      })),
    }),
  ),
}))

vi.mock('@repo/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    checkLimit: vi.fn(() =>
      Promise.resolve({ allowed: true, currentCount: 1, retryAfterSeconds: 0, nextAllowedAt: new Date() }),
    ),
  })),
  generateDailyKey: vi.fn(() => 'mock-rate-limit-key'),
  RATE_LIMIT_WINDOWS: { DAY: 86400000 },
}))

vi.mock('@/core/rate-limit/postgres-store', () => ({
  createPostgresRateLimitStore: vi.fn(() => ({})),
}))

vi.mock('@/core/config/upload', () => ({
  getUploadConfig: vi.fn(() => ({
    pdfMaxBytes: 50 * 1024 * 1024,
    pdfMaxMb: 50,
    imageMaxBytes: 10 * 1024 * 1024,
    imageMaxMb: 10,
    partsListMaxBytes: 5 * 1024 * 1024,
    partsListMaxMb: 5,
    partsListMaxCount: 5,
    imageMaxCount: 20,
    rateLimitPerDay: 100,
    sessionTtlSeconds: 900,
  })),
  isMimeTypeAllowed: vi.fn(() => true),
  getAllowedMimeTypes: vi.fn(() => ['application/pdf']),
}))

vi.mock('@/core/observability/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

describe('create-upload-session handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication', () => {
    it('returns 401 when unauthenticated', async () => {
      const event = createUnauthorizedEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions',
        body: validRequests.createSession,
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(401)

      const body = JSON.parse(response.body)
      expect(body.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('Request Validation', () => {
    it('returns 400 when body is missing', async () => {
      const event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions',
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(400)
    })

    it('returns 400 when body is invalid JSON', async () => {
      const event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions',
        body: 'not-json',
      })
      // Override body to be invalid JSON string
      ;(event as any).body = 'not-json'

      const response = await handler(event as any)
      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.error.message).toContain('Invalid JSON')
    })

    it('returns 422 when files array is empty', async () => {
      const event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions',
        body: { files: [] },
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(422) // ValidationError
    })

    it('returns 400 when no instruction file provided', async () => {
      const event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions',
        body: {
          files: [{ category: 'image', name: 'photo.jpg', size: 1024, type: 'image/jpeg', ext: 'jpg' }],
        },
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(400)

      const body = JSON.parse(response.body)
      expect(body.error.message).toContain('instruction file')
    })
  })

  describe('Rate Limiting', () => {
    it('returns 429 when rate limit exceeded', async () => {
      const { createRateLimiter } = await import('@repo/rate-limit')
      vi.mocked(createRateLimiter).mockReturnValueOnce({
        checkLimit: vi.fn(() =>
          Promise.resolve({
            allowed: false,
            currentCount: 100,
            nextAllowedAt: new Date(Date.now() + 86400000),
            retryAfterSeconds: 86400,
          }),
        ),
      } as any)

      const event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions',
        body: validRequests.createSession,
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(429)

      const body = JSON.parse(response.body)
      expect(body.error.code).toBe('TOO_MANY_REQUESTS')
    })
  })

  describe('Success Cases', () => {
    it('returns 201 with session data on success', async () => {
      const event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/uploads/sessions',
        body: validRequests.createSession,
      })

      const response = await handler(event as any)
      expect(response.statusCode).toBe(201)

      const body = JSON.parse(response.body)
      // Response structure: { data: { sessionId, partSizeBytes, expiresAt } }
      expect(body.data.data).toHaveProperty('sessionId')
      expect(body.data.data).toHaveProperty('partSizeBytes')
      expect(body.data.data).toHaveProperty('expiresAt')
      expect(body.data.data.partSizeBytes).toBe(5 * 1024 * 1024)
    })
  })
})

