import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import {
  successResponse,
  errorResponseFromError,
  UnauthorizedError,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'
import { listSets } from '@/endpoints/sets/_shared/sets-service'

const logger = createLogger('sets-list')

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId ?? 'unknown'

  try {
    logger.info('GET /api/sets invoked', {
      requestId,
      path: event.rawPath,
      query: event.queryStringParameters,
    })

    const userId = getUserIdFromEvent(event)
    if (!userId) {
      throw new UnauthorizedError('Authentication required')
    }

    const result = await listSets(userId, event.queryStringParameters ?? {})

    return successResponse(200, {
      success: true,
      ...result,
    })
  } catch (error) {
    logger.error('GET /api/sets error', { requestId, error })
    return errorResponseFromError(error, requestId)
  }
}
