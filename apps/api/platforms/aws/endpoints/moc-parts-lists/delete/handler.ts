import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { and, eq } from 'drizzle-orm'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { db } from '@/core/database/client'
import { mocPartsLists, mocInstructions, mocParts } from '@/core/database/schema'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { logger } from '@/core/observability/logger'

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      logger.warn('Unauthorized access attempt to delete parts list')
      return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized')
    }

    const mocId = event.pathParameters?.mocId
    const partsListId = event.pathParameters?.partsListId

    if (!mocId || !partsListId) {
      return errorResponse(400, 'VALIDATION_ERROR', 'MOC ID and Parts List ID are required')
    }

    // Verify MOC ownership
    const [moc] = await db
      .select()
      .from(mocInstructions)
      .where(and(eq(mocInstructions.id, mocId), eq(mocInstructions.userId, userId)))
      .limit(1)

    if (!moc) {
      logger.warn(`MOC not found or unauthorized: ${mocId}`, { userId, mocId })
      return errorResponse(404, 'NOT_FOUND', 'MOC instructions not found')
    }

    // Verify parts list exists and belongs to this MOC
    const [existingPartsList] = await db
      .select()
      .from(mocPartsLists)
      .where(and(eq(mocPartsLists.id, partsListId), eq(mocPartsLists.mocId, mocId)))
      .limit(1)

    if (!existingPartsList) {
      logger.warn(`Parts list not found: ${partsListId}`, { userId, mocId, partsListId })
      return errorResponse(404, 'NOT_FOUND', 'Parts list not found')
    }

    // Delete all parts list items first (cascade delete)
    await db.delete(mocParts).where(eq(mocParts.partsListId, partsListId))

    // Delete the parts list
    await db.delete(mocPartsLists).where(eq(mocPartsLists.id, partsListId))

    logger.info(`Deleted parts list: ${partsListId}`, {
      userId,
      mocId,
      partsListId,
    })

    return successResponse(200, {
      message: 'Parts list deleted successfully',
      partsListId,
    })
  } catch (error) {
    logger.error('Error deleting parts list:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to delete parts list')
  }
}
