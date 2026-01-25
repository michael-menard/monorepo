/**
 * Flag Image
 *
 * Platform-agnostic core logic for flagging a gallery image for moderation.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import {
  FlagResultSchema,
  type FlagImageInput,
  type FlagResult,
  type FlagRow,
} from './__types__/index.js'

/**
 * Image row (minimal fields for existence check)
 */
interface ImageExistsRow {
  id: string
}

/**
 * Flag row (minimal fields for conflict check)
 */
interface FlagExistsRow {
  id: string
}

/**
 * Minimal database interface for flag-image operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface FlagImageDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<ImageExistsRow[] | FlagExistsRow[]>
    }
  }
  insert: (table: unknown) => {
    values: (data: Record<string, unknown>) => {
      returning: () => Promise<FlagRow[]>
    }
  }
}

/**
 * Schema references interface
 *
 * Allows injecting table references for platform independence.
 */
export interface FlagImageSchema {
  galleryImages: {
    id: unknown
  }
  galleryFlags: {
    id: unknown
    imageId: unknown
    userId: unknown
    reason: unknown
    createdAt: unknown
    lastUpdatedAt: unknown
  }
}

/**
 * Flag Image Result
 *
 * Discriminated union for flag image operation result.
 */
export type FlagImageResult =
  | { success: true; data: FlagResult }
  | {
      success: false
      error: 'NOT_FOUND' | 'CONFLICT' | 'VALIDATION_ERROR' | 'DB_ERROR'
      message: string
    }

/**
 * Flag a gallery image for moderation
 *
 * Creates a flag record linking the user to the image.
 * Returns CONFLICT if user has already flagged this image.
 * Returns NOT_FOUND if image doesn't exist.
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with galleryImages and galleryFlags tables
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param input - Flag input (imageId, optional reason)
 * @returns Flag result or error
 */
export async function flagGalleryImage(
  db: FlagImageDbClient,
  schema: FlagImageSchema,
  userId: string,
  input: FlagImageInput,
): Promise<FlagImageResult> {
  const { galleryImages, galleryFlags } = schema
  const { imageId, reason } = input

  try {
    // Check if image exists
    const [image] = (await db
      .select({ id: galleryImages.id })
      .from(galleryImages)
      .where((galleryImages.id as any) === imageId)) as ImageExistsRow[]

    if (!image) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'Image not found',
      }
    }

    // Check if user has already flagged this image
    const [existingFlag] = (await db
      .select({ id: galleryFlags.id })
      .from(galleryFlags)
      .where({ imageId, userId } as any)) as FlagExistsRow[]

    if (existingFlag) {
      return {
        success: false,
        error: 'CONFLICT',
        message: 'You have already flagged this image',
      }
    }

    // Insert flag record
    const [flag] = (await db
      .insert(galleryFlags)
      .values({
        imageId,
        userId,
        reason: reason ?? null,
      })
      .returning()) as FlagRow[]

    if (!flag) {
      return {
        success: false,
        error: 'DB_ERROR',
        message: 'Failed to create flag record',
      }
    }

    // Transform to API response format
    const result = FlagResultSchema.parse({
      id: flag.id,
      imageId: flag.imageId,
      userId: flag.userId,
      reason: flag.reason,
      createdAt: flag.createdAt.toISOString(),
      lastUpdatedAt: flag.lastUpdatedAt.toISOString(),
    })

    return { success: true, data: result }
  } catch (error) {
    // Check for unique constraint violation (PostgreSQL error code 23505)
    if (error instanceof Error && error.message.includes('23505')) {
      return {
        success: false,
        error: 'CONFLICT',
        message: 'You have already flagged this image',
      }
    }

    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
