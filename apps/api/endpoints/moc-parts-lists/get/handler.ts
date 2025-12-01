import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { db } from '@/core/database/client'
import { mocPartsLists, mocInstructions } from '@/core/database/schema'
import { and, eq, desc } from 'drizzle-orm'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { logger } from '@/core/observability/logger'

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      logger.warn('Unauthorized access attempt to get parts lists')
      return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized')
    }

    const mocId = event.pathParameters?.mocId
    if (!mocId) {
      return errorResponse(400, 'VALIDATION_ERROR', 'MOC ID is required')
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

    // Get all parts lists for this MOC
    const partsLists = await db
      .select()
      .from(mocPartsLists)
      .where(eq(mocPartsLists.mocId, mocId))
      .orderBy(desc(mocPartsLists.createdAt))

    logger.info(`Retrieved ${partsLists.length} parts lists for MOC ${mocId}`, {
      userId,
      mocId,
      count: partsLists.length,
    })

    return successResponse(200, {
      partsLists,
      total: partsLists.length,
    })
  } catch (error) {
    logger.error('Error getting parts lists:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to retrieve parts lists')
  }
}
