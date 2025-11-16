/**
 * Delete User Avatar Lambda Handler
 *
 * DELETE /api/users/{id}/avatar - Delete user avatar
 *
 * Story 4.5 will implement:
 * - Delete avatar from S3 (avatars/{userId}/avatar.webp)
 * - Update Cognito picture attribute (remove URL)
 * - Invalidate Redis cache
 * - Return 204 No Content
 *
 * Authorization: User can only delete their own avatar (userId from JWT must match {id} parameter)
 * Storage: S3 bucket (avatars/{userId}/avatar.webp)
 * Caching: Invalidates Redis cache after deletion
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { getUserIdFromEvent } from '@/lib/auth/jwt-utils'
import { createErrorResponse } from '@/lib/utils/response-utils'
import { logger } from '@/lib/utils/logger'

/**
 * DELETE /api/users/{id}/avatar Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const pathParams = event.pathParameters || {}

    logger.info('DELETE /api/users/{id}/avatar - Avatar delete handler invoked', { pathParams })

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

    // Authorization check: user can only delete their own avatar
    if (userId !== profileId) {
      logger.warn('Authorization failed - user attempting to delete avatar for another profile', {
        userId,
        profileId,
      })
      return createErrorResponse(403, 'FORBIDDEN', 'Cannot delete avatar for another user')
    }

    // Placeholder implementation for Story 4.1 (infrastructure setup)
    // Story 4.5 will implement the full avatar deletion logic
    logger.info('DELETE /api/users/{id}/avatar - Not yet implemented (Story 4.5)', { userId })

    return createErrorResponse(
      501,
      'INTERNAL_ERROR',
      'Avatar deletion will be implemented in Story 4.5',
    )
  } catch (error) {
    logger.error('Avatar delete handler error:', error)
    return createErrorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred')
  }
}
