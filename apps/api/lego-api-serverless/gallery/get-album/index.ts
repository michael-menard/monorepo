/**
 * Get Album Lambda Handler - GET /api/albums/:id
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq, desc } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import { getUserIdFromEvent } from '@/lib/auth/jwt-utils'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { AlbumIdSchema } from '@/lib/validation/gallery-schemas'
import { db } from '@monorepo/db/client'
import { getRedisClient } from '@/lib/cache/redis-client'
import { galleryAlbums, galleryImages } from '@monorepo/db/schema'

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) return createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required')

    const albumId = event.pathParameters?.id
    if (!albumId) return createErrorResponse(400, 'BAD_REQUEST', 'Album ID is required')

    AlbumIdSchema.parse({ id: albumId })

    const cacheKey = `gallery:album:detail:${albumId}`
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) {
      const album = JSON.parse(cached)
      if (album.userId !== userId) {
        return createErrorResponse(403, 'FORBIDDEN', 'Access denied to this album')
      }
      return createSuccessResponse(album)
    }

    const [album] = await db.select().from(galleryAlbums).where(eq(galleryAlbums.id, albumId))

    if (!album) return createErrorResponse(404, 'NOT_FOUND', 'Album not found')
    if (album.userId !== userId) return createErrorResponse(403, 'FORBIDDEN', 'Access denied to this album')

    const images = await db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.albumId, albumId))
      .orderBy(desc(galleryImages.createdAt))

    const response = {
      ...album,
      images,
      imageCount: images.length,
    }

    await redis.setEx(cacheKey, 600, JSON.stringify(response))

    return createSuccessResponse(response)
  } catch (error) {
    logger.error('Get album error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get album')
  }
}
