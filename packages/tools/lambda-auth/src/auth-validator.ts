/**
 * Lambda Authentication Validator
 *
 * Provides utilities to validate JWT authentication and authorization
 * in AWS Lambda functions behind API Gateway with Cognito JWT Authorizer.
 *
 * This validator provides comprehensive JWT validation including:
 * - Zod schema validation of JWT claims structure
 * - Cognito issuer verification
 * - Token expiration validation with clock skew tolerance
 * - User ID extraction and validation
 * - Business logic authorization (e.g., resource ownership)
 */

import { APIGatewayProxyEventV2 } from 'aws-lambda'
import { z } from 'zod'
import {
  CognitoJwtClaimsSchema,
  ApiGatewayEventSchema,
  ResourceIdSchema,
  UserIdSchema,
  JwtValidationConfig,
  type CognitoJwtClaims,
} from './schemas'
import {
  UnauthorizedError,
  InvalidTokenError,
  TokenExpiredError,
  InvalidIssuerError,
  ForbiddenError,
  ValidationError,
  AuthInternalError,
  type AuthError,
} from './errors'

/**
 * Authentication Result with typed error
 */
export interface AuthResult {
  authenticated: boolean
  userId: string | null
  claims?: CognitoJwtClaims
  error?: AuthError
}

/**
 * Authorization Result with typed error
 */
export interface AuthzResult {
  authorized: boolean
  error?: AuthError
}

/**
 * Extract and validate authentication from API Gateway event
 *
 * Performs comprehensive JWT validation including:
 * - Schema validation of event structure and JWT claims
 * - Cognito issuer verification (if config provided)
 * - Token expiration validation with clock skew tolerance
 * - User ID extraction and validation
 *
 * @param event - API Gateway HTTP API event
 * @param config - Optional JWT validation configuration for enhanced security
 * @returns Authentication result with userId and validated claims
 */
export function validateAuthentication(
  event: APIGatewayProxyEventV2,
  config?: JwtValidationConfig,
): AuthResult {
  try {
    // Step 1: Validate event structure with Zod
    const eventValidation = ApiGatewayEventSchema.safeParse(event)
    if (!eventValidation.success) {
      return {
        authenticated: false,
        userId: null,
        error: new InvalidTokenError('Invalid API Gateway event structure'),
      }
    }

    // Step 2: Extract JWT claims
    const claims = eventValidation.data.requestContext.authorizer?.jwt?.claims
    if (!claims) {
      return {
        authenticated: false,
        userId: null,
        error: new UnauthorizedError('Authentication required'),
      }
    }

    // Step 3: Validate JWT claims structure with Zod
    const claimsValidation = CognitoJwtClaimsSchema.safeParse(claims)
    if (!claimsValidation.success) {
      return {
        authenticated: false,
        userId: null,
        error: new InvalidTokenError(
          `Invalid JWT claims: ${claimsValidation.error.issues.map(i => i.message).join(', ')}`,
        ),
      }
    }

    const validatedClaims = claimsValidation.data

    // Step 4: Enhanced validation if config provided
    if (config) {
      const enhancedValidation = validateJwtClaims(validatedClaims, config)
      if (enhancedValidation.error) {
        return {
          authenticated: false,
          userId: null,
          error: enhancedValidation.error,
        }
      }
    }

    // Step 5: Extract and validate user ID
    const userIdValidation = UserIdSchema.safeParse(validatedClaims.sub)
    if (!userIdValidation.success) {
      return {
        authenticated: false,
        userId: null,
        error: new InvalidTokenError('Invalid user ID in token'),
      }
    }

    return {
      authenticated: true,
      userId: userIdValidation.data,
      claims: validatedClaims,
    }
  } catch (error) {
    return {
      authenticated: false,
      userId: null,
      error: new AuthInternalError(
        error instanceof Error ? error.message : 'Failed to validate authentication',
      ),
    }
  }
}

/**
 * Validate JWT claims against configuration (issuer, expiration, etc.)
 *
 * @param claims - Validated JWT claims
 * @param config - JWT validation configuration
 * @returns Validation result with error if invalid
 */
function validateJwtClaims(
  claims: CognitoJwtClaims,
  config: JwtValidationConfig,
): { error?: AuthError } {
  // Validate issuer
  if (claims.iss !== config.expectedIssuer) {
    return {
      error: new InvalidIssuerError(
        `Token issuer '${claims.iss}' does not match expected '${config.expectedIssuer}'`,
      ),
    }
  }

  // Validate audience
  if (claims.aud !== config.expectedAudience) {
    return {
      error: new InvalidTokenError(
        `Token audience '${claims.aud}' does not match expected '${config.expectedAudience}'`,
      ),
    }
  }

  // Validate expiration with clock skew tolerance
  if (config.validateExpiration) {
    const now = Math.floor(Date.now() / 1000) // Current time in seconds
    const expWithSkew = claims.exp + config.clockSkewTolerance

    if (now > expWithSkew) {
      return {
        error: new TokenExpiredError(
          `Token expired at ${new Date(claims.exp * 1000).toISOString()}`,
        ),
      }
    }
  }

  return {}
}

/**
 * Validate that userId matches a resource ID (common authorization pattern)
 *
 * Example: User can only access their own profile (/api/users/{id})
 *
 * @param userId - Authenticated user ID from JWT
 * @param resourceId - Resource ID from path parameter
 * @param resourceName - Name of resource for error message (e.g., "profile", "account")
 * @returns Authorization result with typed error
 */
export function validateResourceOwnership(
  userId: string,
  resourceId: string | undefined,
  resourceName: string = 'resource',
): AuthzResult {
  try {
    if (!resourceId) {
      return {
        authorized: false,
        error: new ValidationError(`${resourceName} ID is required`, 'resourceId'),
      }
    }

    // Validate resource ID format
    const resourceIdValidation = ResourceIdSchema.safeParse(resourceId)
    if (!resourceIdValidation.success) {
      return {
        authorized: false,
        error: new ValidationError(`Invalid ${resourceName} ID format`, 'resourceId'),
      }
    }

    // Check ownership
    if (userId !== resourceId) {
      return {
        authorized: false,
        error: new ForbiddenError(`Cannot access another user's ${resourceName}`),
      }
    }

    return {
      authorized: true,
    }
  } catch (error) {
    return {
      authorized: false,
      error: new AuthInternalError(
        error instanceof Error ? error.message : 'Failed to validate resource ownership',
      ),
    }
  }
}

/**
 * Combined authentication + authorization check for user-owned resources
 *
 * Common pattern: Validate JWT AND check userId === resourceId
 *
 * @param event - API Gateway HTTP API event
 * @param resourceIdParam - Name of path parameter containing resource ID (e.g., "id")
 * @param resourceName - Name of resource for error messages
 * @param config - Optional JWT validation configuration for enhanced security
 * @returns Combined result with userId and claims if successful
 */
export function validateUserResourceAccess(
  event: APIGatewayProxyEventV2,
  resourceIdParam: string = 'id',
  resourceName: string = 'resource',
  config?: JwtValidationConfig,
): AuthResult & AuthzResult {
  try {
    // Step 1: Validate authentication with enhanced JWT validation
    const authResult = validateAuthentication(event, config)

    if (!authResult.authenticated || !authResult.userId) {
      return {
        authenticated: false,
        authorized: false,
        userId: null,
        claims: undefined,
        error: authResult.error,
      }
    }

    // Step 2: Validate authorization (resource ownership)
    const resourceId = event.pathParameters?.[resourceIdParam]
    const authzResult = validateResourceOwnership(authResult.userId, resourceId, resourceName)

    if (!authzResult.authorized) {
      return {
        authenticated: true,
        authorized: false,
        userId: authResult.userId,
        claims: authResult.claims,
        error: authzResult.error,
      }
    }

    return {
      authenticated: true,
      authorized: true,
      userId: authResult.userId,
      claims: authResult.claims,
    }
  } catch (error) {
    return {
      authenticated: false,
      authorized: false,
      userId: null,
      claims: undefined,
      error: new AuthInternalError(
        error instanceof Error ? error.message : 'Failed to validate user resource access',
      ),
    }
  }
}
