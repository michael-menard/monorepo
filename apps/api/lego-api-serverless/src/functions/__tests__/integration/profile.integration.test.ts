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

// Mock external dependencies
vi.mock('@/lib/auth/jwt-utils')

describe('Profile Lambda Handlers Integration - Story 4.1', () => {
  beforeEach(() => {
    process.env.STAGE = 'dev'
    process.env.AWS_REGION = 'us-east-1'
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Helper to create mock API Gateway event
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
      },
      pathParameters: pathParams,
    } as APIGatewayProxyEventV2
  }

  describe('GET /api/users/{id} - Profile Get Handler', () => {
    it('should return 401 when no userId in JWT', async () => {
      const jwtUtils = await import('@/lib/auth/jwt-utils')
      vi.mocked(jwtUtils.getUserIdFromEvent).mockReturnValue(null)

      const { handler } = await import('../../profile-get')
      const event = createMockEvent('GET', '/api/users/user-123', null, { id: 'user-123' })
      const result = await handler(event)

      expect(result.statusCode).toBe(401)
      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('UNAUTHORIZED')
    })

    it('should return 403 when userId does not match profile ID', async () => {
      const jwtUtils = await import('@/lib/auth/jwt-utils')
      vi.mocked(jwtUtils.getUserIdFromEvent).mockReturnValue('user-123')

      const { handler } = await import('../../profile-get')
      const event = createMockEvent('GET', '/api/users/user-456', 'user-123', { id: 'user-456' })
      const result = await handler(event)

      expect(result.statusCode).toBe(403)
      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('FORBIDDEN')
    })

    it('should return 501 when userId matches (placeholder for Story 4.2)', async () => {
      const jwtUtils = await import('@/lib/auth/jwt-utils')
      vi.mocked(jwtUtils.getUserIdFromEvent).mockReturnValue('user-123')

      const { handler } = await import('../../profile-get')
      const event = createMockEvent('GET', '/api/users/user-123', 'user-123', { id: 'user-123' })
      const result = await handler(event)

      expect(result.statusCode).toBe(501)
      const body = JSON.parse(result.body)
      expect(body.error.message).toContain('Story 4.2')
    })
  })

  describe('PATCH /api/users/{id} - Profile Update Handler', () => {
    it('should return 401 when no userId in JWT', async () => {
      const jwtUtils = await import('@/lib/auth/jwt-utils')
      vi.mocked(jwtUtils.getUserIdFromEvent).mockReturnValue(null)

      const { handler } = await import('../../profile-update')
      const event = createMockEvent('PATCH', '/api/users/user-123', null, { id: 'user-123' })
      const result = await handler(event)

      expect(result.statusCode).toBe(401)
      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('UNAUTHORIZED')
    })

    it('should return 403 when userId does not match profile ID', async () => {
      const jwtUtils = await import('@/lib/auth/jwt-utils')
      vi.mocked(jwtUtils.getUserIdFromEvent).mockReturnValue('user-123')

      const { handler } = await import('../../profile-update')
      const event = createMockEvent('PATCH', '/api/users/user-456', 'user-123', { id: 'user-456' })
      const result = await handler(event)

      expect(result.statusCode).toBe(403)
      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('FORBIDDEN')
    })

    it('should return 501 when userId matches (placeholder for Story 4.3)', async () => {
      const jwtUtils = await import('@/lib/auth/jwt-utils')
      vi.mocked(jwtUtils.getUserIdFromEvent).mockReturnValue('user-123')

      const { handler } = await import('../../profile-update')
      const event = createMockEvent('PATCH', '/api/users/user-123', 'user-123', { id: 'user-123' })
      const result = await handler(event)

      expect(result.statusCode).toBe(501)
      const body = JSON.parse(result.body)
      expect(body.error.message).toContain('Story 4.3')
    })
  })

  describe('POST /api/users/{id}/avatar - Avatar Upload Handler', () => {
    it('should return 401 when no userId in JWT', async () => {
      const jwtUtils = await import('@/lib/auth/jwt-utils')
      vi.mocked(jwtUtils.getUserIdFromEvent).mockReturnValue(null)

      const { handler } = await import('../../profile-avatar-upload')
      const event = createMockEvent('POST', '/api/users/user-123/avatar', null, {
        id: 'user-123',
      })
      const result = await handler(event)

      expect(result.statusCode).toBe(401)
      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('UNAUTHORIZED')
    })

    it('should return 403 when userId does not match profile ID', async () => {
      const jwtUtils = await import('@/lib/auth/jwt-utils')
      vi.mocked(jwtUtils.getUserIdFromEvent).mockReturnValue('user-123')

      const { handler } = await import('../../profile-avatar-upload')
      const event = createMockEvent('POST', '/api/users/user-456/avatar', 'user-123', {
        id: 'user-456',
      })
      const result = await handler(event)

      expect(result.statusCode).toBe(403)
      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('FORBIDDEN')
    })

    it('should return 501 when userId matches (placeholder for Story 4.4)', async () => {
      const jwtUtils = await import('@/lib/auth/jwt-utils')
      vi.mocked(jwtUtils.getUserIdFromEvent).mockReturnValue('user-123')

      const { handler } = await import('../../profile-avatar-upload')
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
      const jwtUtils = await import('@/lib/auth/jwt-utils')
      vi.mocked(jwtUtils.getUserIdFromEvent).mockReturnValue(null)

      const { handler } = await import('../../profile-avatar-delete')
      const event = createMockEvent('DELETE', '/api/users/user-123/avatar', null, {
        id: 'user-123',
      })
      const result = await handler(event)

      expect(result.statusCode).toBe(401)
      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('UNAUTHORIZED')
    })

    it('should return 403 when userId does not match profile ID', async () => {
      const jwtUtils = await import('@/lib/auth/jwt-utils')
      vi.mocked(jwtUtils.getUserIdFromEvent).mockReturnValue('user-123')

      const { handler } = await import('../../profile-avatar-delete')
      const event = createMockEvent('DELETE', '/api/users/user-456/avatar', 'user-123', {
        id: 'user-456',
      })
      const result = await handler(event)

      expect(result.statusCode).toBe(403)
      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('FORBIDDEN')
    })

    it('should return 501 when userId matches (placeholder for Story 4.5)', async () => {
      const jwtUtils = await import('@/lib/auth/jwt-utils')
      vi.mocked(jwtUtils.getUserIdFromEvent).mockReturnValue('user-123')

      const { handler } = await import('../../profile-avatar-delete')
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
      const jwtUtils = await import('@/lib/auth/jwt-utils')
      vi.mocked(jwtUtils.getUserIdFromEvent).mockReturnValue('user-123')

      const { handler } = await import('../../profile-get')
      const event = createMockEvent('GET', '/api/users/user-123', 'user-123', { id: 'user-123' })
      const result = await handler(event)

      expect(result.headers).toBeDefined()
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*')
      expect(result.headers['Access-Control-Allow-Credentials']).toBe(true)
    })

    it('should return valid JSON in all responses', async () => {
      const jwtUtils = await import('@/lib/auth/jwt-utils')
      vi.mocked(jwtUtils.getUserIdFromEvent).mockReturnValue('user-123')

      const { handler } = await import('../../profile-get')
      const event = createMockEvent('GET', '/api/users/user-123', 'user-123', { id: 'user-123' })
      const result = await handler(event)

      expect(() => JSON.parse(result.body)).not.toThrow()
      const body = JSON.parse(result.body)
      expect(body).toHaveProperty('success')
      expect(typeof body.success).toBe('boolean')
    })
  })
})
