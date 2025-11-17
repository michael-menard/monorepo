/**
 * @monorepo/lambda-auth
 *
 * Shared authentication and authorization utilities for AWS Lambda functions
 * behind API Gateway with Cognito JWT Authorizer.
 */

export {
  validateAuthentication,
  validateResourceOwnership,
  validateUserResourceAccess,
  getUserIdFromEvent,
  getEmailFromEvent,
  getUsernameFromEvent,
  getJwtClaims,
  type AuthResult,
  type AuthzResult,
} from './auth-validator'
