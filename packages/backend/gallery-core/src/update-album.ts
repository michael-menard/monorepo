/**
 * Update Album
 *
 * Platform-agnostic core logic for updating an existing gallery album.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import { AlbumSchema, type Album, type AlbumRow, type UpdateAlbumInput } from './__types__/index.js'

/**
 * Minimal database interface for update-album operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface UpdateAlbumDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<Array<{ id: string; userId: string }>>
    }
  }
  update: (table: unknown) => {
    set: (data: Record<string, unknown>) => {
      where: (condition: unknown) => {
        returning: () => Promise<AlbumRow[]>
      }
    }
  }
}

/**
 * Schema references interface
 *
 * Allows injecting table references for platform independence.
 */
export interface UpdateAlbumSchema {
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
    imageUrl: unknown
    albumId: unknown
  }
}

/**
 * Update Album Result
 *
 * Discriminated union for update album operation result.
 */
export type UpdateAlbumResult =
  | { success: true; data: Album }
  | {
      success: false
      error: 'VALIDATION_ERROR' | 'FORBIDDEN' | 'NOT_FOUND' | 'DB_ERROR'
      message: string
    }

/**
 * Update an existing album
 *
 * Updates album with provided fields (patch semantics).
 * The function handles:
 * - Ownership validation
 * - coverImageId validation (if provided and not null)
 * - lastUpdatedAt timestamp update
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with galleryAlbums and galleryImages tables
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param albumId - Album UUID to update
 * @param input - Validated UpdateAlbumInput from request body
 * @returns Updated album or error result
 */
export async function updateAlbum(
  db: UpdateAlbumDbClient,
  schema: UpdateAlbumSchema,
  userId: string,
  albumId: string,
  input: UpdateAlbumInput,
): Promise<UpdateAlbumResult> {
  const { galleryAlbums, galleryImages } = schema

  try {
    // Check if album exists and get ownership
    const [existing] = await db
      .select({
        id: galleryAlbums.id as unknown as string,
        userId: galleryAlbums.userId as unknown as string,
      })
      .from(galleryAlbums)
      .where((galleryAlbums.id as any) === albumId)

    if (!existing) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Album not found',
      }
    }

    if (existing.userId !== userId) {
      return {
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to update this album',
      }
    }

    // If coverImageId provided (and not null), validate it exists and belongs to user
    if (input.coverImageId !== undefined && input.coverImageId !== null) {
      const [image] = await db
        .select({
          id: galleryImages.id as unknown as string,
          userId: galleryImages.userId as unknown as string,
        })
        .from(galleryImages)
        .where((galleryImages.id as any) === input.coverImageId)

      if (!image) {
        return {
          success: false,
          error: 'NOT_FOUND',
          message: 'Cover image not found',
        }
      }

      if (image.userId !== userId) {
        return {
          success: false,
          error: 'FORBIDDEN',
          message: 'Cover image belongs to another user',
        }
      }
    }

    // Build update data - only include provided fields
    const updateData: Record<string, unknown> = {
      lastUpdatedAt: new Date(),
    }

    if (input.title !== undefined) updateData.title = input.title
    if (input.description !== undefined) updateData.description = input.description
    if (input.coverImageId !== undefined) updateData.coverImageId = input.coverImageId

    const [updated] = await db
      .update(galleryAlbums)
      .set(updateData)
      .where((galleryAlbums.id as any) === albumId)
      .returning()

    if (!updated) {
      return {
        success: false,
        error: 'DB_ERROR',
        message: 'No row returned from update',
      }
    }

    // Get imageCount for response
    // Note: In real implementation, this would be a subquery or join
    // For now, we return 0 as a placeholder (endpoint will handle this)

    // Get cover image URL if set
    let coverImageUrl: string | null = null
    if (updated.coverImageId) {
      const [coverImage] = await db
        .select({
          id: galleryImages.id as unknown as string,
          userId: galleryImages.userId as unknown as string,
          imageUrl: galleryImages.imageUrl as unknown as string,
        })
        .from(galleryImages)
        .where((galleryImages.id as any) === updated.coverImageId)

      coverImageUrl = (coverImage as any)?.imageUrl ?? null
    }

    // Transform DB row to API response format
    const album = AlbumSchema.parse({
      id: updated.id,
      userId: updated.userId,
      title: updated.title,
      description: updated.description,
      coverImageId: updated.coverImageId,
      coverImageUrl,
      imageCount: 0, // Will be populated by endpoint
      createdAt: updated.createdAt.toISOString(),
      lastUpdatedAt: updated.lastUpdatedAt.toISOString(),
    })

    return { success: true, data: album }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
