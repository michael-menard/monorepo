/**
 * Get Set Lambda Handler
 *
 * GET /api/sets/{id}
 *
 * Returns a single set with images for the authenticated user.
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { logger } from '@/core/observability/logger'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { db } from '@/core/database/client'
import { sets, setImages } from '@/core/database/schema'

const SetIdSchema = z.object({
  id: z.string().uuid('Invalid set ID format'),
})

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    const id = event.pathParameters?.id
    if (!id) {
      return errorResponse(400, 'BAD_REQUEST', 'Set ID is required')
    }

    SetIdSchema.parse({ id })

    const rows = await db
      .select({
        id: sets.id,
        userId: sets.userId,
        title: sets.title,
        setNumber: sets.setNumber,
        store: sets.store,
        sourceUrl: sets.sourceUrl,
        pieceCount: sets.pieceCount,
        releaseDate: sets.releaseDate,
        theme: sets.theme,
        tags: sets.tags,
        notes: sets.notes,
        isBuilt: sets.isBuilt,
        quantity: sets.quantity,
        purchasePrice: sets.purchasePrice,
        tax: sets.tax,
        shipping: sets.shipping,
        purchaseDate: sets.purchaseDate,
        wishlistItemId: sets.wishlistItemId,
        createdAt: sets.createdAt,
        updatedAt: sets.updatedAt,
        imageId: setImages.id,
        imageUrl: setImages.imageUrl,
        thumbnailUrl: setImages.thumbnailUrl,
        position: setImages.position,
      })
      .from(sets)
      .leftJoin(setImages, eq(setImages.setId, sets.id))
      .where(eq(sets.id, id))
      .orderBy(asc(setImages.position))

    if (rows.length === 0) {
      return errorResponse(404, 'NOT_FOUND', 'Set not found')
    }

    const base = rows[0]

    if (base.userId !== userId) {
      return errorResponse(403, 'FORBIDDEN', 'You do not have permission to access this set')
    }

    const set = {
      id: base.id,
      userId: base.userId,
      title: base.title,
      setNumber: base.setNumber,
      store: base.store,
      sourceUrl: base.sourceUrl,
      pieceCount: base.pieceCount,
      releaseDate: base.releaseDate,
      theme: base.theme,
      tags: base.tags ?? [],
      notes: base.notes,
      isBuilt: base.isBuilt,
      quantity: base.quantity,
      purchasePrice: base.purchasePrice,
      tax: base.tax,
      shipping: base.shipping,
      purchaseDate: base.purchaseDate,
      wishlistItemId: base.wishlistItemId,
      images: rows
        .filter(row => row.imageId)
        .map(row => ({
          id: row.imageId!,
          imageUrl: row.imageUrl!,
          thumbnailUrl: row.thumbnailUrl,
          position: row.position ?? 0,
        })),
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
    }

    logger.info('Set retrieved', { userId, setId: id })

    return successResponse(set)
  } catch (error) {
    logger.error('Get set error:', error)

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }

    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to get set')
  }
}
