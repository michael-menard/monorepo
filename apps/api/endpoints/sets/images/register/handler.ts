import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { z } from 'zod'
import { desc, eq } from 'drizzle-orm'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { db } from '@/core/database/client'
import { sets, setImages } from '@/core/database/schema'
import type { SetImage } from '@repo/api-client/schemas/sets'

/**
 * Register Set Image
 *
 * POST /api/sets/:id/images
 *
 * Registers an uploaded image in the set_images table and returns SetImage JSON.
 */

const PathParamsSchema = z.object({
  id: z.string().uuid('Invalid set ID'),
})

const RegisterBodySchema = z.object({
  imageUrl: z.string().url('imageUrl must be a valid URL'),
  key: z.string().min(1, 'S3 key is required'),
  thumbnailUrl: z.string().url().optional(),
})

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    const pathParams = PathParamsSchema.safeParse(event.pathParameters ?? {})
    if (!pathParams.success) {
      return errorResponse(400, 'BAD_REQUEST', 'Set ID is required')
    }

    const { id: setId } = pathParams.data

    if (!event.body) {
      return errorResponse(400, 'BAD_REQUEST', 'Request body is required')
    }

    let parsedBody: unknown
    try {
      parsedBody = JSON.parse(event.body)
    } catch {
      return errorResponse(400, 'BAD_REQUEST', 'Invalid JSON in request body')
    }

    const body = RegisterBodySchema.parse(parsedBody)

    // Verify set exists and is owned by the current user
    const [setRow] = await db
      .select({ id: sets.id, userId: sets.userId })
      .from(sets)
      .where(eq(sets.id, setId))
      .limit(1)

    if (!setRow) {
      return errorResponse(404, 'NOT_FOUND', 'Set not found')
    }

    if (setRow.userId !== userId) {
      return errorResponse(403, 'FORBIDDEN', 'You do not have permission to modify this set')
    }

    // Determine next image position (0-based)
    const [lastImage] = await db
      .select({ position: setImages.position })
      .from(setImages)
      .where(eq(setImages.setId, setId))
      .orderBy(desc(setImages.position))
      .limit(1)

    const nextPosition = (lastImage?.position ?? 0) + (lastImage ? 1 : 0)

    const [imageRow] = await db
      .insert(setImages)
      .values({
        setId,
        imageUrl: body.imageUrl,
        thumbnailUrl: body.thumbnailUrl ?? null,
        position: nextPosition,
      })
      .returning()

    const image: SetImage = {
      id: imageRow.id,
      imageUrl: imageRow.imageUrl,
      thumbnailUrl: imageRow.thumbnailUrl ?? null,
      position: imageRow.position,
    }

    logger.info('Set image registered', {
      userId,
      setId,
      imageId: image.id,
    })

    return successResponse(image, 201)
  } catch (error) {
    logger.error('Register set image error:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }

    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to register image')
  }
}
