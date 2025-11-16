/**
 * Unit Tests for Profile UPDATE Lambda Handler
 *
 * Tests the Lambda handler in isolation with all dependencies mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { handler } from '../profile-update'
import * as profileService from '@/lib/services/profile-service'
import * as lambdaAuth from '@monorepo/lambda-auth'

// Mock all external dependencies
vi.mock('@/lib/services/profile-service', () => ({
  updateUserProfile: vi.fn(),
  getUserProfile: vi.fn(),
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

describe('Profile UPDATE Lambda Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const createMockEvent = (userId: string, body: Record<string, unknown>): APIGatewayProxyEventV2 => ({
    version: '2.0',
    routeKey: 'PATCH /api/users/{id}',
    rawPath: `/api/users/${userId}`,
    rawQueryString: '',
    headers: {
      authorization: 'Bearer valid-token',
      'content-type': 'application/json',
    },
    requestContext: {
      accountId: '123456789012',
      apiId: 'api-id',
      domainName: 'api.example.com',
      domainPrefix: 'api',
      http: {
        method: 'PATCH',
        path: `/api/users/${userId}`,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      requestId: 'test-request-id',
      routeKey: 'PATCH /api/users/{id}',
      stage: '$default',
      time: '01/Jan/2025:00:00:00 +0000',
      timeEpoch: 1704067200000,
    },
    pathParameters: {
      id: userId,
    },
    body: JSON.stringify(body),
    isBase64Encoded: false,
  })

  describe('Successful Profile Update', () => {
    it('should update profile name successfully', async () => {
      const mockUpdatedProfile = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Updated Name',
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

      vi.mocked(profileService.updateUserProfile).mockResolvedValue(mockUpdatedProfile)

      const event = createMockEvent('user-123', { name: 'Updated Name' })
      const result = await handler(event)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        data: mockUpdatedProfile,
        timestamp: expect.any(String),
      })
      expect(profileService.updateUserProfile).toHaveBeenCalledWith('user-123', {
        name: 'Updated Name',
      })
    })

    it('should update profile with name containing numbers and spaces', async () => {
      const mockUpdatedProfile = {
        id: 'user-456',
        email: 'test2@example.com',
        name: 'Jane Smith 123',
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

      vi.mocked(profileService.updateUserProfile).mockResolvedValue(mockUpdatedProfile)

      const event = createMockEvent('user-456', { name: 'Jane Smith 123' })
      const result = await handler(event)

      expect(result.statusCode).toBe(200)
      expect(JSON.parse(result.body).data.name).toBe('Jane Smith 123')
    })
  })

  describe('Validation Errors', () => {
    it('should return 400 when name is empty', async () => {
      vi.mocked(lambdaAuth.validateUserResourceAccess).mockReturnValue({
        authenticated: true,
        authorized: true,
        userId: 'user-123',
        error: null,
      })

      const event = createMockEvent('user-123', { name: '' })
      const result = await handler(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: expect.stringContaining('Name is required'),
        },
        timestamp: expect.any(String),
      })
      expect(profileService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('should return 400 when name is too long (>100 chars)', async () => {
      vi.mocked(lambdaAuth.validateUserResourceAccess).mockReturnValue({
        authenticated: true,
        authorized: true,
        userId: 'user-123',
        error: null,
      })

      const longName = 'A'.repeat(101)
      const event = createMockEvent('user-123', { name: longName })
      const result = await handler(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: expect.stringContaining('Name must be less than 100 characters'),
        },
        timestamp: expect.any(String),
      })
      expect(profileService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('should return 400 when name contains special characters', async () => {
      vi.mocked(lambdaAuth.validateUserResourceAccess).mockReturnValue({
        authenticated: true,
        authorized: true,
        userId: 'user-123',
        error: null,
      })

      const event = createMockEvent('user-123', { name: 'John@Doe' })
      const result = await handler(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: expect.stringContaining('Name can only contain letters, numbers, and spaces'),
        },
        timestamp: expect.any(String),
      })
      expect(profileService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('should return 400 when name field is missing', async () => {
      vi.mocked(lambdaAuth.validateUserResourceAccess).mockReturnValue({
        authenticated: true,
        authorized: true,
        userId: 'user-123',
        error: null,
      })

      const event = createMockEvent('user-123', {})
      const result = await handler(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body).error.type).toBe('VALIDATION_ERROR')
      expect(profileService.updateUserProfile).not.toHaveBeenCalled()
    })

    it('should return 400 when request body is invalid JSON', async () => {
      vi.mocked(lambdaAuth.validateUserResourceAccess).mockReturnValue({
        authenticated: true,
        authorized: true,
        userId: 'user-123',
        error: null,
      })

      const event = createMockEvent('user-123', {})
      event.body = '{ invalid json'
      const result = await handler(event)

      expect(result.statusCode).toBe(400)
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid JSON in request body',
        },
        timestamp: expect.any(String),
      })
      expect(profileService.updateUserProfile).not.toHaveBeenCalled()
    })
  })

  describe('Authorization', () => {
    it('should return 403 when updating another user\'s profile', async () => {
      vi.mocked(lambdaAuth.validateUserResourceAccess).mockReturnValue({
        authenticated: true,
        authorized: false,
        userId: 'user-123',
        error: {
          statusCode: 403,
          code: 'FORBIDDEN',
          message: 'Cannot update another user\'s profile',
        },
      })

      const event = createMockEvent('user-456', { name: 'Updated Name' })
      const result = await handler(event)

      expect(result.statusCode).toBe(403)
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          type: 'FORBIDDEN',
          message: 'Cannot update another user\'s profile',
        },
        timestamp: expect.any(String),
      })
      expect(profileService.updateUserProfile).not.toHaveBeenCalled()
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

      const event = createMockEvent('user-123', { name: 'Updated Name' })
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
      expect(profileService.updateUserProfile).not.toHaveBeenCalled()
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

      vi.mocked(profileService.updateUserProfile).mockRejectedValue(
        new Error('User not found in Cognito'),
      )

      const event = createMockEvent('non-existent-user', { name: 'Updated Name' })
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

  describe('Cognito Update Errors', () => {
    it('should return 500 when Cognito update fails', async () => {
      vi.mocked(lambdaAuth.validateUserResourceAccess).mockReturnValue({
        authenticated: true,
        authorized: true,
        userId: 'user-123',
        error: null,
      })

      vi.mocked(profileService.updateUserProfile).mockRejectedValue(
        new Error('Failed to update Cognito user attributes'),
      )

      const event = createMockEvent('user-123', { name: 'Updated Name' })
      const result = await handler(event)

      expect(result.statusCode).toBe(500)
      expect(JSON.parse(result.body)).toEqual({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Failed to update user profile',
        },
        timestamp: expect.any(String),
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

      vi.mocked(profileService.updateUserProfile).mockRejectedValue(
        new Error('Unexpected database error'),
      )

      const event = createMockEvent('user-123', { name: 'Updated Name' })
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

    it('should handle Redis cache invalidation failure gracefully', async () => {
      vi.mocked(lambdaAuth.validateUserResourceAccess).mockReturnValue({
        authenticated: true,
        authorized: true,
        userId: 'user-123',
        error: null,
      })

      vi.mocked(profileService.updateUserProfile).mockRejectedValue(
        new Error('Redis connection failed'),
      )

      const event = createMockEvent('user-123', { name: 'Updated Name' })
      const result = await handler(event)

      expect(result.statusCode).toBe(500)
      expect(JSON.parse(result.body).error.type).toBe('INTERNAL_ERROR')
    })
  })
})
