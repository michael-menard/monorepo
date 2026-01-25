/**
 * Get Image
 *
 * Platform-agnostic core logic for getting a single gallery image by ID.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import { GalleryImageSchema, type GalleryImage, type ImageRow } from './__types__/index.js'

/**
 * Minimal database interface for get-image operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface GetImageDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<ImageRow[]>
    }
  }
}

/**
 * Schema references interface
 *
 * Allows injecting table references for platform independence.
 */
export interface GetImageSchema {
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
 * Get Image Result
 *
 * Discriminated union for get image operation result.
 */
export type GetImageResult =
  | { success: true; data: GalleryImage }
  | { success: false; error: 'NOT_FOUND' | 'FORBIDDEN' | 'DB_ERROR'; message: string }

/**
 * Get gallery image by ID
 *
 * Returns image if it exists and belongs to the user.
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with galleryImages table
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param imageId - Image UUID to retrieve
 * @returns Image or error result
 */
export async function getGalleryImage(
  db: GetImageDbClient,
  schema: GetImageSchema,
  userId: string,
  imageId: string,
): Promise<GetImageResult> {
  const { galleryImages } = schema

  try {
    // Get image
    const [image] = (await db
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
      .where((galleryImages.id as any) === imageId)) as ImageRow[]

    if (!image) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Image not found',
      }
    }

    if (image.userId !== userId) {
      return {
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to access this image',
      }
    }

    // Transform to API response format
    const result = GalleryImageSchema.parse({
      id: image.id,
      userId: image.userId,
      title: image.title,
      description: image.description,
      tags: image.tags,
      imageUrl: image.imageUrl,
      thumbnailUrl: image.thumbnailUrl,
      albumId: image.albumId,
      flagged: image.flagged,
      createdAt: image.createdAt.toISOString(),
      lastUpdatedAt: image.lastUpdatedAt.toISOString(),
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
