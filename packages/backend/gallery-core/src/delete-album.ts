/**
 * Delete Album
 *
 * Platform-agnostic core logic for deleting a gallery album.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

/**
 * Minimal database interface for delete-album operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface DeleteAlbumDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<Array<{ id: string; userId: string }>>
    }
  }
  update: (table: unknown) => {
    set: (data: Record<string, unknown>) => {
      where: (condition: unknown) => Promise<void>
    }
  }
  delete: (table: unknown) => {
    where: (condition: unknown) => Promise<void>
  }
}

/**
 * Schema references interface
 *
 * Allows injecting table references for platform independence.
 */
export interface DeleteAlbumSchema {
  galleryAlbums: {
    id: unknown
    userId: unknown
  }
  galleryImages: {
    albumId: unknown
  }
}

/**
 * Delete Album Result
 *
 * Discriminated union for delete album operation result.
 */
export type DeleteAlbumResult =
  | { success: true }
  | { success: false; error: 'NOT_FOUND' | 'FORBIDDEN' | 'DB_ERROR'; message: string }

/**
 * Delete an album
 *
 * Deletes the album and orphans any images that were in it.
 * Images are NOT deleted - only their albumId is set to null.
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with galleryAlbums and galleryImages tables
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param albumId - Album UUID to delete
 * @returns Success or error result
 */
export async function deleteAlbum(
  db: DeleteAlbumDbClient,
  schema: DeleteAlbumSchema,
  userId: string,
  albumId: string,
): Promise<DeleteAlbumResult> {
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
        message: 'You do not have permission to delete this album',
      }
    }

    // Orphan images - set albumId to null for all images in this album
    await db
      .update(galleryImages)
      .set({ albumId: null })
      .where((galleryImages.albumId as any) === albumId)

    // Delete the album
    await db.delete(galleryAlbums).where((galleryAlbums.id as any) === albumId)

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
