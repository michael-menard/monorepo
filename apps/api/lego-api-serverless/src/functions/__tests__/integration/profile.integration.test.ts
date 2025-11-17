/**
 * Profile Lambda Handlers Integration Tests
 *
 * Tests the 4 separate profile Lambda handlers with mocked dependencies.
 * Verifies authorization and response format for each endpoint.
 *
 * Story 4.1: Infrastructure tests for profile handler setup
 * - Tests authorization (userId must match route parameter)
 * - Tests 501 responses (full implementation in future stories)
 * - Tests error handling and response format
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { APIGatewayProxyEventV2 } from 'aws-lambda'

// Mock all external dependencies before importing
vi.mock('@/lib/services/profile-service', () => ({
  getUserProfile: vi.fn(),
}))

vi.mock('@/lib/middleware/rate-limiter', () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 59,
    resetAt: new Date(),
  }),
  RATE_LIMIT_CONFIGS: {
    profile: {
      maxRequests: 60,
      windowSeconds: 60,
      keyPrefix: 'ratelimit:profile',
    },
  },
}))

describe('Profile Lambda Handlers Integration - Story 4.1', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development'
    process.env.STAGE = 'dev'
    process.env.AWS_REGION = 'us-east-1'
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Helper to create mock API Gateway event with JWT claims structure
   */
  function createMockEvent(
    method: string,
    path: string,
    userId: string | null,
    pathParams?: Record<string, string>,
  ): APIGatewayProxyEventV2 {
    return {
      requestContext: {
        http: { method, path },
        requestId: 'test-request-id',
        authorizer: userId
          ? {
              jwt: {
                claims: {
                  sub: userId,
                  iss: 'https://cognito-idp.us-east-1.amazonaws.com/test-pool',
                  exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
                },
              },
            }
          : undefined,
      },
      pathParameters: pathParams,
    } as any
  }

  describe('GET /api/users/{id} - Profile Get Handler', () => {
    it('should return 401 when no userId in JWT', async () => {
      const { handler } = await import('../../../../profile/getProfile/index')
      const event = createMockEvent('GET', '/api/users/user-123', null, { id: 'user-123' })
      const result = await handler(event)

      expect(result.statusCode).toBe(401)
      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('UNAUTHORIZED')
    })

    it('should return 403 when userId does not match profile ID', async () => {
      const { handler } = await import('../../../../profile/getProfile/index')
      const event = createMockEvent('GET', '/api/users/user-456', 'user-123', { id: 'user-456' })
      const result = await handler(event)

      expect(result.statusCode).toBe(403)
      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('FORBIDDEN')
    })

    it('should successfully retrieve profile when userId matches (Story 4.2)', async () => {
      const { getUserProfile } = await import('@/lib/services/profile-service')

      // Mock successful profile retrieval
      vi.mocked(getUserProfile).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        stats: {
          mocs: 5,
          images: 10,
          wishlistItems: 3,
        },
      })

      const { handler } = await import('../../../../profile/getProfile/index')
      const event = createMockEvent('GET', '/api/users/user-123', 'user-123', { id: 'user-123' })
      const result = await handler(event)

      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.data).toBeDefined()
      expect(body.data.id).toBe('user-123')
      expect(body.data.email).toBe('test@example.com')
      expect(body.data.stats).toEqual({
        mocs: 5,
        images: 10,
        wishlistItems: 3,
      })
    })

    it('should return 404 when user not found in Cognito (Story 4.2)', async () => {
      const { getUserProfile } = await import('@/lib/services/profile-service')

      // Mock user not found error
      vi.mocked(getUserProfile).mockRejectedValue(new Error('User not found in Cognito'))

      const { handler } = await import('../../../../profile/getProfile/index')
      const event = createMockEvent('GET', '/api/users/user-123', 'user-123', { id: 'user-123' })
      const result = await handler(event)

      expect(result.statusCode).toBe(404)
      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('NOT_FOUND')
      expect(body.error.message).toBe('User not found')
    })
  })

  describe('PATCH /api/users/{id} - Profile Update Handler', () => {
    it('should return 401 when no userId in JWT', async () => {
      const { handler } = await import('../../../../profile/updateProfile/index')
      const event = createMockEvent('PATCH', '/api/users/user-123', null, { id: 'user-123' })
      const result = await handler(event)

      expect(result.statusCode).toBe(401)
      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('UNAUTHORIZED')
    })

    it('should return 403 when userId does not match profile ID', async () => {
      const { handler } = await import('../../../../profile/updateProfile/index')
      const event = createMockEvent('PATCH', '/api/users/user-456', 'user-123', { id: 'user-456' })
      const result = await handler(event)

      expect(result.statusCode).toBe(403)
      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('FORBIDDEN')
    })

    it('should return 501 when userId matches (placeholder for Story 4.3)', async () => {
      const { handler } = await import('../../../../profile/updateProfile/index')
      const event = createMockEvent('PATCH', '/api/users/user-123', 'user-123', { id: 'user-123' })
      const result = await handler(event)

      expect(result.statusCode).toBe(501)
      const body = JSON.parse(result.body)
      expect(body.error.message).toContain('Story 4.3')
    })
  })

  describe('POST /api/users/{id}/avatar - Avatar Upload Handler', () => {
    it('should return 401 when no userId in JWT', async () => {
      const { handler } = await import('../../../../profile/avatarUpload/index')
      const event = createMockEvent('POST', '/api/users/user-123/avatar', null, {
        id: 'user-123',
      })
      const result = await handler(event)

      expect(result.statusCode).toBe(401)
      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('UNAUTHORIZED')
    })

    it('should return 403 when userId does not match profile ID', async () => {
      const { handler } = await import('../../../../profile/avatarUpload/index')
      const event = createMockEvent('POST', '/api/users/user-456/avatar', 'user-123', {
        id: 'user-456',
      })
      const result = await handler(event)

      expect(result.statusCode).toBe(403)
      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('FORBIDDEN')
    })

    it('should return 501 when userId matches (placeholder for Story 4.4)', async () => {
      const { handler } = await import('../../../../profile/avatarUpload/index')
      const event = createMockEvent('POST', '/api/users/user-123/avatar', 'user-123', {
        id: 'user-123',
      })
      const result = await handler(event)

      expect(result.statusCode).toBe(501)
      const body = JSON.parse(result.body)
      expect(body.error.message).toContain('Story 4.4')
    })
  })

  describe('DELETE /api/users/{id}/avatar - Avatar Delete Handler', () => {
    it('should return 401 when no userId in JWT', async () => {
      const { handler } = await import('../../../../profile/avatarDelete/index')
      const event = createMockEvent('DELETE', '/api/users/user-123/avatar', null, {
        id: 'user-123',
      })
      const result = await handler(event)

      expect(result.statusCode).toBe(401)
      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('UNAUTHORIZED')
    })

    it('should return 403 when userId does not match profile ID', async () => {
      const { handler } = await import('../../../../profile/avatarDelete/index')
      const event = createMockEvent('DELETE', '/api/users/user-456/avatar', 'user-123', {
        id: 'user-456',
      })
      const result = await handler(event)

      expect(result.statusCode).toBe(403)
      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('FORBIDDEN')
    })

    it('should return 501 when userId matches (placeholder for Story 4.5)', async () => {
      const { handler } = await import('../../../../profile/avatarDelete/index')
      const event = createMockEvent('DELETE', '/api/users/user-123/avatar', 'user-123', {
        id: 'user-123',
      })
      const result = await handler(event)

      expect(result.statusCode).toBe(501)
      const body = JSON.parse(result.body)
      expect(body.error.message).toContain('Story 4.5')
    })
  })

  describe('Response Format', () => {
    it('should include CORS headers in all responses', async () => {
      const { handler } = await import('../../../../profile/getProfile/index')
      const event = createMockEvent('GET', '/api/users/user-123', 'user-123', { id: 'user-123' })
      const result = await handler(event)

      expect(result.headers).toBeDefined()
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*')
      expect(result.headers['Access-Control-Allow-Credentials']).toBe(true)
    })

    it('should return valid JSON in all responses', async () => {
      const { handler } = await import('../../../../profile/getProfile/index')
      const event = createMockEvent('GET', '/api/users/user-123', 'user-123', { id: 'user-123' })
      const result = await handler(event)

      expect(() => JSON.parse(result.body)).not.toThrow()
      const body = JSON.parse(result.body)
      expect(body).toHaveProperty('success')
      expect(typeof body.success).toBe('boolean')
    })
  })
})
