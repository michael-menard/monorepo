/**
 * Get MOC Uploads Over Time
 *
 * Platform-agnostic core logic for getting MOC upload statistics as time-series data.
 * Accepts Drizzle DB client via dependency injection for testability.
 *
 * Features:
 * - Returns time-series data for last 12 months
 * - Groups by month (YYYY-MM format) and category (theme)
 * - Only counts authenticated user's MOCs
 */

import {
  UploadsOverTimeResponseSchema,
  type UploadsOverTimeResponse,
  type UploadOverTime,
} from './__types__/index.js'

/**
 * Raw upload stat from database
 */
interface RawUploadStat {
  month: string | null
  category: string | null
  count: number
}

/**
 * Minimal database interface for get-moc-uploads-over-time operations
 */
export interface GetMocUploadsOverTimeDbClient {
  getUploadsOverTime: (userId: string) => Promise<RawUploadStat[]>
}

/**
 * Schema references interface
 */
export interface GetMocUploadsOverTimeSchema {
  mocInstructions: unknown
}

/**
 * Get MOC Uploads Over Time Result
 *
 * Discriminated union for uploads-over-time operation result.
 */
export type GetMocUploadsOverTimeResult =
  | { success: true; data: UploadsOverTimeResponse }
  | { success: false; error: 'DB_ERROR'; message: string }

/**
 * Get MOC uploads over time
 *
 * Returns time-series data of user's MOC uploads grouped by month and theme.
 * Only includes MOCs created within the last 12 months.
 *
 * @param db - Database client with getUploadsOverTime method
 * @param userId - Authenticated user ID (required)
 * @returns UploadsOverTimeResponse or error result
 */
export async function getMocUploadsOverTime(
  db: GetMocUploadsOverTimeDbClient,
  userId: string,
): Promise<GetMocUploadsOverTimeResult> {
  try {
    // Get uploads data grouped by month and category
    const uploadsData = await db.getUploadsOverTime(userId)

    // Transform to response format
    const timeSeriesData: UploadOverTime[] = uploadsData
      .map(row => ({
        date: row.month ? row.month.substring(0, 7) : '', // YYYY-MM format
        category: row.category || 'Unknown',
        count: row.count,
      }))
      .filter(item => item.date && item.count > 0)

    const response: UploadsOverTimeResponse = {
      data: timeSeriesData,
    }

    // Runtime validation
    UploadsOverTimeResponseSchema.parse(response)

    return { success: true, data: response }
  } catch (error) {
    return {
      success: false,
      error: 'DB_ERROR',
      message: error instanceof Error ? error.message : 'Unknown database error',
    }
  }
}
