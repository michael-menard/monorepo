/**
 * Link Gallery Image to MOC Lambda Handler
 *
 * POST /api/mocs/:id/gallery-images
 * Links an existing gallery image to a MOC instruction
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@monorepo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { db } from '@/core/database/client'
import { mocInstructions, galleryImages, mocGalleryImages } from '@/core/database/schema'

/**
 * Link Gallery Image Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    const mocId = event.pathParameters?.id
    const body = JSON.parse(event.body || '{}')
    const { galleryImageId } = body

    if (!mocId || !galleryImageId) {
      return errorResponse(400, 'VALIDATION_ERROR', 'MOC ID and Gallery Image ID are required')
    }

    // Verify MOC exists and user owns it
    const [moc] = await db
      .select()
      .from(mocInstructions)
      .where(and(eq(mocInstructions.id, mocId), eq(mocInstructions.userId, userId)))
      .limit(1)

    if (!moc) {
      logger.warn(`MOC not found or unauthorized: ${mocId}`, { userId, mocId })
      return errorResponse(404, 'NOT_FOUND', 'MOC not found or you do not have permission')
    }

    // Verify gallery image exists
    const [image] = await db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.id, galleryImageId))
      .limit(1)

    if (!image) {
      return errorResponse(404, 'NOT_FOUND', 'Gallery image not found')
    }

    // Check if link already exists
    const [existingLink] = await db
      .select()
      .from(mocGalleryImages)
      .where(
        and(eq(mocGalleryImages.mocId, mocId), eq(mocGalleryImages.galleryImageId, galleryImageId)),
      )
      .limit(1)

    if (existingLink) {
      return errorResponse(409, 'CONFLICT', 'Image is already linked to this MOC')
    }

    // Create the link
    const [link] = await db
      .insert(mocGalleryImages)
      .values({
        mocId,
        galleryImageId,
      })
      .returning()

    logger.info(`Gallery image linked to MOC: ${galleryImageId} -> ${mocId}`, {
      userId,
      mocId,
      galleryImageId,
    })

    return successResponse(201, {
      message: 'Gallery image linked successfully',
      link,
    })
  } catch (error) {
    logger.error('Error in link-gallery-image handler:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to link gallery image')
  }
}
