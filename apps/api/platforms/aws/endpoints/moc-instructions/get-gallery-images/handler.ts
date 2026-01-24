/**
 * Get MOC Gallery Images Lambda Handler
 *
 * GET /api/mocs/:id/gallery-images
 * Retrieves all gallery images linked to a MOC
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq } from 'drizzle-orm'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { logger } from '@/core/observability/logger'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { db } from '@/core/database/client'
import { mocInstructions, galleryImages, mocGalleryImages } from '@/core/database/schema'

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    const mocId = event.pathParameters?.id

    if (!mocId) {
      return errorResponse(400, 'VALIDATION_ERROR', 'MOC ID is required')
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

    // Get linked gallery images with full image data
    const linkedImages = await db
      .select({
        id: galleryImages.id,
        title: galleryImages.title,
        description: galleryImages.description,
        url: galleryImages.imageUrl,
        tags: galleryImages.tags,
        createdAt: galleryImages.createdAt,
        lastUpdatedAt: galleryImages.lastUpdatedAt,
      })
      .from(mocGalleryImages)
      .innerJoin(galleryImages, eq(mocGalleryImages.galleryImageId, galleryImages.id))
      .where(eq(mocGalleryImages.mocId, mocId))
      .orderBy(galleryImages.createdAt)

    logger.info(`Retrieved ${linkedImages.length} gallery images for MOC ${mocId}`, {
      userId,
      mocId,
      count: linkedImages.length,
    })

    return successResponse(200, {
      images: linkedImages,
      total: linkedImages.length,
    })
  } catch (error) {
    logger.error('Error in get-moc-gallery-images handler:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to get gallery images')
  }
}
