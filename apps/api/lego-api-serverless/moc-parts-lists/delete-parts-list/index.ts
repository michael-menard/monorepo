import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { db } from '@monorepo/db/client'
import { mocPartsList, mocInstructions, mocPartsListItems } from '@monorepo/db/schema'
import { and, eq } from 'drizzle-orm'
import { getUserIdFromEvent } from '@/lib/auth/jwt-utils'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { logger } from '@/lib/utils/logger'

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      logger.warn('Unauthorized access attempt to delete parts list')
      return createErrorResponse(401, 'Unauthorized')
    }

    const mocId = event.pathParameters?.mocId
    const partsListId = event.pathParameters?.partsListId

    if (!mocId || !partsListId) {
      return createErrorResponse(400, 'MOC ID and Parts List ID are required')
    }

    // Verify MOC ownership
    const [moc] = await db
      .select()
      .from(mocInstructions)
      .where(and(eq(mocInstructions.id, mocId), eq(mocInstructions.userId, userId)))
      .limit(1)

    if (!moc) {
      logger.warn(`MOC not found or unauthorized: ${mocId}`, { userId, mocId })
      return createErrorResponse(404, 'MOC instructions not found')
    }

    // Verify parts list exists and belongs to this MOC
    const [existingPartsList] = await db
      .select()
      .from(mocPartsList)
      .where(
        and(eq(mocPartsList.id, partsListId), eq(mocPartsList.mocInstructionId, mocId))
      )
      .limit(1)

    if (!existingPartsList) {
      logger.warn(`Parts list not found: ${partsListId}`, { userId, mocId, partsListId })
      return createErrorResponse(404, 'Parts list not found')
    }

    // Delete all parts list items first (cascade delete)
    await db.delete(mocPartsListItems).where(eq(mocPartsListItems.partsListId, partsListId))

    // Delete the parts list
    await db.delete(mocPartsList).where(eq(mocPartsList.id, partsListId))

    logger.info(`Deleted parts list: ${partsListId}`, {
      userId,
      mocId,
      partsListId,
    })

    return createSuccessResponse(200, {
      message: 'Parts list deleted successfully',
      partsListId,
    })
  } catch (error) {
    logger.error('Error deleting parts list:', error)
    return createErrorResponse(500, 'Failed to delete parts list')
  }
}
