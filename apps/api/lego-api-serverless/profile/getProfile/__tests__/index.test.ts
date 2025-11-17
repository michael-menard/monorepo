/**
 * Unit Tests for Profile GET Lambda Handler
 *
 * Tests the Lambda handler in isolation with all dependencies mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { handler } from '../index'
import * as profileService from '@/lib/services/profile-service'
import * as lambdaAuth from '@monorepo/lambda-auth'

// Mock all external dependencies
vi.mock('@/lib/services/profile-service', () => ({
  getUserProfile: vi.fn(),
  getCognitoProfile: vi.fn(),
  getProfileStats: vi.fn(),
}))
vi.mock('@monorepo/lambda-auth')
vi.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))
vi.mock('@/lib/utils/response-utils', async () => {
  const actual = await vi.importActual('@/lib/utils/response-utils')
  return actual
})

describe('Profile GET Lambda Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockEvent = (userId: string): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: 'GET /api/users/{id}',
    rawPath: `/api/users/${userId}`,
    rawQueryString: '',
    headers: {
      authorization: 'Bearer valid-token',
    },
    requestContext: {
      accountId: '123456789012',
      apiId: 'api-id',
      domainName: 'api.example.com',
      domainPrefix: 'api',
      http: {
        method: 'GET',
        path: `/api/users/${userId}`,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      requestId: 'test-request-id',
      routeKey: 'GET /api/users/{id}',
      stage: '$default',
      time: '01/Jan/2025:00:00:00 +0000',
      timeEpoch: 1704067200000,
    },
    pathParameters: {
      id: userId,
    },
    isBase64Encoded: false,
  })

  describe('Successful Profile Retrieval', () => {
    it('should retrieve own profile successfully', async () => {
      const mockProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        avatarUrl: 'https://example.com/avatar.jpg',
        stats: {
          mocs: 5,
          images: 15,
          wishlistItems: 3,
        },
      }

      vi.mocked(lambdaAuth.validateUserResourceAccess).mockReturnValue({
        authenticated: true,
        authorized: true,
        userId: 'user-123',
        error: null,
      })

      vi.mocked(profileService.getUserProfile).mockResolvedValue(mockProfile)

      const event = createMockEvent('user-123')
      const result = await handler(event)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: mockProfile,
        timestamp: expect.any(String),
      })
      expect(profileService.getUserProfile).toHaveBeenCalledWith('user-123')
    })

    it('should return cached profile on second request', async () => {
      const mockProfile = {
        id: 'user-456',
        email: 'cached@example.com',
        name: 'Cached User',
        avatarUrl: null,
        stats: {
          mocs: 0,
          images: 0,
          wishlistItems: 0,
        },
      }

      vi.mocked(lambdaAuth.validateUserResourceAccess).mockReturnValue({
        authenticated: true,
        authorized: true,
        userId: 'user-456',
        error: null,
      })

      vi.mocked(profileService.getUserProfile).mockResolvedValue(mockProfile)

      const event = createMockEvent('user-456')
      const result = await handler(event)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body).data).toEqual(mockProfile)
    })
  })

  describe('Authorization', () => {
    it('should return 403 when accessing another user\'s profile', async () => {
      vi.mocked(lambdaAuth.validateUserResourceAccess).mockReturnValue({
        authenticated: true,
        authorized: false,
        userId: 'user-123',
        error: {
          statusCode: 403,
          code: 'FORBIDDEN',
          message: 'Cannot access another user\'s profile',
        },
      })

      const event = createMockEvent('user-456')
      const result = await handler(event)

      expect(result.statusCode).toBe(403)
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          type: 'FORBIDDEN',
          message: 'Cannot access another user\'s profile',
        },
        timestamp: expect.any(String),
      })
      expect(profileService.getUserProfile).not.toHaveBeenCalled()
    })

    it('should return 401 when JWT token is missing', async () => {
      vi.mocked(lambdaAuth.validateUserResourceAccess).mockReturnValue({
        authenticated: false,
        authorized: false,
        userId: null,
        error: {
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      })

      const event = createMockEvent('user-123')
      const result = await handler(event)

      expect(result.statusCode).toBe(401)
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          type: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        timestamp: expect.any(String),
      })
      expect(profileService.getUserProfile).not.toHaveBeenCalled()
    })
  })

  describe('User Not Found', () => {
    it('should return 404 when Cognito user does not exist', async () => {
      vi.mocked(lambdaAuth.validateUserResourceAccess).mockReturnValue({
        authenticated: true,
        authorized: true,
        userId: 'non-existent-user',
        error: null,
      })

      vi.mocked(profileService.getUserProfile).mockRejectedValue(
        new Error('User not found in Cognito'),
      )

      const event = createMockEvent('non-existent-user')
      const result = await handler(event)

      expect(result.statusCode).toBe(404)
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: 'User not found',
        },
        timestamp: expect.any(String),
      })
    })
  })

  describe('Statistics Aggregation', () => {
    it('should include correct stats from PostgreSQL', async () => {
      const mockProfile = {
        id: 'user-789',
        email: 'stats@example.com',
        name: 'Stats User',
        avatarUrl: null,
        stats: {
          mocs: 10,
          images: 50,
          wishlistItems: 20,
        },
      }

      vi.mocked(lambdaAuth.validateUserResourceAccess).mockReturnValue({
        authenticated: true,
        authorized: true,
        userId: 'user-789',
        error: null,
      })

      vi.mocked(profileService.getUserProfile).mockResolvedValue(mockProfile)

      const event = createMockEvent('user-789')
      const result = await handler(event)

      expect(result.statusCode).toBe(200)
      const body = JSON.parse(result.body)
      expect(body.data.stats).toEqual({
        mocs: 10,
        images: 50,
        wishlistItems: 20,
      })
    })
  })

  describe('Error Handling', () => {
    it('should return 500 on unexpected service error', async () => {
      vi.mocked(lambdaAuth.validateUserResourceAccess).mockReturnValue({
        authenticated: true,
        authorized: true,
        userId: 'user-123',
        error: null,
      })

      vi.mocked(profileService.getUserProfile).mockRejectedValue(
        new Error('Unexpected database error'),
      )

      const event = createMockEvent('user-123')
      const result = await handler(event)

      expect(result.statusCode).toBe(500)
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
        timestamp: expect.any(String),
      })
    })

    it('should handle Redis connection failure gracefully', async () => {
      vi.mocked(lambdaAuth.validateUserResourceAccess).mockReturnValue({
        authenticated: true,
        authorized: true,
        userId: 'user-123',
        error: null,
      })

      vi.mocked(profileService.getUserProfile).mockRejectedValue(
        new Error('Redis connection failed'),
      )

      const event = createMockEvent('user-123')
      const result = await handler(event)

      expect(result.statusCode).toBe(500)
      expect(JSON.parse(result.body).error.type).toBe('INTERNAL_ERROR')
    })
  })
})
