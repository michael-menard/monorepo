/**
 * Unit Tests for Lambda Authentication Validator
 *
 * Tests comprehensive JWT validation including:
 * - Zod schema validation
 * - Cognito issuer verification
 * - Token expiration with clock skew tolerance
 * - Custom error types
 * - Resource ownership authorization
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { APIGatewayProxyEventV2 } from 'aws-lambda'
import {
  validateAuthentication,
  validateResourceOwnership,
  validateUserResourceAccess,
} from '../auth-validator'
import {
  UnauthorizedError,
  InvalidTokenError,
  TokenExpiredError,
  InvalidIssuerError,
  ForbiddenError,
  ValidationError,
} from '../errors'
import { createDefaultJwtConfig } from '../schemas'

// Mock current time for consistent expiration testing
const mockNow = 1640000000 // 2021-12-20T00:00:00Z
const mockNowMs = mockNow * 1000

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(mockNowMs)
})

afterEach(() => {
  vi.useRealTimers()
})

// Test data
const validUserId = '1234abcd-56ef-78gh-90ij-klmnopqrstuv'
const validCognitoIssuer = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_ABC123'
const validClientId = '1234567890abcdefghijklmno'

const validJwtClaims = {
  sub: validUserId,
  iss: validCognitoIssuer,
  aud: validClientId,
  exp: mockNow + 3600, // Expires in 1 hour
  iat: mockNow,
  token_use: 'id' as const,
  'cognito:username': 'john.doe@example.com',
  email: 'john.doe@example.com',
  email_verified: 'true',
}

const createMockEvent = (claims?: Record<string, any>): APIGatewayProxyEventV2 => ({
  version: '2.0',
  routeKey: 'GET /api/test',
  rawPath: '/api/test',
  rawQueryString: '',
  headers: {},
  requestContext: {
    accountId: '123456789012',
    apiId: 'api123',
    domainName: 'api.example.com',
    domainPrefix: 'api',
    http: {
      method: 'GET',
      path: '/api/test',
      protocol: 'HTTP/1.1',
      sourceIp: '127.0.0.1',
      userAgent: 'test-agent',
    },
    requestId: 'request-123',
    routeKey: 'GET /api/test',
    stage: 'test',
    time: '20/Dec/2021:00:00:00 +0000',
    timeEpoch: mockNowMs,
    authorizer: claims ? {
      jwt: {
        claims,
      },
    } : undefined,
  },
  isBase64Encoded: false,
})

describe('validateAuthentication', () => {
  describe('Basic Authentication', () => {
    it('should authenticate valid JWT claims', () => {
      // Given: Valid API Gateway event with JWT claims
      const event = createMockEvent(validJwtClaims)

      // When: Validating authentication
      const result = validateAuthentication(event)

      // Then: Authentication succeeds
      expect(result.authenticated).toBe(true)
      expect(result.userId).toBe(validUserId)
      expect(result.claims).toEqual(validJwtClaims)
      expect(result.error).toBeUndefined()
    })

    it('should reject missing JWT claims', () => {
      // Given: Event without JWT claims
      const event = createMockEvent()

      // When: Validating authentication
      const result = validateAuthentication(event)

      // Then: Authentication fails with UnauthorizedError
      expect(result.authenticated).toBe(false)
      expect(result.userId).toBeNull()
      expect(result.error).toBeInstanceOf(UnauthorizedError)
      expect(result.error?.message).toBe('Authentication required')
    })

    it('should reject invalid JWT claims structure', () => {
      // Given: Event with invalid claims (missing required fields)
      const invalidClaims = {
        sub: '', // Empty user ID
        // Missing iss, aud, exp, iat
      }
      const event = createMockEvent(invalidClaims)

      // When: Validating authentication
      const result = validateAuthentication(event)

      // Then: Authentication fails with InvalidTokenError
      expect(result.authenticated).toBe(false)
      expect(result.userId).toBeNull()
      expect(result.error).toBeInstanceOf(InvalidTokenError)
      expect(result.error?.message).toContain('Invalid JWT claims')
    })
  })

  describe('Enhanced JWT Validation', () => {
    const jwtConfig = createDefaultJwtConfig('us-east-1_ABC123', 'us-east-1', validClientId)

    it('should validate issuer when config provided', () => {
      // Given: Valid claims with correct issuer
      const event = createMockEvent(validJwtClaims)

      // When: Validating with config
      const result = validateAuthentication(event, jwtConfig)

      // Then: Authentication succeeds
      expect(result.authenticated).toBe(true)
      expect(result.userId).toBe(validUserId)
    })

    it('should reject invalid issuer', () => {
      // Given: Claims with wrong issuer
      const invalidClaims = {
        ...validJwtClaims,
        iss: 'https://malicious-issuer.com/fake-pool',
      }
      const event = createMockEvent(invalidClaims)

      // When: Validating with config
      const result = validateAuthentication(event, jwtConfig)

      // Then: Authentication fails with InvalidIssuerError
      expect(result.authenticated).toBe(false)
      expect(result.error).toBeInstanceOf(InvalidIssuerError)
      expect(result.error?.message).toContain('does not match expected')
    })

    it('should reject invalid audience', () => {
      // Given: Claims with wrong audience
      const invalidClaims = {
        ...validJwtClaims,
        aud: 'wrong-client-id',
      }
      const event = createMockEvent(invalidClaims)

      // When: Validating with config
      const result = validateAuthentication(event, jwtConfig)

      // Then: Authentication fails with InvalidTokenError
      expect(result.authenticated).toBe(false)
      expect(result.error).toBeInstanceOf(InvalidTokenError)
      expect(result.error?.message).toContain('audience')
    })

    it('should reject expired token', () => {
      // Given: Expired token (expired 1 hour ago)
      const expiredClaims = {
        ...validJwtClaims,
        exp: mockNow - 3600, // Expired 1 hour ago
      }
      const event = createMockEvent(expiredClaims)

      // When: Validating with config
      const result = validateAuthentication(event, jwtConfig)

      // Then: Authentication fails with TokenExpiredError
      expect(result.authenticated).toBe(false)
      expect(result.error).toBeInstanceOf(TokenExpiredError)
      expect(result.error?.message).toContain('Token expired')
    })

    it('should allow token within clock skew tolerance', () => {
      // Given: Token expired 4 minutes ago (within 5-minute tolerance)
      const recentlyExpiredClaims = {
        ...validJwtClaims,
        exp: mockNow - 240, // Expired 4 minutes ago
      }
      const event = createMockEvent(recentlyExpiredClaims)

      // When: Validating with config (default 5-minute tolerance)
      const result = validateAuthentication(event, jwtConfig)

      // Then: Authentication succeeds due to clock skew tolerance
      expect(result.authenticated).toBe(true)
      expect(result.userId).toBe(validUserId)
    })
  })
})

describe('validateResourceOwnership', () => {
  it('should authorize matching user and resource IDs', () => {
    // Given: User ID matches resource ID
    const userId = 'user-123'
    const resourceId = 'user-123'

    // When: Validating ownership
    const result = validateResourceOwnership(userId, resourceId, 'profile')

    // Then: Authorization succeeds
    expect(result.authorized).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should reject mismatched user and resource IDs', () => {
    // Given: User ID does not match resource ID
    const userId = 'user-123'
    const resourceId = 'user-456'

    // When: Validating ownership
    const result = validateResourceOwnership(userId, resourceId, 'profile')

    // Then: Authorization fails with ForbiddenError
    expect(result.authorized).toBe(false)
    expect(result.error).toBeInstanceOf(ForbiddenError)
    expect(result.error?.message).toBe("Cannot access another user's profile")
  })

  it('should reject missing resource ID', () => {
    // Given: Missing resource ID
    const userId = 'user-123'
    const resourceId = undefined

    // When: Validating ownership
    const result = validateResourceOwnership(userId, resourceId, 'account')

    // Then: Authorization fails with ValidationError
    expect(result.authorized).toBe(false)
    expect(result.error).toBeInstanceOf(ValidationError)
    expect(result.error?.message).toBe('account ID is required')
  })
})

describe('validateUserResourceAccess', () => {
  it('should validate both authentication and authorization', () => {
    // Given: Valid event with matching user and resource IDs
    const event = createMockEvent(validJwtClaims)
    event.pathParameters = { id: validUserId }

    // When: Validating combined access
    const result = validateUserResourceAccess(event, 'id', 'profile')

    // Then: Both authentication and authorization succeed
    expect(result.authenticated).toBe(true)
    expect(result.authorized).toBe(true)
    expect(result.userId).toBe(validUserId)
    expect(result.claims).toEqual(validJwtClaims)
  })

  it('should fail if authentication fails', () => {
    // Given: Event without JWT claims
    const event = createMockEvent()
    event.pathParameters = { id: 'some-id' }

    // When: Validating combined access
    const result = validateUserResourceAccess(event, 'id', 'profile')

    // Then: Authentication fails, authorization not attempted
    expect(result.authenticated).toBe(false)
    expect(result.authorized).toBe(false)
    expect(result.error).toBeInstanceOf(UnauthorizedError)
  })

  it('should fail if authorization fails', () => {
    // Given: Valid authentication but mismatched resource ID
    const event = createMockEvent(validJwtClaims)
    event.pathParameters = { id: 'different-user-id' }

    // When: Validating combined access
    const result = validateUserResourceAccess(event, 'id', 'profile')

    // Then: Authentication succeeds but authorization fails
    expect(result.authenticated).toBe(true)
    expect(result.authorized).toBe(false)
    expect(result.userId).toBe(validUserId)
    expect(result.error).toBeInstanceOf(ForbiddenError)
  })
})
