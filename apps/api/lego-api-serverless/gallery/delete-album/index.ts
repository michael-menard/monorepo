/**
 * Delete Album Lambda Handler - DELETE /api/albums/:id
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import { getUserIdFromEvent } from '@monorepo/lambda-auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { AlbumIdSchema } from '@/lib/validation/gallery-schemas'
import { db } from '@monorepo/db/client'
import { getRedisClient } from '@/lib/cache/redis-client'
import { deleteDocument } from '@/lib/search/opensearch-client'
import { galleryAlbums, galleryImages } from '@monorepo/db/schema'

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) return createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required')

    const albumId = event.pathParameters?.id
    if (!albumId) return createErrorResponse(400, 'BAD_REQUEST', 'Album ID is required')

    AlbumIdSchema.parse({ id: albumId })

    const [existingAlbum] = await db
      .select()
      .from(galleryAlbums)
      .where(eq(galleryAlbums.id, albumId))

    if (!existingAlbum) return createErrorResponse(404, 'NOT_FOUND', 'Album not found')
    if (existingAlbum.userId !== userId)
      return createErrorResponse(403, 'FORBIDDEN', 'Access denied to this album')

    // Set albumId=null for all images in this album (do not delete images)
    await db
      .update(galleryImages)
      .set({ albumId: null, lastUpdatedAt: new Date() })
      .where(eq(galleryImages.albumId, albumId))

    await db.delete(galleryAlbums).where(eq(galleryAlbums.id, albumId))

    try {
      await deleteDocument({
        index: 'gallery_images',
        id: albumId,
      })
    } catch (error) {
      logger.error('OpenSearch delete failed (non-critical):', error)
    }

    const redis = await getRedisClient()
    await redis.del(`gallery:album:detail:${albumId}`)

    try {
      const pattern = `gallery:albums:user:${userId}:*`
      const keys = await redis.keys(pattern)
      if (keys.length > 0) await redis.del(keys)
    } catch (error) {
      logger.error('Redis album cache invalidation failed (non-critical):', error)
    }

    try {
      const pattern = `gallery:images:user:${userId}:*`
      const keys = await redis.keys(pattern)
      if (keys.length > 0) await redis.del(keys)
    } catch (error) {
      logger.error('Redis image cache invalidation failed (non-critical):', error)
    }

    return createSuccessResponse({ message: 'Album deleted successfully' }, 204)
  } catch (error) {
    logger.error('Delete album error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to delete album')
  }
}
