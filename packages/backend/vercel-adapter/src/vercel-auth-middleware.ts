/**
 * Vercel Auth Middleware
 *
 * JWT validation for Vercel functions using Cognito tokens.
 * Uses aws-jwt-verify to validate tokens without AWS SDK dependency.
 *
 * Supports development bypass mode with strict guardrails:
 * - AUTH_BYPASS=true enables bypass (only in non-production)
 * - DEV_USER_SUB, DEV_USER_EMAIL configure mock user identity
 * - Crashes on boot if bypass enabled in production (fail closed)
 *
 * @example
 * ```typescript
 * import { validateCognitoJwt } from '@repo/vercel-adapter'
 *
 * const result = await validateCognitoJwt(authorizationHeader)
 * if (!result.valid) {
 *   return res.status(401).json({ error: 'Unauthorized' })
 * }
 * ```
 */

import { CognitoJwtVerifier } from 'aws-jwt-verify'

// =============================================================================
// GUARDRAIL: Fail closed if auth bypass enabled in production
// =============================================================================
const isProduction = process.env.NODE_ENV === 'production'
const authBypassEnabled = process.env.AUTH_BYPASS === 'true'

if (isProduction && authBypassEnabled) {
  throw new Error(
    'FATAL: AUTH_BYPASS=true is not allowed in production. ' +
    'This is a security violation. Remove AUTH_BYPASS or set NODE_ENV to development.'
  )
}

/**
 * JWT Claims extracted from Cognito access token
 */
export interface CognitoJwtClaims {
  sub: string
  email?: string
  'cognito:username'?: string
  'cognito:groups'?: string[]
  iss: string
  aud?: string
  client_id?: string
  token_use: 'access' | 'id'
  exp: number
  iat: number
  scope?: string
}

/**
 * Configuration for Cognito JWT validation
 *
 * If not provided, uses environment variables.
 */
export interface CognitoConfig {
  userPoolId: string
  clientId: string
  region?: string
}

// Cached verifier instance (reused across requests)
let cachedVerifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null
let cachedConfig: CognitoConfig | null = null

/**
 * Get or create Cognito JWT verifier
 *
 * Caches the verifier for reuse across requests.
 * JWKS is automatically cached by aws-jwt-verify.
 */
function getVerifier(config?: CognitoConfig): ReturnType<typeof CognitoJwtVerifier.create> | null {
  const effectiveConfig: CognitoConfig = config ?? {
    userPoolId: process.env.COGNITO_USER_POOL_ID ?? '',
    clientId: process.env.COGNITO_CLIENT_ID ?? '',
    region: process.env.COGNITO_REGION ?? 'us-east-1',
  }

  // Validate configuration
  if (!effectiveConfig.userPoolId || !effectiveConfig.clientId) {
    console.warn('[vercel-auth] Missing Cognito configuration. Set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID.')
    return null
  }

  // Return cached verifier if config hasn't changed
  if (
    cachedVerifier &&
    cachedConfig?.userPoolId === effectiveConfig.userPoolId &&
    cachedConfig?.clientId === effectiveConfig.clientId
  ) {
    return cachedVerifier
  }

  // Create new verifier
  cachedVerifier = CognitoJwtVerifier.create({
    userPoolId: effectiveConfig.userPoolId,
    tokenUse: 'access',
    clientId: effectiveConfig.clientId,
  })
  cachedConfig = effectiveConfig

  return cachedVerifier
}

/**
 * Validation result for JWT
 */
export type JwtValidationResult =
  | { valid: true; claims: CognitoJwtClaims; bypassed?: boolean }
  | { valid: false; error: 'MISSING_TOKEN' | 'INVALID_FORMAT' | 'INVALID_TOKEN' | 'EXPIRED' | 'CONFIG_ERROR'; message: string }

/**
 * Create mock Cognito JWT claims for development bypass
 *
 * Uses environment variables for identity:
 * - DEV_USER_SUB: User ID (defaults to a test UUID)
 * - DEV_USER_EMAIL: User email (defaults to dev@localhost)
 * - DEV_USER_USERNAME: Cognito username (defaults to dev-user)
 * - DEV_USER_GROUPS: Comma-separated groups (defaults to empty)
 */
function createMockClaims(): CognitoJwtClaims {
  const now = Math.floor(Date.now() / 1000)
  const groups = process.env.DEV_USER_GROUPS
    ? process.env.DEV_USER_GROUPS.split(',').map(g => g.trim())
    : []

  return {
    sub: process.env.DEV_USER_SUB ?? '00000000-0000-0000-0000-000000000001',
    email: process.env.DEV_USER_EMAIL ?? 'dev@localhost',
    'cognito:username': process.env.DEV_USER_USERNAME ?? 'dev-user',
    'cognito:groups': groups.length > 0 ? groups : undefined,
    iss: `https://cognito-idp.us-east-1.amazonaws.com/${process.env.COGNITO_USER_POOL_ID ?? 'us-east-1_DEV00000'}`,
    client_id: process.env.COGNITO_CLIENT_ID ?? 'dev-client-id',
    token_use: 'access',
    exp: now + 3600, // 1 hour from now
    iat: now,
    scope: 'openid profile email',
  }
}

/**
 * Check if auth bypass is enabled and allowed
 */
function isAuthBypassAllowed(): boolean {
  // Already checked for production + bypass at module load (crashes)
  // This is for runtime check
  return !isProduction && authBypassEnabled
}

/**
 * Validate Cognito JWT from Authorization header
 *
 * Validates the JWT signature, issuer, audience, and expiration.
 * Returns the decoded claims if valid, or an error if invalid.
 *
 * In development with AUTH_BYPASS=true:
 * - Returns mock claims from DEV_USER_* env vars
 * - Logs a warning to make bypass visible
 *
 * @param authorizationHeader - Full Authorization header value (e.g., "Bearer eyJ...")
 * @param config - Optional Cognito configuration (uses env vars if not provided)
 * @returns Validation result with claims or error
 */
export async function validateCognitoJwt(
  authorizationHeader: string | undefined,
  config?: CognitoConfig,
): Promise<JwtValidationResult> {
  // =============================================================================
  // DEVELOPMENT BYPASS: Return mock claims if enabled
  // =============================================================================
  if (isAuthBypassAllowed()) {
    console.warn(
      '[AUTH BYPASS] Authentication bypassed in development mode. ' +
      `Using mock user: ${process.env.DEV_USER_SUB ?? '00000000-0000-0000-0000-000000000001'}`
    )
    return {
      valid: true,
      claims: createMockClaims(),
      bypassed: true,
    }
  }

  // =============================================================================
  // NORMAL FLOW: Validate real JWT
  // =============================================================================

  // Check for missing token
  if (!authorizationHeader) {
    return {
      valid: false,
      error: 'MISSING_TOKEN',
      message: 'Authorization header is required',
    }
  }

  // Check for Bearer prefix
  if (!authorizationHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      error: 'INVALID_FORMAT',
      message: 'Authorization header must use Bearer scheme',
    }
  }

  // Extract token
  const token = authorizationHeader.slice(7) // Remove "Bearer "
  if (!token) {
    return {
      valid: false,
      error: 'MISSING_TOKEN',
      message: 'Token is empty',
    }
  }

  // Get verifier
  const verifier = getVerifier(config)
  if (!verifier) {
    return {
      valid: false,
      error: 'CONFIG_ERROR',
      message: 'Cognito not configured. Set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID environment variables.',
    }
  }

  try {
    // Verify token
    const payload = await verifier.verify(token)

    return {
      valid: true,
      claims: payload as unknown as CognitoJwtClaims,
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Check for specific error types
    if (errorMessage.includes('expired')) {
      return {
        valid: false,
        error: 'EXPIRED',
        message: 'Token has expired',
      }
    }

    return {
      valid: false,
      error: 'INVALID_TOKEN',
      message: `Token validation failed: ${errorMessage}`,
    }
  }
}

/**
 * Extract JWT claims from Authorization header (simple helper)
 *
 * Returns null if validation fails, for simpler error handling.
 *
 * @param authorizationHeader - Full Authorization header value
 * @param config - Optional Cognito configuration
 * @returns Claims if valid, null otherwise
 */
export async function getJwtClaims(
  authorizationHeader: string | undefined,
  config?: CognitoConfig,
): Promise<CognitoJwtClaims | null> {
  const result = await validateCognitoJwt(authorizationHeader, config)
  return result.valid ? result.claims : null
}
