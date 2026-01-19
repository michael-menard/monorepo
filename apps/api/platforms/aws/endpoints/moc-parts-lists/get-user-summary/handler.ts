import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { db } from '@/core/database/client'
import { mocPartsLists, mocInstructions } from '@/core/database/schema'
import { eq, sql } from 'drizzle-orm'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { logger } from '@/core/observability/logger'

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      logger.warn('Unauthorized access attempt to get user parts list summary')
      return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized')
    }

    // Get all MOCs for this user
    const userMocs = await db
      .select({ id: mocInstructions.id })
      .from(mocInstructions)
      .where(eq(mocInstructions.userId, userId))

    const mocIds = userMocs.map(moc => moc.id)

    if (mocIds.length === 0) {
      // User has no MOCs, return empty summary
      return successResponse(200, {
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
        built: mocPartsLists.built,
        purchased: mocPartsLists.purchased,
        count: sql<number>`count(*)::int`,
        totalParts: sql<number>`sum(COALESCE(${mocPartsLists.totalPartsCount}::int, 0))::int`,
        acquiredParts: sql<number>`sum(COALESCE(${mocPartsLists.acquiredPartsCount}::int, 0))::int`,
      })
      .from(mocPartsLists)
      .where(sql`${mocPartsLists.mocId} = ANY(${mocIds})`)
      .groupBy(mocPartsLists.built, mocPartsLists.purchased)

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
      // Map built/purchased flags to status
      let status: 'planning' | 'in_progress' | 'completed'
      if (row.purchased) {
        status = 'completed'
      } else if (row.built) {
        status = 'in_progress'
      } else {
        status = 'planning'
      }

      byStatus[status] += Number(row.count)
      totalPartsLists += Number(row.count)
      totalParts += Number(row.totalParts || 0)
      totalCompletedParts += Number(row.acquiredParts || 0)
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

    return successResponse(200, {
      summary,
    })
  } catch (error) {
    logger.error('Error getting user parts list summary:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to retrieve parts list summary')
  }
}
