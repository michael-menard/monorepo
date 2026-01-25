/**
 * Get MOC
 *
 * Platform-agnostic core logic for getting a single MOC by ID with ownership-aware access.
 * Accepts Drizzle DB client via dependency injection for testability.
 *
 * Access rules:
 * - Published MOCs visible to anyone (anonymous or authenticated)
 * - Draft/archived/pending_review MOCs only visible to owner
 * - Returns 404 (not 403) for non-owner access to prevent existence leak
 */

import { MocDetailSchema, type MocDetail, type MocRow, type MocFileRow } from './__types__/index.js'

/**
 * Minimal database interface for get-moc operations
 *
 * Abstracts Drizzle-specific types to enable unit testing with mocks.
 */
export interface GetMocDbClient {
  getMocById: (mocId: string) => Promise<MocRow | null>
  getMocFiles: (mocId: string) => Promise<MocFileRow[]>
}

/**
 * Schema references interface
 *
 * Allows injecting table references for platform independence.
 */
export interface GetMocSchema {
  mocInstructions: unknown
  mocFiles: unknown
}

/**
 * Get MOC Result
 *
 * Discriminated union for get MOC operation result.
 */
export type GetMocResult =
  | { success: true; data: MocDetail }
  | { success: false; error: 'NOT_FOUND' | 'DB_ERROR'; message: string }

// UUID regex for validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Get MOC by ID with ownership-aware access
 *
 * Returns MOC if it exists and is accessible to the user.
 * - Published MOCs: visible to anyone
 * - Draft/archived/pending_review: only visible to owner
 *
 * @param db - Database client with getMocById and getMocFiles methods
 * @param userId - Authenticated user ID (null for anonymous)
 * @param mocId - MOC UUID to retrieve
 * @returns MocDetail or error result
 */
export async function getMoc(
  db: GetMocDbClient,
  userId: string | null,
  mocId: string,
): Promise<GetMocResult> {
  try {
    // Validate mocId is UUID format - return NOT_FOUND for invalid (same as non-existent)
    if (!uuidRegex.test(mocId)) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'MOC not found',
      }
    }

    // Get MOC
    const moc = await db.getMocById(mocId)

    if (!moc) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'MOC not found',
      }
    }

    // Determine ownership
    const isOwner = Boolean(userId && moc.userId === userId)

    // Access control: Draft/archived/pending_review only visible to owner
    // Return 404 (not 403) to prevent existence leak
    if (moc.status !== 'published' && !isOwner) {
      return {
        success: false,
        error: 'NOT_FOUND',
        message: 'MOC not found',
      }
    }

    // Get files (excluding soft-deleted via DB query)
    const files = await db.getMocFiles(mocId)

    // Transform to API response format
    const result = MocDetailSchema.parse({
      id: moc.id,
      title: moc.title,
      description: moc.description,
      slug: moc.slug,
      tags: moc.tags,
      theme: moc.theme,
      status: moc.status,
      createdAt: moc.createdAt.toISOString(),
      updatedAt: moc.updatedAt.toISOString(),
      publishedAt: moc.publishedAt?.toISOString() ?? null,
      files: files.map(file => ({
        id: file.id,
        category: file.fileType,
        filename: file.originalFilename || 'file',
        mimeType: file.mimeType,
        url: file.fileUrl, // CDN URL for MVP (no presigned URLs)
        uploadedAt: file.createdAt.toISOString(),
      })),
      isOwner,
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
