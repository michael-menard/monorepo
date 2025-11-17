import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { db } from '@monorepo/db/client'
import { mocPartsList, mocInstructions } from '@monorepo/db/schema'
import { and, eq } from 'drizzle-orm'
import { getUserIdFromEvent } from '@monorepo/lambda-auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { logger } from '@/lib/utils/logger'

interface UpdateStatusRequest {
  status: 'planning' | 'in_progress' | 'completed'
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      logger.warn('Unauthorized access attempt to update parts list status')
      return createErrorResponse(401, 'Unauthorized')
    }

    const mocId = event.pathParameters?.mocId
    const partsListId = event.pathParameters?.partsListId

    if (!mocId || !partsListId) {
      return createErrorResponse(400, 'MOC ID and Parts List ID are required')
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required')
    }

    let requestData: UpdateStatusRequest
    try {
      requestData = JSON.parse(event.body)
    } catch {
      return createErrorResponse(400, 'Invalid JSON in request body')
    }

    if (!requestData.status) {
      return createErrorResponse(400, 'Status is required')
    }

    const validStatuses = ['planning', 'in_progress', 'completed']
    if (!validStatuses.includes(requestData.status)) {
      return createErrorResponse(
        400,
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
      return createErrorResponse(404, 'MOC instructions not found')
    }

    // Verify parts list exists and belongs to this MOC
    const [existingPartsList] = await db
      .select()
      .from(mocPartsList)
      .where(and(eq(mocPartsList.id, partsListId), eq(mocPartsList.mocInstructionId, mocId)))
      .limit(1)

    if (!existingPartsList) {
      logger.warn(`Parts list not found: ${partsListId}`, { userId, mocId, partsListId })
      return createErrorResponse(404, 'Parts list not found')
    }

    // Update status
    const [updatedPartsList] = await db
      .update(mocPartsList)
      .set({ status: requestData.status })
      .where(eq(mocPartsList.id, partsListId))
      .returning()

    logger.info(`Updated parts list status: ${partsListId}`, {
      userId,
      mocId,
      partsListId,
      oldStatus: existingPartsList.status,
      newStatus: requestData.status,
    })

    return createSuccessResponse(200, {
      partsList: updatedPartsList,
    })
  } catch (error) {
    logger.error('Error updating parts list status:', error)
    return createErrorResponse(500, 'Failed to update parts list status')
  }
}
