import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose'

/**
 * JWT verification for Cognito using jose library (Bun-compatible)
 *
 * Validates ID tokens (not access tokens) for cookie-based authentication.
 * Supports:
 * - AUTH_BYPASS=true for local dev without Cognito
 * - Real Cognito JWT verification for integration testing
 */

export interface AuthUser {
  userId: string
  email?: string
  username?: string
  groups?: string[]
}

interface CognitoIdTokenPayload extends JWTPayload {
  sub: string
  email?: string
  'cognito:username'?: string
  'cognito:groups'?: string[]
  token_use?: string
  email_verified?: boolean
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJWKS() {
  if (!jwks) {
    const userPoolId = process.env.COGNITO_USER_POOL_ID
    const region = process.env.COGNITO_REGION || 'us-east-1'

    if (!userPoolId) {
      throw new Error('COGNITO_USER_POOL_ID environment variable is required')
    }

    const jwksUrl = new URL(
      `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`
    )
    jwks = createRemoteJWKSet(jwksUrl)
  }
  return jwks
}

function getExpectedIssuer(): string {
  const userPoolId = process.env.COGNITO_USER_POOL_ID
  const region = process.env.COGNITO_REGION || 'us-east-1'

  if (!userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID environment variable is required')
  }

  return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`
}

function getExpectedAudience(): string {
  const clientId = process.env.COGNITO_CLIENT_ID

  if (!clientId) {
    throw new Error('COGNITO_CLIENT_ID environment variable is required')
  }

  return clientId
}

/**
 * Verify an ID token and extract user claims using jose
 *
 * @param token - ID token (with or without "Bearer " prefix)
 * @returns Verified user claims or null if invalid
 */
export async function verifyIdToken(token: string): Promise<AuthUser | null> {
  // Development bypass
  if (process.env.AUTH_BYPASS === 'true') {
    // Safety check: Don't allow bypass in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_BYPASS is not allowed in production')
    }
    return {
      userId: process.env.DEV_USER_ID || 'dev-user',
      email: 'dev@localhost',
      username: 'dev-user',
      groups: ['dev'],
    }
  }

  try {
    // Remove "Bearer " prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '')

    const { payload } = await jwtVerify<CognitoIdTokenPayload>(cleanToken, getJWKS(), {
      issuer: getExpectedIssuer(),
      audience: getExpectedAudience(),
    })

    // Validate this is an ID token, not an access token
    if (payload.token_use !== 'id') {
      return null
    }

    return {
      userId: payload.sub,
      email: payload.email,
      username: payload['cognito:username'],
      groups: payload['cognito:groups'],
    }
  } catch {
    return null
  }
}

/**
 * Check if auth bypass is enabled (for middleware use)
 */
export function isAuthBypassEnabled(): boolean {
  return process.env.AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production'
}
