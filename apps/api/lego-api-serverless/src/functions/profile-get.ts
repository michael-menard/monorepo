/**
 * Get User Profile Lambda Handler
 *
 * GET /api/users/{id} - Retrieve user profile
 *
 * Implementation (Story 4.2):
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
import { validateUserResourceAccess } from '@monorepo/lambda-auth'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/response-utils'
import { getUserProfile } from '@/lib/services/profile-service'
import { checkRateLimit, RATE_LIMIT_CONFIGS } from '@/lib/middleware/rate-limiter'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger('profile-get-handler')

/**
 * GET /api/users/{id} Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const pathParams = event.pathParameters || {}
    logger.info('GET /api/users/{id} - Profile retrieval handler invoked', { pathParams })

    // Validate authentication and authorization (userId must match profile ID)
    const authResult = validateUserResourceAccess(event, 'id', 'profile')

    if (!authResult.authenticated || !authResult.authorized) {
      logger.warn('Auth failed', { error: authResult.error })
      return createErrorResponse(
        authResult.error!.statusCode,
        authResult.error!.code as 'UNAUTHORIZED' | 'FORBIDDEN',
        authResult.error!.message,
      )
    }

    const userId = authResult.userId!

    // Check rate limit (60 requests per minute per user)
    const rateLimitResult = await checkRateLimit(userId, RATE_LIMIT_CONFIGS.profile)

    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for user', {
        userId,
        retryAfter: rateLimitResult.retryAfter,
      })
      return createErrorResponse(
        429,
        'TOO_MANY_REQUESTS',
        `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
        {
          retryAfter: rateLimitResult.retryAfter,
          resetAt: rateLimitResult.resetAt.toISOString(),
        },
      )
    }

    // Get user profile (with caching)
    const profile = await getUserProfile(userId)

    logger.info('Profile retrieved successfully', { userId })
    return createSuccessResponse(profile)
  } catch (error) {
    logger.error('Profile get handler error:', error)

    // Handle user not found
    if (error instanceof Error && error.message === 'User not found in Cognito') {
      return createErrorResponse(404, 'NOT_FOUND', 'User not found')
    }

    return createErrorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred')
  }
}
