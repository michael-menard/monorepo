/**
 * Get MOC Statistics by Category Lambda Handler
 *
 * GET /api/mocs/stats/by-category
 * Returns statistics grouped by category (theme/tags)
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { eq, and, sql } from 'drizzle-orm'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { logger } from '@/core/observability/logger'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { db } from '@/core/database/client'
import { mocInstructions } from '@/core/database/schema'

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    logger.info('Getting MOC stats by category', { userId })

    // Get stats by theme (for sets) and by tags (for MOCs)
    const themeStats = await db
      .select({
        category: mocInstructions.theme,
        count: sql<number>`count(*)::int`,
      })
      .from(mocInstructions)
      .where(
        and(
          eq(mocInstructions.userId, userId),
          sql`${mocInstructions.theme} IS NOT NULL AND ${mocInstructions.theme} != ''`,
        ),
      )
      .groupBy(mocInstructions.theme)

    // For MOCs without themes, extract categories from tags
    const mocsWithTags = await db
      .select({
        tags: mocInstructions.tags,
      })
      .from(mocInstructions)
      .where(
        and(
          eq(mocInstructions.userId, userId),
          eq(mocInstructions.type, 'moc'),
          sql`${mocInstructions.tags} IS NOT NULL`,
        ),
      )

    // Process tags to extract categories
    const tagCounts: Record<string, number> = {}
    mocsWithTags.forEach(moc => {
      if (moc.tags && Array.isArray(moc.tags)) {
        moc.tags.forEach(tag => {
          const category = String(tag).toLowerCase()
          tagCounts[category] = (tagCounts[category] || 0) + 1
        })
      }
    })

    // Convert tag counts to the same format as theme stats
    const tagStats = Object.entries(tagCounts).map(([category, count]) => ({
      category,
      count,
    }))

    // Combine theme stats and tag stats, avoiding duplicates
    const allStats = [...themeStats]
    tagStats.forEach(tagStat => {
      const existingTheme = allStats.find(
        stat => stat.category?.toLowerCase() === tagStat.category.toLowerCase(),
      )
      if (!existingTheme) {
        allStats.push(tagStat)
      }
    })

    // Sort by count descending and take top categories
    const sortedStats = allStats
      .filter(stat => stat.category && stat.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Top 10 categories

    logger.info('MOC stats by category retrieved', { userId, categories: sortedStats.length })

    return successResponse(200, {
      success: true,
      data: sortedStats,
      total: sortedStats.reduce((sum, stat) => sum + stat.count, 0),
    })
  } catch (error) {
    logger.error('Error getting MOC stats by category:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to get MOC statistics')
  }
}
