/**
 * Get Album
 *
 * Platform-agnostic core logic for getting a single album by ID.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import {
  AlbumWithImagesSchema,
  GalleryImageSchema,
  type AlbumRow,
  type AlbumWithImages,
  type ImageRow,
} from './__types__/index.js'

/**
 * Minimal database interface for get-album operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface GetAlbumDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<AlbumRow[] | ImageRow[]> & {
        orderBy: (...orders: unknown[]) => Promise<ImageRow[]>
      }
    }
  }
}

/**
 * Schema references interface
 *
 * Allows injecting table references for platform independence.
 */
export interface GetAlbumSchema {
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
    userId: unknown
    title: unknown
    description: unknown
    tags: unknown
    imageUrl: unknown
    thumbnailUrl: unknown
    albumId: unknown
    flagged: unknown
    createdAt: unknown
    lastUpdatedAt: unknown
  }
}

/**
 * Get Album Result
 *
 * Discriminated union for get album operation result.
 */
export type GetAlbumResult =
  | { success: true; data: AlbumWithImages }
  | { success: false; error: 'NOT_FOUND' | 'FORBIDDEN' | 'DB_ERROR'; message: string }

/**
 * Get album by ID with images
 *
 * Returns album with all associated images.
 * Images are ordered by createdAt DESC.
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with galleryAlbums and galleryImages tables
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param albumId - Album UUID to retrieve
 * @returns Album with images or error result
 */
export async function getAlbum(
  db: GetAlbumDbClient,
  schema: GetAlbumSchema,
  userId: string,
  albumId: string,
): Promise<GetAlbumResult> {
  const { galleryAlbums, galleryImages } = schema

  try {
    // Get album
    const [album] = (await db
      .select({
        id: galleryAlbums.id,
        userId: galleryAlbums.userId,
        title: galleryAlbums.title,
        description: galleryAlbums.description,
        coverImageId: galleryAlbums.coverImageId,
        createdAt: galleryAlbums.createdAt,
        lastUpdatedAt: galleryAlbums.lastUpdatedAt,
      })
      .from(galleryAlbums)
      .where((galleryAlbums.id as any) === albumId)) as AlbumRow[]

    if (!album) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Album not found',
      }
    }

    if (album.userId !== userId) {
      return {
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to access this album',
      }
    }

    // Get images in this album, ordered by createdAt DESC
    const images = (await db
      .select({
        id: galleryImages.id,
        userId: galleryImages.userId,
        title: galleryImages.title,
        description: galleryImages.description,
        tags: galleryImages.tags,
        imageUrl: galleryImages.imageUrl,
        thumbnailUrl: galleryImages.thumbnailUrl,
        albumId: galleryImages.albumId,
        flagged: galleryImages.flagged,
        createdAt: galleryImages.createdAt,
        lastUpdatedAt: galleryImages.lastUpdatedAt,
      })
      .from(galleryImages)
      .where((galleryImages.albumId as any) === albumId)
      .orderBy(galleryImages.createdAt)) as ImageRow[]

    // Find cover image URL if coverImageId is set
    let coverImageUrl: string | null = null
    if (album.coverImageId) {
      const coverImage = images.find(img => img.id === album.coverImageId)
      coverImageUrl = coverImage?.imageUrl ?? null
    }

    // Transform to API response format
    const transformedImages = images.map(img =>
      GalleryImageSchema.parse({
        id: img.id,
        userId: img.userId,
        title: img.title,
        description: img.description,
        tags: img.tags,
        imageUrl: img.imageUrl,
        thumbnailUrl: img.thumbnailUrl,
        albumId: img.albumId,
        flagged: img.flagged,
        createdAt: img.createdAt.toISOString(),
        lastUpdatedAt: img.lastUpdatedAt.toISOString(),
      }),
    )

    const result = AlbumWithImagesSchema.parse({
      id: album.id,
      userId: album.userId,
      title: album.title,
      description: album.description,
      coverImageId: album.coverImageId,
      coverImageUrl,
      imageCount: images.length,
      createdAt: album.createdAt.toISOString(),
      lastUpdatedAt: album.lastUpdatedAt.toISOString(),
      images: transformedImages,
    })

    return { success: true, data: result }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
