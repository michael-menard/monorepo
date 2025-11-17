import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { db } from '@monorepo/db/client'
import { mocPartsList, mocInstructions, mocPartsListItems } from '@monorepo/db/schema'
import { and, eq } from 'drizzle-orm'
import { getUserIdFromEvent } from '@/lib/auth/jwt-utils'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { logger } from '@/lib/utils/logger'
import { nanoid } from 'nanoid'

interface CreatePartsListRequest {
  name: string
  parts?: Array<{
    partNumber: string
    partName: string
    quantity: number
    colorId?: string
    colorName?: string
    category?: string
    imageUrl?: string
  }>
}

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      logger.warn('Unauthorized access attempt to create parts list')
      return createErrorResponse(401, 'Unauthorized')
    }

    const mocId = event.pathParameters?.mocId
    if (!mocId) {
      return createErrorResponse(400, 'MOC ID is required')
    }

    if (!event.body) {
      return createErrorResponse(400, 'Request body is required')
    }

    let requestData: CreatePartsListRequest
    try {
      requestData = JSON.parse(event.body)
    } catch {
      return createErrorResponse(400, 'Invalid JSON in request body')
    }

    if (!requestData.name || requestData.name.trim() === '') {
      return createErrorResponse(400, 'Parts list name is required')
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

    const partsListId = nanoid()

    // Create parts list
    const [newPartsList] = await db
      .insert(mocPartsList)
      .values({
        id: partsListId,
        mocInstructionId: mocId,
        name: requestData.name.trim(),
        status: 'planning',
        totalParts: requestData.parts?.length || 0,
        completedParts: 0,
      })
      .returning()

    // Create parts list items if provided
    if (requestData.parts && requestData.parts.length > 0) {
      const partsListItemsData = requestData.parts.map((part) => ({
        id: nanoid(),
        partsListId,
        partNumber: part.partNumber,
        partName: part.partName,
        quantity: part.quantity,
        colorId: part.colorId || null,
        colorName: part.colorName || null,
        category: part.category || null,
        imageUrl: part.imageUrl || null,
        acquired: false,
      }))

      await db.insert(mocPartsListItems).values(partsListItemsData)
    }

    logger.info(`Created parts list ${partsListId} for MOC ${mocId}`, {
      userId,
      mocId,
      partsListId,
      partsCount: requestData.parts?.length || 0,
    })

    return createSuccessResponse(201, {
      partsList: newPartsList,
    })
  } catch (error) {
    logger.error('Error creating parts list:', error)
    return createErrorResponse(500, 'Failed to create parts list')
  }
}
