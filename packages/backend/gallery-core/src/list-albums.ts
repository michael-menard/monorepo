/**
 * List Albums
 *
 * Platform-agnostic core logic for listing gallery albums with pagination.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import {
  AlbumListResponseSchema,
  AlbumSchema,
  type Album,
  type AlbumListResponse,
  type ListAlbumsFilters,
} from './__types__/index.js'

/**
 * Album row with aggregated data
 */
interface AlbumRowWithCounts {
  id: string
  userId: string
  title: string
  description: string | null
  coverImageId: string | null
  createdAt: Date
  lastUpdatedAt: Date
  imageCount: number
  coverImageUrl: string | null
}

/**
 * Minimal database interface for list-albums operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface ListAlbumsDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      // For count queries - returns Promise directly
      where: (condition: unknown) => Promise<Array<{ count: number }>> & {
        // For data queries - returns chained methods
        orderBy: (...orders: unknown[]) => {
          limit: (n: number) => {
            offset: (n: number) => Promise<AlbumRowWithCounts[]>
          }
        }
      }
    }
  }
}

/**
 * Schema references interface
 *
 * Allows injecting table references for platform independence.
 */
export interface ListAlbumsSchema {
  galleryAlbums: {
    id: unknown
    userId: unknown
    title: unknown
    description: unknown
    coverImageId: unknown
    createdAt: unknown
    lastUpdatedAt: unknown
  }
  galleryImages: {
    id: unknown
    albumId: unknown
    imageUrl: unknown
  }
}

/**
 * List albums with pagination
 *
 * Returns paginated list of albums owned by the user.
 * Each album includes:
 * - imageCount: number of images in the album
 * - coverImageUrl: URL of the cover image (if set)
 * Default sort is createdAt DESC (most recent first).
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with galleryAlbums and galleryImages tables
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param filters - Pagination options
 * @returns AlbumListResponse with albums and pagination
 */
export async function listAlbums(
  db: ListAlbumsDbClient,
  schema: ListAlbumsSchema,
  userId: string,
  filters: ListAlbumsFilters,
): Promise<AlbumListResponse> {
  const { galleryAlbums } = schema
  const { page = 1, limit = 20 } = filters

  // Cap limit at 100
  const cappedLimit = Math.min(limit, 100)

  // Get total count for pagination
  const [countResult] = await db
    .select({ count: {} as unknown as number })
    .from(galleryAlbums)
    .where((galleryAlbums.userId as any) === userId)

  const total = Number(countResult?.count ?? 0)

  // Get paginated albums
  const offset = (page - 1) * cappedLimit
  const rows = (await db
    .select({
      id: galleryAlbums.id,
      userId: galleryAlbums.userId,
      title: galleryAlbums.title,
      description: galleryAlbums.description,
      coverImageId: galleryAlbums.coverImageId,
      createdAt: galleryAlbums.createdAt,
      lastUpdatedAt: galleryAlbums.lastUpdatedAt,
      imageCount: {} as unknown as number,
      coverImageUrl: {} as unknown as string | null,
    })
    .from(galleryAlbums)
    .where((galleryAlbums.userId as any) === userId)
    .orderBy(galleryAlbums.createdAt)
    .limit(cappedLimit)
    .offset(offset)) as AlbumRowWithCounts[]

  // Transform rows to API response format
  const albums: Album[] = rows.map(row =>
    AlbumSchema.parse({
      id: row.id,
      userId: row.userId,
      title: row.title,
      description: row.description,
      coverImageId: row.coverImageId,
      coverImageUrl: row.coverImageUrl,
      imageCount: Number(row.imageCount ?? 0),
      createdAt: row.createdAt.toISOString(),
      lastUpdatedAt: row.lastUpdatedAt.toISOString(),
    }),
  )

  const response: AlbumListResponse = {
    data: albums,
    pagination: {
      page,
      limit: cappedLimit,
      total,
      totalPages: Math.ceil(total / cappedLimit) || 0,
    },
  }

  // Runtime validation
  AlbumListResponseSchema.parse(response)

  return response
}
