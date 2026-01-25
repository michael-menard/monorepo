/**
 * Delete Gallery Image
 *
 * Platform-agnostic core logic for deleting a gallery image.
 * Accepts Drizzle DB client via dependency injection for testability.
 *
 * STORY-008: Gallery - Images Write (No Upload)
 *
 * Important:
 * - This function handles DB deletion ONLY
 * - S3 cleanup is handled by the adapter (Vercel handler) as best-effort
 * - gallery_flags and moc_gallery_images are cascade-deleted via FK constraints
 * - If image is album cover, clears coverImageId before deletion
 */

// Note: ImageRow type not needed here since we only extract specific fields for S3 cleanup

/**
 * Minimal database interface for delete-image operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface DeleteImageDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<
        Array<{
          id: string
          userId: string
          imageUrl?: string
          thumbnailUrl?: string | null
        }>
      >
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
export interface DeleteImageSchema {
  galleryImages: {
    id: unknown
    userId: unknown
    imageUrl: unknown
    thumbnailUrl: unknown
  }
  galleryAlbums: {
    id: unknown
    coverImageId: unknown
  }
}

/**
 * Delete Image Result
 *
 * Discriminated union for delete image operation result.
 * Includes imageUrl and thumbnailUrl so adapter can perform S3 cleanup.
 */
export type DeleteImageResult =
  | { success: true; imageUrl: string; thumbnailUrl: string | null }
  | { success: false; error: 'NOT_FOUND' | 'FORBIDDEN' | 'DB_ERROR'; message: string }

/**
 * Delete a gallery image
 *
 * Deletes the image from the database.
 * Before deletion:
 * - Validates ownership
 * - Clears coverImageId on any album that uses this image as cover
 *
 * After deletion:
 * - gallery_flags entries are cascade-deleted (automatic via FK)
 * - moc_gallery_images entries are cascade-deleted (automatic via FK)
 *
 * Returns the imageUrl and thumbnailUrl so the adapter can perform S3 cleanup.
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with galleryImages and galleryAlbums tables
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param imageId - Image UUID to delete
 * @returns Success with image URLs, or error result
 */
export async function deleteGalleryImage(
  db: DeleteImageDbClient,
  schema: DeleteImageSchema,
  userId: string,
  imageId: string,
): Promise<DeleteImageResult> {
  const { galleryImages, galleryAlbums } = schema

  try {
    // Check if image exists, get ownership, and get URLs for S3 cleanup
    const [existing] = await db
      .select({
        id: galleryImages.id as unknown as string,
        userId: galleryImages.userId as unknown as string,
        imageUrl: galleryImages.imageUrl as unknown as string,
        thumbnailUrl: galleryImages.thumbnailUrl as unknown as string | null,
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
        message: 'You do not have permission to delete this image',
      }
    }

    // Clear coverImageId on any album that uses this image as cover (AC-6)
    // This must happen BEFORE deletion to avoid FK constraint issues
    await db
      .update(galleryAlbums)
      .set({ coverImageId: null })
      .where((galleryAlbums.coverImageId as any) === imageId)

    // Delete the image
    // gallery_flags and moc_gallery_images are cascade-deleted via FK constraints
    await db.delete(galleryImages).where((galleryImages.id as any) === imageId)

    return {
      success: true,
      imageUrl: existing.imageUrl!,
      thumbnailUrl: existing.thumbnailUrl ?? null,
    }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
