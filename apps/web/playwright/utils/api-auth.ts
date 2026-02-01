/**
 * API Authentication Utilities
 *
 * Manages authentication tokens for API tests.
 * Uses real Cognito authentication for integration tests.
 *
 * @module utils/api-auth
 */

import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TestUser = {
  id: string
  email: string
  name: string
  password: string
}

export type AuthTokens = {
  idToken: string
  accessToken: string
  refreshToken?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const COGNITO_CONFIG = {
  userPoolId: process.env.COGNITO_USER_POOL_ID || 'us-east-1_vtW1Slo3o',
  clientId: process.env.COGNITO_CLIENT_ID || '4527ui02h63b7c0ra7vs00gua5',
  region: process.env.AWS_REGION || 'us-east-1',
}

const cognitoClient = new CognitoIdentityProviderClient({
  region: COGNITO_CONFIG.region,
})

// ─────────────────────────────────────────────────────────────────────────────
// Test User Data (South Park Characters)
// ─────────────────────────────────────────────────────────────────────────────

const TEST_PASSWORD = '0Xcoffee?'

/**
 * Pre-defined test users for API testing
 * These users must be seeded in Cognito using: pnpm --filter playwright seed:users
 */
export const TEST_USERS = {
  /** Stan Marsh - Primary test user for most tests */
  primary: {
    id: '', // Will be populated from Cognito
    email: 'stan.marsh@southpark.test',
    name: 'Stan Marsh',
    password: TEST_PASSWORD,
  },
  /** Kyle Broflovski - Secondary test user for cross-user access tests */
  secondary: {
    id: '', // Will be populated from Cognito
    email: 'kyle.broflovski@southpark.test',
    name: 'Kyle Broflovski',
    password: TEST_PASSWORD,
  },
  /** Eric Cartman - For edge case and conflict tests */
  cartman: {
    id: '',
    email: 'eric.cartman@southpark.test',
    name: 'Eric Cartman',
    password: TEST_PASSWORD,
  },
  /** Kenny McCormick - For additional user tests */
  kenny: {
    id: '',
    email: 'kenny.mccormick@southpark.test',
    name: 'Kenny McCormick',
    password: TEST_PASSWORD,
  },
  /** Butters Stotch - For additional user tests */
  butters: {
    id: '',
    email: 'butters.stotch@southpark.test',
    name: 'Butters Stotch',
    password: TEST_PASSWORD,
  },
  /** Randy Marsh - Admin user (if applicable) */
  admin: {
    id: '',
    email: 'randy.marsh@southpark.test',
    name: 'Randy Marsh',
    password: TEST_PASSWORD,
  },
} as const satisfies Record<string, TestUser>

// ─────────────────────────────────────────────────────────────────────────────
// Cognito Authentication
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authenticate a user with Cognito and return tokens
 */
export async function authenticateWithCognito(
  email: string,
  password: string,
): Promise<{ tokens: AuthTokens; userId: string }> {
  const response = await cognitoClient.send(
    new AdminInitiateAuthCommand({
      UserPoolId: COGNITO_CONFIG.userPoolId,
      ClientId: COGNITO_CONFIG.clientId,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    }),
  )

  if (!response.AuthenticationResult) {
    throw new Error(`Authentication failed for ${email}`)
  }

  const { AccessToken, IdToken, RefreshToken } = response.AuthenticationResult

  if (!AccessToken || !IdToken) {
    throw new Error(`Missing tokens for ${email}`)
  }

  // Extract userId (sub) from the access token
  const payload = JSON.parse(
    Buffer.from(AccessToken.split('.')[1], 'base64').toString(),
  )

  return {
    tokens: {
      accessToken: AccessToken,
      idToken: IdToken,
      refreshToken: RefreshToken,
    },
    userId: payload.sub,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Token State Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shared auth state for step definitions
 */
export const authState = {
  currentUser: null as (TestUser & { id: string }) | null,
  currentToken: null as string | null,
  tokens: null as AuthTokens | null,

  /**
   * Authenticate as a test user with real Cognito
   */
  async authenticateAs(user: TestUser): Promise<void> {
    const result = await authenticateWithCognito(user.email, user.password)
    this.currentUser = { ...user, id: result.userId }
    this.currentToken = result.tokens.accessToken
    this.tokens = result.tokens
  },

  /**
   * Set authenticated user (authenticates with Cognito)
   */
  async setUser(user: TestUser): Promise<void> {
    await this.authenticateAs(user)
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
    this.tokens = null
  },

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.currentToken !== null
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Token Generation (for specific test scenarios)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a mock JWT token for testing invalid token scenarios
 * Not cryptographically valid - only for testing error handling
 */
export function generateMockToken(user: TestUser, expiresInSeconds = 3600): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: user.id || 'mock-user-id',
    email: user.email,
    name: user.name,
    iat: now,
    exp: now + expiresInSeconds,
    iss: 'mock-issuer',
    aud: 'mock-audience',
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
 * Parse claims from a token (for debugging)
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
