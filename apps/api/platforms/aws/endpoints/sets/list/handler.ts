/**
 * List Sets Lambda Handler
 *
 * GET /api/sets
 *
 * Returns paginated sets for the authenticated user with basic filtering and sorting.
 * Initial version for sets-2001 (read-only gallery slice).
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { db } from '@/core/database/client'
import { sets, setImages } from '@/core/database/schema'
import {
  SetSchema,
  SetListResponseSchema,
  type Set,
  type SetImage,
  type SetListResponse,
} from '@repo/api-client/schemas/sets'

/**
 * Query Parameters Schema for List Sets
 *
 * We accept simple string-based query params from API Gateway and coerce them
 * into strongly-typed values used by the handler.
 */
const ListSetsQuerySchema = z.object({
  search: z.string().optional(),
  theme: z.string().optional(),
  /** Comma-separated tags: tags=space,ship */
  tags: z.string().optional(),
  /** 'true' | 'false' for built status filter */
  isBuilt: z.string().optional(),
  sortField: z
    .enum(['title', 'setNumber', 'pieceCount', 'purchaseDate', 'purchasePrice', 'createdAt'])
    .optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type ListSetsQuery = z.infer<typeof ListSetsQuerySchema>

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    const queryParams: ListSetsQuery = ListSetsQuerySchema.parse(
      event.queryStringParameters || {},
    )

    const {
      search,
      theme,
      tags,
      isBuilt,
      sortField = 'createdAt',
      sortDirection = 'desc',
      page,
      limit,
    } = queryParams

    const tagList = tags
      ? tags
          .split(',')
          .map(tag => tag.trim())
          .filter(Boolean)
      : []

    const isBuiltFilter =
      isBuilt === undefined
        ? undefined
        : isBuilt.toLowerCase() === 'true'
          ? true
          : isBuilt.toLowerCase() === 'false'
            ? false
            : undefined

    // Build query conditions
    const conditions = [eq(sets.userId, userId)]

    if (search) {
      conditions.push(
        or(ilike(sets.title, `%${search}%`), ilike(sets.setNumber, `%${search}%`))!,
      )
    }

    if (theme) {
      conditions.push(eq(sets.theme, theme))
    }

    if (typeof isBuiltFilter === 'boolean') {
      conditions.push(eq(sets.isBuilt, isBuiltFilter))
    }

    if (tagList.length > 0) {
      // Filter by tags (sets must have at least one matching tag)
      conditions.push(
        sql`${sets.tags} && ARRAY[${sql.join(
          tagList.map(t => sql`${t}`),
          sql`,`,
        )}]::text[]`,
      )
    }

    // Build sort order
    const sortColumn = {
      title: sets.title,
      setNumber: sets.setNumber,
      pieceCount: sets.pieceCount,
      purchaseDate: sets.purchaseDate,
      purchasePrice: sets.purchasePrice,
      createdAt: sets.createdAt,
    }[sortField]

    const orderFn = sortDirection === 'asc' ? asc : desc

    // Get total count for pagination
    const [countResult] = await db
      .select({ count: count() })
      .from(sets)
      .where(and(...conditions))

    const total = Number(countResult?.count ?? 0)

    // Get paginated sets with joined images
    const offset = (page - 1) * limit
    const rows = await db
      .select({
        id: sets.id,
        userId: sets.userId,
        title: sets.title,
        setNumber: sets.setNumber,
        store: sets.store,
        sourceUrl: sets.sourceUrl,
        pieceCount: sets.pieceCount,
        releaseDate: sets.releaseDate,
        theme: sets.theme,
        tags: sets.tags,
        notes: sets.notes,
        isBuilt: sets.isBuilt,
        quantity: sets.quantity,
        purchasePrice: sets.purchasePrice,
        tax: sets.tax,
        shipping: sets.shipping,
        purchaseDate: sets.purchaseDate,
        wishlistItemId: sets.wishlistItemId,
        createdAt: sets.createdAt,
        updatedAt: sets.updatedAt,
        imageId: setImages.id,
        imageUrl: setImages.imageUrl,
        thumbnailUrl: setImages.thumbnailUrl,
        position: setImages.position,
      })
      .from(sets)
      .leftJoin(setImages, eq(setImages.setId, sets.id))
      .where(and(...conditions))
      .orderBy(orderFn(sortColumn ?? sets.createdAt), asc(setImages.position))
      .limit(limit)
      .offset(offset)

    // Aggregate rows into typed sets with images[] matching the API Set schema
    const setMap = new Map<string, Set>()

    for (const row of rows) {
      let current = setMap.get(row.id)
      if (!current) {
        current = SetSchema.parse({
          id: row.id,
          userId: row.userId,
          title: row.title,
          setNumber: row.setNumber,
          store: row.store,
          sourceUrl: row.sourceUrl,
          pieceCount: row.pieceCount ?? null,
          releaseDate: row.releaseDate ? row.releaseDate.toISOString() : null,
          theme: row.theme,
          tags: row.tags ?? [],
          notes: row.notes,
          isBuilt: row.isBuilt,
          quantity: row.quantity,
          purchasePrice:
            row.purchasePrice === null || row.purchasePrice === undefined
              ? null
              : Number(row.purchasePrice),
          tax:
            row.tax === null || row.tax === undefined ? null : Number(row.tax),
          shipping:
            row.shipping === null || row.shipping === undefined
              ? null
              : Number(row.shipping),
          purchaseDate: row.purchaseDate ? row.purchaseDate.toISOString() : null,
          wishlistItemId: row.wishlistItemId,
          images: [],
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        })

        setMap.set(row.id, current)
      }

      if (row.imageId && row.imageUrl) {
        const image: SetImage = {
          id: row.imageId,
          imageUrl: row.imageUrl,
          thumbnailUrl: row.thumbnailUrl ?? null,
          position: row.position ?? 0,
        }

        current.images.push(image)
      }
    }

    // Derive available themes and tags for filters
    const themeRows = await db
      .selectDistinct({ theme: sets.theme })
      .from(sets)
      .where(eq(sets.userId, userId))

    const availableThemes = themeRows
      .map(row => row.theme)
      .filter((t): t is string => Boolean(t))

    const tagRows = await db
      .selectDistinct({ tags: sets.tags })
      .from(sets)
      .where(eq(sets.userId, userId))

    const availableTags = [
      ...new Set(tagRows.flatMap(row => row.tags ?? [])),
    ] as string[]

    const response: SetListResponse = {
      items: Array.from(setMap.values()),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        availableThemes,
        availableTags,
      },
    }

    // Runtime validation to guard against accidental shape drift
    SetListResponseSchema.parse(response)

    logger.info('Sets retrieved', {
      userId,
      search,
      theme,
      isBuilt: isBuiltFilter,
      tags: tagList,
      page,
      limit,
      count: response.items.length,
      total,
    })

    return successResponse(response)
  } catch (error) {
    logger.error('List sets error:', error)

    if (error instanceof z.ZodError) {
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }

    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to list sets')
  }
}
