import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import {
  successResponse,
  errorResponseFromError,
  UnauthorizedError,
  ValidationError,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'
import { createSet } from '@/endpoints/sets/_shared/sets-service'

const logger = createLogger('sets-create')

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId ?? 'unknown'

  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      throw new UnauthorizedError('Authentication required')
    }

    if (!event.body) {
      throw new ValidationError('Request body is required')
    }

    let body: unknown
    try {
      body = JSON.parse(event.body)
    } catch {
      throw new ValidationError('Invalid JSON body')
    }

    const set = await createSet(userId, body)

    return successResponse(201, {
      success: true,
      data: set,
    })
  } catch (error) {
    logger.error('POST /api/sets error', { requestId, error })
    return errorResponseFromError(error, requestId)
  }
}
