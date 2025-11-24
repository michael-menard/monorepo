import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { db } from '@/core/database/client'
import { mocPartsLists, mocInstructions, mocParts } from '@/core/database/schema'
import { and, eq } from 'drizzle-orm'
import { getUserIdFromEvent } from '@monorepo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { logger } from '@/core/observability/logger'
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

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      logger.warn('Unauthorized access attempt to create parts list')
      return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized')
    }

    const mocId = event.pathParameters?.mocId
    if (!mocId) {
      return errorResponse(400, 'VALIDATION_ERROR', 'MOC ID is required')
    }

    if (!event.body) {
      return errorResponse(400, 'VALIDATION_ERROR', 'Request body is required')
    }

    let requestData: CreatePartsListRequest
    try {
      requestData = JSON.parse(event.body)
    } catch {
      return errorResponse(400, 'VALIDATION_ERROR', 'Invalid JSON in request body')
    }

    if (!requestData.name || requestData.name.trim() === '') {
      return errorResponse(400, 'VALIDATION_ERROR', 'Parts list name is required')
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

    const partsListId = nanoid()

    // Create parts list
    const [newPartsList] = await db
      .insert(mocPartsLists)
      .values({
        id: partsListId,
        mocId: mocId,
        title: requestData.name.trim(),
        built: false,
        purchased: false,
        totalPartsCount: (requestData.parts?.length || 0).toString(),
        acquiredPartsCount: '0',
      })
      .returning()

    // Create parts list items if provided
    if (requestData.parts && requestData.parts.length > 0) {
      const partsListItemsData = requestData.parts.map(part => ({
        id: nanoid(),
        partsListId,
        partId: part.partNumber,
        partName: part.partName,
        quantity: part.quantity,
        color: part.colorName || 'Unknown',
      }))

      await db.insert(mocParts).values(partsListItemsData)
    }

    logger.info(`Created parts list ${partsListId} for MOC ${mocId}`, {
      userId,
      mocId,
      partsListId,
      partsCount: requestData.parts?.length || 0,
    })

    return successResponse(201, {
      partsList: newPartsList,
    })
  } catch (error) {
    logger.error('Error creating parts list:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to create parts list')
  }
}
