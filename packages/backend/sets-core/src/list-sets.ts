/**
 * List Sets
 *
 * Platform-agnostic core logic for listing sets with filtering, sorting, and pagination.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm'
import {
  SetSchema,
  SetListResponseSchema,
  type Set,
  type SetImage,
  type SetListResponse,
} from '@repo/api-client/schemas/sets'
import type { ListSetsFilters, SetRow } from './__types__/index.js'

/**
 * Minimal database interface for list-sets operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface ListSetsDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      leftJoin: (
        joinTable: unknown,
        condition: unknown,
      ) => {
        where: (condition: unknown) => {
          orderBy: (...orders: unknown[]) => {
            limit: (n: number) => {
              offset: (n: number) => Promise<SetRow[]>
            }
          }
        }
      }
      where: (condition: unknown) => Promise<Array<{ count: number }>>
    }
  }
  selectDistinct: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<Array<{ theme: string | null } | { tags: string[] | null }>>
    }
  }
}

/**
 * Schema references interface
 *
 * Allows injecting table references for platform independence.
 */
export interface SetsSchema {
  sets: {
    id: unknown
    userId: unknown
    title: unknown
    setNumber: unknown
    store: unknown
    sourceUrl: unknown
    pieceCount: unknown
    releaseDate: unknown
    theme: unknown
    tags: unknown
    notes: unknown
    isBuilt: unknown
    quantity: unknown
    purchasePrice: unknown
    tax: unknown
    shipping: unknown
    purchaseDate: unknown
    wishlistItemId: unknown
    createdAt: unknown
    updatedAt: unknown
  }
  setImages: {
    id: unknown
    setId: unknown
    imageUrl: unknown
    thumbnailUrl: unknown
    position: unknown
  }
}

/**
 * List sets with filters, sorting, and pagination
 *
 * Returns paginated list of sets owned by the user with available filter options.
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with sets and setImages tables
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param filters - Filter, sort, and pagination options
 * @returns SetListResponse with items, pagination, and available filters
 */
export async function listSets(
  db: ListSetsDbClient,
  schema: SetsSchema,
  userId: string,
  filters: ListSetsFilters,
): Promise<SetListResponse> {
  const { sets, setImages } = schema
  const {
    search,
    theme,
    tags = [],
    isBuilt,
    sortField = 'createdAt',
    sortDirection = 'desc',
    page = 1,
    limit = 20,
  } = filters

  // Build query conditions
  const conditions: unknown[] = [eq(sets.userId as any, userId)]

  if (search) {
    conditions.push(
      or(
        ilike(sets.title as any, `%${search}%`),
        ilike(sets.setNumber as any, `%${search}%`),
      )!,
    )
  }

  if (theme) {
    conditions.push(eq(sets.theme as any, theme))
  }

  if (typeof isBuilt === 'boolean') {
    conditions.push(eq(sets.isBuilt as any, isBuilt))
  }

  if (tags.length > 0) {
    // Filter by tags (sets must have at least one matching tag)
    conditions.push(
      sql`${sets.tags} && ARRAY[${sql.join(
        tags.map(t => sql`${t}`),
        sql`,`,
      )}]::text[]`,
    )
  }

  // Build sort order
  const sortColumnMap: Record<string, unknown> = {
    title: sets.title,
    setNumber: sets.setNumber,
    pieceCount: sets.pieceCount,
    purchaseDate: sets.purchaseDate,
    purchasePrice: sets.purchasePrice,
    createdAt: sets.createdAt,
  }
  const sortColumn = sortColumnMap[sortField] || sets.createdAt
  const orderFn = sortDirection === 'asc' ? asc : desc

  // Get total count for pagination
  const [countResult] = await db
    .select({ count: count() })
    .from(sets)
    .where(and(...(conditions as any[])))

  const total = Number(countResult?.count ?? 0)

  // Get paginated sets with joined images
  const offset = (page - 1) * limit
  const rows = (await db
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
    .leftJoin(setImages, eq(setImages.setId as any, sets.id as any))
    .where(and(...(conditions as any[])))
    .orderBy(orderFn(sortColumn as any), asc(setImages.position as any))
    .limit(limit)
    .offset(offset)) as SetRow[]

  // Aggregate rows into typed sets with images[]
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
        purchasePrice: row.purchasePrice !== null ? Number(row.purchasePrice) : null,
        tax: row.tax !== null ? Number(row.tax) : null,
        shipping: row.shipping !== null ? Number(row.shipping) : null,
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
  const themeRows = (await db
    .selectDistinct({ theme: sets.theme })
    .from(sets)
    .where(eq(sets.userId as any, userId))) as Array<{ theme: string | null }>

  const availableThemes = themeRows
    .map(row => row.theme)
    .filter((t): t is string => Boolean(t))

  const tagRows = (await db
    .selectDistinct({ tags: sets.tags })
    .from(sets)
    .where(eq(sets.userId as any, userId))) as Array<{ tags: string[] | null }>

  const availableTags = [...new Set(tagRows.flatMap(row => row.tags ?? []))]

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

  return response
}
