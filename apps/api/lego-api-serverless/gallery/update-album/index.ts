/**
 * Update Album Lambda Handler - PATCH /api/albums/:id
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import { getUserIdFromEvent } from '@monorepo/lambda-auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { UpdateAlbumSchema, AlbumIdSchema } from '@/lib/validation/gallery-schemas'
import { db } from '@monorepo/db/client'
import { getRedisClient } from '@/lib/cache/redis-client'
import { indexDocument } from '@/lib/search/opensearch-client'
import { galleryAlbums, galleryImages } from '@monorepo/db/schema'

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) return createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required')

    const albumId = event.pathParameters?.id
    if (!albumId) return createErrorResponse(400, 'BAD_REQUEST', 'Album ID is required')

    AlbumIdSchema.parse({ id: albumId })

    const body = JSON.parse(event.body || '{}')
    const updateData = UpdateAlbumSchema.parse(body)

    const [existingAlbum] = await db
      .select()
      .from(galleryAlbums)
      .where(eq(galleryAlbums.id, albumId))

    if (!existingAlbum) return createErrorResponse(404, 'NOT_FOUND', 'Album not found')
    if (existingAlbum.userId !== userId)
      return createErrorResponse(403, 'FORBIDDEN', 'Access denied to this album')

    if (updateData.coverImageId !== undefined && updateData.coverImageId !== null) {
      const [coverImage] = await db
        .select()
        .from(galleryImages)
        .where(eq(galleryImages.id, updateData.coverImageId))
      if (!coverImage) return createErrorResponse(400, 'VALIDATION_ERROR', 'Cover image not found')
      if (coverImage.userId !== userId)
        return createErrorResponse(403, 'FORBIDDEN', "Cannot use another user's image as cover")
    }

    const [updatedAlbum] = await db
      .update(galleryAlbums)
      .set({ ...updateData, lastUpdatedAt: new Date() })
      .where(eq(galleryAlbums.id, albumId))
      .returning()

    try {
      await indexDocument({
        index: 'gallery_images',
        id: albumId,
        body: {
          type: 'album',
          userId: updatedAlbum.userId,
          title: updatedAlbum.title,
          description: updatedAlbum.description || '',
          coverImageId: updatedAlbum.coverImageId || null,
          createdAt: updatedAlbum.createdAt.toISOString(),
        },
      })
    } catch (error) {
      logger.error('OpenSearch update failed (non-critical):', error)
    }

    const redis = await getRedisClient()
    await redis.del(`gallery:album:detail:${albumId}`)

    try {
      const pattern = `gallery:albums:user:${userId}:*`
      const keys = await redis.keys(pattern)
      if (keys.length > 0) await redis.del(keys)
    } catch (error) {
      logger.error('Redis list cache invalidation failed (non-critical):', error)
    }

    return createSuccessResponse(updatedAlbum)
  } catch (error) {
    logger.error('Update album error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to update album')
  }
}
