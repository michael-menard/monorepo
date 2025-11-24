import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { db } from '@/core/database/client'
import { mocPartsLists, mocInstructions, mocParts } from '@/core/database/schema'
import { and, eq } from 'drizzle-orm'
import { getUserIdFromEvent } from '@monorepo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { logger } from '@/core/observability/logger'
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

    let requestData: UpdatePartsListRequest
    try {
      requestData = JSON.parse(event.body)
    } catch {
      return errorResponse(400, 'VALIDATION_ERROR', 'Invalid JSON in request body')
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

    // Build update object
    const updateData: Partial<typeof mocPartsLists.$inferInsert> = {}
    if (requestData.name !== undefined) {
      updateData.title = requestData.name.trim()
    }
    if (requestData.status !== undefined) {
      // Map status to built/purchased flags
      updateData.built = requestData.status === 'completed' || requestData.status === 'in_progress'
      updateData.purchased = requestData.status === 'completed'
    }

    // Update parts list metadata
    let updatedPartsList = existingPartsList
    if (Object.keys(updateData).length > 0) {
      ;[updatedPartsList] = await db
        .update(mocPartsLists)
        .set(updateData)
        .where(eq(mocPartsLists.id, partsListId))
        .returning()
    }

    // Handle parts updates if provided
    if (requestData.parts) {
      // Delete all existing items and recreate
      await db.delete(mocParts).where(eq(mocParts.partsListId, partsListId))

      if (requestData.parts.length > 0) {
        const partsListItemsData = requestData.parts.map(part => ({
          id: part.id || nanoid(),
          partsListId,
          partId: part.partNumber,
          partName: part.partName,
          quantity: part.quantity,
          color: part.colorName || 'Unknown',
        }))

        await db.insert(mocParts).values(partsListItemsData)
      }

      // Update total parts count (acquired count will be managed separately)
      const acquiredCount = 0 // Default to 0, will be updated through separate acquired tracking
      ;[updatedPartsList] = await db
        .update(mocPartsLists)
        .set({
          totalPartsCount: requestData.parts.length.toString(),
          acquiredPartsCount: acquiredCount.toString(),
        })
        .where(eq(mocPartsLists.id, partsListId))
        .returning()
    }

    logger.info(`Updated parts list ${partsListId}`, {
      userId,
      mocId,
      partsListId,
      updatedFields: Object.keys(updateData),
    })

    return successResponse(200, {
      partsList: updatedPartsList,
    })
  } catch (error) {
    logger.error('Error updating parts list:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to update parts list')
  }
}
