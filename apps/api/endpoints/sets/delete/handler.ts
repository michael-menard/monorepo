import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import {
  successResponse,
  errorResponseFromError,
  UnauthorizedError,
  ValidationError,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'
import { deleteSet } from '@/endpoints/sets/_shared/sets-service'
import { cleanupS3Images } from '@/endpoints/sets/_shared/set-images-s3'

const logger = createLogger('sets-delete')

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId ?? 'unknown'

  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      throw new UnauthorizedError('Authentication required')
    }

    const setId = event.pathParameters?.id
    if (!setId) {
      throw new ValidationError('Set ID is required')
    }

    const { imagesForCleanup } = await deleteSet(userId, setId)

    cleanupS3Images(imagesForCleanup).catch(err => {
      logger.error('S3 cleanup failed for deleted set', { requestId, setId, err })
    })

    return successResponse(204, {
      success: true,
      message: 'Set deleted',
    })
  } catch (error) {
    logger.error('DELETE /api/sets/:id error', { requestId, error })
    return errorResponseFromError(error, requestId)
  }
}
