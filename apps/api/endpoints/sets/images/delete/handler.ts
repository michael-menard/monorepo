import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { and, eq } from 'drizzle-orm'

import { getUserIdFromEvent } from '@repo/lambda-auth'
import {
  errorResponse,
  errorResponseFromError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'
import { getDbAsync } from '@/core/database/client'
import { mocInstructions, setImages } from '@/core/database/schema'
import { cleanupS3Images } from '@/endpoints/sets/_shared/set-images-s3'

const logger = createLogger('sets-images-delete')

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId ?? 'unknown'

  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required', { requestId })
    }

    const setId = event.pathParameters?.id
    const imageId = event.pathParameters?.imageId
    if (!setId || !imageId) {
      throw new ValidationError('Set ID and image ID are required')
    }

    const db = await getDbAsync()

    const [row] = await db
      .select({
        imageId: setImages.id,
        imageUrl: setImages.imageUrl,
        thumbnailUrl: setImages.thumbnailUrl,
        ownerId: mocInstructions.userId,
        type: mocInstructions.type,
      })
      .from(setImages)
      .innerJoin(
        mocInstructions,
        and(eq(setImages.setId, mocInstructions.id), eq(mocInstructions.id, setId)),
      )
      .where(eq(setImages.id, imageId))
      .limit(1)

    if (!row) {
      throw new NotFoundError('Image not found')
    }
    if (row.ownerId !== userId || row.type !== 'set') {
      throw new ForbiddenError('Not authorized to delete this image')
    }

    await db.delete(setImages).where(eq(setImages.id, imageId))

    cleanupS3Images([{ imageUrl: row.imageUrl, thumbnailUrl: row.thumbnailUrl }]).catch(err => {
      logger.error('Failed to cleanup S3 for deleted set image', { imageId, err })
    })

    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: '',
    }
  } catch (error) {
    logger.error('Delete set image error', { requestId, error })
    return errorResponseFromError(error, requestId)
  }
}
