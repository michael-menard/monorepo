/**
 * API Authentication Utilities
 *
 * Manages authentication tokens for API tests.
 * Supports mocked tokens for unit tests and real tokens for integration tests.
 *
 * @module utils/api-auth
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TestUser = {
  id: string
  email: string
  name: string
}

export type AuthTokens = {
  idToken: string
  accessToken: string
  refreshToken?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Test User Data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pre-defined test users for API testing
 */
export const TEST_USERS = {
  /** Primary test user for most tests */
  primary: {
    id: 'test-user-001-0000-0000-000000000001',
    email: 'test-user-1@test.example.com',
    name: 'Test User One',
  },
  /** Secondary test user for cross-user access tests */
  secondary: {
    id: 'test-user-002-0000-0000-000000000002',
    email: 'test-user-2@test.example.com',
    name: 'Test User Two',
  },
  /** Admin user (if applicable) */
  admin: {
    id: 'admin-user-000-0000-0000-000000000000',
    email: 'admin@test.example.com',
    name: 'Admin User',
  },
} as const satisfies Record<string, TestUser>

// ─────────────────────────────────────────────────────────────────────────────
// Mock Token Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a mock JWT token for testing
 *
 * Creates a base64-encoded JWT-like string with user claims.
 * Not cryptographically valid - only for testing with mocked auth middleware.
 */
export function generateMockToken(user: TestUser, expiresInSeconds = 3600): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    iat: now,
    exp: now + expiresInSeconds,
    iss: 'test-issuer',
    aud: 'test-audience',
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signature = 'mock-signature-for-testing'

  return `${encodedHeader}.${encodedPayload}.${signature}`
}

/**
 * Generate an expired mock token for testing 401 scenarios
 */
export function generateExpiredToken(user: TestUser): string {
  return generateMockToken(user, -3600) // Expired 1 hour ago
}

/**
 * Generate mock auth tokens for a user
 */
export function generateMockAuthTokens(user: TestUser): AuthTokens {
  return {
    idToken: generateMockToken(user),
    accessToken: generateMockToken(user),
    refreshToken: generateMockToken(user, 86400 * 7), // 7 days
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Token Manipulation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create an invalid token (malformed)
 */
export function createInvalidToken(): string {
  return 'invalid.token.format'
}

/**
 * Create a token with tampered signature
 */
export function createTamperedToken(user: TestUser): string {
  const token = generateMockToken(user)
  const parts = token.split('.')
  return `${parts[0]}.${parts[1]}.tampered-signature`
}

/**
 * Create a token for a non-existent user
 */
export function createTokenForNonExistentUser(): string {
  return generateMockToken({
    id: '00000000-0000-0000-0000-000000000000',
    email: 'nonexistent@test.example.com',
    name: 'Non-existent User',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Token State Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shared auth state for step definitions
 */
export const authState = {
  currentUser: null as TestUser | null,
  currentToken: null as string | null,

  /**
   * Set authenticated user
   */
  setUser(user: TestUser): void {
    this.currentUser = user
    this.currentToken = generateMockToken(user)
  },

  /**
   * Set explicit token (for invalid token tests)
   */
  setToken(token: string | null): void {
    this.currentToken = token
  },

  /**
   * Clear authentication
   */
  clear(): void {
    this.currentUser = null
    this.currentToken = null
  },

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.currentToken !== null
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base64 URL encode (for JWT format)
 */
function base64UrlEncode(str: string): string {
  const base64 = Buffer.from(str).toString('base64')
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Parse claims from a mock token (for debugging)
 */
export function parseTokenClaims(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
    const decoded = Buffer.from(payload, 'base64').toString('utf-8')
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(token: string): boolean {
  const claims = parseTokenClaims(token)
  if (!claims || typeof claims.exp !== 'number') return true
  return claims.exp < Math.floor(Date.now() / 1000)
}
