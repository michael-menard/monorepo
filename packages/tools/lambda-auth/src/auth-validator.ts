/**
 * Lambda Authentication Validator
 *
 * Provides utilities to validate JWT authentication and authorization
 * in AWS Lambda functions behind API Gateway with Cognito JWT Authorizer.
 *
 * Note: API Gateway JWT Authorizer already validates:
 * - JWT signature
 * - Issuer (Cognito User Pool)
 * - Audience (Client ID)
 * - Expiration (exp claim)
 * - Not Before (nbf claim)
 *
 * This validator handles:
 * - Extracting userId from validated JWT
 * - Business logic authorization (e.g., userId must match resource ID)
 */

import { APIGatewayProxyEventV2 } from 'aws-lambda'

/**
 * Type for API Gateway v2 request context with JWT authorizer
 */
interface RequestContextWithAuthorizer {
  authorizer?: {
    jwt?: {
      claims?: Record<string, string>
    }
  }
}

/**
 * Authentication Result
 */
export interface AuthResult {
  authenticated: boolean
  userId: string | null
  error?: {
    statusCode: number
    code: string
    message: string
  }
}

/**
 * Authorization Result
 */
export interface AuthzResult {
  authorized: boolean
  error?: {
    statusCode: number
    code: string
    message: string
  }
}

/**
 * Extract and validate authentication from API Gateway event
 *
 * @param event - API Gateway HTTP API event
 * @returns Authentication result with userId
 */
export function validateAuthentication(event: APIGatewayProxyEventV2): AuthResult {
  try {
    const authorizer = (event.requestContext as RequestContextWithAuthorizer).authorizer
    const claims = authorizer?.jwt?.claims

    if (!claims) {
      return {
        authenticated: false,
        userId: null,
        error: {
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      }
    }

    // Extract userId (sub claim from Cognito JWT)
    const userId = claims.sub as string

    if (!userId) {
      return {
        authenticated: false,
        userId: null,
        error: {
          statusCode: 401,
          code: 'UNAUTHORIZED',
          message: 'Invalid authentication token',
        },
      }
    }

    return {
      authenticated: true,
      userId,
    }
  } catch (error) {
    return {
      authenticated: false,
      userId: null,
      error: {
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Failed to validate authentication',
      },
    }
  }
}

/**
 * Validate that userId matches a resource ID (common authorization pattern)
 *
 * Example: User can only access their own profile (/api/users/{id})
 *
 * @param userId - Authenticated user ID from JWT
 * @param resourceId - Resource ID from path parameter
 * @param resourceName - Name of resource for error message (e.g., "profile", "account")
 * @returns Authorization result
 */
export function validateResourceOwnership(
  userId: string,
  resourceId: string | undefined,
  resourceName: string = 'resource',
): AuthzResult {
  if (!resourceId) {
    return {
      authorized: false,
      error: {
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: `${resourceName} ID is required`,
      },
    }
  }

  if (userId !== resourceId) {
    return {
      authorized: false,
      error: {
        statusCode: 403,
        code: 'FORBIDDEN',
        message: `Cannot access another user's ${resourceName}`,
      },
    }
  }

  return {
    authorized: true,
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
 * @returns Combined result with userId if successful
 */
export function validateUserResourceAccess(
  event: APIGatewayProxyEventV2,
  resourceIdParam: string = 'id',
  resourceName: string = 'resource',
): AuthResult & AuthzResult {
  // Step 1: Validate authentication
  const authResult = validateAuthentication(event)

  if (!authResult.authenticated || !authResult.userId) {
    return {
      authenticated: false,
      authorized: false,
      userId: null,
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
      error: authzResult.error,
    }
  }

  return {
    authenticated: true,
    authorized: true,
    userId: authResult.userId,
  }
}
