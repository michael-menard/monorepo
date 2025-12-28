/**
 * List Wishlist Items Lambda Handler
 *
 * GET /api/wishlist
 *
 * Returns paginated wishlist items for authenticated user.
 * Supports filtering by store, priority, tags, and search.
 * Supports sorting by various fields.
 * Results cached in Redis for 5 minutes.
 *
 * Updated for Epic 6 PRD (wish-2001)
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq, and, asc, desc, ilike, or, sql, count } from 'drizzle-orm'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { db } from '@/core/database/client'
import { getRedisClient } from '@/core/cache/redis'
import { wishlistItems } from '@/core/database/schema'
import { z } from 'zod'

/**
 * Query Parameters Schema for List Wishlist
 */
const ListWishlistQuerySchema = z.object({
  q: z.string().optional(),
  store: z.string().max(100).optional(),
  tags: z.string().optional(), // comma-separated
  priority: z.coerce.number().int().min(0).max(5).optional(),
  sort: z.enum(['createdAt', 'title', 'price', 'pieceCount', 'sortOrder', 'priority']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

/**
 * Main Lambda Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Validate query parameters
    const queryParams = ListWishlistQuerySchema.parse(event.queryStringParameters || {})
    const {
      q,
      store,
      tags,
      priority,
      sort = 'sortOrder',
      order = 'asc',
      page,
      limit,
    } = queryParams

    // Parse comma-separated tags
    const tagList = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []

    // Generate cache key based on all params
    const cacheKey = `wishlist:user:${userId}:q:${q || ''}:store:${store || ''}:tags:${tagList.join(',')}:priority:${priority ?? ''}:sort:${sort}:order:${order}:page:${page}:limit:${limit}`

    // Check Redis cache
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) {
      logger.info('Cache hit', { userId, store, priority, page })
      return successResponse(JSON.parse(cached))
    }

    // Build query conditions
    const conditions = [eq(wishlistItems.userId, userId)]

    if (store) {
      conditions.push(eq(wishlistItems.store, store))
    }

    if (priority !== undefined) {
      conditions.push(eq(wishlistItems.priority, priority))
    }

    if (q) {
      // Search in title and setNumber
      conditions.push(
        or(
          ilike(wishlistItems.title, `%${q}%`),
          ilike(wishlistItems.setNumber, `%${q}%`),
        )!,
      )
    }

    if (tagList.length > 0) {
      // Filter by tags (items must have at least one matching tag)
      conditions.push(
        sql`${wishlistItems.tags} && ARRAY[${sql.join(tagList.map(t => sql`${t}`), sql`,`)}]::text[]`,
      )
    }

    // Build sort order
    const sortColumn = {
      createdAt: wishlistItems.createdAt,
      title: wishlistItems.title,
      price: wishlistItems.price,
      pieceCount: wishlistItems.pieceCount,
      sortOrder: wishlistItems.sortOrder,
      priority: wishlistItems.priority,
    }[sort]

    const orderFn = order === 'desc' ? desc : asc

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: count() })
      .from(wishlistItems)
      .where(and(...conditions))

    const total = countResult?.count ?? 0

    // Get paginated items
    const offset = (page - 1) * limit
    const items = await db
      .select()
      .from(wishlistItems)
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn))
      .limit(limit)
      .offset(offset)

    // Get counts by store for sidebar filtering
    const storeCounts = await db
      .select({
        store: wishlistItems.store,
        count: count(),
      })
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, userId))
      .groupBy(wishlistItems.store)

    const byStore: Record<string, number> = {}
    storeCounts.forEach(sc => {
      byStore[sc.store] = Number(sc.count)
    })

    // Get all unique tags for the user
    const tagQuery = await db
      .selectDistinct({ tags: wishlistItems.tags })
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, userId))

    const availableTags = [...new Set(tagQuery.flatMap(row => row.tags ?? []))]

    // Get all unique stores
    const storeQuery = await db
      .selectDistinct({ store: wishlistItems.store })
      .from(wishlistItems)
      .where(eq(wishlistItems.userId, userId))

    const availableStores = storeQuery.map(row => row.store)

    // Build response
    const response = {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts: {
        total,
        byStore,
      },
      filters: {
        availableTags,
        availableStores,
      },
    }

    // Cache result for 5 minutes
    await redis.setEx(cacheKey, 300, JSON.stringify(response))

    logger.info('Wishlist items retrieved', {
      userId,
      store,
      priority,
      q,
      page,
      limit,
      count: items.length,
      total,
    })

    return successResponse(response)
  } catch (error) {
    logger.error('List wishlist error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to list wishlist items')
  }
}
