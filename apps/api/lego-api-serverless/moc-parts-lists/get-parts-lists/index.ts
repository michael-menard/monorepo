import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { db } from '@monorepo/db/client'
import { mocPartsList, mocInstructions } from '@monorepo/db/schema'
import { and, eq, desc } from 'drizzle-orm'
import { getUserIdFromEvent } from '@monorepo/lambda-auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { logger } from '@/lib/utils/logger'

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      logger.warn('Unauthorized access attempt to get parts lists')
      return createErrorResponse(401, 'Unauthorized')
    }

    const mocId = event.pathParameters?.mocId
    if (!mocId) {
      return createErrorResponse(400, 'MOC ID is required')
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

    // Get all parts lists for this MOC
    const partsLists = await db
      .select()
      .from(mocPartsList)
      .where(eq(mocPartsList.mocInstructionId, mocId))
      .orderBy(desc(mocPartsList.createdAt))

    logger.info(`Retrieved ${partsLists.length} parts lists for MOC ${mocId}`, {
      userId,
      mocId,
      count: partsLists.length,
    })

    return createSuccessResponse(200, {
      partsLists,
      total: partsLists.length,
    })
  } catch (error) {
    logger.error('Error getting parts lists:', error)
    return createErrorResponse(500, 'Failed to retrieve parts lists')
  }
}
