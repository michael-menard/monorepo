import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { db } from '@monorepo/db/client'
import { mocPartsList, mocInstructions, mocPartsListItems } from '@monorepo/db/schema'
import { and, eq } from 'drizzle-orm'
import { getUserIdFromEvent } from '@monorepo/lambda-auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { logger } from '@/lib/utils/logger'
import { nanoid } from 'nanoid'

interface UpdatePartsListRequest {
  name?: string
  status?: 'planning' | 'in_progress' | 'completed'
  parts?: Array<{
    id?: string // If provided, update existing item
    partNumber: string
    partName: string
    quantity: number
    colorId?: string
    colorName?: string
    category?: string
    imageUrl?: string
    acquired?: boolean
  }>
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      logger.warn('Unauthorized access attempt to update parts list')
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

    let requestData: UpdatePartsListRequest
    try {
      requestData = JSON.parse(event.body)
    } catch {
      return createErrorResponse(400, 'Invalid JSON in request body')
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

    // Build update object
    const updateData: Partial<typeof mocPartsList.$inferInsert> = {}
    if (requestData.name !== undefined) {
      updateData.name = requestData.name.trim()
    }
    if (requestData.status !== undefined) {
      updateData.status = requestData.status
    }

    // Update parts list metadata
    let updatedPartsList = existingPartsList
    if (Object.keys(updateData).length > 0) {
      ;[updatedPartsList] = await db
        .update(mocPartsList)
        .set(updateData)
        .where(eq(mocPartsList.id, partsListId))
        .returning()
    }

    // Handle parts updates if provided
    if (requestData.parts) {
      // Delete all existing items and recreate
      await db.delete(mocPartsListItems).where(eq(mocPartsListItems.partsListId, partsListId))

      if (requestData.parts.length > 0) {
        const partsListItemsData = requestData.parts.map(part => ({
          id: part.id || nanoid(),
          partsListId,
          partNumber: part.partNumber,
          partName: part.partName,
          quantity: part.quantity,
          colorId: part.colorId || null,
          colorName: part.colorName || null,
          category: part.category || null,
          imageUrl: part.imageUrl || null,
          acquired: part.acquired || false,
        }))

        await db.insert(mocPartsListItems).values(partsListItemsData)
      }

      // Update total and completed parts count
      const acquiredCount = requestData.parts.filter(p => p.acquired).length
      ;[updatedPartsList] = await db
        .update(mocPartsList)
        .set({
          totalParts: requestData.parts.length,
          completedParts: acquiredCount,
        })
        .where(eq(mocPartsList.id, partsListId))
        .returning()
    }

    logger.info(`Updated parts list ${partsListId}`, {
      userId,
      mocId,
      partsListId,
      updatedFields: Object.keys(updateData),
    })

    return createSuccessResponse(200, {
      partsList: updatedPartsList,
    })
  } catch (error) {
    logger.error('Error updating parts list:', error)
    return createErrorResponse(500, 'Failed to update parts list')
  }
}
