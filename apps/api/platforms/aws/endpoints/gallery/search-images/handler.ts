/**
 * Search Gallery Images Lambda Handler
 *
 * GET /api/images/search
 * Search gallery images using OpenSearch with PostgreSQL fallback
 * Story 3.8: Gallery and Wishlist Search
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { logger } from '@/core/observability/logger'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { SearchGalleryImagesQuerySchema } from '@/endpoints/gallery/schemas'
import { getRedisClient } from '@/core/cache/redis'
import { searchGalleryImages, hashQuery } from '@/core/search/utils'

/**
 * Search Gallery Images Handler
 *
 * Story 3.8 AC #1: Search via OpenSearch multi-match on title, description, tags
 * Story 3.8 AC #3: User ID filter enforced
 * Story 3.8 AC #4: PostgreSQL fallback if OpenSearch unavailable
 * Story 3.8 AC #5: Pagination with page and limit
 * Story 3.8 AC #6: Fuzzy matching enabled
 * Story 3.8 AC #7: Sorted by relevance score
 * Story 3.8 AC #8: Response includes total hits
 * Story 3.8 AC #10: Redis caching with 2-minute TTL
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Validate query parameters
    const queryParams = SearchGalleryImagesQuerySchema.parse(event.queryStringParameters || {})
    const { search, page, limit } = queryParams

    // Generate cache key with MD5 hash of query
    const queryHash = hashQuery(search)
    const cacheKey = `gallery:search:${userId}:query:${queryHash}:page:${page}:limit:${limit}`

    // Check Redis cache
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) {
      logger.info('Gallery search cache hit', { userId, query: search, page, limit })
      return successResponse(JSON.parse(cached))
    }

    // Execute search with OpenSearch (or PostgreSQL fallback)
    const searchResult = await searchGalleryImages({
      query: search,
      userId,
      page,
      limit,
    })

    // Build response
    const response = {
      success: true,
      data: searchResult.data,
      total: searchResult.total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(searchResult.total / limit),
      },
      timestamp: new Date().toISOString(),
    }

    // Cache result for 2 minutes (120 seconds)
    await redis.setEx(cacheKey, 120, JSON.stringify(response))

    logger.info('Gallery search completed', {
      userId,
      query: search,
      page,
      limit,
      resultCount: searchResult.data.length,
      total: searchResult.total,
      source: searchResult.source,
      duration: searchResult.duration,
    })

    return successResponse(response)
  } catch (error) {
    logger.error('Search images error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    if (error instanceof Error && error.message.includes('Search service unavailable')) {
      return errorResponse(500, 'SEARCH_ERROR', 'Search service is currently unavailable')
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to search images')
  }
}
