/**
 * Search Wishlist Items Lambda Handler
 *
 * GET /api/wishlist/search
 *
 * Search wishlist items via OpenSearch with multi-match on title, description, category.
 * PostgreSQL fallback if OpenSearch unavailable.
 * Results cached in Redis for 2 minutes.
 *
 * Story 3.8 AC #2: Search via OpenSearch multi-match on title, description, category
 * Story 3.8 AC #3: User ID filter enforced
 * Story 3.8 AC #4: PostgreSQL fallback if OpenSearch unavailable
 * Story 3.8 AC #5: Pagination with page and limit
 * Story 3.8 AC #6: Fuzzy matching enabled
 * Story 3.8 AC #7: Sorted by relevance score
 * Story 3.8 AC #8: Response includes total hits
 * Story 3.8 AC #10: Redis caching with 2-minute TTL
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { ZodError } from 'zod'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { SearchWishlistQuerySchema } from '@/endpoints/wishlist/schemas'
import { getRedisClient } from '@/core/cache/redis'
import { searchWishlistItems, hashQuery } from '@/core/search/utils'

/**
 * Search Wishlist Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Validate query parameters
    const queryParams = SearchWishlistQuerySchema.parse(event.queryStringParameters || {})
    const { search, page, limit } = queryParams

    // Generate cache key with MD5 hash of query
    const queryHash = hashQuery(search)
    const cacheKey = `wishlist:search:${userId}:query:${queryHash}:page:${page}:limit:${limit}`

    // Check Redis cache
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) {
      logger.info('Wishlist search cache hit', { userId, query: search, page, limit })
      return successResponse(JSON.parse(cached))
    }

    // Execute search with OpenSearch (or PostgreSQL fallback)
    const searchResult = await searchWishlistItems({
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

    logger.info('Wishlist search completed', {
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
    logger.error('Search wishlist error:', error)
    if (error instanceof ZodError) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    if (error instanceof Error && error.message.includes('Validation')) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    if (error instanceof Error && error.message.includes('Search service unavailable')) {
      return errorResponse(500, 'SEARCH_ERROR', 'Search service is currently unavailable')
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to search wishlist')
  }
}
