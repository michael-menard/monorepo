/**
 * Delete MOC File Core Function
 *
 * Platform-agnostic business logic for soft-deleting a file from a MOC.
 * Follows ports & adapters pattern - all infrastructure is injected via deps.
 *
 * STORY-016: MOC File Upload Management
 */

import type { DeleteMocFileDeps, DeleteMocFileResult } from './__types__/index.js'

/**
 * Soft-delete a file from a MOC
 *
 * Business rules:
 * 1. MOC must exist
 * 2. User must own the MOC
 * 3. File must exist and belong to the MOC
 * 4. File is soft-deleted (deletedAt set, not hard deleted)
 * 5. MOC's updatedAt timestamp is updated
 *
 * @param mocId - MOC ID
 * @param fileId - File ID to delete
 * @param userId - Authenticated user ID
 * @param deps - Injected dependencies
 * @returns Result with success or error details
 */
export async function deleteMocFile(
  mocId: string,
  fileId: string,
  userId: string,
  deps: DeleteMocFileDeps,
): Promise<DeleteMocFileResult> {
  // Verify MOC exists and ownership
  const moc = await deps.db.getMoc(mocId)

  if (!moc) {
    return {
      success: false,
      error: 'NOT_FOUND',
      message: 'MOC not found',
    }
  }

  if (moc.userId !== userId) {
    return {
      success: false,
      error: 'FORBIDDEN',
      message: 'You do not own this MOC',
    }
  }

  // Verify file exists and belongs to the MOC
  const file = await deps.db.getFile(fileId, mocId)

  if (!file) {
    return {
      success: false,
      error: 'NOT_FOUND',
      message: 'File not found',
    }
  }

  // Soft-delete the file
  try {
    await deps.db.softDeleteFile(fileId)

    // Update MOC's updatedAt timestamp
    await deps.db.updateMocTimestamp(mocId)

    return {
      success: true,
      data: {
        fileId,
        message: 'File deleted successfully',
      },
    }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Database error',
    }
  }
}
