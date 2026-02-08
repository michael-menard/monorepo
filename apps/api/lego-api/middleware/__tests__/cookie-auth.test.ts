/**
 * Cookie Auth Middleware Unit Tests
 *
 * Tests for cookie-based authentication middleware with header fallback.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { cookieAuth, optionalCookieAuth, AUTH_COOKIE_NAME } from '../cookie-auth'

// Mock @repo/api-core
vi.mock('@repo/api-core', () => ({
  verifyIdToken: vi.fn(),
  verifyToken: vi.fn(),
  isAuthBypassEnabled: vi.fn(() => false),
}))

import { verifyIdToken, verifyToken, isAuthBypassEnabled } from '@repo/api-core'

const mockVerifyIdToken = vi.mocked(verifyIdToken)
const mockVerifyToken = vi.mocked(verifyToken)
const mockIsAuthBypassEnabled = vi.mocked(isAuthBypassEnabled)

describe('Cookie Auth Middleware', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('cookieAuth', () => {
    beforeEach(() => {
      app.use('/protected/*', cookieAuth)
      app.get('/protected/resource', c => c.json({ userId: c.get('userId') }))
    })

    it('should allow request with valid cookie', async () => {
      mockVerifyIdToken.mockResolvedValue({
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        groups: [],
      })

      const response = await app.request('/protected/resource', {
        method: 'GET',
        headers: {
          Cookie: `${AUTH_COOKIE_NAME}=valid-token`,
        },
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.userId).toBe('user-123')
    })

    it('should reject request with invalid cookie', async () => {
      mockVerifyIdToken.mockResolvedValue(null)

      const response = await app.request('/protected/resource', {
        method: 'GET',
        headers: {
          Cookie: `${AUTH_COOKIE_NAME}=invalid-token`,
        },
      })

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error).toBe('Unauthorized')
      expect(body.message).toBe('Invalid or expired session')
    })

    it('should fallback to Authorization header when no cookie', async () => {
      mockVerifyToken.mockResolvedValue({
        userId: 'user-456',
        email: 'test@example.com',
        username: 'testuser',
        groups: [],
      })

      const response = await app.request('/protected/resource', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-access-token',
        },
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.userId).toBe('user-456')
    })

    it('should reject when header token is invalid', async () => {
      mockVerifyToken.mockResolvedValue(null)

      const response = await app.request('/protected/resource', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer invalid-token',
        },
      })

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.message).toBe('Invalid or expired token')
    })

    it('should reject when no auth provided', async () => {
      const response = await app.request('/protected/resource', {
        method: 'GET',
      })

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.message).toBe('Authentication required')
    })

    it('should prefer cookie over Authorization header', async () => {
      mockVerifyIdToken.mockResolvedValue({
        userId: 'cookie-user',
        email: 'cookie@example.com',
        username: 'cookieuser',
        groups: [],
      })

      // This should not be called if cookie is valid
      mockVerifyToken.mockResolvedValue({
        userId: 'header-user',
        email: 'header@example.com',
        username: 'headeruser',
        groups: [],
      })

      const response = await app.request('/protected/resource', {
        method: 'GET',
        headers: {
          Cookie: `${AUTH_COOKIE_NAME}=cookie-token`,
          Authorization: 'Bearer header-token',
        },
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.userId).toBe('cookie-user')
      expect(mockVerifyToken).not.toHaveBeenCalled()
    })

    it('should bypass auth in development when AUTH_BYPASS is enabled', async () => {
      mockIsAuthBypassEnabled.mockReturnValue(true)

      const response = await app.request('/protected/resource', {
        method: 'GET',
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.userId).toBe('dev-user')
    })
  })

  describe('optionalCookieAuth', () => {
    beforeEach(() => {
      app.use('/optional/*', optionalCookieAuth)
      app.get('/optional/resource', c => {
        const userId = c.get('userId')
        return c.json({ userId: userId || 'anonymous' })
      })
    })

    it('should allow request without auth', async () => {
      const response = await app.request('/optional/resource', {
        method: 'GET',
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.userId).toBe('anonymous')
    })

    it('should set user when valid cookie provided', async () => {
      mockVerifyIdToken.mockResolvedValue({
        userId: 'user-789',
        email: 'test@example.com',
        username: 'testuser',
        groups: [],
      })

      const response = await app.request('/optional/resource', {
        method: 'GET',
        headers: {
          Cookie: `${AUTH_COOKIE_NAME}=valid-token`,
        },
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.userId).toBe('user-789')
    })

    it('should allow request even with invalid cookie', async () => {
      mockVerifyIdToken.mockResolvedValue(null)

      const response = await app.request('/optional/resource', {
        method: 'GET',
        headers: {
          Cookie: `${AUTH_COOKIE_NAME}=invalid-token`,
        },
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.userId).toBe('anonymous')
    })

    it('should fallback to Authorization header', async () => {
      mockVerifyToken.mockResolvedValue({
        userId: 'header-user',
        email: 'test@example.com',
        username: 'testuser',
        groups: [],
      })

      const response = await app.request('/optional/resource', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      })

      expect(response.status).toBe(200)
      const body = await response.json()
      expect(body.userId).toBe('header-user')
    })
  })
})
