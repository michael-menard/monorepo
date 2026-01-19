/**
 * Create Set
 *
 * Platform-agnostic core logic for creating a new set record.
 * Accepts Drizzle DB client via dependency injection for testability.
 */

import { SetSchema, type Set, type CreateSetInput } from '@repo/api-client/schemas/sets'

/**
 * Minimal database interface for create-set operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface CreateSetDbClient {
  insert: (table: unknown) => {
    values: (data: Record<string, unknown>) => {
      returning: () => Promise<InsertedSetRow[]>
    }
  }
}

/**
 * Schema references interface for create operations
 *
 * Allows injecting table references for platform independence.
 */
export interface CreateSetSetsSchema {
  sets: unknown
}

/**
 * Raw row returned from INSERT ... RETURNING
 */
interface InsertedSetRow {
  id: string
  userId: string
  title: string
  setNumber: string | null
  store: string | null
  sourceUrl: string | null
  pieceCount: number | null
  releaseDate: Date | null
  theme: string | null
  tags: string[] | null
  notes: string | null
  isBuilt: boolean
  quantity: number
  purchasePrice: string | null
  tax: string | null
  shipping: string | null
  purchaseDate: Date | null
  wishlistItemId: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Create Set Result
 *
 * Discriminated union for create set operation result.
 */
export type CreateSetResult =
  | { success: true; data: Set }
  | { success: false; error: 'DB_ERROR'; message: string }

/**
 * Generate a UUID v4
 */
function generateUuid(): string {
  return crypto.randomUUID()
}

/**
 * Create a new set for a user
 *
 * Inserts a new set record into the database with server-generated fields.
 * The function handles:
 * - UUID generation for set id
 * - Timestamp generation for createdAt/updatedAt
 * - Default values for isBuilt (false), quantity (1)
 * - Empty images array and null wishlistItemId
 *
 * @param db - Drizzle database client
 * @param schema - Database schema with sets table
 * @param userId - Authenticated user ID (Cognito sub claim)
 * @param input - Validated CreateSetInput from request body
 * @returns Created set or error result
 */
export async function createSet(
  db: CreateSetDbClient,
  schema: CreateSetSetsSchema,
  userId: string,
  input: CreateSetInput,
): Promise<CreateSetResult> {
  const now = new Date()
  const id = generateUuid()

  // Prepare insert data with server-generated fields
  const insertData: Record<string, unknown> = {
    id,
    userId,
    title: input.title,
    setNumber: input.setNumber ?? null,
    store: input.store ?? null,
    sourceUrl: input.sourceUrl ?? null,
    pieceCount: input.pieceCount ?? null,
    releaseDate: input.releaseDate ? new Date(input.releaseDate) : null,
    theme: input.theme ?? null,
    tags: input.tags ?? [],
    notes: input.notes ?? null,
    isBuilt: input.isBuilt ?? false,
    quantity: input.quantity ?? 1,
    purchasePrice: input.purchasePrice?.toString() ?? null,
    tax: input.tax?.toString() ?? null,
    shipping: input.shipping?.toString() ?? null,
    purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
    wishlistItemId: null, // Not linked at creation
    createdAt: now,
    updatedAt: now,
  }

  try {
    const [inserted] = await db.insert(schema.sets).values(insertData).returning()

    if (!inserted) {
      return {
        success: false,
        error: 'DB_ERROR',
        message: 'No row returned from insert',
      }
    }

    // Transform DB row to API response format
    const set = SetSchema.parse({
      id: inserted.id,
      userId: inserted.userId,
      title: inserted.title,
      setNumber: inserted.setNumber,
      store: inserted.store,
      sourceUrl: inserted.sourceUrl,
      pieceCount: inserted.pieceCount,
      releaseDate: inserted.releaseDate ? inserted.releaseDate.toISOString() : null,
      theme: inserted.theme,
      tags: inserted.tags ?? [],
      notes: inserted.notes,
      isBuilt: inserted.isBuilt,
      quantity: inserted.quantity,
      purchasePrice: inserted.purchasePrice !== null ? Number(inserted.purchasePrice) : null,
      tax: inserted.tax !== null ? Number(inserted.tax) : null,
      shipping: inserted.shipping !== null ? Number(inserted.shipping) : null,
      purchaseDate: inserted.purchaseDate ? inserted.purchaseDate.toISOString() : null,
      wishlistItemId: inserted.wishlistItemId,
      images: [], // No images at creation
      createdAt: inserted.createdAt.toISOString(),
      updatedAt: inserted.updatedAt.toISOString(),
    })

    return { success: true, data: set }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
