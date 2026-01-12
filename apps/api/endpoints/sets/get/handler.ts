import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import {
  successResponse,
  errorResponseFromError,
  UnauthorizedError,
  ValidationError,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'
import { getSetDetail } from '@/endpoints/sets/_shared/sets-service'

const logger = createLogger('sets-get')

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

    const set = await getSetDetail(userId, setId)

    return successResponse(200, {
      success: true,
      data: set,
    })
  } catch (error) {
    logger.error('GET /api/sets/:id error', { requestId, error })
    return errorResponseFromError(error, requestId)
  }
}
