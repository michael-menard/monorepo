/**
 * Create Album Lambda Handler
 *
 * POST /api/albums
 * Creates a new gallery album
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@monorepo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { CreateAlbumSchema } from '@/endpoints/gallery/schemas'
import { db } from '@/core/database/client'
import { getRedisClient } from '@/core/cache/redis'
import { indexDocument } from '@/core/search/opensearch'
import { galleryAlbums, galleryImages } from '@/core/database/schema'

/**
 * Create Album Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}')
    const albumData = CreateAlbumSchema.parse(body)

    // Generate unique ID for album
    const albumId = uuidv4()

    // If coverImageId is provided, verify it exists and belongs to user
    if (albumData.coverImageId) {
      const [coverImage] = await db
        .select()
        .from(galleryImages)
        .where(eq(galleryImages.id, albumData.coverImageId))

      if (!coverImage) {
        return errorResponse(400, 'VALIDATION_ERROR', 'Cover image not found')
      }

      if (coverImage.userId !== userId) {
        return errorResponse(403, 'FORBIDDEN', "Cannot use another user's image as cover")
      }
    }

    // Create database record
    const [newAlbum] = await db
      .insert(galleryAlbums)
      .values({
        id: albumId,
        userId,
        title: albumData.title,
        description: albumData.description || null,
        coverImageId: albumData.coverImageId || null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      })
      .returning()

    // Index in OpenSearch
    try {
      await indexDocument({
        index: 'gallery_images',
        id: albumId,
        body: {
          type: 'album',
          userId,
          title: albumData.title,
          description: albumData.description || '',
          coverImageId: albumData.coverImageId || null,
          createdAt: newAlbum.createdAt.toISOString(),
        },
      })
    } catch (error) {
      logger.error('OpenSearch indexing failed (non-critical):', error)
    }

    // Invalidate album list cache
    try {
      const redis = await getRedisClient()
      const pattern = `gallery:albums:user:${userId}:*`
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(keys)
        logger.info(`Invalidated ${keys.length} album cache keys for user ${userId}`)
      }
    } catch (error) {
      logger.error('Redis cache invalidation failed (non-critical):', error)
    }

    // Build response with imageCount = 0
    return successResponse(
      {
        id: newAlbum.id,
        userId: newAlbum.userId,
        title: newAlbum.title,
        description: newAlbum.description,
        coverImageId: newAlbum.coverImageId,
        createdAt: newAlbum.createdAt,
        lastUpdatedAt: newAlbum.lastUpdatedAt,
        imageCount: 0,
        coverImageUrl: null,
      },
      201,
    )
  } catch (error) {
    logger.error('Create album error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to create album')
  }
}
