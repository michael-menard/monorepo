import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { asc, eq } from 'drizzle-orm'

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
import { RegisterImageSchema } from '@/endpoints/sets/schemas'

const logger = createLogger('sets-images-register')

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId = event.requestContext.requestId ?? 'unknown'

  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required', { requestId })
    }

    const setId = event.pathParameters?.id
    if (!setId) {
      throw new ValidationError('Set ID is required')
    }

    let body: unknown
    try {
      body = JSON.parse(event.body || '{}')
    } catch {
      throw new ValidationError('Invalid JSON body')
    }

    const parsed = RegisterImageSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Invalid request body', {
        errors: parsed.error.flatten(),
      })
    }

    const { imageUrl, thumbnailUrl } = parsed.data

    const db = await getDbAsync()

    const [setRow] = await db
      .select({ userId: mocInstructions.userId, type: mocInstructions.type })
      .from(mocInstructions)
      .where(eq(mocInstructions.id, setId))
      .limit(1)

    if (!setRow) {
      throw new NotFoundError('Set not found')
    }
    if (setRow.userId !== userId || setRow.type !== 'set') {
      throw new ForbiddenError('Not authorized to modify this set')
    }

    const existing = await db
      .select({ position: setImages.position })
      .from(setImages)
      .where(eq(setImages.setId, setId))
      .orderBy(asc(setImages.position))

    const nextPosition =
      existing.length === 0 ? 0 : Math.max(...existing.map(r => r.position)) + 1

    const [img] = await db
      .insert(setImages)
      .values({
        setId,
        imageUrl,
        thumbnailUrl: thumbnailUrl ?? null,
        position: nextPosition,
      })
      .returning()

    logger.info('Registered set image', {
      requestId,
      userId,
      setId,
      imageId: img.id,
      position: img.position,
    })

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify({
        id: img.id,
        imageUrl: img.imageUrl,
        thumbnailUrl: img.thumbnailUrl,
        position: img.position,
      }),
    }
  } catch (error) {
    logger.error('Register set image error', { requestId, error })
    return errorResponseFromError(error, requestId)
  }
}
