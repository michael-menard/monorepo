/**
 * List Albums Lambda Handler - GET /api/albums
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq, desc, count, sql } from 'drizzle-orm'
import { logger } from '@/lib/utils/logger'
import { getUserIdFromEvent } from '@/lib/auth/jwt-utils'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { ListAlbumsQuerySchema } from '@/lib/validation/gallery-schemas'
import { db } from '@monorepo/db/client'
import { getRedisClient } from '@/lib/cache/redis-client'
import { galleryAlbums, galleryImages } from '@monorepo/db/schema'

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    const queryParams = ListAlbumsQuerySchema.parse(event.queryStringParameters || {})
    const { page, limit, search } = queryParams

    const cacheKey = `gallery:albums:user:${userId}:page:${page}:limit:${limit}:search:${search || 'none'}`

    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) {
      return createSuccessResponse(JSON.parse(cached))
    }

    const offset = (page - 1) * limit

    const albums = await db
      .select({
        id: galleryAlbums.id,
        userId: galleryAlbums.userId,
        title: galleryAlbums.title,
        description: galleryAlbums.description,
        coverImageId: galleryAlbums.coverImageId,
        createdAt: galleryAlbums.createdAt,
        lastUpdatedAt: galleryAlbums.lastUpdatedAt,
        imageCount: sql<number>`CAST(COUNT(${galleryImages.id}) AS INTEGER)`,
        coverImageUrl: sql<
          string | null
        >`MAX(CASE WHEN ${galleryImages.id} = ${galleryAlbums.coverImageId} THEN ${galleryImages.imageUrl} ELSE NULL END)`,
      })
      .from(galleryAlbums)
      .leftJoin(galleryImages, eq(galleryImages.albumId, galleryAlbums.id))
      .where(eq(galleryAlbums.userId, userId))
      .groupBy(galleryAlbums.id)
      .orderBy(desc(galleryAlbums.createdAt))
      .limit(limit)
      .offset(offset)

    const [{ total }] = await db
      .select({ total: count() })
      .from(galleryAlbums)
      .where(eq(galleryAlbums.userId, userId))

    const response = {
      data: albums,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    }

    await redis.setEx(cacheKey, 300, JSON.stringify(response))

    return createSuccessResponse(response)
  } catch (error) {
    logger.error('List albums error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to list albums')
  }
}
