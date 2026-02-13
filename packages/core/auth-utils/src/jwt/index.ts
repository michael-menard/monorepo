import { z } from 'zod'
import { logger } from '@repo/logger'

/**
 * Base JWT payload schema with standard claims
 */
export const JwtPayloadSchema = z
  .object({
    sub: z.string(),
    exp: z.number(),
    iat: z.number(),
  })
  .passthrough()

export type JwtPayload = z.infer<typeof JwtPayloadSchema>

/**
 * Cognito ID Token payload schema with user identity claims
 */
export const CognitoIdTokenPayloadSchema = JwtPayloadSchema.extend({
  email: z.string().email(),
  email_verified: z.boolean(),
  'cognito:username': z.string(),
  'cognito:groups': z.array(z.string()).optional(),
})

export type CognitoIdTokenPayload = z.infer<typeof CognitoIdTokenPayloadSchema>

/**
 * Cognito Access Token payload schema with authorization claims
 */
export const CognitoAccessTokenPayloadSchema = JwtPayloadSchema.extend({
  client_id: z.string(),
  scope: z.string(),
  token_use: z.literal('access'),
})

export type CognitoAccessTokenPayload = z.infer<typeof CognitoAccessTokenPayloadSchema>

/**
 * Decodes a JWT token and extracts the payload.
 * Note: This does NOT verify the token signature - verification should happen on the backend.
 *
 * @param token - The JWT token string to decode
 * @returns The decoded payload or null if invalid/malformed
 */
export const decodeToken = <T extends JwtPayload>(token: string): T | null => {
  try {
    if (!token || typeof token !== 'string') {
      return null
    }

    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payloadBase64 = parts[1]
    if (!payloadBase64) {
      return null
    }

    // Handle base64url encoding (replace - with + and _ with /)
    const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64))

    return payload as T
  } catch (error) {
    logger.warn('Failed to decode JWT', { error })
    return null
  }
}

/**
 * Checks if a JWT token is expired.
 *
 * @param token - The JWT token string to check
 * @param bufferSeconds - Buffer time in seconds to account for clock skew (default: 30)
 * @returns true if the token is expired or invalid, false if still valid
 */
export const isTokenExpired = (token: string, bufferSeconds = 30): boolean => {
  const payload = decodeToken(token)
  if (!payload?.exp) {
    return true
  }

  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now + bufferSeconds
}

/**
 * Gets the expiration date of a JWT token.
 *
 * @param token - The JWT token string
 * @returns The expiration Date or null if invalid
 */
export const getTokenExpiration = (token: string): Date | null => {
  const payload = decodeToken(token)
  if (!payload?.exp) {
    return null
  }
  return new Date(payload.exp * 1000)
}

/**
 * Extracts specific claims from a token payload.
 *
 * @param token - The JWT token string
 * @returns The token payload or null if invalid
 */
export const getTokenPayload = <T extends JwtPayload>(token: string): T | null => {
  return decodeToken<T>(token)
}

/**
 * Extracts scopes/permissions from a Cognito access token.
 * Cognito access tokens contain a space-separated scope string.
 *
 * @param accessToken - The access token string
 * @returns Array of scopes/permissions, or empty array if invalid
 */
export const getTokenScopes = (accessToken: string): string[] => {
  const payload = decodeToken<CognitoAccessTokenPayload>(accessToken)
  if (!payload?.scope) {
    return []
  }

  // Split space-separated scopes and filter out empty strings
  return payload.scope.split(' ').filter(scope => scope.trim().length > 0)
}
