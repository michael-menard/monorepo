/**
 * JWT Authentication Utilities
 *
 * Helper functions for extracting and validating JWT claims from API Gateway events.
 * Cognito JWT authorizer populates event.requestContext.authorizer.jwt.claims
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
 * Extract user ID (sub claim) from JWT in API Gateway event
 *
 * @param event - API Gateway HTTP API event
 * @returns User ID (Cognito sub) or null if not authenticated
 */
export function getUserIdFromEvent(event: APIGatewayProxyEventV2): string | null {
  try {
    // API Gateway v2 JWT authorizer populates authorizer in requestContext
    const authorizer = (event.requestContext as RequestContextWithAuthorizer).authorizer
    const claims = authorizer?.jwt?.claims
    if (!claims) {
      return null
    }

    // Cognito 'sub' claim is the user ID
    const userId = claims.sub as string
    return userId || null
  } catch (error) {
    console.error('Error extracting user ID from JWT:', error)
    return null
  }
}

/**
 * Extract email from JWT claims
 *
 * @param event - API Gateway HTTP API event
 * @returns User email or null if not available
 */
export function getEmailFromEvent(event: APIGatewayProxyEventV2): string | null {
  try {
    const authorizer = (event.requestContext as RequestContextWithAuthorizer).authorizer
    const claims = authorizer?.jwt?.claims
    if (!claims) {
      return null
    }

    return (claims.email as string) || null
  } catch (error) {
    console.error('Error extracting email from JWT:', error)
    return null
  }
}

/**
 * Extract username from JWT claims
 *
 * @param event - API Gateway HTTP API event
 * @returns Username or null if not available
 */
export function getUsernameFromEvent(event: APIGatewayProxyEventV2): string | null {
  try {
    const authorizer = (event.requestContext as RequestContextWithAuthorizer).authorizer
    const claims = authorizer?.jwt?.claims
    if (!claims) {
      return null
    }

    return (claims['cognito:username'] as string) || null
  } catch (error) {
    console.error('Error extracting username from JWT:', error)
    return null
  }
}

/**
 * Get all JWT claims from event
 *
 * @param event - API Gateway HTTP API event
 * @returns JWT claims object or null if not authenticated
 */
export function getJwtClaims(event: APIGatewayProxyEventV2): Record<string, unknown> | null {
  try {
    const authorizer = (event.requestContext as RequestContextWithAuthorizer).authorizer
    const claims = authorizer?.jwt?.claims
    return claims || null
  } catch (error) {
    console.error('Error extracting JWT claims:', error)
    return null
  }
}
