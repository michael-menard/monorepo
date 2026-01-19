/**
 * Get Set by ID
 *
 * Platform-agnostic core logic for retrieving a single set with images.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import { asc, eq } from 'drizzle-orm'
import { SetSchema, type Set } from '@repo/api-client/schemas/sets'
import type { SetRow } from './__types__/index.js'

/**
 * Minimal database interface for get-set operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface GetSetDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      leftJoin: (
        joinTable: unknown,
        condition: unknown,
      ) => {
        where: (condition: unknown) => {
          orderBy: (order: unknown) => Promise<SetRow[]>
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
 * Get Set Result
 *
 * Discriminated union for get set operation result.
 */
export type GetSetResult =
  | { success: true; data: Set }
  | { success: false; error: 'NOT_FOUND' | 'FORBIDDEN' }

/**
 * Get set by ID with ownership validation
 *
 * Retrieves a set with its images for the specified user.
 * Returns null if set not found or user doesn't own it.
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with sets and setImages tables
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param setId - UUID of the set to retrieve
 * @returns Set with images or null
 */
export async function getSetById(
  db: GetSetDbClient,
  schema: SetsSchema,
  userId: string,
  setId: string,
): Promise<GetSetResult> {
  const { sets, setImages } = schema

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
    .where(eq(sets.id as any, setId))
    .orderBy(asc(setImages.position as any))) as SetRow[]

  if (rows.length === 0) {
    return { success: false, error: 'NOT_FOUND' }
  }

  const base = rows[0]

  // Check ownership
  if (base.userId !== userId) {
    return { success: false, error: 'FORBIDDEN' }
  }

  // Aggregate rows into a single set with images array
  const set = SetSchema.parse({
    id: base.id,
    userId: base.userId,
    title: base.title,
    setNumber: base.setNumber,
    store: base.store,
    sourceUrl: base.sourceUrl,
    pieceCount: base.pieceCount,
    releaseDate: base.releaseDate ? base.releaseDate.toISOString() : null,
    theme: base.theme,
    tags: base.tags ?? [],
    notes: base.notes,
    isBuilt: base.isBuilt,
    quantity: base.quantity,
    purchasePrice: base.purchasePrice !== null ? Number(base.purchasePrice) : null,
    tax: base.tax !== null ? Number(base.tax) : null,
    shipping: base.shipping !== null ? Number(base.shipping) : null,
    purchaseDate: base.purchaseDate ? base.purchaseDate.toISOString() : null,
    wishlistItemId: base.wishlistItemId,
    images: rows
      .filter(row => row.imageId !== null)
      .map(row => ({
        id: row.imageId!,
        imageUrl: row.imageUrl!,
        thumbnailUrl: row.thumbnailUrl,
        position: row.position ?? 0,
      })),
    createdAt: base.createdAt.toISOString(),
    updatedAt: base.updatedAt.toISOString(),
  })

  return { success: true, data: set }
}
