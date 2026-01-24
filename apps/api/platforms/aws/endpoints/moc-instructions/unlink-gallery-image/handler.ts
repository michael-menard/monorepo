/**
 * Unlink Gallery Image from MOC Lambda Handler
 *
 * DELETE /api/mocs/:id/gallery-images/:galleryImageId
 * Removes the association between a gallery image and a MOC
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq, and } from 'drizzle-orm'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { logger } from '@/core/observability/logger'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { db } from '@/core/database/client'
import { mocInstructions, mocGalleryImages } from '@/core/database/schema'

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    const mocId = event.pathParameters?.id
    const galleryImageId = event.pathParameters?.galleryImageId

    if (!mocId || !galleryImageId) {
      return errorResponse(400, 'VALIDATION_ERROR', 'MOC ID and Gallery Image ID are required')
    }

    // Verify MOC exists and ownership
    const [moc] = await db
      .select()
      .from(mocInstructions)
      .where(eq(mocInstructions.id, mocId))
      .limit(1)

    if (!moc) {
      return errorResponse(404, 'NOT_FOUND', 'MOC not found')
    }
    if (moc.userId !== userId) {
      return errorResponse(403, 'FORBIDDEN', 'You do not own this MOC')
    }

    // Check if link exists
    const [link] = await db
      .select()
      .from(mocGalleryImages)
      .where(
        and(eq(mocGalleryImages.mocId, mocId), eq(mocGalleryImages.galleryImageId, galleryImageId)),
      )
      .limit(1)

    if (!link) {
      return errorResponse(404, 'NOT_FOUND', 'Image is not linked to this MOC')
    }

    // Delete the link
    await db
      .delete(mocGalleryImages)
      .where(
        and(eq(mocGalleryImages.mocId, mocId), eq(mocGalleryImages.galleryImageId, galleryImageId)),
      )

    logger.info(`Gallery image unlinked from MOC: ${galleryImageId} -> ${mocId}`, {
      userId,
      mocId,
      galleryImageId,
    })

    return successResponse(200, {
      message: 'Gallery image unlinked successfully',
    })
  } catch (error) {
    logger.error('Error in unlink-gallery-image handler:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to unlink gallery image')
  }
}
