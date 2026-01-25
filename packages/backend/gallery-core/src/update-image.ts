/**
 * Update Gallery Image
 *
 * Platform-agnostic core logic for updating an existing gallery image.
 * Accepts Drizzle DB client via dependency injection for testability.
 *
 * STORY-008: Gallery - Images Write (No Upload)
 */

import {
  GalleryImageSchema,
  type GalleryImage,
  type ImageRow,
  type UpdateImageInput,
} from './__types__/index.js'

/**
 * Minimal database interface for update-image operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface UpdateImageDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<Array<{ id: string; userId: string }>>
    }
  }
  update: (table: unknown) => {
    set: (data: Record<string, unknown>) => {
      where: (condition: unknown) => {
        returning: () => Promise<ImageRow[]>
      }
    }
  }
}

/**
 * Schema references interface
 *
 * Allows injecting table references for platform independence.
 */
export interface UpdateImageSchema {
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
  galleryAlbums: {
    id: unknown
    userId: unknown
  }
}

/**
 * Update Image Result
 *
 * Discriminated union for update image operation result.
 */
export type UpdateImageResult =
  | { success: true; data: GalleryImage }
  | {
      success: false
      error: 'VALIDATION_ERROR' | 'FORBIDDEN' | 'NOT_FOUND' | 'DB_ERROR'
      message: string
    }

/**
 * Update an existing gallery image
 *
 * Updates image with provided fields (patch semantics).
 * The function handles:
 * - Ownership validation
 * - albumId validation (if provided and not null)
 * - lastUpdatedAt timestamp update
 *
 * Note: imageUrl, thumbnailUrl, and flagged are NOT updatable via this function.
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with galleryImages and galleryAlbums tables
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param imageId - Image UUID to update
 * @param input - Validated UpdateImageInput from request body
 * @returns Updated image or error result
 */
export async function updateGalleryImage(
  db: UpdateImageDbClient,
  schema: UpdateImageSchema,
  userId: string,
  imageId: string,
  input: UpdateImageInput,
): Promise<UpdateImageResult> {
  const { galleryImages, galleryAlbums } = schema

  try {
    // Check if image exists and get ownership
    const [existing] = await db
      .select({
        id: galleryImages.id as unknown as string,
        userId: galleryImages.userId as unknown as string,
      })
      .from(galleryImages)
      .where((galleryImages.id as any) === imageId)

    if (!existing) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Image not found',
      }
    }

    if (existing.userId !== userId) {
      return {
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to update this image',
      }
    }

    // If albumId provided (and not null), validate it exists and belongs to user
    if (input.albumId !== undefined && input.albumId !== null) {
      const [album] = await db
        .select({
          id: galleryAlbums.id as unknown as string,
          userId: galleryAlbums.userId as unknown as string,
        })
        .from(galleryAlbums)
        .where((galleryAlbums.id as any) === input.albumId)

      if (!album) {
        return {
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Album not found',
        }
      }

      if (album.userId !== userId) {
        return {
          success: false,
          error: 'FORBIDDEN',
          message: 'Album belongs to another user',
        }
      }
    }

    // Build update data - only include provided fields
    // Always update lastUpdatedAt (per AC-4: even for empty body)
    const updateData: Record<string, unknown> = {
      lastUpdatedAt: new Date(),
    }

    if (input.title !== undefined) updateData.title = input.title
    if (input.description !== undefined) updateData.description = input.description
    if (input.tags !== undefined) updateData.tags = input.tags
    if (input.albumId !== undefined) updateData.albumId = input.albumId

    const [updated] = await db
      .update(galleryImages)
      .set(updateData)
      .where((galleryImages.id as any) === imageId)
      .returning()

    if (!updated) {
      return {
        success: false,
        error: 'DB_ERROR',
        message: 'No row returned from update',
      }
    }

    // Transform DB row to API response format
    const image = GalleryImageSchema.parse({
      id: updated.id,
      userId: updated.userId,
      title: updated.title,
      description: updated.description,
      tags: updated.tags,
      imageUrl: updated.imageUrl,
      thumbnailUrl: updated.thumbnailUrl,
      albumId: updated.albumId,
      flagged: updated.flagged,
      createdAt: updated.createdAt.toISOString(),
      lastUpdatedAt: updated.lastUpdatedAt.toISOString(),
    })

    return { success: true, data: image }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
