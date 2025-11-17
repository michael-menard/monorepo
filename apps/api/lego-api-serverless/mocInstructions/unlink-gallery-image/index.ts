/**
 * Unlink Gallery Image from MOC Lambda Handler
 *
 * DELETE /api/mocs/:id/gallery-images/:galleryImageId
 * Removes the association between a gallery image and a MOC
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import { getUserIdFromEvent } from '@/lib/auth/jwt-utils'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { db } from '@monorepo/db/client'
import { mocInstructions, mocGalleryImages } from '@monorepo/db/schema'

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    const mocId = event.pathParameters?.id
    const galleryImageId = event.pathParameters?.galleryImageId

    if (!mocId || !galleryImageId) {
      return createErrorResponse(400, 'VALIDATION_ERROR', 'MOC ID and Gallery Image ID are required')
    }

    // Verify MOC ownership
    const [moc] = await db
      .select()
      .from(mocInstructions)
      .where(and(eq(mocInstructions.id, mocId), eq(mocInstructions.userId, userId)))
      .limit(1)

    if (!moc) {
      return createErrorResponse(404, 'NOT_FOUND', 'MOC not found or unauthorized')
    }

    // Check if link exists
    const [link] = await db
      .select()
      .from(mocGalleryImages)
      .where(and(eq(mocGalleryImages.mocId, mocId), eq(mocGalleryImages.galleryImageId, galleryImageId)))
      .limit(1)

    if (!link) {
      return createErrorResponse(404, 'NOT_FOUND', 'Image is not linked to this MOC')
    }

    // Delete the link
    await db
      .delete(mocGalleryImages)
      .where(and(eq(mocGalleryImages.mocId, mocId), eq(mocGalleryImages.galleryImageId, galleryImageId)))

    logger.info(`Gallery image unlinked from MOC: ${galleryImageId} -> ${mocId}`, { userId, mocId, galleryImageId })

    return createSuccessResponse(200, {
      message: 'Gallery image unlinked successfully',
    })
  } catch (error) {
    logger.error('Error in unlink-gallery-image handler:', error)
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to unlink gallery image')
  }
}
