/**
 * Auth Routes Unit Tests
 *
 * Tests for /auth/* session management endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import authRoutes from '../routes'

// Mock @repo/api-core
vi.mock('@repo/api-core', () => ({
  verifyIdToken: vi.fn(),
}))

import { verifyIdToken } from '@repo/api-core'

const mockVerifyIdToken = vi.mocked(verifyIdToken)

describe('Auth Routes', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
    app.route('/auth', authRoutes)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /auth/session', () => {
    it('should create session with valid ID token', async () => {
      mockVerifyIdToken.mockResolvedValue({
        userId: 'test-user-123',
        email: 'test@example.com',
        username: 'testuser',
        groups: [],
      })

      const response = await app.request('/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'valid-id-token' }),
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.message).toBe('Session created')
      expect(body.user.userId).toBe('test-user-123')

      // Check cookie is set
      const setCookie = response.headers.get('set-cookie')
      expect(setCookie).toContain('auth_token=')
      expect(setCookie?.toLowerCase()).toContain('httponly')
      expect(setCookie?.toLowerCase()).toContain('samesite=strict')
    })

    it('should return 400 when idToken is missing', async () => {
      const response = await app.request('/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toBe('Bad Request')
      // Zod returns "Required" when field is absent
      expect(body.message).toBeDefined()
    })

    it('should return 400 when idToken is empty', async () => {
      const response = await app.request('/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: '' }),
      })

      expect(response.status).toBe(400)
    })

    it('should return 401 when idToken is invalid', async () => {
      mockVerifyIdToken.mockResolvedValue(null)

      const response = await app.request('/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'invalid-token' }),
      })

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
      expect(body.message).toBe('Invalid ID token')
    })
  })

  describe('POST /auth/refresh', () => {
    it('should refresh session with valid ID token', async () => {
      mockVerifyIdToken.mockResolvedValue({
        userId: 'test-user-123',
        email: 'test@example.com',
        username: 'testuser',
        groups: [],
      })

      const response = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'valid-id-token' }),
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.message).toBe('Session refreshed')

      // Check cookie is updated
      const setCookie = response.headers.get('set-cookie')
      expect(setCookie).toContain('auth_token=')
    })

    it('should return 401 when idToken is invalid', async () => {
      mockVerifyIdToken.mockResolvedValue(null)

      const response = await app.request('/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: 'invalid-token' }),
      })

      expect(response.status).toBe(401)
    })
  })

  describe('POST /auth/logout', () => {
    it('should clear session cookie', async () => {
      const response = await app.request('/auth/logout', {
        method: 'POST',
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.message).toBe('Session ended')

      // Check cookie is cleared (set-cookie with empty value or max-age=0)
      const setCookie = response.headers.get('set-cookie')
      expect(setCookie).toContain('auth_token=')
    })

    it('should succeed even without existing session', async () => {
      const response = await app.request('/auth/logout', {
        method: 'POST',
      })

      expect(response.status).toBe(200)
    })
  })

  describe('GET /auth/status', () => {
    it('should return authenticated=false when no cookie', async () => {
      const response = await app.request('/auth/status', {
        method: 'GET',
      })

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.authenticated).toBe(false)
    })

    it('should return authenticated=true with valid cookie', async () => {
      mockVerifyIdToken.mockResolvedValue({
        userId: 'test-user-123',
        email: 'test@example.com',
        username: 'testuser',
        groups: [],
      })

      const response = await app.request('/auth/status', {
        method: 'GET',
        headers: {
          Cookie: 'auth_token=valid-token',
        },
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.authenticated).toBe(true)
      expect(body.user.userId).toBe('test-user-123')
    })

    it('should return authenticated=false with invalid cookie', async () => {
      mockVerifyIdToken.mockResolvedValue(null)

      const response = await app.request('/auth/status', {
        method: 'GET',
        headers: {
          Cookie: 'auth_token=invalid-token',
        },
      })

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.authenticated).toBe(false)
      expect(body.reason).toBe('invalid_token')
    })
  })
})
