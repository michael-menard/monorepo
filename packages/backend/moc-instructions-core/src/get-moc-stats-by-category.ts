/**
 * Get MOC Stats by Category
 *
 * Platform-agnostic core logic for getting MOC statistics aggregated by category.
 * Accepts Drizzle DB client via dependency injection for testability.
 *
 * Features:
 * - Aggregates by theme (for sets) and tags (for MOCs)
 * - Returns top 10 categories sorted by count descending
 * - Only counts authenticated user's MOCs
 */

import {
  CategoryStatsResponseSchema,
  type CategoryStatsResponse,
  type CategoryStat,
} from './__types__/index.js'

/**
 * Raw theme stat from database
 */
interface ThemeStat {
  category: string | null
  count: number
}

/**
 * MOC with tags for tag aggregation
 */
interface MocWithTags {
  tags: string[] | null
}

/**
 * Minimal database interface for get-moc-stats-by-category operations
 */
export interface GetMocStatsByCategoryDbClient {
  getThemeStats: (userId: string) => Promise<ThemeStat[]>
  getMocsWithTags: (userId: string) => Promise<MocWithTags[]>
}

/**
 * Schema references interface
 */
export interface GetMocStatsByCategorySchema {
  mocInstructions: unknown
}

/**
 * Get MOC Stats by Category Result
 *
 * Discriminated union for stats operation result.
 */
export type GetMocStatsByCategoryResult =
  | { success: true; data: CategoryStatsResponse }
  | { success: false; error: 'DB_ERROR'; message: string }

/**
 * Get MOC statistics by category
 *
 * Aggregates user's MOCs by theme and tags, returns top 10.
 *
 * @param db - Database client with getThemeStats and getMocsWithTags methods
 * @param userId - Authenticated user ID (required)
 * @returns CategoryStatsResponse or error result
 */
export async function getMocStatsByCategory(
  db: GetMocStatsByCategoryDbClient,
  userId: string,
): Promise<GetMocStatsByCategoryResult> {
  try {
    // Get stats by theme
    const themeStats = await db.getThemeStats(userId)

    // Get MOCs with tags for tag aggregation
    const mocsWithTags = await db.getMocsWithTags(userId)

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

    // Convert tag counts to stat format
    const tagStats: CategoryStat[] = Object.entries(tagCounts).map(([category, count]) => ({
      category,
      count,
    }))

    // Combine theme stats and tag stats, avoiding duplicates
    const allStats: CategoryStat[] = themeStats
      .filter((stat): stat is { category: string; count: number } => stat.category !== null)
      .map(stat => ({ category: stat.category, count: stat.count }))

    tagStats.forEach(tagStat => {
      const existingTheme = allStats.find(
        stat => stat.category.toLowerCase() === tagStat.category.toLowerCase(),
      )
      if (!existingTheme) {
        allStats.push(tagStat)
      }
    })

    // Sort by count descending and take top 10
    const sortedStats = allStats
      .filter(stat => stat.category && stat.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const response: CategoryStatsResponse = {
      data: sortedStats,
      total: sortedStats.reduce((sum, stat) => sum + stat.count, 0),
    }

    // Runtime validation
    CategoryStatsResponseSchema.parse(response)

    return { success: true, data: response }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
