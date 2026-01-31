import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import { auth, optionalAuth } from '../auth.js'

// Mock @repo/api-core
vi.mock('@repo/api-core', () => ({
  verifyToken: vi.fn(),
  isAuthBypassEnabled: vi.fn().mockReturnValue(false),
}))

import { verifyToken, isAuthBypassEnabled } from '@repo/api-core'

/**
 * Auth Middleware Unit Tests
 *
 * Tests for JWT validation, token extraction, and error handling.
 * Covers AC17 (10+ middleware tests) and AC22 (malformed header edge cases).
 */
describe('Auth Middleware', () => {
  let app: Hono
  const mockVerifyToken = vi.mocked(verifyToken)
  const mockIsAuthBypassEnabled = vi.mocked(isAuthBypassEnabled)

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAuthBypassEnabled.mockReturnValue(false)

    app = new Hono()
    app.use('/protected/*', auth)
    app.get('/protected/resource', c => {
      const userId = c.get('userId')
      const user = c.get('user')
      return c.json({ userId, user })
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // Test 1: Valid JWT token extracts userId from sub claim
  it('extracts userId from valid JWT token sub claim', async () => {
    mockVerifyToken.mockResolvedValue({
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      groups: ['users'],
    })

    const res = await app.request('/protected/resource', {
      headers: { Authorization: 'Bearer valid-jwt-token' },
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { userId: string; user: { email: string } }
    expect(body.userId).toBe('user-123')
    expect(body.user.email).toBe('test@example.com')
  })

  // Test 2: Expired JWT token returns 401
  it('returns 401 for expired JWT token', async () => {
    mockVerifyToken.mockResolvedValue(null)

    const res = await app.request('/protected/resource', {
      headers: { Authorization: 'Bearer expired-token' },
    })

    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string; message: string }
    expect(body.error).toBe('Unauthorized')
    expect(body.message).toBe('Invalid or expired token')
  })

  // Test 3: Invalid JWT signature returns 401
  it('returns 401 for invalid JWT signature', async () => {
    mockVerifyToken.mockResolvedValue(null)

    const res = await app.request('/protected/resource', {
      headers: { Authorization: 'Bearer invalid-signature-token' },
    })

    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Unauthorized')
  })

  // Test 4: Missing Authorization header returns 401
  it('returns 401 when Authorization header is missing', async () => {
    const res = await app.request('/protected/resource')

    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string; message: string }
    expect(body.error).toBe('Unauthorized')
    expect(body.message).toBe('Missing Authorization header')
  })

  // Test 5: Malformed JWT token returns 401
  it('returns 401 for malformed JWT token', async () => {
    mockVerifyToken.mockResolvedValue(null)

    const res = await app.request('/protected/resource', {
      headers: { Authorization: 'Bearer not.a.valid.jwt.format' },
    })

    expect(res.status).toBe(401)
    const body = (await res.json()) as { error: string }
    expect(body.error).toBe('Unauthorized')
  })

  // Test 6: Empty token string returns 401
  it('returns 401 for empty token string', async () => {
    mockVerifyToken.mockResolvedValue(null)

    const res = await app.request('/protected/resource', {
      headers: { Authorization: 'Bearer ' },
    })

    expect(res.status).toBe(401)
  })

  // Test 7: Middleware attaches userId to request context
  it('attaches userId to request context on success', async () => {
    mockVerifyToken.mockResolvedValue({
      userId: 'context-test-user',
      email: 'context@test.com',
    })

    const res = await app.request('/protected/resource', {
      headers: { Authorization: 'Bearer valid-token' },
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { userId: string }
    expect(body.userId).toBe('context-test-user')
  })

  // Test 8: Middleware calls next() on successful validation
  it('calls next() on successful token validation', async () => {
    mockVerifyToken.mockResolvedValue({
      userId: 'next-test-user',
    })

    const res = await app.request('/protected/resource', {
      headers: { Authorization: 'Bearer valid-token' },
    })

    // If next() was called, we should get the route response
    expect(res.status).toBe(200)
    expect(mockVerifyToken).toHaveBeenCalledTimes(1)
  })

  // Test 9: Middleware short-circuits on failure (doesn't call next)
  it('short-circuits and returns 401 without calling route handler on failure', async () => {
    mockVerifyToken.mockResolvedValue(null)
    let routeHandlerCalled = false

    const testApp = new Hono()
    testApp.use('/test/*', auth)
    testApp.get('/test/resource', c => {
      routeHandlerCalled = true
      return c.json({ success: true })
    })

    const res = await testApp.request('/test/resource', {
      headers: { Authorization: 'Bearer invalid-token' },
    })

    expect(res.status).toBe(401)
    expect(routeHandlerCalled).toBe(false)
  })

  // Test 10: verifyToken receives the full Authorization header
  it('passes full Authorization header to verifyToken', async () => {
    mockVerifyToken.mockResolvedValue({
      userId: 'verify-test-user',
    })

    await app.request('/protected/resource', {
      headers: { Authorization: 'Bearer my-special-token' },
    })

    expect(mockVerifyToken).toHaveBeenCalledWith('Bearer my-special-token')
  })

  // Test 11 (AC22): Authorization header missing "Bearer " prefix returns 401
  it('returns 401 when Authorization header is missing Bearer prefix', async () => {
    // verifyToken in @repo/api-core strips "Bearer " prefix before validation
    // When token is passed without prefix, it should still work if valid
    // But the auth.ts middleware passes the raw header to verifyToken
    mockVerifyToken.mockResolvedValue(null)

    const res = await app.request('/protected/resource', {
      headers: { Authorization: 'just-a-token-no-bearer' },
    })

    expect(res.status).toBe(401)
    expect(mockVerifyToken).toHaveBeenCalledWith('just-a-token-no-bearer')
  })

  // Test 12 (AC22): Authorization header with extra whitespace
  it('handles Authorization header with extra whitespace correctly', async () => {
    // The verifyToken function uses regex /^Bearer\s+/i to strip prefix
    // So "Bearer  token" (extra space) should still work
    mockVerifyToken.mockResolvedValue({
      userId: 'whitespace-test-user',
    })

    const res = await app.request('/protected/resource', {
      headers: { Authorization: 'Bearer  extra-space-token' },
    })

    // verifyToken should be called with the header as-is
    expect(mockVerifyToken).toHaveBeenCalledWith('Bearer  extra-space-token')
    // If verifyToken handles it correctly, we get 200
    expect(res.status).toBe(200)
  })
})

describe('Auth Bypass (Development Mode)', () => {
  let app: Hono
  const mockIsAuthBypassEnabled = vi.mocked(isAuthBypassEnabled)

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAuthBypassEnabled.mockReturnValue(true)

    app = new Hono()
    app.use('/protected/*', auth)
    app.get('/protected/resource', c => {
      const userId = c.get('userId')
      const user = c.get('user')
      return c.json({ userId, user })
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // Test: Auth bypass allows access without token
  it('allows access without token when AUTH_BYPASS is enabled', async () => {
    const res = await app.request('/protected/resource')

    expect(res.status).toBe(200)
    const body = (await res.json()) as { userId: string; user: { email: string } }
    expect(body.userId).toBe('dev-user')
    expect(body.user.email).toBe('dev@localhost')
  })

  // Test: Auth bypass sets dev user in context
  it('sets dev user in context when AUTH_BYPASS is enabled', async () => {
    const res = await app.request('/protected/resource')

    expect(res.status).toBe(200)
    const body = (await res.json()) as { user: { username: string; groups: string[] } }
    expect(body.user.username).toBe('dev-user')
    expect(body.user.groups).toContain('dev')
  })
})

describe('Optional Auth Middleware', () => {
  let app: Hono
  const mockVerifyToken = vi.mocked(verifyToken)
  const mockIsAuthBypassEnabled = vi.mocked(isAuthBypassEnabled)

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsAuthBypassEnabled.mockReturnValue(false)

    app = new Hono()
    app.use('/optional/*', optionalAuth)
    app.get('/optional/resource', c => {
      const userId = c.get('userId')
      return c.json({ userId: userId || 'anonymous' })
    })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // Test: Optional auth allows access without token
  it('allows access without token (anonymous)', async () => {
    const res = await app.request('/optional/resource')

    expect(res.status).toBe(200)
    const body = (await res.json()) as { userId: string }
    expect(body.userId).toBe('anonymous')
  })

  // Test: Optional auth sets user when valid token provided
  it('sets user in context when valid token is provided', async () => {
    mockVerifyToken.mockResolvedValue({
      userId: 'optional-user-123',
    })

    const res = await app.request('/optional/resource', {
      headers: { Authorization: 'Bearer valid-token' },
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { userId: string }
    expect(body.userId).toBe('optional-user-123')
  })

  // Test: Optional auth allows access with invalid token (doesn't set user)
  it('allows access but does not set user for invalid token', async () => {
    mockVerifyToken.mockResolvedValue(null)

    const res = await app.request('/optional/resource', {
      headers: { Authorization: 'Bearer invalid-token' },
    })

    expect(res.status).toBe(200)
    const body = (await res.json()) as { userId: string }
    expect(body.userId).toBe('anonymous')
  })
})
