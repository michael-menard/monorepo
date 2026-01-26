import { CognitoJwtVerifier } from 'aws-jwt-verify'

/**
 * JWT verification for Cognito
 *
 * Simplified for local development. Supports:
 * - AUTH_BYPASS=true for local dev without Cognito
 * - Real Cognito JWT verification for integration testing
 */

let verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null

function getVerifier() {
  if (!verifier) {
    const userPoolId = process.env.COGNITO_USER_POOL_ID
    const clientId = process.env.COGNITO_CLIENT_ID

    if (!userPoolId || !clientId) {
      throw new Error(
        'COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID environment variables are required'
      )
    }

    verifier = CognitoJwtVerifier.create({
      userPoolId,
      clientId,
      tokenUse: 'access',
    })
  }
  return verifier
}

export interface AuthUser {
  userId: string
  email?: string
  username?: string
  groups?: string[]
}

/**
 * Verify a JWT token and extract user claims
 *
 * @param token - Bearer token (with or without "Bearer " prefix)
 * @returns Verified user claims or null if invalid
 */
export async function verifyToken(token: string): Promise<AuthUser | null> {
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

    const payload = await getVerifier().verify(cleanToken)

    return {
      userId: payload.sub,
      email: payload.email as string | undefined,
      username: payload['cognito:username'] as string | undefined,
      groups: payload['cognito:groups'] as string[] | undefined,
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
