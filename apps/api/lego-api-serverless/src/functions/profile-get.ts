/**
 * Get User Profile Lambda Handler
 *
 * GET /api/users/{id} - Retrieve user profile
 *
 * Story 4.2 will implement:
 * - Query Cognito User Pool for profile attributes
 * - Query PostgreSQL for user statistics (MOCs, images, wishlist items)
 * - Check Redis cache first (10-minute TTL)
 * - Return combined profile response
 *
 * Authorization: User can only access their own profile (userId from JWT must match {id} parameter)
 * Data Source: AWS Cognito User Pool (not PostgreSQL)
 * Caching: Redis with 10-minute TTL
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { getUserIdFromEvent } from '@/lib/auth/jwt-utils'
import { createErrorResponse } from '@/lib/utils/response-utils'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/users/{id} Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const pathParams = event.pathParameters || {}

    logger.info('GET /api/users/{id} - Profile retrieval handler invoked', { pathParams })

    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      logger.warn('Unauthorized access attempt - no user ID in JWT')
      return createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Extract profile ID from path parameter
    const profileId = pathParams.id
    if (!profileId) {
      logger.warn('Missing profile ID in path parameters')
      return createErrorResponse(400, 'VALIDATION_ERROR', 'Profile ID is required')
    }

    // Authorization check: user can only access their own profile
    if (userId !== profileId) {
      logger.warn('Authorization failed - user attempting to access another profile', {
        userId,
        profileId,
      })
      return createErrorResponse(403, 'FORBIDDEN', "Cannot access another user's profile")
    }

    // Placeholder implementation for Story 4.1 (infrastructure setup)
    // Story 4.2 will implement the full profile retrieval logic
    logger.info('GET /api/users/{id} - Not yet implemented (Story 4.2)', { userId })

    return createErrorResponse(
      501,
      'INTERNAL_ERROR',
      'Profile retrieval will be implemented in Story 4.2',
    )
  } catch (error) {
    logger.error('Profile get handler error:', error)
    return createErrorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred')
  }
}
