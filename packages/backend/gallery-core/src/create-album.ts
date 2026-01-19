/**
 * Create Album
 *
 * Platform-agnostic core logic for creating a new gallery album.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import { AlbumSchema, type Album, type AlbumRow, type CreateAlbumInput } from './__types__/index.js'

/**
 * Minimal database interface for create-album operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface CreateAlbumDbClient {
  insert: (table: unknown) => {
    values: (data: Record<string, unknown>) => {
      returning: () => Promise<AlbumRow[]>
    }
  }
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<Array<{ id: string; userId: string }>>
    }
  }
}

/**
 * Schema references interface
 *
 * Allows injecting table references for platform independence.
 */
export interface CreateAlbumSchema {
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
  }
}

/**
 * Create Album Result
 *
 * Discriminated union for create album operation result.
 */
export type CreateAlbumResult =
  | { success: true; data: Album }
  | {
      success: false
      error: 'VALIDATION_ERROR' | 'FORBIDDEN' | 'NOT_FOUND' | 'DB_ERROR'
      message: string
    }

/**
 * Generate a UUID v4
 */
function generateUuid(): string {
  return crypto.randomUUID()
}

/**
 * Create a new album for a user
 *
 * Inserts a new album into the database with server-generated fields.
 * The function handles:
 * - UUID generation for album id
 * - Timestamp generation for createdAt/lastUpdatedAt
 * - Validation that coverImageId belongs to the user (if provided)
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with galleryAlbums and galleryImages tables
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param input - Validated CreateAlbumInput from request body
 * @returns Created album or error result
 */
export async function createAlbum(
  db: CreateAlbumDbClient,
  schema: CreateAlbumSchema,
  userId: string,
  input: CreateAlbumInput,
): Promise<CreateAlbumResult> {
  const now = new Date()
  const id = generateUuid()
  const { galleryAlbums, galleryImages } = schema

  try {
    // If coverImageId provided, validate it exists and belongs to user
    if (input.coverImageId) {
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

    // Prepare insert data with server-generated fields
    const insertData: Record<string, unknown> = {
      id,
      userId,
      title: input.title,
      description: input.description ?? null,
      coverImageId: input.coverImageId ?? null,
      createdAt: now,
      lastUpdatedAt: now,
    }

    const [inserted] = await db.insert(galleryAlbums).values(insertData).returning()

    if (!inserted) {
      return {
        success: false,
        error: 'DB_ERROR',
        message: 'No row returned from insert',
      }
    }

    // Transform DB row to API response format
    const album = AlbumSchema.parse({
      id: inserted.id,
      userId: inserted.userId,
      title: inserted.title,
      description: inserted.description,
      coverImageId: inserted.coverImageId,
      coverImageUrl: null, // New album has no cover image URL yet
      imageCount: 0, // New album has no images
      createdAt: inserted.createdAt.toISOString(),
      lastUpdatedAt: inserted.lastUpdatedAt.toISOString(),
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
