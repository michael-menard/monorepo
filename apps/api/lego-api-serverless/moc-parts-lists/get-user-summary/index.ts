import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { db } from '@monorepo/db/client'
import { mocPartsList, mocInstructions } from '@monorepo/db/schema'
import { eq, sql } from 'drizzle-orm'
import { getUserIdFromEvent } from '@monorepo/lambda-auth'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import { logger } from '@/lib/utils/logger'

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      logger.warn('Unauthorized access attempt to get user parts list summary')
      return createErrorResponse(401, 'Unauthorized')
    }

    // Get all MOCs for this user
    const userMocs = await db
      .select({ id: mocInstructions.id })
      .from(mocInstructions)
      .where(eq(mocInstructions.userId, userId))

    const mocIds = userMocs.map(moc => moc.id)

    if (mocIds.length === 0) {
      // User has no MOCs, return empty summary
      return createSuccessResponse(200, {
        summary: {
          totalPartsLists: 0,
          byStatus: {
            planning: 0,
            in_progress: 0,
            completed: 0,
          },
          totalParts: 0,
          totalCompletedParts: 0,
        },
      })
    }

    // Get summary statistics for all parts lists across user's MOCs
    const summaryResult = await db
      .select({
        status: mocPartsList.status,
        count: sql<number>`count(*)::int`,
        totalParts: sql<number>`sum(${mocPartsList.totalParts})::int`,
        completedParts: sql<number>`sum(${mocPartsList.completedParts})::int`,
      })
      .from(mocPartsList)
      .where(sql`${mocPartsList.mocInstructionId} = ANY(${mocIds})`)
      .groupBy(mocPartsList.status)

    // Aggregate the results
    const byStatus = {
      planning: 0,
      in_progress: 0,
      completed: 0,
    }

    let totalPartsLists = 0
    let totalParts = 0
    let totalCompletedParts = 0

    for (const row of summaryResult) {
      const status = row.status as 'planning' | 'in_progress' | 'completed'
      byStatus[status] = Number(row.count)
      totalPartsLists += Number(row.count)
      totalParts += Number(row.totalParts || 0)
      totalCompletedParts += Number(row.completedParts || 0)
    }

    const summary = {
      totalPartsLists,
      byStatus,
      totalParts,
      totalCompletedParts,
      completionPercentage:
        totalParts > 0 ? Math.round((totalCompletedParts / totalParts) * 100) : 0,
    }

    logger.info('Retrieved user parts list summary', {
      userId,
      totalPartsLists,
      totalParts,
    })

    return createSuccessResponse(200, {
      summary,
    })
  } catch (error) {
    logger.error('Error getting user parts list summary:', error)
    return createErrorResponse(500, 'Failed to retrieve parts list summary')
  }
}
