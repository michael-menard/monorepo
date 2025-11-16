/**
 * Update User Profile Lambda Handler
 *
 * PATCH /api/users/{id} - Update user profile
 *
 * Implementation (Story 4.3):
 * - Validate request body (name field)
 * - Update Cognito User Pool attributes via AdminUpdateUserAttributesCommand
 * - Invalidate Redis cache
 * - Return updated profile
 *
 * Authorization: User can only update their own profile (userId from JWT must match {id} parameter)
 * Data Source: AWS Cognito User Pool
 * Caching: Invalidates Redis cache after update
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { ZodError } from 'zod'
import { validateUserResourceAccess } from '@monorepo/lambda-auth'
import { createErrorResponse, createSuccessResponse } from '@/lib/utils/response-utils'
import { createLogger } from '@/lib/utils/logger'
import { UpdateProfileSchema } from '@/lib/validation/profile-schemas'
import { updateUserProfile } from '@/lib/services/profile-service'

const logger = createLogger('profile-update-handler')

/**
 * PATCH /api/users/{id} Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const pathParams = event.pathParameters || {}
    logger.info('PATCH /api/users/{id} - Profile update handler invoked', { pathParams })

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

    // Parse and validate request body
    let updateData
    try {
      const body = event.body ? JSON.parse(event.body) : {}
      updateData = UpdateProfileSchema.parse(body)
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        logger.warn('Validation failed', { userId, errors: error.issues })
        return createErrorResponse(400, 'VALIDATION_ERROR', errorMessages)
      }

      if (error instanceof SyntaxError) {
        logger.warn('Invalid JSON in request body', { userId })
        return createErrorResponse(400, 'VALIDATION_ERROR', 'Invalid JSON in request body')
      }

      throw error
    }

    // Update profile in Cognito and invalidate cache
    const updatedProfile = await updateUserProfile(userId, updateData)

    logger.info('Profile updated successfully', { userId })
    return createSuccessResponse(updatedProfile)
  } catch (error) {
    logger.error('Profile update handler error:', error)

    // Handle specific error cases
    if (error instanceof Error) {
      // User not found in Cognito
      if (error.message === 'User not found in Cognito') {
        return createErrorResponse(404, 'NOT_FOUND', 'User not found')
      }

      // Cognito update failure
      if (error.message.includes('Failed to update Cognito')) {
        return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to update user profile')
      }
    }

    return createErrorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred')
  }
}
