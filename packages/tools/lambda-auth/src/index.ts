/**
 * @monorepo/lambda-auth
 *
 * Shared authentication and authorization utilities for AWS Lambda functions
 * behind API Gateway with Cognito JWT Authorizer.
 *
 * Features:
 * - Zod schema validation for JWT claims and API Gateway events
 * - Comprehensive JWT validation (issuer, expiration, audience)
 * - Custom typed error classes (never throw new Error())
 * - Resource ownership authorization patterns
 * - Clock skew tolerance for token expiration
 */

// Main validation functions
export {
  validateAuthentication,
  validateResourceOwnership,
  validateUserResourceAccess,
  type AuthResult,
  type AuthzResult,
} from './auth-validator'

// Zod schemas and types
export {
  CognitoJwtClaimsSchema,
  JwtValidationConfigSchema,
  createDefaultJwtConfig,
  type CognitoJwtClaims,
  type JwtValidationConfig,
} from './schemas'

// Custom error types
export {
  AuthError,
  UnauthorizedError,
  InvalidTokenError,
  TokenExpiredError,
  InvalidIssuerError,
  ForbiddenError,
  ValidationError,
  AuthInternalError,
} from './errors'
