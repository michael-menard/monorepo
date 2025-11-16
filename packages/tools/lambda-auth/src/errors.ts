/**
 * Custom Error Types for Lambda Authentication
 *
 * Following coding standards: Never use `throw new Error()` - always create custom error types.
 */

/**
 * Base authentication error class
 */
export abstract class AuthError extends Error {
  abstract readonly statusCode: number
  abstract readonly code: string

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
  }
}

/**
 * Authentication required - no valid JWT token found
 */
export class UnauthorizedError extends AuthError {
  readonly statusCode = 401
  readonly code = 'UNAUTHORIZED'

  constructor(message: string = 'Authentication required') {
    super(message)
  }
}

/**
 * Invalid JWT token structure or claims
 */
export class InvalidTokenError extends AuthError {
  readonly statusCode = 401
  readonly code = 'INVALID_TOKEN'

  constructor(message: string = 'Invalid authentication token') {
    super(message)
  }
}

/**
 * JWT token has expired
 */
export class TokenExpiredError extends AuthError {
  readonly statusCode = 401
  readonly code = 'TOKEN_EXPIRED'

  constructor(message: string = 'Authentication token has expired') {
    super(message)
  }
}

/**
 * JWT token is not from expected Cognito issuer
 */
export class InvalidIssuerError extends AuthError {
  readonly statusCode = 401
  readonly code = 'INVALID_ISSUER'

  constructor(message: string = 'Token is not from expected issuer') {
    super(message)
  }
}

/**
 * User does not have permission to access resource
 */
export class ForbiddenError extends AuthError {
  readonly statusCode = 403
  readonly code = 'FORBIDDEN'

  constructor(message: string = 'Access denied') {
    super(message)
  }
}

/**
 * Required resource ID is missing or invalid
 */
export class ValidationError extends AuthError {
  readonly statusCode = 400
  readonly code = 'VALIDATION_ERROR'

  constructor(
    message: string,
    public field?: string,
  ) {
    super(message)
  }
}

/**
 * Internal server error during authentication
 */
export class AuthInternalError extends AuthError {
  readonly statusCode = 500
  readonly code = 'INTERNAL_ERROR'

  constructor(message: string = 'Failed to validate authentication') {
    super(message)
  }
}
