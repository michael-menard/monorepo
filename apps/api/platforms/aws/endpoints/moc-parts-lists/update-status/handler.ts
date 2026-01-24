import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { and, eq } from 'drizzle-orm'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { db } from '@/core/database/client'
import { mocPartsLists, mocInstructions } from '@/core/database/schema'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { logger } from '@/core/observability/logger'

interface UpdateStatusRequest {
  status: 'planning' | 'in_progress' | 'completed'
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      logger.warn('Unauthorized access attempt to update parts list status')
      return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized')
    }

    const mocId = event.pathParameters?.mocId
    const partsListId = event.pathParameters?.partsListId

    if (!mocId || !partsListId) {
      return errorResponse(400, 'VALIDATION_ERROR', 'MOC ID and Parts List ID are required')
    }

    if (!event.body) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Request body is required')
    }

    let requestData: UpdateStatusRequest
    try {
      requestData = JSON.parse(event.body)
    } catch {
      return errorResponse(400, 'VALIDATION_ERROR', 'Invalid JSON in request body')
    }

    if (!requestData.status) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Status is required')
    }

    const validStatuses = ['planning', 'in_progress', 'completed']
    if (!validStatuses.includes(requestData.status)) {
      return errorResponse(
        400,
        'VALIDATION_ERROR',
        'Invalid status. Must be: planning, in_progress, or completed',
      )
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

    // Update status
    const [updatedPartsList] = await db
      .update(mocPartsLists)
      .set({
        built: requestData.status === 'completed' || requestData.status === 'in_progress',
        purchased: requestData.status === 'completed',
      })
      .where(eq(mocPartsLists.id, partsListId))
      .returning()

    logger.info(`Updated parts list status: ${partsListId}`, {
      userId,
      mocId,
      partsListId,
      oldBuilt: existingPartsList.built,
      oldPurchased: existingPartsList.purchased,
      newStatus: requestData.status,
    })

    return successResponse(200, {
      partsList: updatedPartsList,
    })
  } catch (error) {
    logger.error('Error updating parts list status:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to update parts list status')
  }
}
