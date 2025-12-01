/**
 * Delete MOC File Lambda Handler
 *
 * DELETE /api/mocs/:id/files/:fileId
 * Deletes a file attachment from a MOC instruction
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq, and } from 'drizzle-orm'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { db } from '@/core/database/client'
import { mocInstructions, mocFiles } from '@/core/database/schema'

/**
 * Delete MOC File Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    const mocId = event.pathParameters?.id
    const fileId = event.pathParameters?.fileId

    if (!mocId || !fileId) {
      return errorResponse(400, 'VALIDATION_ERROR', 'MOC ID and File ID are required')
    }

    // Verify MOC exists and user owns it
    const [moc] = await db
      .select()
      .from(mocInstructions)
      .where(and(eq(mocInstructions.id, mocId), eq(mocInstructions.userId, userId)))
      .limit(1)

    if (!moc) {
      logger.warn(`MOC not found or unauthorized: ${mocId}`, { userId, mocId })
      return errorResponse(404, 'NOT_FOUND', 'MOC not found or you do not have permission')
    }

    // Verify file exists and belongs to the MOC
    const [file] = await db
      .select()
      .from(mocFiles)
      .where(and(eq(mocFiles.id, fileId), eq(mocFiles.mocId, mocId)))
      .limit(1)

    if (!file) {
      logger.warn(`File not found: ${fileId}`, { userId, mocId, fileId })
      return errorResponse(404, 'NOT_FOUND', 'File not found')
    }

    // Delete the file record
    await db.delete(mocFiles).where(eq(mocFiles.id, fileId))

    // Update MOC's updatedAt timestamp
    await db
      .update(mocInstructions)
      .set({ updatedAt: new Date() })
      .where(eq(mocInstructions.id, mocId))

    logger.info(`File deleted successfully: ${fileId}`, { userId, mocId, fileId })

    return successResponse(200, {
      message: 'File deleted successfully',
      fileId,
    })
  } catch (error) {
    logger.error('Error in delete-moc-file handler:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to delete file')
  }
}
