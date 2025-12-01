import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  decodeToken,
  isTokenExpired,
  getTokenExpiration,
  getTokenPayload,
  getTokenScopes,
  type JwtPayload,
  type CognitoIdTokenPayload,
  type CognitoAccessTokenPayload,
} from '../jwt'

// Mock the logger
vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

/**
 * Helper to create a valid JWT token for testing.
 * Note: This creates tokens with a fake signature - only for testing decode functionality.
 */
const createTestToken = (payload: Record<string, unknown>): string => {
  const header = { alg: 'RS256', typ: 'JWT' }
  const headerBase64 = btoa(JSON.stringify(header))
  const payloadBase64 = btoa(JSON.stringify(payload))
  const signature = 'fake-signature'
  return `${headerBase64}.${payloadBase64}.${signature}`
}

/**
 * Helper to create a token with base64url encoding (uses - and _ instead of + and /)
 */
const createBase64UrlToken = (payload: Record<string, unknown>): string => {
  const header = { alg: 'RS256', typ: 'JWT' }
  const headerBase64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_')
  const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_')
  const signature = 'fake-signature'
  return `${headerBase64}.${payloadBase64}.${signature}`
}

describe('JWT Utilities', () => {
  describe('decodeToken', () => {
    it('should decode a valid JWT token', () => {
      const payload = {
        sub: 'user-123',
        exp: 1700000000,
        iat: 1699990000,
        email: 'test@example.com',
      }
      const token = createTestToken(payload)

      const result = decodeToken(token)

      expect(result).toEqual(payload)
    })

    it('should decode token with type parameter', () => {
      const payload: CognitoIdTokenPayload = {
        sub: 'user-123',
        exp: 1700000000,
        iat: 1699990000,
        email: 'test@example.com',
        email_verified: true,
        'cognito:username': 'testuser',
        'cognito:groups': ['admin', 'users'],
      }
      const token = createTestToken(payload)

      const result = decodeToken<CognitoIdTokenPayload>(token)

      expect(result).not.toBeNull()
      expect(result?.email).toBe('test@example.com')
      expect(result?.['cognito:username']).toBe('testuser')
      expect(result?.['cognito:groups']).toEqual(['admin', 'users'])
    })

    it('should handle base64url encoding', () => {
      const payload = {
        sub: 'user-123',
        exp: 1700000000,
        iat: 1699990000,
      }
      const token = createBase64UrlToken(payload)

      const result = decodeToken(token)

      expect(result).toEqual(payload)
    })

    it('should return null for empty string', () => {
      const result = decodeToken('')
      expect(result).toBeNull()
    })

    it('should return null for null/undefined', () => {
      expect(decodeToken(null as unknown as string)).toBeNull()
      expect(decodeToken(undefined as unknown as string)).toBeNull()
    })

    it('should return null for non-string input', () => {
      expect(decodeToken(123 as unknown as string)).toBeNull()
      expect(decodeToken({} as unknown as string)).toBeNull()
    })

    it('should return null for token with wrong number of parts', () => {
      expect(decodeToken('only-one-part')).toBeNull()
      expect(decodeToken('two.parts')).toBeNull()
      expect(decodeToken('too.many.parts.here')).toBeNull()
    })

    it('should return null for malformed base64', () => {
      const result = decodeToken('header.!!!invalid-base64!!!.signature')
      expect(result).toBeNull()
    })

    it('should return null for invalid JSON payload', () => {
      const invalidJson = btoa('not-valid-json')
      const result = decodeToken(`header.${invalidJson}.signature`)
      expect(result).toBeNull()
    })
  })

  describe('isTokenExpired', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should return false for non-expired token', () => {
      // Set current time to a known value
      const now = 1700000000 * 1000 // Convert to milliseconds
      vi.setSystemTime(now)

      const payload = {
        sub: 'user-123',
        exp: 1700001000, // Expires 1000 seconds in the future
        iat: 1699990000,
      }
      const token = createTestToken(payload)

      const result = isTokenExpired(token)

      expect(result).toBe(false)
    })

    it('should return true for expired token', () => {
      const now = 1700000000 * 1000
      vi.setSystemTime(now)

      const payload = {
        sub: 'user-123',
        exp: 1699999000, // Expired 1000 seconds ago
        iat: 1699990000,
      }
      const token = createTestToken(payload)

      const result = isTokenExpired(token)

      expect(result).toBe(true)
    })

    it('should account for buffer time (clock skew)', () => {
      const now = 1700000000 * 1000
      vi.setSystemTime(now)

      // Token expires in 20 seconds - should be considered expired with 30s buffer
      const payload = {
        sub: 'user-123',
        exp: 1700000020,
        iat: 1699990000,
      }
      const token = createTestToken(payload)

      // With default 30s buffer, token expiring in 20s is considered expired
      expect(isTokenExpired(token)).toBe(true)

      // With 10s buffer, token expiring in 20s is NOT expired
      expect(isTokenExpired(token, 10)).toBe(false)
    })

    it('should return true for invalid token', () => {
      expect(isTokenExpired('')).toBe(true)
      expect(isTokenExpired('invalid')).toBe(true)
    })

    it('should return true for token without exp claim', () => {
      const payload = {
        sub: 'user-123',
        iat: 1699990000,
        // No exp claim
      }
      const token = createTestToken(payload)

      expect(isTokenExpired(token)).toBe(true)
    })

    it('should handle zero buffer', () => {
      const now = 1700000000 * 1000
      vi.setSystemTime(now)

      const payload = {
        sub: 'user-123',
        exp: 1700000001, // Expires 1 second in the future
        iat: 1699990000,
      }
      const token = createTestToken(payload)

      expect(isTokenExpired(token, 0)).toBe(false)
    })
  })

  describe('getTokenExpiration', () => {
    it('should return expiration date for valid token', () => {
      const payload = {
        sub: 'user-123',
        exp: 1700000000,
        iat: 1699990000,
      }
      const token = createTestToken(payload)

      const result = getTokenExpiration(token)

      expect(result).toBeInstanceOf(Date)
      expect(result?.getTime()).toBe(1700000000 * 1000)
    })

    it('should return null for invalid token', () => {
      expect(getTokenExpiration('')).toBeNull()
      expect(getTokenExpiration('invalid')).toBeNull()
    })

    it('should return null for token without exp claim', () => {
      const payload = {
        sub: 'user-123',
        iat: 1699990000,
      }
      const token = createTestToken(payload)

      expect(getTokenExpiration(token)).toBeNull()
    })
  })

  describe('getTokenPayload', () => {
    it('should extract payload with correct type', () => {
      const payload: CognitoAccessTokenPayload = {
        sub: 'user-123',
        exp: 1700000000,
        iat: 1699990000,
        client_id: 'client-abc',
        scope: 'openid profile email',
        token_use: 'access',
      }
      const token = createTestToken(payload)

      const result = getTokenPayload<CognitoAccessTokenPayload>(token)

      expect(result).not.toBeNull()
      expect(result?.client_id).toBe('client-abc')
      expect(result?.scope).toBe('openid profile email')
      expect(result?.token_use).toBe('access')
    })

    it('should return null for invalid token', () => {
      expect(getTokenPayload('')).toBeNull()
    })
  })

  describe('type interfaces', () => {
    it('should support JwtPayload with additional claims', () => {
      const payload: JwtPayload = {
        sub: 'user-123',
        exp: 1700000000,
        iat: 1699990000,
        customClaim: 'custom-value',
      }
      const token = createTestToken(payload)

      const result = decodeToken<JwtPayload>(token)

      expect(result?.customClaim).toBe('custom-value')
    })

    it('should support CognitoIdTokenPayload', () => {
      const payload: CognitoIdTokenPayload = {
        sub: 'user-123',
        exp: 1700000000,
        iat: 1699990000,
        email: 'test@example.com',
        email_verified: true,
        'cognito:username': 'testuser',
      }
      const token = createTestToken(payload)

      const result = decodeToken<CognitoIdTokenPayload>(token)

      expect(result?.email_verified).toBe(true)
    })

    it('should handle optional cognito:groups', () => {
      const payloadWithGroups: CognitoIdTokenPayload = {
        sub: 'user-123',
        exp: 1700000000,
        iat: 1699990000,
        email: 'test@example.com',
        email_verified: true,
        'cognito:username': 'testuser',
        'cognito:groups': ['admin'],
      }

      const payloadWithoutGroups: CognitoIdTokenPayload = {
        sub: 'user-123',
        exp: 1700000000,
        iat: 1699990000,
        email: 'test@example.com',
        email_verified: true,
        'cognito:username': 'testuser',
      }

      const tokenWithGroups = createTestToken(payloadWithGroups)
      const tokenWithoutGroups = createTestToken(payloadWithoutGroups)

      const resultWithGroups = decodeToken<CognitoIdTokenPayload>(tokenWithGroups)
      const resultWithoutGroups = decodeToken<CognitoIdTokenPayload>(tokenWithoutGroups)

      expect(resultWithGroups?.['cognito:groups']).toEqual(['admin'])
      expect(resultWithoutGroups?.['cognito:groups']).toBeUndefined()
    })
  })

  describe('getTokenScopes', () => {
    it('should extract scopes from access token', () => {
      const payload: CognitoAccessTokenPayload = {
        sub: 'user-123',
        exp: 1700000000,
        iat: 1699990000,
        client_id: 'client-abc',
        scope: 'openid profile email',
        token_use: 'access',
      }
      const token = createTestToken(payload)

      const scopes = getTokenScopes(token)

      expect(scopes).toEqual(['openid', 'profile', 'email'])
    })

    it('should handle custom scopes', () => {
      const payload: CognitoAccessTokenPayload = {
        sub: 'user-123',
        exp: 1700000000,
        iat: 1699990000,
        client_id: 'client-abc',
        scope: 'openid profile email custom:gallery.read custom:gallery.write',
        token_use: 'access',
      }
      const token = createTestToken(payload)

      const scopes = getTokenScopes(token)

      expect(scopes).toEqual([
        'openid',
        'profile',
        'email',
        'custom:gallery.read',
        'custom:gallery.write',
      ])
    })

    it('should return empty array for token without scope', () => {
      const payload = {
        sub: 'user-123',
        exp: 1700000000,
        iat: 1699990000,
        client_id: 'client-abc',
        token_use: 'access',
      }
      const token = createTestToken(payload)

      const scopes = getTokenScopes(token)

      expect(scopes).toEqual([])
    })

    it('should return empty array for invalid token', () => {
      const scopes = getTokenScopes('invalid-token')

      expect(scopes).toEqual([])
    })

    it('should handle empty scope string', () => {
      const payload: CognitoAccessTokenPayload = {
        sub: 'user-123',
        exp: 1700000000,
        iat: 1699990000,
        client_id: 'client-abc',
        scope: '',
        token_use: 'access',
      }
      const token = createTestToken(payload)

      const scopes = getTokenScopes(token)

      expect(scopes).toEqual([])
    })

    it('should handle scope string with extra spaces', () => {
      const payload: CognitoAccessTokenPayload = {
        sub: 'user-123',
        exp: 1700000000,
        iat: 1699990000,
        client_id: 'client-abc',
        scope: '  openid   profile   email  ',
        token_use: 'access',
      }
      const token = createTestToken(payload)

      const scopes = getTokenScopes(token)

      expect(scopes).toEqual(['openid', 'profile', 'email'])
    })
  })
})
