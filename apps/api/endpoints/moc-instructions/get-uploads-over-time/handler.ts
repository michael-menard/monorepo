/**
 * Get MOC Uploads Over Time Lambda Handler
 *
 * GET /api/mocs/stats/uploads-over-time
 * Returns time-series data of MOC uploads grouped by month and category
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq, and, sql } from 'drizzle-orm'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@monorepo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { db } from '@/core/database/client'
import { mocInstructions } from '@/core/database/schema'

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    logger.info('Getting MOC uploads over time', { userId })

    // Get MOCs grouped by month and category (last 12 months)
    const uploadsData = await db
      .select({
        month: sql<string>`DATE_TRUNC('month', ${mocInstructions.createdAt})::text`,
        category: mocInstructions.theme,
        count: sql<number>`count(*)::int`,
      })
      .from(mocInstructions)
      .where(
        and(
          eq(mocInstructions.userId, userId),
          sql`${mocInstructions.createdAt} >= NOW() - INTERVAL '12 months'`,
        ),
      )
      .groupBy(sql`DATE_TRUNC('month', ${mocInstructions.createdAt})`, mocInstructions.theme)
      .orderBy(sql`DATE_TRUNC('month', ${mocInstructions.createdAt})`)

    // Transform to format expected by frontend: {date, category, count}
    const timeSeriesData = uploadsData
      .map(row => ({
        date: row.month ? row.month.substring(0, 7) : '', // YYYY-MM format
        category: row.category || 'Unknown',
        count: row.count,
      }))
      .filter(item => item.date && item.count > 0)

    logger.info('MOC uploads over time retrieved', {
      userId,
      months: new Set(timeSeriesData.map(d => d.date)).size,
    })

    return successResponse(200, {
      success: true,
      data: timeSeriesData,
    })
  } catch (error) {
    logger.error('Error getting MOC uploads over time:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to get MOC upload statistics')
  }
}
